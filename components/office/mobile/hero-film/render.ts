/**
 * Phone hero film over the desktop room: a flat still of the whole desktop scene with every object on it
 * (`/office/room-hero-<locale>.webp`, captured from the live desktop room at 1376x768 @1.5x) is panned by a virtual
 * camera on one canvas, with live light layers on top (darkness, rain on the window, headlights, beam + dust).
 * One flat image instead of a transformed DOM stage: Android Chrome dropped tiles of the big moving layer (black
 * rectangles). Recapture the stills when the desk objects or board copy change.
 *
 * Opening 0..INTRO_END: dark room and rain on the arched window → pan to the lamp, which catches → desk (phone,
 * map) → case board → filing cabinet and envelope tray. Then the camera keeps panning slowly across the whole room,
 * forever (all periodic, no loop point).
 */

export const INTRO_END = 7.8
/** calm frame for reduced motion / returning visitors */
export const STILL_TIME = INTRO_END + 2
/** desktop scene size in CSS px; the stage is laid out at this size and scaled by the camera */
export const STAGE_W = 1376
export const STAGE_H = 768

/** plate height as a share of the canvas height at zoom 1; the copy covers what's below */
const PLATE_H = 0.66
const ANCHOR_Y = PLATE_H / 2

// geometry on the render, as fractions of the scene
const WINDOW = { x0: 0.855, x1: 1, y0: 0, y1: 0.64 }
const MOUTH = { x: 0.165, y: 0.622 }
/** the shade's lower rim, left end (lower) to right end (higher), measured on the plate */
const RIM = { x0: 0.09, y0: 0.632, x1: 0.238, y1: 0.598 }
const POOL = { x: 0.24, y: 0.88 }
const WALL_BOTTOM = 0.62
const LAMP_ON = 2.7

type Ctx = CanvasRenderingContext2D
type Cam = { cx: number; cy: number; z: number }
export type Frame = { ox: number; oy: number; s: number }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** the tour: [time, shot]; consecutive equal shots are holds */
const KEYS: [number, Cam][] = [
  [0, { cx: 0.9, cy: 0.36, z: 1.45 }], // rain on the window
  [1.2, { cx: 0.9, cy: 0.38, z: 1.38 }],
  [2.6, { cx: 0.2, cy: 0.62, z: 1.3 }], // the lamp, it catches
  [3.1, { cx: 0.21, cy: 0.63, z: 1.28 }],
  [4.3, { cx: 0.4, cy: 0.84, z: 1.35 }], // phone + map on the desk
  [4.8, { cx: 0.42, cy: 0.84, z: 1.34 }],
  [6.0, { cx: 0.52, cy: 0.42, z: 1.12 }], // the case board
  [6.6, { cx: 0.53, cy: 0.43, z: 1.1 }],
  [INTRO_END, { cx: 0.78, cy: 0.6, z: 1 }], // cabinet + envelope tray, where the slow pan begins
]
const IDLE_PERIOD = 44

function camera(t: number): Cam {
  if (t >= INTRO_END) {
    const k = t - INTRO_END
    return {
      cx: 0.5 + 0.28 * Math.cos((k / IDLE_PERIOD) * Math.PI * 2),
      cy: 0.6,
      z: 1 + 0.03 * (1 - Math.cos((k / IDLE_PERIOD) * Math.PI * 4)),
    }
  }
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, b] = KEYS[i]
    if (t <= t1) {
      const [t0, a] = KEYS[i - 1]
      const k = eio(seg(t, t0, t1))
      return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) }
    }
  }
  return KEYS[KEYS.length - 1][1]
}

/** stage transform (CSS px) for a cw x ch viewport, kept on the plate: no empty edges left, right or top */
export function frameFor(t: number, cw: number, ch: number): Frame {
  const cam = camera(t)
  const s = ((ch * PLATE_H) / STAGE_H) * cam.z
  const halfW = cw / 2 / (STAGE_W * s)
  const halfH = (ch * ANCHOR_Y) / (STAGE_H * s)
  const cx = clamp(cam.cx, halfW, 1 - halfW)
  const cy = Math.max(cam.cy, halfH)
  return { ox: cw / 2 - cx * STAGE_W * s, oy: ch * ANCHOR_Y - cy * STAGE_H * s, s }
}

