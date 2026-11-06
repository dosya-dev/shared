"""Generate the client-decode test fixtures. Usage: python3 make_fixtures.py <outdir>"""
import io, os, struct, subprocess, sys, zipfile
from PIL import Image, TiffImagePlugin

out = sys.argv[1]
W, H = 48, 32
# Quadrants: red | green / blue | white
def quad(mode="RGB"):
    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = (255, 0, 0) if x < W // 2 and y < H // 2 else (0, 255, 0) if y < H // 2 else (0, 0, 255) if x < W // 2 else (255, 255, 255)
    return im if mode == "RGB" else im.convert(mode)

def save(im, name, **kw):
    im.save(os.path.join(out, name), **kw)

save(quad(), "rgb-none.tif", compression="raw")
save(quad(), "rgb-lzw.tif", compression="tiff_lzw")
save(quad(), "rgb-deflate.tif", compression="tiff_adobe_deflate")
save(quad(), "rgb-packbits.tif", compression="packbits")
save(quad("RGBA"), "rgba-lzw.tif", compression="tiff_lzw")
save(quad("L"), "gray-lzw.tif", compression="tiff_lzw")
save(quad("1"), "bilevel.tif", compression="raw")
save(quad().quantize(4), "palette.tif", compression="raw")
save(quad("CMYK"), "cmyk.tif", compression="raw")
save(quad(), "rgb-jpeg.tif", compression="jpeg")
# 16-bit gray: 0..65535 ramp across x
im16 = Image.new("I;16", (W, H))
px = im16.load()
for y in range(H):
    for x in range(W):
        px[x, y] = 65535 if x >= W // 2 else 0
save(im16, "gray16.tif", compression="raw")
# Orientation 6 (rotate 90 CW to display)
info = TiffImagePlugin.ImageFileDirectory_v2(); info[274] = 6
save(quad(), "rgb-orient6.tif", compression="raw", tiffinfo=info)
# Two pages: the first must be shown
pg2 = Image.new("RGB", (W, H), (10, 20, 30))
quad().save(os.path.join(out, "two-pages.tif"), save_all=True, append_images=[pg2], compression="raw")

base = os.path.join(out, "rgb-none.tif")
def tiffcp(args, name):
    subprocess.run(["tiffcp", *args, base, os.path.join(out, name)], check=True)
tiffcp(["-c", "lzw:2"], "rgb-lzw-predictor.tif")
tiffcp(["-c", "zip:2"], "rgb-deflate-predictor.tif")
tiffcp(["-t", "-w", "16", "-l", "16", "-c", "lzw"], "rgb-tiled-lzw.tif")
tiffcp(["-p", "separate", "-c", "packbits"], "rgb-planar.tif")
tiffcp(["-B", "-c", "lzw"], "rgb-bigendian-lzw.tif")
tiffcp(["-r", "5", "-c", "lzw"], "rgb-strips-lzw.tif")

# ── Fake RAW: TIFF header, then a small JPEG, a large JPEG, and a bigger lossless JPEG
def jpeg_bytes(im):
    b = io.BytesIO(); im.save(b, "JPEG", quality=95); return b.getvalue()
small = jpeg_bytes(Image.new("RGB", (16, 10), (0, 0, 255)))
large = jpeg_bytes(quad())
def lossless(w, h):
    sof3 = b"\xff\xc3" + struct.pack(">HBHHB", 11, 8, h, w, 1) + b"\x01\x11\x00"
    sos = b"\xff\xda" + struct.pack(">HB", 8, 1) + b"\x01\x00\x01\x00\x00"
    return b"\xff\xd8" + sof3 + sos + bytes([0x12, 0x34, 0xff, 0x00, 0x56] * 40) + b"\xff\xd9"
hdr = b"II*\x00" + struct.pack("<I", 8) + struct.pack("<H", 1) + struct.pack("<HHII", 274, 3, 1, 6) + struct.pack("<I", 0)
noise = bytes([0xff, 0xd8, 0xff, 0x00, 0x11]) * 3  # a false start
raw = hdr + noise + small + b"\x00" * 7 + large + b"\x00" * 5 + lossless(4000, 3000) + b"\x00" * 9
open(os.path.join(out, "fake.nef"), "wb").write(raw)
open(os.path.join(out, "large.jpg"), "wb").write(large)
open(os.path.join(out, "fake-nopreview.cr3"), "wb").write(b"\x00\x00\x00\x18ftypcrx " + b"\x00" * 64 + lossless(100, 100))

