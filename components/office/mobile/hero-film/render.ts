/**
 * Phone hero film: a deterministic canvas render of the investigator's office. `renderOffice(ctx, t, ...)` draws
 * the frame for time `t` (seconds). 0..INTRO_END is the opening (headlights sweep the dark room, the lamp chain is
 * pulled, the lamp catches, the camera pulls back, the case folder slides into the light, the stamp lands, the
 * compass settles). After INTRO_END everything is periodic (rain, steam, clock, dust, an occasional car), so the
 * film idles forever without a visible loop point.
 *
 * Stage is 900x1600 portrait, cover-fitted by height and anchored to the top: the scene lives in stage y 0..760,
 * the hero copy sits over the dark desk front below it.
 */

export const INTRO_END = 6
/** a calm frame used for reduced motion / the first paint before play is decided */
export const STILL_TIME = INTRO_END + 2.4

export type FilmLabels = { caseName: string; state: string }
export type FilmFonts = { serif: string; sans: string }

const W = 900
const H = 1600

const DESK_BACK = 560
const DESK_FRONT = 735
const DESK_FACE = 800

const LAMP_BASE = { x: 132, y: 652 }
const LAMP_ELBOW = { x: 182, y: 428 }
const LAMP_PIVOT = { x: 300, y: 372 }
/** shade axis angle (radians from +x), pointing down-right at the desk */
const SHADE_ANGLE = 1.02
const SHADE_LEN = 92
const POOL = { x: 432, y: 640, rx: 300, ry: 92 }

const C = {
  ink: "#0c0b0a",
  wallTop: "#1e1914",
  wallLow: "#15110e",
  wood: "#4a2f1f",
  woodDeep: "#2c1b12",
  pad: "#3a1d19",
  gold: "#e2b04f",
  goldDeep: "#a8751f",
  manila: "#c9a465",
  manilaDeep: "#a9854a",
  string: "#a3262e",
  paper: "#efe6d3",
  night: "#0e1a2b",
  teal: "#14394a",
}

type Ctx = CanvasRenderingContext2D

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eout = (x: number) => 1 - Math.pow(1 - x, 3)
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgba = (h: string, a: number) => {
  const [r, g, b] = rgb(h)
  return `rgba(${r},${g},${b},${a})`
}

/** how lit the lamp is: off, a yank on the chain, two flickers, on; plus a rare small dip while idling */
export function lampLevel(t: number) {
  if (t < 0.95) return 0
  if (t < 1.5) {
    const k = (t - 0.95) / 0.55
    if (k < 0.16) return 0.55
    if (k < 0.3) return 0.05
    if (k < 0.48) return 0.8
    if (k < 0.58) return 0.25
    return lerp(0.75, 1, (k - 0.58) / 0.42)
  }
  const idle = (t - INTRO_END) % 17
  if (t > INTRO_END && idle > 9 && idle < 9.22) return idle < 9.08 ? 0.72 : 0.9
  return 1
}

/** headlights sweeping the wall through the blinds: once in the dark opening, then every 13 s */
function sweepProgress(t: number) {
  const first = seg(t, 0.15, 1.75)
  if (t < 1.75) return first > 0 && first < 1 ? first : -1
  if (t < INTRO_END + 3) return -1
  const p = ((t - INTRO_END - 3) % 13) / 1.9
  return p < 1 ? p : -1
}

let grain: HTMLCanvasElement | null = null
function grainTile() {
  if (grain || typeof document === "undefined") return grain
  const c = document.createElement("canvas")
  c.width = c.height = 160
  const g = c.getContext("2d")
  if (!g) return null
  const img = g.createImageData(160, 160)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 13
  }
  g.putImageData(img, 0, 0)
  grain = c
  return c
}

