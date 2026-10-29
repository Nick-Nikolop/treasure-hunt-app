"""Remove the photographed phone from the desktop room so a live CSS phone can be picked up from the desk.

Run: /tmp/pv/bin/python scripts/office/clean-plate.py  (needs pillow + numpy)
Source: public/office/room-desktop-src.webp (original render, kept for re-runs).
"""
from PIL import Image, ImageFilter
import numpy as np

SRC = "public/office/room-desktop-src.webp"
im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float64)
H, W, _ = im.shape

# 1. phone silhouette = very dark pixels in the phone's neighbourhood, filled + dilated to catch rim light and contact shadow
x0, y0, x1, y1 = 360, 625, 512, 698
lum = im[..., :3].mean(2)
mask = np.zeros((H, W), bool)
mask[y0:y1, x0:x1] = lum[y0:y1, x0:x1] < 46
# fill rows between first and last dark pixel (glass reflections are lighter than the threshold)
for y in range(y0, y1):
    xs = np.nonzero(mask[y, x0:x1])[0]
    if len(xs) > 1:
        mask[y, x0 + xs[0] : x0 + xs[-1] + 1] = True
def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
mask = dilate(mask, 7)
# the contact shadow falls down/right of the near edge: extend a little more that way
mask |= np.roll(np.roll(dilate(mask, 2), 4, 0), 3, 1) & (np.arange(H)[:, None] > 640)

# 2. source = wood just below the phone (same horizontal grain), Poisson-blended so lighting stays continuous
OFF_Y = 54
src = np.roll(im, -OFF_Y, 0)
ys, xs = np.nonzero(mask)
by0, by1, bx0, bx1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
region_mask = mask[by0:by1, bx0:bx1]
tgt = im[by0:by1, bx0:bx1].copy()
s = src[by0:by1, bx0:bx1].copy()
diff = np.where(region_mask[..., None], 0.0, tgt - s)
for _ in range(4000):  # Jacobi: harmonic correction inside the mask, fixed outside
    avg = (np.roll(diff, 1, 0) + np.roll(diff, -1, 0) + np.roll(diff, 1, 1) + np.roll(diff, -1, 1)) / 4
    diff = np.where(region_mask[..., None], avg, diff)
out = im.copy()
patch = np.where(region_mask[..., None], s + diff, tgt)
# feather the seam by 2px
soft = np.asarray(Image.fromarray((region_mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)[..., None] / 255
out[by0:by1, bx0:bx1] = tgt * (1 - soft) + patch * soft
out = np.clip(out, 0, 255).astype(np.uint8)
print("mask bbox", bx0, by0, bx1, by1, "px", int(mask.sum()))

clean = Image.fromarray(out)
clean.save("public/office/room-desktop-clean.webp", quality=84, method=6)
# 3. 1.5x master for large monitors: Lanczos + gentle unsharp (a true hi-res render is still to do)
big = clean.resize((W * 3 // 2, H * 3 // 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
big.save("public/office/room-desktop-clean-2064.webp", quality=80, method=6)
clean.crop((300, 590, 580, 740)).resize((840, 450), Image.LANCZOS).save("/tmp/clean-crop.png")
