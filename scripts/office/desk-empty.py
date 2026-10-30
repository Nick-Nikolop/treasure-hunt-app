"""Empty desk for the phone pickups: room-desk.webp with the phone, map and envelope removed.

The phone view lifts the photographed object off the desk; without this the original stays behind as a double.
Run: /tmp/pv/bin/python scripts/office/desk-empty.py  (needs pillow + numpy + opencv)
Frames match OBJECTS in components/office/mobile/object-lift.tsx (centre, upright size, turn in degrees).
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter

SRC = "public/office/room-desk.webp"
OUT = "public/office/room-desk-empty.webp"
im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float64)
H, W, _ = im.shape

# (cx, cy, w, h, angle) + where the fill wood is taken from (dx, dy) or None = inpaint
OBJECTS = {
    "phone": ((254.5, 381.5, 90, 155, 27.7), (118, 0), 9),
    # the paper runs a little past the fitted outline at its top-right corner; wood comes from the left (phone already gone)
    "map": ((700, 384, 372, 206, 23.2), (-330, 0), 14),
    "envelope": ((743, 885.1, 147.4, 236.9, -2.7), (-280, 0), 6),
}


def rect_mask(cx, cy, w, h, a, pad):
    m = np.zeros((H, W), np.uint8)
    pts = cv2.boxPoints(((cx, cy), (w + pad * 2, h + pad * 2), a)).astype(np.int32)
    cv2.fillPoly(m, [pts], 255)
    # contact shadow falls down/right of the object
    shadow = np.zeros_like(m)
    shadow[4:, 3:] = m[:-4, :-3]
    out = np.maximum(m, shadow) > 0
    # keep the fill region off the image border (np.roll in the solver wraps around)
    out[:, -2:] = False
    out[:2, :] = False
    return out


def poisson_fill(img, mask, dx, dy):
    src = np.roll(np.roll(img, -dy, 0), -dx, 1)
    ys, xs = np.nonzero(mask)
    by0, by1, bx0, bx1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    region = mask[by0:by1, bx0:bx1]
    tgt = img[by0:by1, bx0:bx1].copy()
    s = src[by0:by1, bx0:bx1].copy()
    diff = np.where(region[..., None], 0.0, tgt - s)
    for _ in range(3000):
        avg = (np.roll(diff, 1, 0) + np.roll(diff, -1, 0) + np.roll(diff, 1, 1) + np.roll(diff, -1, 1)) / 4
        diff = np.where(region[..., None], avg, diff)
    patch = np.where(region[..., None], s + diff, tgt)
    soft = np.asarray(Image.fromarray((region * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.4))).astype(float)[..., None] / 255
    img[by0:by1, bx0:bx1] = tgt * (1 - soft) + patch * soft
    return img


out = im.copy()
for name, (frame, offset, pad) in OBJECTS.items():
    mask = rect_mask(*frame, pad)
    if name == "map":
        # the paper is pale and unsaturated against the wood: take every such pixel near the map, then fill + grow
        sub = out[150:620, 440:]
        lum = sub.mean(2)
        sat = sub.max(2) - sub.min(2)
        paper = ((lum > 118) & (sat < 70)).astype(np.uint8) * 255
        paper = cv2.morphologyEx(paper, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        n, labels, stats, _ = cv2.connectedComponentsWithStats(paper)
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        blob = (labels == biggest).astype(np.uint8)
        hull = cv2.convexHull(cv2.findNonZero(blob))
        filled = np.zeros_like(blob)
        cv2.fillPoly(filled, [hull], 1)
        filled = cv2.dilate(filled, np.ones((17, 17), np.uint8))
        full = np.zeros((H, W), bool)
        full[150:620, 440:] = filled > 0
        full[:, -2:] = False
        mask = full
    if offset is None:
        u8 = np.clip(out, 0, 255).astype(np.uint8)
        filled = cv2.inpaint(u8, mask.astype(np.uint8) * 255, 12, cv2.INPAINT_TELEA).astype(np.float64)
        # Telea leaves a smooth smear: put back a little of the tray's grain noise
        noise = np.random.default_rng(3).normal(0, 3.2, out.shape)
        filled = cv2.GaussianBlur(filled, (0, 0), 2.2) + noise
        out = np.where(mask[..., None], filled, out)
    else:
        out = poisson_fill(out, mask, *offset)
        if name == "map":
            # the right end copied from the map's own left end; a second pass copies from the cleaned wood
            out = poisson_fill(out, mask, *offset)
    print(name, "masked px", int(mask.sum()))

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT, quality=84, method=6)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((W // 2, H // 2)).save("/vercel/share/v0-project/public/office/zz-desk-empty-check.png")
print("wrote", OUT)