/** lamp level: dark, then the desktop stutter (dim, catch, dip, on), plus a rare small dip while idling */
export function lampLevel(t: number) {
  if (t < LAMP_ON) return 0
  if (t < LAMP_ON + 0.55) {
    const k = (t - LAMP_ON) / 0.55
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
  if (t < LAMP_ON) {
    const p = seg(t, 0.4, 2.5)
    return p > 0 && p < 1 ? p : -1
  }
  if (t < INTRO_END + 4) return -1
  const p = ((t - INTRO_END - 4) % 13) / 2.2
  return p < 1 ? p : -1
}

/** draws the room still + light layers for time t; cw/ch in CSS px, k = device pixel ratio of the canvas */
export function renderOffice(ctx: Ctx, t: number, cw: number, ch: number, k: number, f: Frame, plate: HTMLImageElement | null) {
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  ctx.fillStyle = "#141414"
  ctx.fillRect(0, 0, cw, ch)

  const width = STAGE_W * f.s
  if (plate && plate.naturalWidth > 0) {
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(plate, f.ox, f.oy, width, STAGE_H * f.s)
  }
  const P = (fx: number, fy: number) => ({ x: f.ox + fx * width, y: f.oy + fy * STAGE_H * f.s })
  const L = lampLevel(t)

  // the stage's bottom edge melts into the page; below it is page colour
  const bottom = f.oy + STAGE_H * f.s
  const fade = ctx.createLinearGradient(0, bottom - ch * 0.12, 0, bottom)
  fade.addColorStop(0, "rgba(20,20,20,0)")
  fade.addColorStop(1, "rgba(20,20,20,1)")
  ctx.fillStyle = fade
  ctx.fillRect(0, bottom - ch * 0.12, cw, ch * 0.12)
  ctx.fillStyle = "#141414"
  ctx.fillRect(0, bottom - 0.5, cw, ch)

  const w0 = P(WINDOW.x0, WINDOW.y0)
  const w1 = P(WINDOW.x1, WINDOW.y1)
  drawRain(ctx, t, w0, w1, width)

  // darkness over the whole room except the window glass; the lamp lifts it
  const dark = 1 - L
  if (dark > 0.001) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, cw, ch)
    ctx.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y)
    ctx.fillStyle = `rgba(5,8,16,${0.72 * dark})`
    ctx.fill("evenodd")
    ctx.globalCompositeOperation = "lighter"
    const cy = (w0.y + w1.y) / 2
    const spill = ctx.createRadialGradient(w0.x, cy, 0, w0.x, cy, width * 0.35)
    spill.addColorStop(0, `rgba(60,100,160,${0.14 * dark})`)
    spill.addColorStop(1, "rgba(60,100,160,0)")
    ctx.fillStyle = spill
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
  }

  drawSweep(ctx, t, P, L, width)
  drawLampLight(ctx, t, P, L, width)

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

