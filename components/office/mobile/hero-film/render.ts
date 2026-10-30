/**
 * Phone hero film, shot on the SAME painted render the desktop office uses (`/office/room-desktop-clean-2064.webp`),
 * so both surfaces share one art style. `renderOffice(ctx, t, ...)` is deterministic: a virtual camera moves over
 * the plate and live light layers sit on top.
 *
 * 0..INTRO_END: the room is dark, rain runs down the arched window, headlights sweep the wall; the camera pans past
 * the board to the lamp, the lamp catches (same stutter as desktop) and the camera settles. After that it idles
 * forever (dust in the beam, a slow drift, a car now and then, a rare lamp dip), all periodic, no loop point.
 *
 * The plate fills the top ~2/3 of the canvas; the hero copy sits over the desk below it.
 */

export const INTRO_END = 6
/** calm frame for reduced motion / returning visitors */
export const STILL_TIME = INTRO_END + 2.4
export const PLATE_SRC = "/office/room-desktop-clean-2064.webp"

/** plate height as a share of the canvas height; the copy covers what's below */
const PLATE_H = 0.66
/** the camera target is placed here on the canvas */
const ANCHOR_Y = PLATE_H / 2

// geometry measured on the render, as fractions of the image
const WINDOW = { x0: 0.855, x1: 1, y0: 0, y1: 0.64 }
const MOUTH = { x: 0.152, y: 0.625 }
const POOL = { x: 0.24, y: 0.88 }
const WALL_BOTTOM = 0.62

type Ctx = CanvasRenderingContext2D
type Cam = { cx: number; cy: number; z: number }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const SHOT_WINDOW: Cam = { cx: 0.86, cy: 0.36, z: 1.45 }
const SHOT_LAMP: Cam = { cx: 0.2, cy: 0.66, z: 1.3 }
const SHOT_ROOM: Cam = { cx: 0.25, cy: 0.6, z: 1 }

const mix = (a: Cam, b: Cam, k: number): Cam => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) })

function camera(t: number): Cam {
  if (t < 1.1) return mix(SHOT_WINDOW, { ...SHOT_WINDOW, z: 1.38 }, seg(t, 0, 1.1))
  if (t < 3.3) return mix({ ...SHOT_WINDOW, z: 1.38 }, SHOT_LAMP, eio(seg(t, 1.1, 3.3)))
  if (t < INTRO_END) return mix(SHOT_LAMP, SHOT_ROOM, eio(seg(t, 3.7, 5.7)))
  const k = t - INTRO_END
  return { cx: 0.25 + 0.04 * Math.sin(k * 0.16), cy: 0.6, z: 1 + 0.025 * (1 - Math.cos(k * 0.21)) }
}

/** lamp level: dark, then the desktop stutter (dim, catch, dip, on), plus a rare small dip while idling */
export function lampLevel(t: number) {
  if (t < 3.3) return 0
  if (t < 3.85) {
    const k = (t - 3.3) / 0.55
    if (k < 0.12) return 0.65
    if (k < 0.2) return 0.15
    if (k < 0.36) return 1
    if (k < 0.46) return 0.55
    return 1
  }
  const idle = (t - INTRO_END) % 17
  if (t > INTRO_END && idle > 9 && idle < 9.22) return idle < 9.08 ? 0.75 : 0.92
  return 1
}

/** headlights through the window: across the wall in the dark opening, then every 13 s */
function sweep(t: number) {
  if (t < 3.2) {
    const p = seg(t, 0.5, 2.9)
    return p > 0 && p < 1 ? p : -1
  }
  if (t < INTRO_END + 4) return -1
  const p = ((t - INTRO_END - 4) % 13) / 2.2
  return p < 1 ? p : -1
}

