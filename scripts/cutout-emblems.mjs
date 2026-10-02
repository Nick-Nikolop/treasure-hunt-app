import sharp from "sharp"

const BLOB = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/"

// Source emblems are already transparent PNGs; this only trims, centres them on a square canvas and converts to webp.
const EMBLEMS = {
  "brushed-gold": "Brushed%20Gold%20Compass%20Emblem-zBdGHtOTSmcAbPvPK4kTpBnKieInXQ.png",
  "weathered-brass": "Weathered%20Brass%20TH%20Compass%20Emblem-gylxTBi9bivSifZI8GcGJp6gyBC8eO.png",
  pewter: "Weathered%20Metallic%20Compass%20Monogram%20Logo-pLHfCROToCqzryiS6N9FauUWMZVkyR.png",
  "weathered-steel": "Weathered%20Steel%20TH%20Compass%20Emblem%20%281%29-9yZ2UdsiOo2ExFQ7F8CMutwqxDMsd9.png",
  "dark-stone": "Dark%20Stone%20Compass%20Emblem%20with%20TH%20Monogram-YmZMCM3mRjibrej8ucGMDWZKQ4zhaU.png",
  carnival: "Golden%20TH%20Carnival%20Compass%20Emblem%20%281%29-v8FILXPIvQPSwCZLJVxWxOrNuz7B6b.png",
}

const BACKDROPS = {
  "beige-paper": "Warm%20Beige%20Textured%20Paper%20Background-jhPHeKVQIgugANnAA4uwfK8NxTOPln.png",
  concrete: "Realistic%20Weathered%20Concrete%20Texture-GTOyJGgPvM3FEV6mc16w9n7pUIiVZk.png",
  "bronze-charcoal": "Moody%20Charcoal%20Bronze%20Texture%20Background-TYNTfhImNMVjeQCNG4XJnkNggcpMDT.png",
  "charcoal-slate": "Moody%20Charcoal%20Slate%20Texture%20%281%29-NgiblH2JASOWPxu2BPAr6sUuO8pZsR.png",
  "charcoal-marble": "Dark%20Charcoal%20Marble%20Veins-hGZaw03kxg23ALpQdKxs2r2A64kxg4.png",
  "emerald-green": "Moody%20Dark%20Green%20Textured%20Surface-iYVcv7Zjp5T0rwILct928pPM7HgOMa.png",
  "burgundy-velvet": "Moody%20Burgundy%20Velvet%20Gradient-FhKtvlmxFtgA6fhW8EW9vf6WgVlTIJ.png",
}

const SIZE = 1254
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

async function load(file) {
  return Buffer.from(await (await fetch(BLOB + file)).arrayBuffer())
}

for (const [id, file] of Object.entries(EMBLEMS)) {
  const tight = await sharp(await load(file)).ensureAlpha().trim({ background: CLEAR, threshold: 1 }).toBuffer()
  const inner = Math.round(SIZE * 0.92)
  const fitted = await sharp(tight).resize(inner, inner, { fit: "contain", background: CLEAR }).toBuffer()
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: CLEAR } })
    .composite([{ input: fitted, gravity: "center" }])
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`public/brand/alt/emblems/${id}.webp`)
  console.log("emblem", id)
}

for (const [id, file] of Object.entries(BACKDROPS)) {
  await sharp(await load(file)).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82 }).toFile(`public/brand/alt/backdrops/${id}.webp`)
  console.log("backdrop", id)
}
