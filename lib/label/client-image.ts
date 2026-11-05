// F5: browser only. Shrink the photo and re-encode it as JPEG before it leaves the phone.
//
// Re-encoding through a canvas drops everything that is not pixels: EXIF data, GPS location,
// camera model, timestamps. Smaller files are also faster on mobile data.

import { fitWithin, JPEG_QUALITY, MAX_SIDE } from "./image";

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
    if (typeof createImageBitmap === "function") {
        try {
            // "from-image" applies the camera rotation, so the label is upright after EXIF is dropped.
            const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
        } catch {
            // fall through to the <img> route
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        await img.decode();
        return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }
}

/** Returns a JPEG blob no larger than MAX_SIDE on its long side, or throws if the file is not a readable image. */
export async function prepareLabelPhoto(file: File): Promise<Blob> {
    const decoded = await decode(file);
    try {
        const { width, height } = fitWithin(decoded.width, decoded.height, MAX_SIDE);
        if (width === 0 || height === 0) throw new Error("empty image");
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.fillStyle = "#fff"; // JPEG has no transparency
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(decoded.source, 0, 0, width, height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        if (!blob) throw new Error("encode failed");
        return blob;
    } finally {
        decoded.close();
    }
}