function drawRain(ctx: Ctx, t: number, a: { x: number; y: number }, b: { x: number; y: number }, width: number) {
  const w = b.x - a.x
  const h = b.y - a.y
  if (w <= 0 || h <= 0) return
  const u = width / 1376
  ctx.save()
  ctx.beginPath()
  ctx.rect(a.x, a.y, w, h)
  ctx.clip()
  ctx.strokeStyle = "rgba(190,215,240,0.22)"
  ctx.lineWidth = Math.max(0.6, 1.2 * u)
  ctx.beginPath()
  for (let i = 0; i < 60; i++) {
    const x = a.x + hash(i) * (w + 30 * u) - 15 * u
    const speed = (420 + hash(i + 50) * 240) * u
    const y = a.y + ((hash(i + 99) * h + t * speed) % (h + 40 * u)) - 28 * u
    ctx.moveTo(x, y)
    ctx.lineTo(x - 5 * u, y + 20 * u)
  }
  ctx.stroke()
  for (let i = 0; i < 14; i++) {
    const period = 3 + hash(i + 7) * 4
    const p = ((t + hash(i) * period) % period) / period
    const x = a.x + 7 * u + hash(i + 3) * (w - 14 * u)
    const y = a.y + eio(p) * h
    ctx.fillStyle = "rgba(210,230,250,0.4)"
    ctx.beginPath()
    ctx.ellipse(x, y, 2 * u, 2.8 * u, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(210,230,250,0.13)"
    ctx.lineWidth = 1.4 * u
    ctx.beginPath()
    ctx.moveTo(x, y - 3 * u)
    ctx.lineTo(x + Math.sin(i) * 1.4 * u, y - (23 * p + 4) * u)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSweep(ctx: Ctx, t: number, P: (x: number, y: number) => { x: number; y: number }, L: number, width: number) {
  const p = sweep(t)
  if (p < 0) return
  const fx = lerp(0.92, -0.25, eio(p))
  const strength = Math.sin(p * Math.PI) * (L > 0.5 ? 0.45 : 1)
  const top = P(0, 0.04).y
  const wall = P(0, WALL_BOTTOM).y
  const band = 0.17 * width
  ctx.save()
  ctx.beginPath()
  ctx.rect(P(0, 0).x, top, width * 0.86, wall - top)
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
function drawLampLight(ctx: Ctx, t: number, P: (x: number, y: number) => { x: number; y: number }, L: number, width: number) {
  if (L <= 0) return
  const m = P(MOUTH.x, MOUTH.y)
  const pool = P(POOL.x, POOL.y)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  // light only exists below the shade's rim, so the brass dome itself never gets a glow painted on top
  const rimL = P(RIM.x0 - 0.02, RIM.y0)
  const rimR = P(RIM.x1 + 0.02, RIM.y1)
  const slope = (rimR.y - rimL.y) / (rimR.x - rimL.x)
  ctx.beginPath()
  ctx.moveTo(0, rimL.y - slope * rimL.x)
  ctx.lineTo(ctx.canvas.width, rimL.y + slope * (ctx.canvas.width - rimL.x))
  ctx.lineTo(ctx.canvas.width, ctx.canvas.height)
  ctx.lineTo(0, ctx.canvas.height)
  ctx.closePath()
  ctx.clip()

  const r = width * 0.11
  ctx.save()
  ctx.translate(m.x, m.y)
  ctx.scale(1, 0.5)
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  bloom.addColorStop(0, `rgba(255,220,150,${0.32 * L})`)
  bloom.addColorStop(1, "rgba(255,220,150,0)")
  ctx.fillStyle = bloom
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()

  const left = P(RIM.x0, RIM.y0)
  const right = P(RIM.x1, RIM.y1)
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

  // dust does not stream anywhere: each mote hangs at a spot in the beam and wanders slowly on the air,
  // glinting as it turns, and fades out to reappear somewhere else in the light
  const u = width / 1376
  for (let i = 0; i < 26; i++) {
    const period = 10 + hash(i) * 9
    const age = t + hash(i + 40) * period
    const cycle = Math.floor(age / period)
    const p = (age % period) / period
    const v = lerp(0.08, 0.92, hash(i * 13 + cycle * 7 + 3))
    const across = hash(i * 17 + cycle * 11 + 5)
    const homeX = lerp(lerp(MOUTH.x - 0.06, 0.05, v), lerp(MOUTH.x + 0.06, 0.43, v), across)
    const homeY = lerp(MOUTH.y + 0.015, POOL.y - 0.03, v)
    const ph = hash(i + 60) * 6.28
    const wx = 0.012 * Math.sin(t * (0.16 + hash(i + 90) * 0.14) + ph) + 0.005 * Math.sin(t * 0.41 + ph * 2)
    const wy = 0.009 * Math.sin(t * (0.12 + hash(i + 100) * 0.12) + ph * 1.7) + 0.004 * Math.cos(t * 0.37 + ph)
    const pt = P(homeX + wx, homeY + wy)
    const glint = 0.55 + 0.45 * Math.sin(t * (0.9 + hash(i + 110) * 1.2) + ph * 3)
    const falloff = lerp(1, 0.45, v)
    ctx.fillStyle = `rgba(255,230,180,${Math.sin(p * Math.PI) * 0.5 * glint * falloff * L})`
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, Math.max(0.45, (0.45 + hash(i + 120) * 0.6) * u * 1.3), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
