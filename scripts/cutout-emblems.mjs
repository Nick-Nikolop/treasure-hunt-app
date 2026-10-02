import sharp from "sharp"

// Source emblems are already transparent PNGs; this only trims, centres them on a square canvas and converts to webp.
const SOURCES = {
  "weathered-gold": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Weathered%20Gold%20TH%20Compass%20Emblem-C73Ra7iohWaDapoNLeic629Ltltlps.png",
  "brushed-gold": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Antique%20Gold%20TH%20Compass%20Emblem-c90UPmmUemXNsRcoUckaqzhRQJwvei.png",
  "antique-gold": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Antique%20Gold%20Compass%20Emblem-osgJZjjEtPBA3KUAFokdUhMvtMrhce.png",
  "polished-gold": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gold%20TH%20Compass%20Emblem-BTk0mYqORsoncL8TF7Kwib3UfyjeP4.png",
  carnival: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Golden%20TH%20Carnival%20Compass%20Emblem-hTnRWreJZLzz6syI3tAO8AjqlJUrr1.png",
  "dark-marble": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dark%20Marble%20Compass%20TH%20Emblem-OTixgc4ciuvb7tjE7gU7S9uEfJt3Mg.png",
  "weathered-steel": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Weathered%20Steel%20TH%20Compass%20Emblem-hSGtqaH3LJV8Y5gQDhtmY3o5gqKy0c.png",
}

const SIZE = 1254
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

for (const [id, url] of Object.entries(SOURCES)) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  const tight = await sharp(buf).ensureAlpha().trim({ background: CLEAR, threshold: 1 }).toBuffer()
  const inner = Math.round(SIZE * 0.92)
  const fitted = await sharp(tight).resize(inner, inner, { fit: "contain", background: CLEAR }).toBuffer()
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: CLEAR } })
    .composite([{ input: fitted, gravity: "center" }])
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`public/brand/alt/emblems/${id}.webp`)
  console.log("ok", id)
}
