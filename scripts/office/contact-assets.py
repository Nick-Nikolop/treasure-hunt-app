"""
Assets for the letter tray pickup (components/office/contact/*), cut from the desktop clean plate.

  /tmp/pv/bin/python scripts/office/contact-assets.py [--debug]

Writes to public/office/contact/:
  envelope-photo.webp  the photographed envelope, rectified to a flat ENV_ASPECT rectangle; the strip hidden
                       behind the tray's front wall is filled by smearing the paper down, so nothing of the
                       wall travels with it when it is lifted
  tray-empty.webp      the tray with the envelope painted out (shown under the envelope once it moves)
  tray-walls.webp      the left and front walls of the tray with alpha, drawn over the envelope while it is
                       still inside the tray
and components/office/contact/geometry.json (photo px boxes + the seal's position on the envelope).
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PLATE = ROOT / "public/office/room-desktop-clean-2064.webp"
OUT = ROOT / "public/office/contact"
GEO = ROOT / "components/office/contact/geometry.json"
DEBUG = "--debug" in sys.argv

PHOTO_W = 1376
ENV_ASPECT = 1.42
TEX_W = 1136
TEX_H = round(TEX_W / ENV_ASPECT)

# Envelope corners on the plate, photo px: TL, TR, BR, BL (bottom pair extrapolated behind the front wall).
SEEN = [(946.7, 630.0), (1075.0, 629.3), (1177.0, 696.7), (999.0, 696.7)]
SEAL = (1043.3, 655.0)


def zoomed(points):
    """Polygons were traced on a 3× zoom of the photo window that starts at (840, 540)."""
    return [(840 + x / 3, 540 + y / 3) for x, y in points]


LEFT_WALL = zoomed([(214, 188), (266, 194), (436, 418), (436, 548), (214, 230)])
FRONT_WALL = zoomed(
    [
        (428, 417), (582, 417), (596, 428), (612, 452), (630, 474), (648, 486), (668, 491),
        (850, 491), (872, 486), (892, 470), (908, 446), (922, 428), (940, 417), (1102, 415),
        (1102, 584), (428, 584),
    ]
)

plate = Image.open(PLATE).convert("RGB")
S = plate.width / PHOTO_W  # plate px per photo px
arr = np.asarray(plate).copy()


def to_plate(points):
    return [(x * S, y * S) for x, y in points]


def poly_mask(size, polys, offset=(0, 0)):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([(x - offset[0], y - offset[1]) for x, y in p], fill=255)
    return np.asarray(m)


walls_full = poly_mask(plate.size, [to_plate(LEFT_WALL), to_plate(FRONT_WALL)])

# ---------- envelope texture ----------
src = np.float32(to_plate(SEEN))
dst = np.float32([(0, 0), (TEX_W, 0), (TEX_W, TEX_H), (0, TEX_H)])
H = cv2.getPerspectiveTransform(src, dst)
tex = cv2.warpPerspective(arr, H, (TEX_W, TEX_H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
hidden = cv2.warpPerspective(walls_full, H, (TEX_W, TEX_H), flags=cv2.INTER_NEAREST)
hidden = cv2.dilate(hidden, np.ones((9, 9), np.uint8))
rng = np.random.default_rng(7)
# The extrapolated bottom corners sit a little outside the real paper, so besides the wall strip anything that
# is not paper near the bottom/side edges (floor, wall faces) is repainted too. The flap creases and the seal
# are dark as well, so only the edge bands are tested by colour.
lum = tex.astype(np.float32) @ np.float32([0.299, 0.587, 0.114])
warm = (tex[..., 0].astype(int) - tex[..., 2].astype(int)) > 40
paper = (lum > 120) & warm
yy, xx = np.mgrid[0:TEX_H, 0:TEX_W]
edge_band = (yy > 0.6 * TEX_H) | ((xx > 0.9 * TEX_W) & (yy > 0.1 * TEX_H)) | (xx < 0.035 * TEX_W) | (yy < 0.02 * TEX_H)
repaint = ((hidden > 0) | (edge_band & ~paper)).astype(np.uint8) * 255
repaint = cv2.dilate(repaint, np.ones((7, 7), np.uint8))
fill = cv2.inpaint(cv2.cvtColor(tex, cv2.COLOR_RGB2BGR), repaint, 25, cv2.INPAINT_TELEA)
fill = cv2.cvtColor(fill, cv2.COLOR_BGR2RGB).astype(np.float32)
fill = cv2.GaussianBlur(fill, (0, 0), 6) + rng.normal(0, 1.6, fill.shape)
soft = (cv2.GaussianBlur(repaint.astype(np.float32), (0, 0), 2) / 255)[..., None]
tex = np.clip(tex * (1 - soft) + fill * soft, 0, 255)
OUT.mkdir(parents=True, exist_ok=True)
Image.fromarray(tex.astype(np.uint8)).save(OUT / "envelope-photo.webp", quality=90)

seal_uv = cv2.perspectiveTransform(np.float32([[[SEAL[0] * S, SEAL[1] * S]]]), H)[0][0]
seal = [round(float(seal_uv[0]) / TEX_W, 4), round(float(seal_uv[1]) / TEX_H, 4)]

# ---------- tray with the envelope painted out ----------
env_mask = poly_mask(plate.size, [to_plate(SEEN)])
env_mask = cv2.dilate(env_mask, np.ones((11, 11), np.uint8))
env_mask[walls_full > 0] = 0
ys, xs = np.where(env_mask > 0)
pad = 24
bx0, by0, bx1, by1 = xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad
crop = arr[by0:by1, bx0:bx1].copy()
cmask = env_mask[by0:by1, bx0:bx1]
bgr = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
filled = cv2.cvtColor(cv2.inpaint(bgr, cmask, 9, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB).astype(np.float32)
# the tray floor is dark wood: pull the fill towards it and add faint grain along the tray's long axis
floor = np.array([46, 30, 20], np.float32)
grain = cv2.GaussianBlur(rng.normal(0, 1, crop.shape[:2]).astype(np.float32), (0, 0), sigmaX=14, sigmaY=1.2)
grain = (grain / (np.abs(grain).max() + 1e-6))[..., None] * 9
inside = (cv2.GaussianBlur(cmask.astype(np.float32), (0, 0), 3) / 255)[..., None]
filled = filled * 0.45 + floor * 0.55 + grain
out = crop * (1 - inside) + filled * inside
# soft alpha so the patch melts into the plate at its border
alpha = cv2.GaussianBlur(cv2.dilate(cmask, np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 4)
rgba = np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(OUT / "tray-empty.webp", quality=92)
empty_box = [round(v / S, 3) for v in (bx0, by0, bx1 - bx0, by1 - by0)]

# ---------- walls overlay ----------
ys, xs = np.where(walls_full > 0)
wx0, wy0, wx1, wy1 = xs.min() - 2, ys.min() - 2, xs.max() + 2, ys.max() + 2
wa = cv2.GaussianBlur(walls_full[wy0:wy1, wx0:wx1].astype(np.float32), (0, 0), 0.8)
walls = np.dstack([arr[wy0:wy1, wx0:wx1], wa]).astype(np.uint8)
Image.fromarray(walls, "RGBA").save(OUT / "tray-walls.webp", quality=92, lossless=False)
walls_box = [round(v / S, 3) for v in (wx0, wy0, wx1 - wx0, wy1 - wy0)]

geo = {
    "aspect": ENV_ASPECT,
    "corners": [list(p) for p in SEEN],
    "seal": seal,
    "texture": [TEX_W, TEX_H],
    "empty": empty_box,
    "walls": walls_box,
}
GEO.parent.mkdir(parents=True, exist_ok=True)
GEO.write_text(json.dumps(geo, indent=2) + "\n")
print(json.dumps(geo))

if DEBUG:
    dbg = plate.copy()
    dbg.paste(Image.fromarray(rgba, "RGBA"), (int(bx0), int(by0)), Image.fromarray(rgba, "RGBA"))
    x0, y0 = int(900 * S), int(570 * S)
    dbg.crop((x0, y0, int(1220 * S), int(760 * S))).save("/tmp/contact-empty.png")
    d = ImageDraw.Draw(dbg)
    d.polygon(to_plate(LEFT_WALL), outline=(0, 255, 255))
    d.polygon(to_plate(FRONT_WALL), outline=(255, 0, 255))
    d.polygon(to_plate(SEEN), outline=(255, 255, 0))
    dbg.crop((x0, y0, int(1220 * S), int(760 * S))).save("/tmp/contact-polys.png")