# ── PSD writer
def packbits(row):
    outb = bytearray(); i = 0
    while i < len(row):
        run = 1
        while i + run < len(row) and run < 128 and row[i + run] == row[i]: run += 1
        if run > 1:
            outb += bytes([(257 - run) & 0xff, row[i]]); i += run
        else:
            j = i
            while j < len(row) and j - i < 128 and (j + 1 >= len(row) or row[j + 1] != row[j]): j += 1
            j = max(j, i + 1)
            outb += bytes([j - i - 1]) + bytes(row[i:j]); i = j
    return bytes(outb)
def psd(planes, mode, depth, rle, version=1, palette=b""):
    ch = len(planes); h = len(planes[0]); w = len(planes[0][0]) // (depth // 8) if depth != 1 else W
    b = b"8BPS" + struct.pack(">H", version) + b"\x00" * 6 + struct.pack(">HIIHH", ch, h, w, depth, mode)
    b += struct.pack(">I", len(palette)) + palette
    b += struct.pack(">I", 0)
    b += struct.pack(">Q" if version == 2 else ">I", 0)
    if not rle:
        b += struct.pack(">H", 0) + b"".join(r for p in planes for r in p)
    else:
        packed = [[packbits(r) for r in p] for p in planes]
        b += struct.pack(">H", 1) + b"".join(struct.pack(">I" if version == 2 else ">H", len(r)) for p in packed for r in p) + b"".join(r for p in packed for r in p)
    return b
q = quad()
def plane(im, c): return [bytes(im.getpixel((x, y))[c] for x in range(W)) for y in range(H)]
rgb = [plane(q, c) for c in range(3)]
open(os.path.join(out, "rgb-raw.psd"), "wb").write(psd(rgb, 3, 8, False))
open(os.path.join(out, "rgb-rle.psd"), "wb").write(psd(rgb + [[b"\xff" * W] * H], 3, 8, True))
open(os.path.join(out, "rgb-rle.psb"), "wb").write(psd(rgb, 3, 8, True, version=2))
cm = q.convert("CMYK")
cmyk = [[bytes(255 - cm.getpixel((x, y))[c] for x in range(W)) for y in range(H)] for c in range(4)]
open(os.path.join(out, "cmyk.psd"), "wb").write(psd(cmyk, 4, 8, False))
g16 = [[b"".join(struct.pack(">H", 65535 if x >= W // 2 else 0) for x in range(W)) for y in range(H)]]
open(os.path.join(out, "gray16.psd"), "wb").write(psd(g16, 1, 16, True))

# ── iWork: zip with preview.jpg, stored and deflated
for name, method in (("stored.key", zipfile.ZIP_STORED), ("deflated.pages", zipfile.ZIP_DEFLATED)):
    with zipfile.ZipFile(os.path.join(out, name), "w") as z:
        z.writestr("Index/Document.iwa", b"\x00" * 50, compress_type=method)
        z.writestr("preview-micro.jpg", small, compress_type=method)
        z.writestr("preview.jpg", large, compress_type=method)
with zipfile.ZipFile(os.path.join(out, "nopreview.numbers"), "w") as z:
    z.writestr("Index/Document.iwa", b"\x00" * 50)
print("fixtures written")

# ── CCITT fax: a small text page in every fax flavour, each with an
# uncompressed twin the test compares against pixel for pixel.
from PIL import ImageDraw
def fax_page(w, h, seed):
    import random
    random.seed(seed)
    im = Image.new("1", (w, h), 1)
    d = ImageDraw.Draw(im)
    for i in range(8):
        d.text((6, 4 + i * 22), "Page %d line %d: 0123456789 ABCDEFG" % (seed, i), fill=0)
    for i in range(12):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        d.rectangle([x, y, x + random.randint(1, 90), y + random.randint(1, 12)], fill=random.choice([0, 1]))
    d.rectangle([0, h - 8, w - 1, h - 1], fill=0)
    return im
fp1, fp2 = fax_page(301, 190, 1), fax_page(301, 190, 2)
fp1.save(os.path.join(out, "fax-plain.tif"), compression="raw")
fp1.save(os.path.join(out, "fax-g4.tif"), compression="group4")
fp1.save(os.path.join(out, "fax-g3.tif"), compression="group3")
fp1.save(os.path.join(out, "fax-rle.tif"), compression="tiff_ccitt")
fp1.save(os.path.join(out, "fax-two-pages-plain.tif"), compression="raw", save_all=True, append_images=[fp2])
fp1.save(os.path.join(out, "fax-two-pages-g4.tif"), compression="group4", save_all=True, append_images=[fp2])
fplain = os.path.join(out, "fax-plain.tif")
subprocess.run(["tiffcp", "-c", "g3:2d:fill", "-r", "7", fplain, os.path.join(out, "fax-g3-2d-fill.tif")], check=True)
subprocess.run(["tiffcp", "-c", "g4", "-f", "lsb2msb", fplain, os.path.join(out, "fax-g4-lsb.tif")], check=True)
print("fax fixtures written")
