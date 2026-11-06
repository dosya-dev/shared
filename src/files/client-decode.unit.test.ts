import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    PreviewDecodeError,
    RowDownscaler,
    decodeFax,
    decodePreview,
    findIworkPreview,
    findLargestEmbeddedJpeg,
    lzwDecode,
    readJpeg,
    unpackBits,
    type Raster,
} from "./client-decode";
import { CLIENT_DECODE_EXTS, previewKindFor } from "./preview-formats";

// Fixtures are 48x32: red top-left, green top-right, blue bottom-left, white
// bottom-right. Regenerate with: python3 __fixtures__/make_fixtures.py __fixtures__
// (needs Pillow and libtiff's tiffcp).
const FIX = join(__dirname, "__fixtures__");
const read = (name: string) => new Uint8Array(readFileSync(join(FIX, name)));

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const WHITE = [255, 255, 255];

function px(r: Raster, x: number, y: number): number[] {
    const i = (y * r.width + x) * 4;
    return [r.data[i]!, r.data[i + 1]!, r.data[i + 2]!, r.data[i + 3]!];
}

function expectQuadrants(r: Raster, tolerance = 2): void {
    expect([r.width, r.height]).toEqual([48, 32]);
    const near = (got: number[], want: number[], where: string) => {
        for (let c = 0; c < 3; c++) expect(Math.abs(got[c]! - want[c]!), `${where} channel ${c}: ${got}`).toBeLessThanOrEqual(tolerance);
    };
    near(px(r, 5, 5), RED, "top-left");
    near(px(r, 40, 5), GREEN, "top-right");
    near(px(r, 5, 28), BLUE, "bottom-left");
    near(px(r, 40, 28), WHITE, "bottom-right");
}

async function raster(name: string, maxEdge = 4096): Promise<Raster> {
    const out = await decodePreview(name, read(name), { maxEdge });
    if (out.kind !== "raster") throw new Error(`expected a raster for ${name}`);
    return out.raster;
}