export function renderOffice(ctx: Ctx, t: number, cw: number, ch: number, plate: HTMLImageElement | null) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  ctx.fillStyle = "#141414"
  ctx.fillRect(0, 0, cw, ch)
  if (!plate || !plate.naturalWidth) return

  const iw = plate.naturalWidth
  const ih = plate.naturalHeight
  const cam = camera(t)
  const s = ((ch * PLATE_H) / ih) * cam.z
  // keep the frame on the plate: no empty edges left, right or top
  const halfW = cw / 2 / (iw * s)
  const halfH = (ch * ANCHOR_Y) / (ih * s)
  const cx = clamp(cam.cx, halfW, 1 - halfW)
  const cy = Math.max(cam.cy, halfH)
  const ox = cw / 2 - cx * iw * s
  const oy = ch * ANCHOR_Y - cy * ih * s
  const P = (fx: number, fy: number) => ({ x: ox + fx * iw * s, y: oy + fy * ih * s })
  const L = lampLevel(t)

  ctx.drawImage(plate, ox, oy, iw * s, ih * s)

  // plate's bottom edge melts into the page
  const bottom = oy + ih * s
  const fade = ctx.createLinearGradient(0, bottom - ch * 0.12, 0, bottom)
  fade.addColorStop(0, "rgba(20,20,20,0)")
  fade.addColorStop(1, "rgba(20,20,20,1)")
  ctx.fillStyle = fade
  ctx.fillRect(0, bottom - ch * 0.12, cw, ch)

  const w0 = P(WINDOW.x0, WINDOW.y0)
  const w1 = P(WINDOW.x1, WINDOW.y1)
  drawRain(ctx, t, w0, w1, s * iw)

  // darkness: the whole room except the window glass; the lamp lifts it
  const dark = 1 - L
  if (dark > 0.001) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, cw, ch)
    ctx.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y)
    ctx.fillStyle = `rgba(5,8,16,${0.72 * dark})`
    ctx.fill("evenodd")
    // cool spill from the window onto the wall and desk while the lamp is off
    ctx.globalCompositeOperation = "lighter"
    const spill = ctx.createRadialGradient(w0.x, (w0.y + w1.y) / 2, 0, w0.x, (w0.y + w1.y) / 2, iw * s * 0.35)
    spill.addColorStop(0, `rgba(60,100,160,${0.14 * dark})`)
    spill.addColorStop(1, "rgba(60,100,160,0)")
    ctx.fillStyle = spill
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
  }

  drawSweep(ctx, t, P, L, iw * s)
  drawLampLight(ctx, t, P, L, iw * s)

  const vg = ctx.createRadialGradient(cw * 0.5, ch * 0.3, ch * 0.2, cw * 0.5, ch * 0.4, ch * 0.75)
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,0.5)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, cw, ch)

  const black = 1 - seg(t, 0, 0.5)
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`
    ctx.fillRect(0, 0, cw, ch)
  }
}

function drawRain(ctx: Ctx, t: number, a: { x: number; y: number }, b: { x: number; y: number }, scale: number) {
  const w = b.x - a.x
  const h = b.y - a.y
  if (w <= 0 || h <= 0) return
  const u = scale / 2064
  ctx.save()
  ctx.beginPath()
  ctx.rect(a.x, a.y, w, h)
  ctx.clip()
  ctx.strokeStyle = "rgba(190,215,240,0.22)"
  ctx.lineWidth = Math.max(0.8, 1.6 * u)
  ctx.beginPath()
  for (let i = 0; i < 60; i++) {
    const x = a.x + hash(i) * (w + 40 * u) - 20 * u
    const speed = (620 + hash(i + 50) * 360) * u
    const y = a.y + ((hash(i + 99) * h + t * speed) % (h + 60 * u)) - 40 * u
    ctx.moveTo(x, y)
    ctx.lineTo(x - 8 * u, y + 30 * u)
  }
  ctx.stroke()
  for (let i = 0; i < 14; i++) {
    const period = 3 + hash(i + 7) * 4
    const p = ((t + hash(i) * period) % period) / period
    const x = a.x + 10 * u + hash(i + 3) * (w - 20 * u)
    const y = a.y + eio(p) * h
    ctx.fillStyle = "rgba(210,230,250,0.4)"
    ctx.beginPath()
    ctx.ellipse(x, y, 3 * u, 4.2 * u, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(210,230,250,0.13)"
    ctx.lineWidth = 2 * u
    ctx.beginPath()
    ctx.moveTo(x, y - 5 * u)
    ctx.lineTo(x + Math.sin(i) * 2 * u, y - (34 * p + 6) * u)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSweep(
  ctx: Ctx,
  t: number,
  P: (x: number, y: number) => { x: number; y: number },
  L: number,
  scale: number,
) {
  const p = sweep(t)
  if (p < 0) return
  const fx = lerp(0.92, -0.25, eio(p))
  const strength = Math.sin(p * Math.PI) * (L > 0.5 ? 0.45 : 1)
  const top = P(0, 0.04).y
  const wall = P(0, WALL_BOTTOM).y
  const band = 0.17 * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(P(0, 0).x, top, scale * 0.86, wall - top)
  ctx.clip()
  ctx.globalCompositeOperation = "lighter"
  const x = P(fx, 0).x
  const step = (wall - top) / 8
  for (let i = 0; i < 8; i++) {
    const y = top + i * step
    const g = ctx.createLinearGradient(x, 0, x + band, 0)
    g.addColorStop(0, "rgba(255,232,190,0)")
    g.addColorStop(0.5, `rgba(255,232,190,${0.2 * strength})`)
    g.addColorStop(1, "rgba(255,232,190,0)")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + band, y + step * 0.5)
    ctx.lineTo(x + band, y + step * 1.05)
    ctx.lineTo(x, y + step * 0.55)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** bulb bloom under the shade, a soft beam to the desk and dust turning in it */
function drawLampLight(
  ctx: Ctx,
  t: number,
  P: (x: number, y: number) => { x: number; y: number },
  L: number,
  scale: number,
) {
  if (L <= 0) return
  const m = P(MOUTH.x, MOUTH.y)
  const pool = P(POOL.x, POOL.y)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  const bloom = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, scale * 0.12)
  bloom.addColorStop(0, `rgba(255,220,150,${0.32 * L})`)
  bloom.addColorStop(1, "rgba(255,220,150,0)")
  ctx.fillStyle = bloom
  ctx.fillRect(m.x - scale * 0.12, m.y - scale * 0.12, scale * 0.24, scale * 0.24)

  const left = P(MOUTH.x - 0.075, MOUTH.y)
  const right = P(MOUTH.x + 0.08, MOUTH.y)
  const beam = ctx.createLinearGradient(m.x, m.y, pool.x, pool.y)
  beam.addColorStop(0, `rgba(255,205,120,${0.1 * L})`)
  beam.addColorStop(1, "rgba(255,205,120,0)")
  ctx.fillStyle = beam
  ctx.beginPath()
  ctx.moveTo(left.x, left.y)
  ctx.lineTo(P(0.02, POOL.y).x, pool.y)
  ctx.lineTo(P(0.46, POOL.y).x, pool.y)
  ctx.lineTo(right.x, right.y)
  ctx.closePath()
  ctx.fill()

  const u = scale / 2064
  for (let i = 0; i < 22; i++) {
    const period = 9 + hash(i) * 8
    const p = ((t + hash(i + 40) * period) % period) / period
    const k = hash(i + 80)
    const fx = lerp(MOUTH.x - 0.06, MOUTH.x + 0.06, k)
    const tx = lerp(0.06, 0.42, k)
    const d = 1 - p
    const pt = P(lerp(fx, tx, d) + Math.sin(t * 0.5 + i) * 0.006, lerp(MOUTH.y + 0.01, POOL.y - 0.03, d))
    ctx.fillStyle = `rgba(255,228,175,${Math.sin(p * Math.PI) * 0.55 * L})`
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, Math.max(0.6, (1 + hash(i + 120) * 1.6) * u * 1.3), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
