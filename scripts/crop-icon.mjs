import sharp from "sharp"
import { readFile, writeFile } from "node:fs/promises"

const SRC = "public/compass-icon-source.png"
const OUT = "public/compass-icon.png"

// The source art has a lot of empty white/transparent margin, so as a favicon
// the compass renders tiny. Trim the surrounding background, then re-pad by a
// small amount and place it on a transparent square so it fills the tab icon.
const input = await readFile(SRC)

const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

// 1) Trim the near-white / transparent border so the compass fills the frame.
const trimmedBuf = await sharp(input).trim({ threshold: 30 }).png().toBuffer()
const meta = await sharp(trimmedBuf).metadata()

// 2) Fit the trimmed art into a 472px box (leaving ~8% padding inside 512),
//    then extend with transparent pixels out to a clean 512x512 square.
const inner = 472
const resized = await sharp(trimmedBuf)
  .resize(inner, inner, { fit: "contain", background: transparent })
  .toBuffer()
const rMeta = await sharp(resized).metadata()

const padX = Math.round((512 - (rMeta.width ?? inner)) / 2)
const padY = Math.round((512 - (rMeta.height ?? inner)) / 2)

const out = await sharp(resized)
  .extend({
    top: padY,
    bottom: 512 - (rMeta.height ?? inner) - padY,
    left: padX,
    right: 512 - (rMeta.width ?? inner) - padX,
    background: transparent,
  })
  .png()
  .toBuffer()

await writeFile(OUT, out)
console.log(`[v0] wrote ${OUT} 512x512, trimmed from ${meta.width}x${meta.height}`)
