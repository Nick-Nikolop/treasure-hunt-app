"""
Prepares the two licensed Kalamata images used by the explainer video.

  kalamata-night.webp  "Very Long Exposure Of Kalamata Port", Evangelos Gkikopoulos, CC BY 3.0
                       https://commons.wikimedia.org/wiki/File:Very_Long_Exposure_Of_Kalamata_Port_(224478827).jpeg
  kalamata-1686.webp   "Calamata", Vincenzo Coronelli, 1686 (scan CC BY-SA 4.0)
                       https://commons.wikimedia.org/wiki/File:Kalamata_1686.jpg

Both are adaptations (crop, retouch, tone) and must stay credited in the explainer.
Needs Pillow + numpy: python3 -m venv /tmp/pv && /tmp/pv/bin/pip install pillow numpy
Run: /tmp/pv/bin/python scripts/kalamata-images.py
"""

import os
import urllib.request

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/landing2/explainer")
CACHE = "/tmp/kalamata-images"
UA = "TheHuntLanding/1.0 (webmasteerras@gmail.com)"
SOURCES = {
    "night": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Very_Long_Exposure_Of_Kalamata_Port_%28224478827%29.jpeg",
    "engraving": "https://upload.wikimedia.org/wikipedia/commons/d/d5/Kalamata_1686.jpg",
}
INK = np.array([0x1E, 0x19, 0x14], dtype=np.float32)
PAPER = np.array([0xF6, 0xF2, 0xEA], dtype=np.float32)


def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{name}.jpg")
    if not os.path.exists(path):
        req = urllib.request.Request(SOURCES[name], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as res, open(path, "wb") as out:
            out.write(res.read())
    return Image.open(path).convert("RGB")


def night():
    img = fetch("night")
    w, h = img.size
    # Drop the bottom strip that carries the photographer's watermark (credited in the UI instead).
    img = img.crop((0, 0, w, round(h * 0.94)))
    img = img.resize((1920, round(img.height * 1920 / img.width)), Image.LANCZOS)
    img.save(os.path.join(OUT, "kalamata-night.webp"), "WEBP", quality=80, method=6)
    return img.size


def engraving():
    img = fetch("engraving")
    w, h = img.size
    # Inside the printed frame line.
    img = img.crop((round(w * 0.018), round(h * 0.026), round(w * 0.982), round(h * 0.985)))
    a = np.asarray(img.convert("L"), dtype=np.float32)

    # Retouch the book gutter: a dark vertical fold near the middle of the scan.
    cw = a.shape[1]
    lo, hi = round(cw * 0.45), round(cw * 0.54)
    darkness = 255 - a[:, lo:hi].mean(axis=0)
    smooth = np.convolve(darkness, np.ones(41) / 41, mode="same")
    peak = lo + int(np.argmax(darkness - smooth))
    band = 9
    left, right = peak - band, peak + band
    for x in range(left + 1, right):
        k = (x - left) / (right - left)
        a[:, x] = a[:, left] * (1 - k) + a[:, right] * k

    # Levels, then map luminance onto the brand ink → paper duotone.
    p_lo, p_hi = np.percentile(a, 2), np.percentile(a, 97)
    lum = np.clip((a - p_lo) / (p_hi - p_lo), 0, 1) ** 1.1
    rgb = INK[None, None, :] * (1 - lum[..., None]) + PAPER[None, None, :] * lum[..., None]
    out = Image.fromarray(rgb.astype(np.uint8), "RGB").filter(ImageFilter.SMOOTH)
    out = out.resize((2000, round(out.height * 2000 / out.width)), Image.LANCZOS)
    out.save(os.path.join(OUT, "kalamata-1686.webp"), "WEBP", quality=74, method=6)
    return out.size, peak


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("night", night())
    print("engraving", engraving())
    for name in ("kalamata-night.webp", "kalamata-1686.webp"):
        print(name, round(os.path.getsize(os.path.join(OUT, name)) / 1024), "KB")
