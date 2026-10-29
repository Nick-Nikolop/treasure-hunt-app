"""Second pass of the clean plate: also remove the photographed open map from the desk, so a live folded
map can lie there and be picked up. Run AFTER clean-plate.py (it reads that output's phone-free pixels
from the source again, so both passes are re-runnable in order).

Run: /tmp/pv/bin/python scripts/office/clean-plate.py && /tmp/pv/bin/python scripts/office/clean-plate-map.py
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

CLEAN = "public/office/room-desktop-clean.webp"
im = np.asarray(Image.open(CLEAN).convert("RGB")).astype(np.float64)
H, W, _ = im.shape

# map paper quad in source px (TL, fold-top, TR, BR, BL), grown to take the paper edge + contact shadow
quad = [(547, 627), (770, 623), (838, 627), (889, 714), (504, 714)]
m = Image.new("L", (W, H), 0)
ImageDraw.Draw(m).polygon(quad, fill=255)
m = m.filter(ImageFilter.MaxFilter(7))
mask = np.asarray(m) > 0
ys, xs = np.nonzero(mask)
by0, by1, bx0, bx1 = ys.min() - 3, ys.max() + 4, xs.min() - 3, xs.max() + 4

# Fill rows with the wood under the map, reflected back and forth (the grain is horizontal, so a vertical
# mirror keeps it continuous), then Poisson-correct so the lamp's light gradient carries across.
SRC_TOP = by1 + 1
SRC_H = H - SRC_TOP - 2
src = im.copy()
for y in range(by0, by1):
    k = (by1 - y) % (2 * SRC_H)
    sy = SRC_TOP + (k if k < SRC_H else 2 * SRC_H - k - 1)
    src[y] = im[sy]

region = mask[by0:by1, bx0:bx1]
tgt = im[by0:by1, bx0:bx1].copy()
s = src[by0:by1, bx0:bx1].copy()
diff = np.where(region[..., None], 0.0, tgt - s)
for _ in range(6000):
    avg = (np.roll(diff, 1, 0) + np.roll(diff, -1, 0) + np.roll(diff, 1, 1) + np.roll(diff, -1, 1)) / 4
    diff = np.where(region[..., None], avg, diff)
patch = np.where(region[..., None], s + diff, tgt)
soft = np.asarray(Image.fromarray((region * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)[..., None] / 255
out = im.copy()
out[by0:by1, bx0:bx1] = tgt * (1 - soft) + patch * soft
out = np.clip(out, 0, 255).astype(np.uint8)
print("map mask bbox", bx0, by0, bx1, by1)

clean = Image.fromarray(out)
clean.save(CLEAN, quality=84, method=6)
big = clean.resize((W * 3 // 2, H * 3 // 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
big.save("public/office/room-desktop-clean-2064.webp", quality=80, method=6)
clean.crop((440, 580, 940, 768)).resize((1000, 376), Image.LANCZOS).save(".tmp-map-crop.png")
