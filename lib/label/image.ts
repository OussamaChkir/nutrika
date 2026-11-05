// F5: image rules shared by the browser (downscale) and the server (validate). Pure.

/** The browser shrinks photos to this many pixels on the longest side before upload. */
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.82;
/** The server refuses bigger uploads. A 1600 px JPEG is normally 300 to 800 KB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type AcceptedMime = "image/jpeg" | "image/png" | "image/webp";

/** New size that fits in MAX_SIDE without enlarging and without changing the proportions. */
export function fitWithin(width: number, height: number, maxSide: number = MAX_SIDE): { width: number; height: number } {
    if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
    const longest = Math.max(width, height);
    if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
    const scale = maxSide / longest;
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** What the file really is, from its first bytes. The Content-Type header is never trusted. */
export function sniffImageType(bytes: Uint8Array): AcceptedMime | null {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
    ) return "image/webp";
    return null;
}