export function renderOffice(ctx: Ctx, t: number, cw: number, ch: number, labels: FilmLabels, fonts: FilmFonts) {
  const L = lampLevel(t)
  const s0 = Math.max(cw / W, ch / H)
  const ox = (cw - W * s0) / 2

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, cw, ch)

  // camera: close on the lamp in the dark, pulls back as the room comes up, then barely breathes
  const pull = eio(seg(t, 1.15, 4.1))
  const z = lerp(1.85, 1, pull) * (t > INTRO_END ? 1 + 0.012 * (1 - Math.cos((t - INTRO_END) * 0.32)) : 1)
  const focus = { x: lerp(LAMP_PIVOT.x + 60, POOL.x, pull), y: lerp(LAMP_PIVOT.y + 120, 420, pull) }
  const anchor = { x: lerp(W / 2, POOL.x, pull), y: lerp(560, 420, pull) }
  ctx.setTransform(s0, 0, 0, s0, ox, 0)
  ctx.translate(anchor.x, anchor.y)
  ctx.scale(z, z)
  ctx.translate(-focus.x, -focus.y)

  drawWall(ctx, t)
  drawClock(ctx, t, fonts)
  drawMap(ctx)
  drawDesk(ctx)
  drawMagnifier(ctx)
  drawCompass(ctx, t)
  drawFolder(ctx, t, labels, fonts)
  drawMug(ctx)
  drawDarkness(ctx, L)
  drawWindow(ctx, t)
  drawSweep(ctx, t, L)
  drawLamp(ctx, t, L)
  drawCone(ctx, t, L)
  drawSteam(ctx, t, L)

  // screen space: fade from black, vignette, grain
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const vg = ctx.createRadialGradient(cw * 0.5, ch * 0.3, ch * 0.18, cw * 0.5, ch * 0.4, ch * 0.75)
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,0.6)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, cw, ch)
  const tile = grainTile()
  if (tile) {
    const pattern = ctx.createPattern(tile, "repeat")
    if (pattern) {
      ctx.save()
      ctx.translate(Math.floor(hash(Math.floor(t * 12)) * 160), Math.floor(hash(Math.floor(t * 12) + 7) * 160))
      ctx.fillStyle = pattern
      ctx.fillRect(-160, -160, cw + 320, ch + 320)
      ctx.restore()
    }
  }
  const black = 1 - seg(t, 0, 0.45)
  if (black > 0) {
    ctx.fillStyle = `rgba(0,0,0,${black})`
    ctx.fillRect(0, 0, cw, ch)
  }
}

/* ---------- room ---------- */

