import { describe, expect, it } from "vitest";

import { fitWithin, MAX_SIDE, sniffImageType } from "./image";

const bytes = (...b: number[]) => new Uint8Array(b);

describe("fitWithin", () => {
    it("never enlarges", () => {
        expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    });

    it("shrinks the long side to MAX_SIDE and keeps proportions", () => {
        expect(fitWithin(4000, 3000)).toEqual({ width: MAX_SIDE, height: 1200 });
        expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_SIDE });
    });

    it("handles extreme and invalid sizes", () => {
        expect(fitWithin(100_000, 10).height).toBeGreaterThanOrEqual(1);
        expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
        expect(fitWithin(-5, 100)).toEqual({ width: 0, height: 0 });
        expect(fitWithin(NaN, 100)).toEqual({ width: 0, height: 0 });
    });
});

describe("sniffImageType", () => {
    it("recognises JPEG, PNG and WebP from the first bytes", () => {
        expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
        expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
        expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    });

    it("refuses everything else (PDF, SVG, GIF, HTML, empty)", () => {
        expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
        expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
        expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
        expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
        expect(sniffImageType(new Uint8Array(0))).toBeNull();
        expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull();
    });
});