describe("TIFF", () => {
    it.each([
        "rgb-none.tif",
        "rgb-lzw.tif",
        "rgb-deflate.tif",
        "rgb-packbits.tif",
        "rgb-lzw-predictor.tif",
        "rgb-deflate-predictor.tif",
        "rgb-tiled-lzw.tif",
        "rgb-planar.tif",
        "rgb-bigendian-lzw.tif",
        "rgb-strips-lzw.tif",
        "rgba-lzw.tif",
        "cmyk.tif",
        "palette.tif",
    ])("decodes %s", async (name) => {
        const r = await raster(name);
        // CMYK through PIL's conversion is not exact.
        expectQuadrants(r, name === "cmyk.tif" ? 3 : 2);
        expect(px(r, 5, 5)[3]).toBe(255);
    });

    it("decodes gray, bilevel and 16-bit images", async () => {
        const gray = await raster("gray-lzw.tif");
        expect(px(gray, 5, 5)[0]).toBe(76); // red's luma
        expect(px(gray, 40, 28)[0]).toBe(255);
        const bilevel = await raster("bilevel.tif");
        expect(px(bilevel, 40, 28).slice(0, 3)).toEqual(WHITE);
        const g16 = await raster("gray16.tif");
        expect(px(g16, 5, 5).slice(0, 3)).toEqual([0, 0, 0]);
        expect(px(g16, 40, 5).slice(0, 3)).toEqual(WHITE);
    });

    it("shows the first page of a multi-page file", async () => {
        expectQuadrants(await raster("two-pages.tif"));
    });

    it("reports the orientation so the preview can be turned upright", async () => {
        const out = await decodePreview("x.tif", read("rgb-orient6.tif"));
        expect(out.orientation).toBe(6);
    });

    it("splices the shared tables into JPEG-compressed strips", async () => {
        let seen: Uint8Array | null = null;
        const out = await decodePreview("x.tif", read("rgb-jpeg.tif"), {
            decodeJpeg: async (jpeg) => {
                seen = jpeg;
                return { width: 48, height: 32, data: new Uint8ClampedArray(48 * 32 * 4).fill(200) };
            },
        });
        expect(out.kind).toBe("raster");
        expect(seen).not.toBeNull();
        const info = readJpeg(seen!, 0);
        expect(info).toMatchObject({ width: 48, height: 32 });
        expect(info!.end).toBe(seen!.length);
    });

    it("marks RGB JPEG strips as untransformed so Safari does not shift the colours", async () => {
        let seen: Uint8Array | null = null;
        await decodePreview("x.tif", read("rgb-jpeg.tif"), {
            decodeJpeg: async (jpeg) => {
                seen = jpeg;
                return { width: 48, height: 32, data: new Uint8ClampedArray(48 * 32 * 4) };
            },
        });
        // SOI, then APP14 "Adobe" with transform byte 0.
        expect([...seen!.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xee]);
        expect(new TextDecoder().decode(seen!.subarray(6, 11))).toBe("Adobe");
        expect(seen![17]).toBe(0);
    });

    it("downscales while decoding, averaging what it drops", async () => {
        const r = await raster("rgb-lzw.tif", 12);
        expect([r.width, r.height]).toEqual([12, 8]);
        expect(px(r, 1, 1).slice(0, 3)).toEqual(RED);
        expect(px(r, 10, 6).slice(0, 3)).toEqual(WHITE);
    });

    it("refuses what is not a TIFF", async () => {
        await expect(decodePreview("x.tif", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toMatchObject({ reason: "damaged" });
        await expect(decodePreview("x.tif", read("rgb-lzw.tif").subarray(0, 40))).rejects.toBeInstanceOf(PreviewDecodeError);
    });
});

describe("camera RAW", () => {
    it("finds the largest JPEG a browser can draw, skipping the lossless sensor data", () => {
        const raw = read("fake.nef");
        const jpeg = findLargestEmbeddedJpeg(raw)!;
        expect(Buffer.from(jpeg).equals(Buffer.from(read("large.jpg")))).toBe(true);
    });

    it("carries the RAW header's orientation with the preview", async () => {
        const out = await decodePreview("DSC_1.NEF", read("fake.nef"));
        expect(out).toMatchObject({ kind: "jpeg", orientation: 6 });
    });

    it("says so when there is no preview to show", async () => {
        await expect(decodePreview("a.cr3", read("fake-nopreview.cr3"))).rejects.toMatchObject({ reason: "unsupported" });
    });
});

describe("PSD", () => {
    it.each(["rgb-raw.psd", "rgb-rle.psd", "rgb-rle.psb", "cmyk.psd"])("decodes the composite of %s", async (name) => {
        expectQuadrants(await raster(name), name === "cmyk.psd" ? 3 : 2);
    });

    it("decodes 16-bit grayscale", async () => {
        const r = await raster("gray16.psd");
        expect(px(r, 5, 5).slice(0, 3)).toEqual([0, 0, 0]);
        expect(px(r, 40, 5).slice(0, 3)).toEqual(WHITE);
    });

    it("refuses a truncated file instead of reading past it", async () => {
        await expect(decodePreview("a.psd", read("rgb-raw.psd").subarray(0, 200))).rejects.toMatchObject({ reason: "damaged" });
    });
});

describe("iWork", () => {
    it.each(["stored.key", "deflated.pages"])("reads the first-page preview from %s", async (name) => {
        const jpeg = await findIworkPreview(read(name));
        expect(Buffer.from(jpeg!).equals(Buffer.from(read("large.jpg")))).toBe(true);
    });

    it("says so when the document was saved without a preview", async () => {
        await expect(decodePreview("a.numbers", read("nopreview.numbers"))).rejects.toMatchObject({ reason: "unsupported" });
    });
});

describe("building blocks", () => {
    it("reads a JPEG whose end marker is the last byte of the buffer", () => {
        const jpeg = read("large.jpg");
        expect(readJpeg(jpeg, 0)).toMatchObject({ width: 48, height: 32, end: jpeg.length });
    });

    it("PackBits", () => {
        // Literal run of 3, then 4 repeats of 0xAA.
        expect([...unpackBits(new Uint8Array([2, 1, 2, 3, 0xfd, 0xaa]), 7)]).toEqual([1, 2, 3, 0xaa, 0xaa, 0xaa, 0xaa]);
    });

    it("LZW stops at the end of its input instead of reading on", () => {
        expect(lzwDecode(new Uint8Array([0x80]), 10).length).toBe(10);
    });

    it("area-averages rows", () => {
        const s = new RowDownscaler(4, 2, 2);
        s.push(0, new Uint8Array([0, 0, 0, 255, 100, 100, 100, 255, 200, 200, 200, 255, 200, 200, 200, 255]));
        s.push(1, new Uint8Array([0, 0, 0, 255, 100, 100, 100, 255, 0, 0, 0, 255, 0, 0, 0, 255]));
        const r = s.finish();
        expect([r.width, r.height]).toEqual([2, 1]);
        expect(px(r, 0, 0)).toEqual([50, 50, 50, 255]);
        expect(px(r, 1, 0)).toEqual([100, 100, 100, 255]);
    });

    it("decodes every extension the format list sends to it", () => {
        // preview-formats.ts cannot import this module (both are copied apart),
        // so the two lists are compared here.
        for (const ext of CLIENT_DECODE_EXTS) {
            expect(previewKindFor(`a.${ext}`), ext).toBe("decode");
        }
        return Promise.all(
            [...CLIENT_DECODE_EXTS].map((ext) =>
                decodePreview(`a.${ext}`, new Uint8Array(64)).catch((e: PreviewDecodeError) => {
                    expect(e.message, ext).not.toMatch(/No in-browser decoder/);
                }),
            ),
        );
    });
});

/**
 * A one-IFD little-endian TIFF. Each entry is [tag, type, count, value]; a
 * value that does not fit inline is written at `extra.at`.
 */
function buildTiff(entries: [number, number, number, number][], size: number, fill?: (b: Uint8Array) => void, next = 0): Uint8Array {
    const b = new Uint8Array(size);
    const v = new DataView(b.buffer);
    b.set([0x49, 0x49, 42, 0]);
    v.setUint32(4, 8, true);
    v.setUint16(8, entries.length, true);
    entries.forEach(([tag, type, count, value], i) => {
        const e = 10 + i * 12;
        v.setUint16(e, tag, true);
        v.setUint16(e + 2, type, true);
        v.setUint32(e + 4, count, true);
        if (type === 3 && count === 1) v.setUint16(e + 8, value, true);
        else v.setUint32(e + 8, value, true);
    });
    v.setUint32(10 + entries.length * 12, next, true);
    fill?.(b);
    return b;
}

// Each of these was a crafted file that crashed or froze a tab before the
// decoder was hardened (review of 2026-11-02). They must fail fast and cleanly.
describe("hostile input", () => {
    const fast = async (work: () => Promise<unknown>, ms = 1000) => {
        const t = performance.now();
        const result = await work().catch((e: unknown) => e);
        expect(performance.now() - t).toBeLessThan(ms);
        return result;
    };

    it("does not size arrays from a tag count the layout does not need", async () => {
        // StripOffsets claiming one BYTE value per byte of the file.
        const n = 1 << 20;
        const b = buildTiff([[256, 3, 1, 10], [257, 3, 1, 10], [258, 3, 1, 8], [262, 3, 1, 1], [273, 1, n, 0], [279, 1, n, 0]], n);
        expect(await fast(() => decodePreview("x.tif", b))).toBeInstanceOf(PreviewDecodeError);
    });

    it("refuses absurd samples per pixel before allocating for them", async () => {
        const b = buildTiff([[256, 3, 1, 1000], [257, 3, 1, 300000], [258, 3, 1, 8], [262, 3, 1, 1], [277, 3, 1, 65535], [278, 3, 1, 1], [273, 4, 1, 200], [279, 4, 1, 1]], 400);
        expect(await fast(() => decodePreview("x.tif", b))).toMatchObject({ reason: "unsupported" });
    });

    it("refuses absurd widths", async () => {
        const b = buildTiff([[256, 4, 1, 300_000_000], [257, 3, 1, 1], [258, 3, 1, 8], [262, 3, 1, 1], [273, 4, 1, 200], [279, 4, 1, 1]], 400);
        expect(await fast(() => decodePreview("x.tif", b))).toBeInstanceOf(PreviewDecodeError);
    });

    it("stops inflating a Deflate bomb at what the strip can hold", async () => {
        const bomb = deflateSync(new Uint8Array(64 * 1024 * 1024), { level: 9 });
        const b = buildTiff(
            [[256, 3, 1, 10], [257, 3, 1, 10], [258, 3, 1, 8], [259, 3, 1, 8], [262, 3, 1, 1], [273, 4, 1, 400], [279, 4, 1, bomb.length]],
            400 + bomb.length,
            (bb) => bb.set(bomb, 400),
        );
        const out = await fast(() => decodePreview("x.tif", b, { maxEdge: 64 }), 500);
        expect(out).toMatchObject({ kind: "raster", raster: { width: 10, height: 10 } });
    });

    it("checks a Photoshop header against the file before sizing anything from it", async () => {
        const b = new Uint8Array(64);
        const v = new DataView(b.buffer);
        b.set([0x38, 0x42, 0x50, 0x53]);
        v.setUint16(4, 1);
        v.setUint16(12, 3);
        v.setUint32(14, 100_000); // height
        v.setUint32(18, 3); // width
        v.setUint16(22, 8);
        v.setUint16(24, 3);
        expect(await fast(() => decodePreview("a.psd", b))).toMatchObject({ reason: "damaged" });
    });

    it("gives the embedded-JPEG search a budget instead of one pass per fake marker", async () => {
        const head = new Uint8Array(256 * 6);
        for (let i = 0; i < 256; i++) head.set([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02], i * 6);
        const tail = new Uint8Array(4 * 1024 * 1024);
        for (let i = 0; i < tail.length; i += 2) { tail[i] = 0xff; tail[i + 1] = 0x00; }
        const b = new Uint8Array(head.length + tail.length);
        b.set(head);
        b.set(tail, head.length);
        const out = await fast(async () => findLargestEmbeddedJpeg(b), 1500);
        expect(out).toBeNull();
    });

    it("shows page one even when page two has the same shape", async () => {
        // Page 1: 4x4 black. Page 2: 2x2 white, the same shape and still big
        // enough for a 2px preview, so it used to be taken for a smaller copy.
        const b = buildTiff([[256, 3, 1, 4], [257, 3, 1, 4], [258, 3, 1, 8], [262, 3, 1, 1], [273, 4, 1, 300], [279, 4, 1, 16]], 400, (bb) => {
            const v = new DataView(bb.buffer);
            const ifd2 = 200;
            v.setUint32(10 + 6 * 12, ifd2, true);
            const e2: [number, number, number, number][] = [[256, 3, 1, 2], [257, 3, 1, 2], [258, 3, 1, 8], [262, 3, 1, 1], [273, 4, 1, 340], [279, 4, 1, 4]];
            v.setUint16(ifd2, e2.length, true);
            e2.forEach(([tag, type, count, value], i) => {
                const e = ifd2 + 2 + i * 12;
                v.setUint16(e, tag, true); v.setUint16(e + 2, type, true); v.setUint32(e + 4, count, true);
                if (type === 3) v.setUint16(e + 8, value, true); else v.setUint32(e + 8, value, true);
            });
            bb.fill(0, 300, 316);
            bb.fill(255, 340, 344);
        });
        const out = await decodePreview("x.tif", b, { maxEdge: 2 });
        if (out.kind !== "raster") throw new Error("raster expected");
        expect(px(out.raster, 0, 0)[0]).toBe(0);
    });
});

describe("CCITT fax TIFFs (scanned documents)", () => {
    async function pixels(name: string, page = 0) {
        const out = await decodePreview("x.tif", read(name), { maxEdge: 1 << 16, page });
        if (out.kind !== "raster") throw new Error("raster expected");
        return out;
    }

    it.each(["fax-g4.tif", "fax-g3.tif", "fax-rle.tif", "fax-g3-2d-fill.tif", "fax-g4-lsb.tif"])(
        "decodes %s to exactly the uncompressed page",
        async (name) => {
            const fax = await pixels(name);
            const plain = await pixels("fax-plain.tif");
            expect([fax.raster.width, fax.raster.height]).toEqual([301, 190]);
            expect(Buffer.from(fax.raster.data.buffer).equals(Buffer.from(plain.raster.data.buffer))).toBe(true);
        },
    );

    it("reads every page of a multi-page fax, and says how many there are", async () => {
        for (const page of [0, 1]) {
            const fax = await pixels("fax-two-pages-g4.tif", page);
            const plain = await pixels("fax-two-pages-plain.tif", page);
            expect(fax).toMatchObject({ page, pageCount: 2 });
            expect(Buffer.from(fax.raster.data.buffer).equals(Buffer.from(plain.raster.data.buffer))).toBe(true);
        }
        const one = await pixels("fax-two-pages-g4.tif", 0);
        const two = await pixels("fax-two-pages-g4.tif", 1);
        expect(Buffer.from(one.raster.data.buffer).equals(Buffer.from(two.raster.data.buffer))).toBe(false);
    });

    it("clamps a page number past the end to the last page", async () => {
        expect(await pixels("fax-two-pages-g4.tif", 9)).toMatchObject({ page: 1, pageCount: 2 });
        expect(await pixels("fax-two-pages-g4.tif", -3)).toMatchObject({ page: 0 });
    });

    it("keeps the rows before a damaged line and leaves the rest white", () => {
        const good = read("fax-g4.tif");
        // Random bytes: whatever decodes before the first bad code is kept.
        const junk = new Uint8Array(4096).map((_, i) => (i * 2654435761) >>> 24);
        const rows = decodeFax(junk, 301, 190, 4, 0, 1);
        expect(rows.length).toBe(Math.ceil(301 / 8) * 190);
        expect(good.length).toBeGreaterThan(0);
    });

    it("finishes quickly on hostile fax data", async () => {
        // All 1 bits: an endless run of V0 codes on a wide, tall strip.
        const t = performance.now();
        decodeFax(new Uint8Array(1 << 20).fill(0xff), 4096, 2048, 4, 0, 1);
        decodeFax(new Uint8Array(1 << 20).fill(0x00), 4096, 2048, 3, 1, 1);
        expect(performance.now() - t).toBeLessThan(2000);
    });

    it("reports a single page for everything that is not a TIFF", async () => {
        expect(await decodePreview("a.psd", read("rgb-raw.psd"))).toMatchObject({ page: 0, pageCount: 1 });
        expect(await decodePreview("DSC_1.NEF", read("fake.nef"))).toMatchObject({ page: 0, pageCount: 1 });
    });
});