function drawWall(ctx: Ctx, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, DESK_BACK)
  g.addColorStop(0, C.wallTop)
  g.addColorStop(1, C.wallLow)
  ctx.fillStyle = g
  ctx.fillRect(-200, -200, W + 400, DESK_BACK + 200)
  // damask-ish wallpaper stripes
  ctx.fillStyle = "rgba(255,240,215,0.025)"
  for (let x = -200; x < W + 200; x += 46) ctx.fillRect(x, -200, 14, DESK_BACK + 200)
  // chair rail
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  ctx.fillRect(-200, 492, W + 400, 10)
  ctx.fillStyle = "rgba(255,230,190,0.05)"
  ctx.fillRect(-200, 490, W + 400, 2)
  // faint cool spill from the window, slat stripes falling to the left
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  const flick = 0.85 + 0.15 * Math.sin(t * 0.7)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(90,140,190,${0.022 * flick})`
    ctx.beginPath()
    const y = 120 + i * 30
    ctx.moveTo(520, y)
    ctx.lineTo(520, y + 14)
    ctx.lineTo(300, y + 120)
    ctx.lineTo(300, y + 96)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawWindow(ctx: Ctx, t: number) {
  const x0 = 540
  const y0 = 40
  const w = 290
  const h = 280
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, w, h)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, y0, 0, y0 + h)
  sky.addColorStop(0, C.night)
  sky.addColorStop(1, C.teal)
  ctx.fillStyle = sky
  ctx.fillRect(x0, y0, w, h)
  // distant town: rooftops with a few lit windows
  const roofs = [
    [0, 70],
    [40, 110],
    [70, 90],
    [120, 140],
    [150, 100],
    [195, 125],
    [230, 80],
    [260, 115],
  ]
  for (let i = 0; i < roofs.length; i++) {
    const [bx, bh] = roofs[i]
    const next = roofs[i + 1]?.[0] ?? w
    ctx.fillStyle = "#091320"
    ctx.fillRect(x0 + bx, y0 + h - bh, next - bx + 1, bh)
    for (let k = 0; k < 4; k++) {
      const on = hash(i * 9 + k) > 0.45
      if (!on) continue
      const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + hash(i + k * 3)) + i * 2 + k)
      ctx.fillStyle = rgba(C.gold, 0.35 + 0.35 * tw)
      ctx.fillRect(x0 + bx + 8 + (k % 2) * 14, y0 + h - bh + 14 + Math.floor(k / 2) * 22, 6, 9)
    }
  }
  // rain
  ctx.strokeStyle = "rgba(180,210,235,0.28)"
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (let i = 0; i < 70; i++) {
    const rx = x0 + hash(i) * (w + 60) - 30
    const speed = 520 + hash(i + 50) * 300
    const ry = y0 + ((hash(i + 99) * h + t * speed) % (h + 60)) - 40
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx - 7, ry + 26)
  }
  ctx.stroke()
  // drops sliding down the glass
  for (let i = 0; i < 12; i++) {
    const period = 3 + hash(i + 7) * 4
    const p = ((t + hash(i) * period) % period) / period
    const dx = x0 + 12 + hash(i + 3) * (w - 24)
    const dy = y0 + eio(p) * h
    ctx.fillStyle = "rgba(200,225,245,0.35)"
    ctx.beginPath()
    ctx.ellipse(dx, dy, 2.6, 3.6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(200,225,245,0.12)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(dx, dy - 4)
    ctx.lineTo(dx + Math.sin(i) * 2, dy - 30 * p - 6)
    ctx.stroke()
  }
  // blinds, half raised
  for (let i = 0; i < 6; i++) {
    const sy = y0 + i * 16
    ctx.fillStyle = "#2c2520"
    ctx.fillRect(x0, sy, w, 11)
    ctx.fillStyle = "rgba(255,235,200,0.06)"
    ctx.fillRect(x0, sy, w, 2)
  }
  ctx.restore()
  // frame + mullions
  ctx.strokeStyle = "#2a1f17"
  ctx.lineWidth = 16
  ctx.strokeRect(x0, y0, w, h)
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(x0 + w / 2, y0 + 96)
  ctx.lineTo(x0 + w / 2, y0 + h)
  ctx.moveTo(x0, y0 + 186)
  ctx.lineTo(x0 + w, y0 + 186)
  ctx.stroke()
  // sill
  ctx.fillStyle = "#33261c"
  ctx.fillRect(x0 - 22, y0 + h + 6, w + 44, 14)
  // blind cord
  ctx.strokeStyle = "rgba(220,200,170,0.25)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x0 + w - 24, y0 + 96)
  ctx.lineTo(x0 + w - 24 + Math.sin(t * 0.9) * 2, y0 + 210)
  ctx.stroke()
}

function drawClock(ctx: Ctx, t: number, fonts: FilmFonts) {
  const cx = 150
  const cy = 236
  const r = 56
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.4)"
  ctx.beginPath()
  ctx.arc(cx + 6, cy + 8, r + 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.goldDeep
  ctx.beginPath()
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.paper
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.ink
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.lineWidth = i % 3 === 0 ? 4 : 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6))
    ctx.lineTo(cx + Math.cos(a) * (r - (i % 3 === 0 ? 16 : 11)), cy + Math.sin(a) * (r - (i % 3 === 0 ? 16 : 11)))
    ctx.stroke()
  }
  ctx.fillStyle = C.ink
  ctx.font = `700 13px ${fonts.serif}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("XII", cx, cy - r + 26)
  // 23:57 and running; the second hand ticks with a small overshoot
  const secs = 57 * 60 + 40 + t
  const whole = Math.floor(secs)
  const tick = whole + clamp((secs - whole) / 0.12) + Math.sin(clamp((secs - whole) / 0.25) * Math.PI) * 0.12
  const hand = (frac: number, len: number, width: number, color: string) => {
    const a = frac * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(cx - Math.cos(a) * 8, cy - Math.sin(a) * 8)
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
    ctx.stroke()
  }
  hand((23 + secs / 3600) / 12, r * 0.5, 5, C.ink)
  hand(secs / 3600, r * 0.75, 3.5, C.ink)
  hand((tick % 60) / 60, r * 0.82, 1.6, C.string)
  ctx.fillStyle = C.goldDeep
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawMap(ctx: Ctx) {
  ctx.save()
  ctx.translate(372, 250)
  ctx.rotate(-0.05)
  const w = 230
  const h = 170
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w, h)
  ctx.fillStyle = C.manila
  ctx.fillRect(-w / 2, -h / 2, w, h)
  const edge = ctx.createRadialGradient(0, 0, 40, 0, 0, 160)
  edge.addColorStop(0, "rgba(0,0,0,0)")
  edge.addColorStop(1, "rgba(80,50,20,0.45)")
  ctx.fillStyle = edge
  ctx.fillRect(-w / 2, -h / 2, w, h)
  // folds
  ctx.strokeStyle = "rgba(90,60,30,0.3)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-w / 6, -h / 2)
  ctx.lineTo(-w / 6, h / 2)
  ctx.moveTo(w / 6, -h / 2)
  ctx.lineTo(w / 6, h / 2)
  ctx.moveTo(-w / 2, 0)
  ctx.lineTo(w / 2, 0)
  ctx.stroke()
  // coastline + sea hatch
  ctx.strokeStyle = "rgba(60,40,20,0.75)"
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-w / 2, 40)
  ctx.bezierCurveTo(-60, 20, -40, 70, 0, 52)
  ctx.bezierCurveTo(40, 34, 60, 72, w / 2, 46)
  ctx.stroke()
  ctx.strokeStyle = "rgba(60,40,20,0.25)"
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 10, 62 + i * 6)
    ctx.bezierCurveTo(-50, 50 + i * 6, -30, 78 + i * 6, 10, 66 + i * 6)
    ctx.stroke()
  }
  // route to the X
  ctx.setLineDash([7, 6])
  ctx.strokeStyle = C.string
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(-84, -48)
  ctx.bezierCurveTo(-30, -70, -20, 10, 30, -10)
  ctx.bezierCurveTo(60, -22, 66, 10, 72, 18)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(64, 10)
  ctx.lineTo(80, 26)
  ctx.moveTo(80, 10)
  ctx.lineTo(64, 26)
  ctx.stroke()
  // pins
  for (const [px, py] of [
    [-w / 2 + 12, -h / 2 + 12],
    [w / 2 - 12, -h / 2 + 12],
    [-84, -48],
  ]) {
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.beginPath()
    ctx.arc(px + 2, py + 3, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = C.string
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.beginPath()
    ctx.arc(px - 2, py - 2, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawDesk(ctx: Ctx) {
  // top surface in slight perspective
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-200, DESK_BACK)
  ctx.lineTo(W + 200, DESK_BACK)
  ctx.lineTo(W + 260, DESK_FRONT)
  ctx.lineTo(-260, DESK_FRONT)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, DESK_BACK, 0, DESK_FRONT)
  g.addColorStop(0, C.woodDeep)
  g.addColorStop(1, C.wood)
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  ctx.strokeStyle = "rgba(20,10,5,0.35)"
  ctx.lineWidth = 1.4
  for (let i = 0; i < 16; i++) {
    const y = DESK_BACK + 8 + i * 11
    ctx.beginPath()
    ctx.moveTo(-200, y)
    for (let x = -200; x <= W + 200; x += 60) ctx.lineTo(x, y + Math.sin(x * 0.012 + i * 1.7) * 3)
    ctx.stroke()
  }
  // leather pad under the folder
  ctx.fillStyle = C.pad
  ctx.beginPath()
  ctx.moveTo(250, DESK_BACK + 26)
  ctx.lineTo(690, DESK_BACK + 26)
  ctx.lineTo(720, DESK_FRONT - 18)
  ctx.lineTo(220, DESK_FRONT - 18)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba(C.gold, 0.25)
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
  // front edge + face
  ctx.fillStyle = "rgba(255,220,170,0.12)"
  ctx.fillRect(-260, DESK_FRONT - 2, W + 520, 3)
  const f = ctx.createLinearGradient(0, DESK_FRONT, 0, DESK_FACE + 120)
  f.addColorStop(0, C.woodDeep)
  f.addColorStop(1, C.ink)
  ctx.fillStyle = f
  ctx.fillRect(-260, DESK_FRONT + 1, W + 520, H)
}

function drawMagnifier(ctx: Ctx) {
  ctx.save()
  ctx.translate(626, 702)
  ctx.scale(1, 0.62)
  ctx.rotate(0.5)
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  ctx.beginPath()
  ctx.ellipse(8, 10, 40, 40, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#3b2416"
  ctx.fillRect(36, -7, 74, 14)
  ctx.fillStyle = C.goldDeep
  ctx.beginPath()
  ctx.arc(0, 0, 38, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "rgba(160,190,200,0.35)"
  ctx.beginPath()
  ctx.arc(0, 0, 31, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.55)"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 24, 3.6, 4.5)
  ctx.stroke()
  ctx.restore()
}

/** compass on the desk: spins when the light finds it, settles pointing at the viewer (down, toward the copy) */
function drawCompass(ctx: Ctx, t: number) {
  const cx = 206
  const cy = 700
  let a = Math.PI / 2
  if (t < 3.4) a = Math.PI / 2 + 0.6
  else if (t < INTRO_END + 0.5) {
    const k = t - 3.4
    a = Math.PI / 2 + 0.6 * Math.exp(-k * 1.8) * Math.cos(k * 9) + (k < 0.9 ? (1 - eout(k / 0.9)) * Math.PI * 4 : 0)
  } else a = Math.PI / 2 + Math.sin(t * 1.3) * 0.04 + Math.sin(t * 3.1) * 0.015
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, 0.6)
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.beginPath()
  ctx.arc(10, 14, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.goldDeep
  ctx.beginPath()
  ctx.arc(0, 0, 56, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.arc(0, 0, 50, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.paper
  ctx.beginPath()
  ctx.arc(0, 0, 44, 0, Math.PI * 2)
  ctx.fill()
  // rose
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 38 : 24
    const ang = (i / 8) * Math.PI * 2 - Math.PI / 2
    ctx.fillStyle = i % 2 === 0 ? C.goldDeep : rgba(C.goldDeep, 0.55)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(ang - 0.22) * 9, Math.sin(ang - 0.22) * 9)
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
    ctx.lineTo(Math.cos(ang + 0.22) * 9, Math.sin(ang + 0.22) * 9)
    ctx.closePath()
    ctx.fill()
  }
  // needle
  ctx.rotate(a)
  ctx.fillStyle = C.string
  ctx.beginPath()
  ctx.moveTo(40, 0)
  ctx.lineTo(0, -6)
  ctx.lineTo(0, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = C.ink
  ctx.beginPath()
  ctx.moveTo(-34, 0)
  ctx.lineTo(0, -6)
  ctx.lineTo(0, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // glass glint
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(cx, cy, 40, 24, 0, 3.7, 4.6)
  ctx.stroke()
}

/** the case folder: pushed into the light, then the status stamp comes down on it */
function drawFolder(ctx: Ctx, t: number, labels: FilmLabels, fonts: FilmFonts) {
  const slide = eout(seg(t, 2.3, 3.15))
  if (slide <= 0) return
  const x = lerp(820, 452, slide)
  const rot = lerp(0.32, -0.06, slide)
  ctx.save()
  ctx.translate(x, 646)
  ctx.scale(1, 0.62)
  ctx.rotate(rot)
  const w = 300
  const h = 200
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(-w / 2 + 12, -h / 2 + 16, w, h)
  // sheets peeking out
  ctx.fillStyle = C.paper
  ctx.fillRect(-w / 2 + 10, -h / 2 - 8, w - 18, h)
  ctx.fillStyle = "#e4d8c0"
  ctx.fillRect(-w / 2 + 16, -h / 2 - 14, w - 40, 10)
  // cover + tab
  ctx.fillStyle = C.manilaDeep
  ctx.fillRect(-w / 2 + 14, -h / 2 - 22, 92, 26)
  ctx.fillStyle = C.manila
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.fillStyle = "rgba(90,60,25,0.18)"
  ctx.fillRect(-w / 2, -h / 2, w, 6)
  // label + redactions
  ctx.fillStyle = C.paper
  ctx.fillRect(-w / 2 + 22, -h / 2 + 24, 176, 40)
  ctx.fillStyle = "#1e1914"
  ctx.font = `800 25px ${fonts.serif}`
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(labels.caseName.toUpperCase(), -w / 2 + 32, -h / 2 + 45)
  ctx.fillStyle = "rgba(30,25,20,0.88)"
  for (let i = 0; i < 4; i++) {
    const lw = [150, 112, 136, 84][i]
    ctx.fillRect(-w / 2 + 24, -h / 2 + 88 + i * 22, lw, 11)
  }
  // string tie
  ctx.fillStyle = "#6e5430"
  ctx.beginPath()
  ctx.arc(w / 2 - 30, 0, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.string
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w / 2 - 30, 0)
  ctx.bezierCurveTo(w / 2 - 10, 20, w / 2 - 50, 40, w / 2 - 24, 64)
  ctx.moveTo(w / 2 - 30, 0)
  ctx.bezierCurveTo(w / 2 - 6, -10, w / 2 + 4, 30, w / 2 - 6, 52)
  ctx.stroke()
  // stamp
  const st = seg(t, 3.3, 3.62)
  if (st > 0 && labels.state) {
    const k = eout(st)
    const sc = lerp(2.3, 1, k)
    ctx.save()
    ctx.translate(66, 46)
    ctx.rotate(lerp(-0.1, -0.12, k))
    ctx.scale(sc, sc * 1.25)
    ctx.globalAlpha = clamp(st * 2.2) * 0.92
    ctx.font = `900 34px ${fonts.sans}`
    const text = labels.state.toUpperCase()
    const tw = ctx.measureText(text).width + 30
    ctx.strokeStyle = C.string
    ctx.lineWidth = 5
    ctx.strokeRect(-tw / 2, -28, tw, 56)
    ctx.lineWidth = 2
    ctx.strokeRect(-tw / 2 + 6, -22, tw - 12, 44)
    ctx.fillStyle = C.string
    ctx.textAlign = "center"
    ctx.fillText(text, 0, 2)
    ctx.restore()
    // ink specks from the hit
    if (k >= 1) {
      ctx.fillStyle = rgba(C.string, 0.7)
      for (let i = 0; i < 6; i++) {
        ctx.beginPath()
        ctx.arc(48 + (hash(i) - 0.5) * 170, 34 + (hash(i + 4) - 0.5) * 80, 1.5 + hash(i + 8) * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()
}

function drawMug(ctx: Ctx) {
  const cx = 752
  const by = 652
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.beginPath()
  ctx.ellipse(cx + 12, by + 4, 56, 14, 0, 0, Math.PI * 2)
  ctx.fill()
  // handle
  ctx.strokeStyle = "#d8ccb4"
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.arc(cx + 46, by - 50, 22, -1.3, 1.3)
  ctx.stroke()
  // body
  const g = ctx.createLinearGradient(cx - 44, 0, cx + 44, 0)
  g.addColorStop(0, "#f0e6d2")
  g.addColorStop(1, "#a99c86")
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(cx - 44, by - 96)
  ctx.lineTo(cx + 44, by - 96)
  ctx.lineTo(cx + 40, by - 4)
  ctx.quadraticCurveTo(cx, by + 8, cx - 40, by - 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = C.string
  ctx.fillRect(cx - 43, by - 70, 86, 8)
  // coffee
  ctx.fillStyle = "#d8ccb4"
  ctx.beginPath()
  ctx.ellipse(cx, by - 96, 44, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#24140c"
  ctx.beginPath()
  ctx.ellipse(cx, by - 94, 38, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ---------- light ---------- */

/** the room's darkness, with the lamp's pool cut into it */
function drawDarkness(ctx: Ctx, L: number) {
  const g = ctx.createRadialGradient(POOL.x, POOL.y - 40, 10, POOL.x, POOL.y - 40, 620)
  const stops: [number, number][] = [
    [0, 0.0],
    [0.22, 0.12],
    [0.45, 0.48],
    [0.75, 0.78],
    [1, 0.88],
  ]
  for (const [p, a] of stops) g.addColorStop(p, `rgba(6,6,9,${lerp(0.94, a, L)})`)
  ctx.fillStyle = g
  ctx.fillRect(-300, -300, W + 600, H + 600)
}

function drawSweep(ctx: Ctx, t: number, L: number) {
  const p = sweepProgress(t)
  if (p < 0) return
  const x = lerp(W + 260, -420, eio(p))
  const strength = Math.sin(p * Math.PI) * (L > 0.5 ? 0.5 : 1)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-300, -300, W + 600, DESK_BACK + 300)
  ctx.clip()
  ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 7; i++) {
    const y = 60 + i * 52
    ctx.fillStyle = `rgba(255,236,200,${0.11 * strength})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 230, y + 40)
    ctx.lineTo(x + 230, y + 70)
    ctx.lineTo(x, y + 26)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function shadeGeom() {
  const ax = Math.cos(SHADE_ANGLE)
  const ay = Math.sin(SHADE_ANGLE)
  const nx = -ay
  const ny = ax
  const mouth = { x: LAMP_PIVOT.x + ax * SHADE_LEN, y: LAMP_PIVOT.y + ay * SHADE_LEN }
  return { ax, ay, nx, ny, mouth }
}

function drawLamp(ctx: Ctx, t: number, L: number) {
  const { ax, ay, nx, ny, mouth } = shadeGeom()
  ctx.save()
  ctx.lineCap = "round"
  // base
  ctx.fillStyle = "#1c1612"
  ctx.beginPath()
  ctx.ellipse(LAMP_BASE.x, LAMP_BASE.y, 62, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(C.gold, 0.12 + 0.25 * L)
  ctx.beginPath()
  ctx.ellipse(LAMP_BASE.x + 14, LAMP_BASE.y - 4, 40, 7, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  // arm
  ctx.strokeStyle = "#241c16"
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(LAMP_BASE.x, LAMP_BASE.y - 6)
  ctx.lineTo(LAMP_ELBOW.x, LAMP_ELBOW.y)
  ctx.lineTo(LAMP_PIVOT.x, LAMP_PIVOT.y)
  ctx.stroke()
  ctx.strokeStyle = rgba(C.gold, 0.1 + 0.35 * L)
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(LAMP_BASE.x + 5, LAMP_BASE.y - 8)
  ctx.lineTo(LAMP_ELBOW.x + 5, LAMP_ELBOW.y)
  ctx.lineTo(LAMP_PIVOT.x, LAMP_PIVOT.y + 5)
  ctx.stroke()
  ctx.fillStyle = C.goldDeep
  for (const j of [LAMP_ELBOW, LAMP_PIVOT]) {
    ctx.beginPath()
    ctx.arc(j.x, j.y, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  // shade: narrow at the pivot, wide at the mouth
  const back = { x: LAMP_PIVOT.x - ax * 10, y: LAMP_PIVOT.y - ay * 10 }
  const sg = ctx.createLinearGradient(back.x + nx * 30, back.y + ny * 30, back.x - nx * 30, back.y - ny * 30)
  sg.addColorStop(0, "#2b2a26")
  sg.addColorStop(0.5, `rgba(${Math.round(60 + 90 * L)},${Math.round(56 + 70 * L)},${Math.round(44 + 30 * L)},1)`)
  sg.addColorStop(1, "#151412")
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.moveTo(back.x + nx * 18, back.y + ny * 18)
  ctx.lineTo(mouth.x + nx * 62, mouth.y + ny * 62)
  ctx.quadraticCurveTo(mouth.x + ax * 14, mouth.y + ay * 14, mouth.x - nx * 62, mouth.y - ny * 62)
  ctx.lineTo(back.x - nx * 18, back.y - ny * 18)
  ctx.closePath()
  ctx.fill()
  // glowing rim + bulb
  ctx.strokeStyle = rgba(C.gold, 0.2 + 0.75 * L)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(mouth.x + nx * 62, mouth.y + ny * 62)
  ctx.quadraticCurveTo(mouth.x + ax * 14, mouth.y + ay * 14, mouth.x - nx * 62, mouth.y - ny * 62)
  ctx.stroke()
  if (L > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const bg = ctx.createRadialGradient(mouth.x, mouth.y, 2, mouth.x, mouth.y, 120)
    bg.addColorStop(0, `rgba(255,236,190,${0.85 * L})`)
    bg.addColorStop(0.25, `rgba(242,190,100,${0.35 * L})`)
    bg.addColorStop(1, "rgba(242,190,100,0)")
    ctx.fillStyle = bg
    ctx.fillRect(mouth.x - 140, mouth.y - 140, 280, 280)
    ctx.restore()
  }
  // pull chain: yanked at 0.8 s, swings and settles; drifts a hair in the draught afterwards
  const anchor = { x: mouth.x - nx * 40, y: mouth.y - ny * 40 }
  const k = t - 0.8
  const pullDown = k > 0 && k < 0.18 ? Math.sin((k / 0.18) * Math.PI) * 14 : 0
  const swing = k > 0 ? 0.55 * Math.exp(-k * 1.6) * Math.sin(k * 7.5) : 0
  const sway = swing + Math.sin(t * 0.8) * 0.03
  const len = 62 + pullDown
  const tip = { x: anchor.x + Math.sin(sway) * len, y: anchor.y + Math.cos(sway) * len }
  ctx.strokeStyle = rgba(C.gold, 0.35 + 0.45 * L)
  ctx.lineWidth = 1.6
  ctx.setLineDash([3, 2.5])
  ctx.beginPath()
  ctx.moveTo(anchor.x, anchor.y)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = rgba(C.gold, 0.5 + 0.5 * L)
  ctx.beginPath()
  ctx.ellipse(tip.x, tip.y + 5, 3.5, 6, sway, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** the beam: a soft warm cone from the shade to the desk, with dust turning in it */
function drawCone(ctx: Ctx, t: number, L: number) {
  if (L <= 0) return
  const { nx, ny, mouth } = shadeGeom()
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  const a = { x: mouth.x + nx * 58, y: mouth.y + ny * 58 }
  const b = { x: mouth.x - nx * 58, y: mouth.y - ny * 58 }
  const g = ctx.createLinearGradient(mouth.x, mouth.y, POOL.x, POOL.y)
  g.addColorStop(0, `rgba(242,196,110,${0.2 * L})`)
  g.addColorStop(1, `rgba(242,196,110,${0.04 * L})`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(POOL.x - POOL.rx * 0.95, POOL.y + 10)
  ctx.lineTo(POOL.x + POOL.rx * 0.95, POOL.y + 10)
  ctx.lineTo(b.x, b.y)
  ctx.closePath()
  ctx.fill()
  const pool = ctx.createRadialGradient(POOL.x, POOL.y, 10, POOL.x, POOL.y, POOL.rx)
  pool.addColorStop(0, `rgba(255,210,130,${0.22 * L})`)
  pool.addColorStop(1, "rgba(255,210,130,0)")
  ctx.save()
  ctx.translate(POOL.x, POOL.y)
  ctx.scale(1, POOL.ry / POOL.rx)
  ctx.translate(-POOL.x, -POOL.y)
  ctx.fillStyle = pool
  ctx.fillRect(POOL.x - POOL.rx, POOL.y - POOL.rx, POOL.rx * 2, POOL.rx * 2)
  ctx.restore()
  // dust
  for (let i = 0; i < 26; i++) {
    const period = 9 + hash(i) * 8
    const p = ((t + hash(i + 40) * period) % period) / period
    const u = hash(i + 80)
    const top = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }
    const bot = { x: lerp(POOL.x - POOL.rx * 0.8, POOL.x + POOL.rx * 0.8, u), y: POOL.y - 20 }
    const depth = 1 - p
    const x = lerp(top.x, bot.x, depth) + Math.sin(t * 0.6 + i) * 10
    const y = lerp(top.y, bot.y, depth)
    const alpha = Math.sin(p * Math.PI) * 0.75 * L
    ctx.fillStyle = `rgba(255,226,170,${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, 1.4 + hash(i + 120) * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawSteam(ctx: Ctx, t: number, L: number) {
  const cx = 752
  const top = 556
  ctx.save()
  ctx.lineCap = "round"
  for (let i = 0; i < 3; i++) {
    const period = 3.6
    const p = ((t + i * 1.2) % period) / period
    const alpha = Math.sin(p * Math.PI) * (0.1 + 0.16 * L)
    ctx.strokeStyle = `rgba(240,230,210,${alpha})`
    ctx.lineWidth = 7 - p * 3
    ctx.beginPath()
    const x0 = cx - 18 + i * 18
    const y0 = top - p * 40
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(
      x0 + Math.sin(t * 1.4 + i) * 16,
      y0 - 40,
      x0 - Math.sin(t * 1.1 + i * 2) * 18,
      y0 - 80,
      x0 + Math.sin(t * 0.9 + i) * 10,
      y0 - 120,
    )
    ctx.stroke()
  }
  ctx.restore()
}
