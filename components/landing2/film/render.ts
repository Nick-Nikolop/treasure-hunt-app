/**
 * The Hunt hero film. A deterministic, resolution-independent canvas render:
 * `renderFilm(ctx, t, ...)` draws the frame for time `t` (0..FILM_LENGTH).
 * Scene changes sit on the 97 BPM bar grid of "The Four-Note Question"
 * (bar = 2.472 s, first downbeat 0.15 s) so any score on that grid lines up.
 */

export const FILM_LENGTH = 46
export const BEAT = 0.618
export const BAR = 2.472
export const D = (n: number) => 0.15 + n * BAR
export const STILL_TIME = 38.6

const W = 1920
const H = 1080

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

const C = {
  night: "#0E1A2B",
  teal: "#14394A",
  sea: "#1F5C73",
  roof: "#C4683F",
  stone: "#EFE3C8",
  gold: "#E2B552",
}

function rgbOf(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(a: string, b: string, t: number, alpha = 1) {
  const x = rgbOf(a)
  const y = rgbOf(b)
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t))
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`
}
const rgba = (h: string, a: number) => mix(h, h, 0, a)

const K = {
  sky0: mix(C.night, "#000000", 0.35),
  ridgeFar: mix(C.night, C.teal, 0.55),
  ridgeNear: mix(C.night, C.teal, 0.25),
  hill: mix(C.night, C.teal, 0.4),
  stoneDim: mix(C.stone, C.night, 0.55),
  stoneDeep: mix(C.stone, C.night, 0.7),
  house0: mix(C.stone, C.night, 0.68),
  house1: mix(C.stone, C.night, 0.6),
  roofDim: mix(C.roof, C.night, 0.4),
  winDark: mix(C.night, C.teal, 0.5),
  wall: ["#6F6455", "#7A6C5A", "#5F6460"],
  shutter: mix(C.teal, C.sea, 0.4),
  wood: mix(C.roof, C.night, 0.38),
  woodDark: mix(C.roof, C.night, 0.6),
  iron: mix(C.night, C.teal, 0.2),
  ground: mix(C.night, C.teal, 0.55),
  seaDeep: mix(C.sea, C.night, 0.55),
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eout = (x: number) => 1 - Math.pow(1 - x, 3)
const back = (x: number) => {
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ helpers */

function poly(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()
}
function disc(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + q, y)
  ctx.arcTo(x + w, y, x + w, y + h, q)
  ctx.arcTo(x + w, y + h, x, y + h, q)
  ctx.arcTo(x, y + h, x, y, q)
  ctx.arcTo(x, y, x + w, y, q)
  ctx.closePath()
}
function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number) {
  if (a <= 0.002 || r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.35, rgba(color, a * 0.45))
  g.addColorStop(1, rgba(color, 0))
  const prev = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = "lighter"
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.globalCompositeOperation = prev
}
function cam(ctx: Ctx, cx: number, cy: number, z: number, rot = 0) {
  ctx.translate(W / 2, H / 2)
  ctx.scale(z, z)
  if (rot) ctx.rotate(rot)
  ctx.translate(-cx, -cy)
}
function resample(src: Pt[], step: number): Pt[] {
  const out: Pt[] = [src[0]]
  let carry = 0
  for (let i = 1; i < src.length; i++) {
    const [x0, y0] = src[i - 1]
    const [x1, y1] = src[i]
    const len = Math.hypot(x1 - x0, y1 - y0)
    let d = step - carry
    while (d <= len) {
      const k = d / len
      out.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k])
      d += step
    }
    carry = len - (d - step)
  }
  return out
}
function curve(p0: Pt, c: Pt, p1: Pt, n = 40): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const a = (1 - k) * (1 - k)
    const b = 2 * (1 - k) * k
    const d = k * k
    out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]])
  }
  return out
}

/** Dotted gold trail. `prog` draws it in, `alpha` fades it, newest dots glow. */
function trail(ctx: Ctx, pts: Pt[], prog: number, alpha: number, r = 4.5, from = 0) {
  if (alpha <= 0 || prog <= 0) return
  const n = Math.floor(pts.length * clamp(prog))
  const start = Math.floor(pts.length * from)
  ctx.fillStyle = rgba(C.gold, alpha)
  for (let i = start; i < n; i++) {
    const head = n - i
    const rad = head < 4 ? r * (1 + (4 - head) * 0.18) : r
    ctx.beginPath()
    ctx.arc(pts[i][0], pts[i][1], rad, 0, Math.PI * 2)
    ctx.fill()
  }
  if (n > start && n < pts.length) glow(ctx, pts[n - 1][0], pts[n - 1][1], 46, C.gold, 0.55 * alpha)
}

/* ------------------------------------------------------------------- data */

const R0 = rng(7)
const STARS = Array.from({ length: 190 }, () => ({
  x: R0() * 2600 - 340,
  y: R0() * 760 - 160,
  r: 0.7 + R0() * 1.9,
  ph: R0() * 6.28,
  sp: 0.6 + R0() * 2.2,
}))

function ridge(seed: number, base: number, amp: number, peakX: number): Pt[] {
  const r = rng(seed)
  const pts: Pt[] = []
  for (let x = -420; x <= 2340; x += 42) {
    const peak = Math.exp(-(((x - peakX) / 560) ** 2))
    pts.push([x, base - amp * peak - r() * 34 - Math.sin(x / 120) * 16 - Math.sin(x / 47) * 6])
  }
  return pts
}
const RIDGE_FAR = ridge(11, 650, 250, 560)
const RIDGE_NEAR = ridge(23, 712, 120, 860)

type House = { x: number; y: number; w: number; h: number; row: number; roof: boolean; win: { lit: boolean; ph: number }[] }
const HOUSES: House[] = []
{
  const r = rng(31)
  for (let row = 0; row < 2; row++) {
    let x = 120
    const base = row ? 822 : 800
    while (x < 2060) {
      const w = 34 + r() * 46
      const h = (row ? 28 : 40) + r() * (row ? 34 : 58)
      const n = Math.max(1, Math.floor(w / 17))
      HOUSES.push({ x, y: base, w, h, row, roof: r() > 0.3, win: Array.from({ length: n }, () => ({ lit: r() > 0.5, ph: r() * 6.3 })) })
      x += w + r() * 5
    }
  }
}

type AlleyHouse = { x: number; w: number; h: number; shade: number; flower: boolean; door: boolean; lit: boolean[]; line: boolean }
const ALLEY: AlleyHouse[] = []
let ALLEY_L = 0
{
  const r = rng(41)
  let x = 0
  while (x < 2700) {
    const w = 230 + r() * 140
    const h = 440 + r() * 220
    ALLEY.push({
      x,
      w,
      h,
      shade: Math.floor(r() * 3),
      flower: r() > 0.5,
      door: r() > 0.3,
      lit: Array.from({ length: 12 }, () => r() > 0.62),
      line: r() > 0.45,
    })
    x += w
  }
  ALLEY_L = x
}

const CASTLE: Pt = [1355, 528]
const ROUTE_A = resample(
  [
    [1355, 548],
    [1290, 640],
    [1190, 716],
    [1040, 758],
    [880, 772],
    [720, 790],
  ],
  17,
)
const ROUTE_B = resample(curve([1355, 548], [1180, 600], [1010, 790]), 17)
const ROUTES_ALL = (
  [
    [[200, 806], [720, 640]],
    [[520, 880], [900, 760]],
    [[860, 846], [1100, 700]],
    [[1120, 900], [1200, 760]],
    [[1720, 870], [1520, 720]],
    [[1960, 760], [1650, 610]],
    [[1600, 980], [1420, 800]],
  ] as [Pt, Pt][]
).map(([p0, c]) => resample(curve(p0, c, [CASTLE[0], CASTLE[1] + 18]), 16))

/* Top-down map (scene 6) */
const MAP_CASTLE: Pt = [1290, 420]
const MAP_STREETS: [Pt, Pt][] = []
{
  const r = rng(77)
  for (let gx = 160; gx < 2100; gx += 72) {
    for (let gy = -40; gy < 800; gy += 72) {
      const jx = (r() - 0.5) * 22
      const jy = (r() - 0.5) * 22
      if (r() > 0.45) MAP_STREETS.push([[gx + jx, gy + jy], [gx + 72 + jx, gy + jy + (r() - 0.5) * 10]])
      if (r() > 0.55) MAP_STREETS.push([[gx + jx, gy + jy], [gx + jx + (r() - 0.5) * 10, gy + 72 + jy]])
    }
  }
}
const coastY = (x: number) => 690 + Math.sin(x / 180) * 26 + Math.sin(x / 61) * 8 - Math.exp(-(((x - 1500) / 260) ** 2)) * 60
const MAP_ROUTES = (
  [
    [1880, 120],
    [260, 80],
    [1900, 650],
    [420, 690],
    [980, 30],
  ] as Pt[]
).map((s, i) => {
  const r = rng(90 + i)
  const pts: Pt[] = [s]
  let [x, y] = s
  for (let k = 0; k < 16; k++) {
    const dx = MAP_CASTLE[0] - x
    const dy = MAP_CASTLE[1] - y
    if ((k + i) % 2 === 0) x += Math.sign(dx) * Math.min(Math.abs(dx), 72 * (1 + Math.floor(r() * 2)))
    else y += Math.sign(dy) * Math.min(Math.abs(dy), 72 * (1 + Math.floor(r() * 2)))
    pts.push([x + (r() - 0.5) * 10, y + (r() - 0.5) * 10])
  }
  return resample(pts, 9)
})

/* Climax particles */
const COINS = Array.from({ length: 52 }, (_, i) => {
  const r = rng(300 + i)
  return { vx: (r() - 0.5) * 1100, vy: -780 - r() * 760, delay: r() * 0.25, spin: 6 + r() * 12, floor: 862 + r() * 40 }
})
const CONFETTI = Array.from({ length: 90 }, (_, i) => {
  const r = rng(500 + i)
  const colors = [C.roof, C.gold, C.stone, C.sea]
  return {
    x: 1300 + (r() - 0.5) * 300,
    vx: (r() - 0.5) * 900,
    vy: -600 - r() * 700,
    rot: r() * 6,
    vr: (r() - 0.5) * 14,
    color: colors[i % 4],
    delay: 0.1 + r() * 0.5,
    w: 8 + r() * 10,
  }
})

/* ------------------------------------------------------------ set pieces */

function sky(ctx: Ctx, t: number, top = -200, bottom = 1300, twinkle = 1) {
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, K.sky0)
  g.addColorStop(0.55, C.night)
  g.addColorStop(1, C.teal)
  ctx.fillStyle = g
  ctx.fillRect(-600, top - 600, W + 1200, bottom - top + 1200)
  for (const s of STARS) {
    const a = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * twinkle
    ctx.fillStyle = rgba(C.stone, a)
    ctx.fillRect(s.x, s.y + top + 200, s.r, s.r)
  }
}

function moon(ctx: Ctx, x: number, y: number, r: number) {
  glow(ctx, x, y, r * 5, C.stone, 0.12)
  disc(ctx, x, y, r, C.stone)
  disc(ctx, x + r * 0.42, y - r * 0.22, r * 0.86, C.night)
}

function fillRidge(ctx: Ctx, pts: Pt[], color: string, rimA: number) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], H + 600)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], H + 600)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  if (rimA > 0) {
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
    ctx.strokeStyle = rgba(C.gold, rimA)
    ctx.lineWidth = 2.2
    ctx.stroke()
  }
}

function castleBuilding(ctx: Ctx, x: number, y: number, s: number, light: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = K.stoneDim
  ctx.fillRect(-85, 20, 170, 58)
  ctx.fillRect(-100, -2, 36, 80)
  ctx.fillRect(56, 4, 34, 74)
  ctx.fillRect(-26, -18, 52, 40)
  for (let i = -85; i < 85; i += 17) ctx.fillRect(i, 12, 10, 10)
  for (let i = -100; i < -64; i += 12) ctx.fillRect(i, -10, 8, 9)
  for (let i = 56; i < 90; i += 12) ctx.fillRect(i, -4, 8, 9)
  for (let i = -26; i < 26; i += 13) ctx.fillRect(i, -26, 8, 9)
  ctx.fillStyle = rgba(C.gold, 0.18)
  ctx.fillRect(-100, -2, 3, 80)
  ctx.fillRect(-26, -18, 3, 40)
  disc(ctx, 0, 72, 14, C.night)
  ctx.fillRect(-14, 72, 28, 8)
  ctx.restore()
  if (light > 0) {
    const ls = s || 1
    const fl = light * (0.86 + 0.14 * Math.sin(t * 11) * Math.sin(t * 3.3))
    glow(ctx, x, y, 170 * ls * (0.7 + fl * 0.5), C.gold, 0.6 * fl)
    disc(ctx, x, y, 8 * ls * (0.6 + fl * 0.5), rgba(C.gold, fl))
    disc(ctx, x, y, 3.5 * ls, rgba(C.stone, fl))
  }
}

function palm(ctx: Ctx, x: number, y: number, s: number, t: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(6, -40, 2, -78)
  ctx.stroke()
  const sway = Math.sin(t * 1.4 + x * 0.01) * 0.12
  ctx.lineWidth = 4
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.48 + sway
    ctx.beginPath()
    ctx.moveTo(2, -78)
    ctx.quadraticCurveTo(2 + Math.cos(a) * 26, -78 + Math.sin(a) * 26 - 8, 2 + Math.cos(a) * 44, -78 + Math.sin(a) * 44 + 12)
    ctx.stroke()
  }
  ctx.restore()
}

/** Wide night view of Kalamata. Used at the opening and the finale. */
function city(ctx: Ctx, t: number, light: number, dim: number) {
  sky(ctx, t)
  moon(ctx, 1640, 190, 44)
  fillRidge(ctx, RIDGE_FAR, K.ridgeFar, 0.1)
  fillRidge(ctx, RIDGE_NEAR, K.ridgeNear, 0.06)
  ctx.beginPath()
  ctx.moveTo(1040, 820)
  ctx.bezierCurveTo(1170, 650, 1250, 606, 1355, 604)
  ctx.bezierCurveTo(1460, 604, 1560, 660, 1700, 820)
  ctx.closePath()
  ctx.fillStyle = K.hill
  ctx.fill()
  castleBuilding(ctx, CASTLE[0], CASTLE[1] + 14, 0.8, 0, t)

  for (const h of HOUSES) {
    ctx.fillStyle = h.row ? K.house1 : K.house0
    ctx.fillRect(h.x, h.y - h.h, h.w, h.h)
    if (h.roof) {
      ctx.fillStyle = K.roofDim
      ctx.beginPath()
      ctx.moveTo(h.x - 3, h.y - h.h)
      ctx.lineTo(h.x + h.w / 2, h.y - h.h - h.w * 0.32)
      ctx.lineTo(h.x + h.w + 3, h.y - h.h)
      ctx.fill()
    }
    h.win.forEach((wn, i) => {
      const wx = h.x + 6 + i * 16
      const wy = h.y - h.h + 10
      ctx.fillStyle = wn.lit ? rgba(C.gold, 0.55 + 0.4 * Math.sin(t * 0.9 + wn.ph) ** 2) : K.winDark
      ctx.fillRect(wx, wy, 7, 9)
    })
  }

  ctx.fillStyle = K.stoneDim
  ctx.fillRect(940, 740, 120, 66)
  ctx.beginPath()
  ctx.arc(1000, 740, 30, Math.PI, 0)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(958, 752, 15, Math.PI, 0)
  ctx.arc(1042, 752, 15, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(1070, 690, 22, 116)
  ctx.beginPath()
  ctx.arc(1081, 690, 11, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = rgba(C.gold, 0.6)
  ctx.fillRect(994, 758, 12, 18)

  ctx.fillStyle = K.ridgeNear
  ctx.fillRect(-600, 826, W + 1200, 8)
  for (let x = 140; x < 2000; x += 132) palm(ctx, x, 830, 0.55, t, mix(C.night, C.teal, 0.15))

  const sg = ctx.createLinearGradient(0, 832, 0, 1150)
  sg.addColorStop(0, K.seaDeep)
  sg.addColorStop(1, C.night)
  ctx.fillStyle = sg
  ctx.fillRect(-600, 832, W + 1200, 900)
  for (let i = 0; i < 16; i++) {
    const y = 846 + i * 14
    const w = 30 + (16 - i) * 4 + Math.sin(t * 2 + i * 1.7) * 14
    ctx.fillStyle = rgba(C.stone, 0.18 + 0.12 * Math.sin(t * 3 + i))
    ctx.fillRect(1640 - w / 2 + Math.sin(t + i) * 10, y, w, 2.5)
  }

  if (dim > 0) {
    ctx.fillStyle = rgba(C.night, dim * 0.85)
    ctx.fillRect(-600, -1200, W + 1200, H + 2400)
  }
  castleBuilding(ctx, CASTLE[0], CASTLE[1], 0, light, t)
}

function pulseRing(ctx: Ctx, x: number, y: number, age: number, maxR = 360, lw = 5) {
  if (age < 0 || age > 1.4) return
  const k = eout(age / 1.4)
  ctx.beginPath()
  ctx.arc(x, y, 10 + k * maxR, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(C.gold, (1 - k) * 0.7)
  ctx.lineWidth = lw * (1 - k) + 1
  ctx.stroke()
}

type Acc = "scarf" | "cap" | "pack"
type Pose = {
  run?: number
  lean?: number
  arms?: "run" | "up" | "point" | "hold" | "lean" | "cheer" | "idle"
  jump?: number
  tuck?: boolean
  skid?: boolean
  face?: 1 | -1
}

/** Kurzgesagt-style stick figure. Returns the front hand position in world space. */
function figure(ctx: Ctx, x: number, y: number, s: number, acc: Acc, p: Pose, t: number): Pt {
  const face = p.face ?? 1
  const lift = p.jump ?? 0
  ctx.save()
  ctx.translate(x, y - lift)
  ctx.scale(s * face, s)
  const run = p.run
  const bob = run !== undefined ? -Math.abs(Math.cos(run)) * 7 : 0
  const lean = p.lean ?? (run !== undefined ? 0.2 : 0)
  const hip: Pt = [0, -64 + bob]
  const sh: Pt = [hip[0] + Math.sin(lean) * 54, hip[1] - Math.cos(lean) * 54]
  const head: Pt = [sh[0] + Math.sin(lean) * 27, sh[1] - Math.cos(lean) * 27]
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  if (acc === "pack") {
    ctx.save()
    ctx.translate((hip[0] + sh[0]) / 2 - 15, (hip[1] + sh[1]) / 2 - 6)
    ctx.rotate(lean)
    rr(ctx, -13, -21, 25, 40, 8)
    ctx.fillStyle = C.sea
    ctx.fill()
    ctx.strokeStyle = rgba(C.stone, 0.35)
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  ctx.strokeStyle = C.stone
  ctx.lineWidth = 7
  for (const side of [0, Math.PI]) {
    let th: number
    let kn: number
    if (p.tuck) {
      th = side ? 0.65 : -0.2
      kn = 1.3
    } else if (run !== undefined) {
      const ph = run + side
      th = Math.sin(ph) * 0.78
      kn = 0.2 + Math.max(0, Math.sin(ph + 1.7))
    } else if (p.skid) {
      th = side ? 0.75 : -0.12
      kn = side ? 0.05 : 0.55
    } else {
      th = side ? 0.13 : -0.13
      kn = 0.04
    }
    const knee: Pt = [hip[0] + Math.sin(th) * 32, hip[1] + Math.cos(th) * 32]
    const foot: Pt = [knee[0] + Math.sin(th - kn) * 32, knee[1] + Math.cos(th - kn) * 32]
    poly(ctx, [hip, knee, foot])
  }
  poly(ctx, [hip, sh])

  let hand: Pt = sh
  const arms = p.arms ?? (run !== undefined ? "run" : "idle")
  for (const side of [1, 0]) {
    let ua = 0
    let fa = 0
    if (arms === "run") {
      const ph = (run ?? 0) + (side ? 0 : Math.PI)
      ua = Math.sin(ph) * 0.85
      fa = ua + 1.25
    } else if (arms === "up") {
      ua = side ? Math.PI + 0.45 : Math.PI - 0.45
      fa = ua
    } else if (arms === "cheer") {
      const w = Math.sin(t * 15 + side * 2) * 0.22
      ua = side ? Math.PI + 0.55 + w : Math.PI - 0.55 - w
      fa = ua + (side ? 0.25 : -0.25)
    } else if (arms === "point") {
      if (side === 0) {
        ua = 2.25
        fa = 2.3
      } else {
        ua = -0.2
        fa = 0.05
      }
    } else if (arms === "hold") {
      if (side === 0) {
        ua = 0.55
        fa = 1.95
      } else {
        ua = -0.15
        fa = 0.15
      }
    } else if (arms === "lean") {
      ua = 0.75 + side * 0.15
      fa = 1.35
    } else {
      ua = side ? 0.13 : -0.13
      fa = ua + 0.12
    }
    const el: Pt = [sh[0] + Math.sin(ua) * 28, sh[1] + Math.cos(ua) * 28]
    const hd: Pt = [el[0] + Math.sin(fa) * 28, el[1] + Math.cos(fa) * 28]
    poly(ctx, [sh, el, hd])
    if (side === 0) hand = hd
  }

  disc(ctx, head[0], head[1], 17, C.stone)
  disc(ctx, head[0] + 6, head[1] - 3, 2.7, C.night)
  disc(ctx, head[0] + 13, head[1] - 3, 2.7, C.night)

  if (acc === "scarf") {
    const flap = Math.sin(t * 13) * (run !== undefined ? 1 : 0.35)
    ctx.strokeStyle = C.roof
    ctx.lineWidth = 9
    poly(ctx, [
      [sh[0] - 9, sh[1] - 5],
      [sh[0] + 8, sh[1] - 8],
    ])
    ctx.lineWidth = 7
    poly(ctx, [
      [sh[0] - 7, sh[1] - 5],
      [sh[0] - 30, sh[1] + 2 + flap * 5],
      [sh[0] - 50, sh[1] - 2 + flap * 10],
    ])
  } else if (acc === "cap") {
    ctx.beginPath()
    ctx.arc(head[0], head[1] - 3, 18, Math.PI, 0)
    ctx.fillStyle = C.gold
    ctx.fill()
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 6
    poly(ctx, [
      [head[0] + 4, head[1] - 4],
      [head[0] + 31, head[1] - 4],
    ])
  }
  ctx.restore()
  return [x + hand[0] * s * face, y - lift + hand[1] * s]
}

function phone(ctx: Ctx, x: number, y: number, s: number, light: number, rot = 0, needle?: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  if (light > 0) glow(ctx, 0, 0, 110, C.gold, 0.5 * light)
  rr(ctx, -15, -26, 30, 52, 7)
  ctx.fillStyle = C.night
  ctx.fill()
  ctx.strokeStyle = C.stone
  ctx.lineWidth = 2.5
  ctx.stroke()
  rr(ctx, -11, -21, 22, 42, 3)
  ctx.fillStyle = mix(C.night, C.gold, 0.15 + light * 0.85)
  ctx.fill()
  if (light > 0.2) {
    ctx.beginPath()
    ctx.arc(0, 0, 7, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(C.night, light)
    ctx.lineWidth = 1.8
    ctx.stroke()
    const a = needle ?? -0.6
    ctx.fillStyle = rgba(C.roof, light)
    ctx.beginPath()
    ctx.moveTo(Math.sin(a) * 7, -Math.cos(a) * 7)
    ctx.lineTo(Math.cos(a) * 2, Math.sin(a) * 2)
    ctx.lineTo(-Math.cos(a) * 2, -Math.sin(a) * 2)
    ctx.fill()
  }
  ctx.restore()
}

function compass(ctx: Ctx, x: number, y: number, r: number, needle: number, a: number) {
  if (a <= 0) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, x, y, r * 2.4, C.gold, 0.35)
  disc(ctx, x, y, r, mix(C.night, C.teal, 0.4))
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = C.gold
  ctx.lineWidth = r * 0.08
  ctx.stroke()
  for (let i = 0; i < 32; i++) {
    const ang = (i / 32) * Math.PI * 2
    const l = i % 8 === 0 ? 0.2 : i % 2 === 0 ? 0.12 : 0.07
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(ang) * r * 0.9, y + Math.sin(ang) * r * 0.9)
    ctx.lineTo(x + Math.cos(ang) * r * (0.9 - l), y + Math.sin(ang) * r * (0.9 - l))
    ctx.strokeStyle = rgba(C.stone, 0.7)
    ctx.lineWidth = r * 0.025
    ctx.stroke()
  }
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.12)
  ctx.lineTo(x - r * 0.08, y - r * 0.98)
  ctx.lineTo(x + r * 0.08, y - r * 0.98)
  ctx.fill()
  ctx.translate(x, y)
  ctx.rotate(needle)
  ctx.fillStyle = C.roof
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.72)
  ctx.lineTo(r * 0.11, 0)
  ctx.lineTo(-r * 0.11, 0)
  ctx.fill()
  ctx.fillStyle = C.stone
  ctx.beginPath()
  ctx.moveTo(0, r * 0.72)
  ctx.lineTo(r * 0.11, 0)
  ctx.lineTo(-r * 0.11, 0)
  ctx.fill()
  disc(ctx, 0, 0, r * 0.07, C.gold)
  ctx.restore()
}

function ringArcs(ctx: Ctx, cx: number, cy: number, R: number, prog: number, lw: number, a: number) {
  if (a <= 0 || prog <= 0) return
  const gaps = [0.21, 0.24, 0.21, 0.24]
  for (let k = 0; k < 4; k++) {
    const start = -Math.PI / 2 + k * (Math.PI / 2) + gaps[k]
    const end = -Math.PI / 2 + (k + 1) * (Math.PI / 2) - gaps[(k + 1) % 4]
    const e = start + (end - start) * clamp(prog)
    ctx.beginPath()
    ctx.arc(cx, cy, R, start, e)
    ctx.strokeStyle = rgba(C.gold, a * 0.25)
    ctx.lineWidth = lw * 4
    ctx.lineCap = "round"
    ctx.stroke()
    ctx.strokeStyle = rgba(C.gold, a)
    ctx.lineWidth = lw
    ctx.stroke()
    if (prog < 1) glow(ctx, cx + Math.cos(e) * R, cy + Math.sin(e) * R, R * 0.35, C.gold, a * 0.6)
  }
}

/* --------------------------------------------------------------- scenes */

/** 1. The city keeps a secret. */
function sceneCity(ctx: Ctx, t: number) {
  const p = eio(seg(t, 0, D(2)))
  ctx.save()
  cam(ctx, lerp(960, 1090, p), lerp(540, 575, p), 1 + 0.07 * p)
  const light = t < 0.15 ? 0 : seg(t, 0.15, 0.5) * (t < 0.42 ? (Math.sin(t * 70) > 0 ? 1 : 0.3) : 1)
  city(ctx, t, light, 0)
  pulseRing(ctx, CASTLE[0], CASTLE[1], t - D(1), 420)
  pulseRing(ctx, CASTLE[0], CASTLE[1], t - D(2) + 0.05, 260)
  trail(ctx, ROUTE_A, eio(seg(t, D(1), D(1) + 1.6)), 1 - seg(t, D(1) + 1.9, D(2) - 0.1))
  trail(ctx, ROUTE_B, eio(seg(t, D(2) - 0.3, D(2) + 0.3)), 1)
  ctx.restore()
}

function cafeBackdrop(ctx: Ctx, t: number) {
  ctx.fillStyle = K.wall[0]
  ctx.fillRect(-300, -300, W + 600, H + 600)
  ctx.fillStyle = rgba(C.night, 0.18)
  for (let y = 40; y < 880; y += 64) {
    const off = (y / 64) % 2 ? 0 : 70
    for (let x = -100 + off; x < W + 200; x += 140) ctx.fillRect(x, y, 2, 64)
    ctx.fillRect(-300, y, W + 600, 2)
  }
  ctx.fillStyle = mix(C.night, C.teal, 0.25)
  ctx.beginPath()
  ctx.moveTo(250, 880)
  ctx.lineTo(250, 380)
  ctx.arc(480, 380, 230, Math.PI, 0)
  ctx.lineTo(710, 880)
  ctx.fill()
  ctx.fillStyle = C.teal
  rr(ctx, 1690, 420, 200, 460, 10)
  ctx.fill()
  ctx.fillStyle = rgba(C.stone, 0.12)
  for (let i = 0; i < 4; i++) ctx.fillRect(1712 + i * 46, 446, 6, 410)

  const lx = 1590
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 2.7)
  glow(ctx, lx, 300, 320, C.gold, 0.32 * fl)
  ctx.strokeStyle = K.iron
  ctx.lineWidth = 5
  poly(ctx, [
    [lx + 70, 230],
    [lx, 230],
    [lx, 262],
  ])
  rr(ctx, lx - 22, 262, 44, 66, 8)
  ctx.fillStyle = K.iron
  ctx.fill()
  rr(ctx, lx - 15, 270, 30, 50, 5)
  ctx.fillStyle = rgba(C.gold, fl)
  ctx.fill()

  const r = rng(5)
  const clusters: Pt[] = [
    [1330, 40],
    [1520, 90],
    [1760, 30],
    [1900, 150],
  ]
  for (let i = 0; i < 220; i++) {
    const [cx0, cy0] = clusters[i % 4]
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 120
    const x = cx0 + Math.cos(a) * d * 1.4
    const y = cy0 + Math.sin(a) * d * 0.8
    const sw = Math.sin(t * 1.6 + i) * 2
    const leaf = i % 4 === 0
    disc(ctx, x + sw, y, leaf ? 9 + r() * 6 : 5 + r() * 6, leaf ? mix(C.night, C.teal, 0.45) : i % 3 ? "#B4506B" : mix(C.roof, "#B4506B", 0.4))
  }

  ctx.strokeStyle = rgba(C.night, 0.5)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-50, 120)
  ctx.quadraticCurveTo(700, 260, 1300, 150)
  ctx.stroke()
  for (let i = 0; i < 14; i++) {
    const k = i / 13
    const x = lerp(-50, 1300, k)
    const y = (1 - k) * (1 - k) * 120 + 2 * (1 - k) * k * 260 + k * k * 150
    const a = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.3)
    glow(ctx, x, y + 10, 34, C.gold, 0.35 * a)
    disc(ctx, x, y + 10, 6, rgba(C.gold, a))
  }

  ctx.fillStyle = K.stoneDeep
  ctx.fillRect(-300, 880, W + 600, 400)
  ctx.fillStyle = rgba(C.night, 0.25)
  for (let x = -300; x < W + 300; x += 90) ctx.fillRect(x, 880, 3, 400)
  ctx.fillRect(-300, 940, W + 600, 3)
}

function envelopeAndMap(ctx: Ctx, t: number) {
  const e = t - D(3)
  if (e < 0) return
  const rise = back(seg(e, 0, 0.45))
  const unfold = eio(seg(t, 8.2, 8.78))
  const grow = eio(seg(t, 9.6, D(4) + 0.2))
  const x = 1300
  const y = lerp(690, 455, rise) + Math.sin(t * 2.4) * 6 * unfold
  const sc = clamp(rise, 0, 1.2) * (1 + grow * 5.5)
  const w = lerp(210, 440, unfold)
  const h = lerp(136, 290, unfold)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(sc, sc)
  ctx.rotate(lerp(-0.06, 0.02, unfold))
  glow(ctx, 0, 0, 340, C.gold, 0.28)
  ctx.fillStyle = rgba(C.night, 0.35)
  rr(ctx, -w / 2 + 10, -h / 2 + 14, w, h, 6)
  ctx.fill()
  ctx.fillStyle = C.stone
  rr(ctx, -w / 2, -h / 2, w, h, 6)
  ctx.fill()

  if (unfold < 1) {
    ctx.globalAlpha = 1 - unfold
    ctx.strokeStyle = rgba(C.night, 0.25)
    ctx.lineWidth = 3
    poly(ctx, [
      [-w / 2, -h / 2],
      [0, 8],
      [w / 2, -h / 2],
    ])
    const crack = seg(t, 8.05, 8.12)
    disc(ctx, 0, 6, 24, C.roof)
    disc(ctx, 0, 6, 16, mix(C.roof, C.night, 0.25))
    if (crack > 0) {
      ctx.strokeStyle = C.stone
      ctx.lineWidth = 3
      poly(ctx, [
        [-10, -12],
        [2, 4],
        [-4, 12],
        [8, 28],
      ])
    }
    ctx.globalAlpha = 1
  }
  if (unfold > 0) {
    ctx.globalAlpha = unfold
    ctx.strokeStyle = rgba(C.night, 0.15)
    ctx.lineWidth = 2
    for (const fx of [-w / 6, w / 6]) poly(ctx, [
      [fx, -h / 2],
      [fx, h / 2],
    ])
    ctx.fillStyle = mix(C.stone, C.sea, 0.35)
    ctx.beginPath()
    ctx.moveTo(-w / 2, h * 0.18)
    for (let i = 0; i <= 20; i++) {
      const xx = -w / 2 + (w * i) / 20
      ctx.lineTo(xx, h * 0.18 + Math.sin(i * 0.9) * 8 - Math.exp(-(((i - 14) / 3) ** 2)) * 22)
    }
    ctx.lineTo(w / 2, h / 2)
    ctx.lineTo(-w / 2, h / 2)
    ctx.fill()
    ctx.fillStyle = rgba(C.night, 0.18)
    for (let i = 0; i < 26; i++) {
      const r = rng(60 + i)
      ctx.fillRect(-w / 2 + 20 + r() * (w - 60), -h / 2 + 20 + r() * (h * 0.55), 8 + r() * 14, 6 + r() * 8)
    }
    const route = resample(
      [
        [-w * 0.38, h * 0.08],
        [-w * 0.18, -h * 0.05],
        [-w * 0.02, h * 0.06],
        [w * 0.14, -h * 0.12],
        [w * 0.3, -h * 0.26],
      ],
      9,
    )
    ctx.globalAlpha = unfold
    trail(ctx, route, eio(seg(t, 8.6, 9.5)), 1, 3)
    ctx.strokeStyle = C.roof
    ctx.lineWidth = 5
    ctx.lineCap = "round"
    const X: Pt = [w * 0.3, -h * 0.26]
    poly(ctx, [
      [X[0] - 9, X[1] - 9],
      [X[0] + 9, X[1] + 9],
    ])
    poly(ctx, [
      [X[0] + 9, X[1] - 9],
      [X[0] - 9, X[1] + 9],
    ])
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** 2. The invitation. */
function sceneCafe(ctx: Ctx, t: number) {
  ctx.save()
  cam(ctx, 1150, 560, 1 + 0.035 * seg(t, D(2), D(4)))
  cafeBackdrop(ctx, t)

  ctx.fillStyle = rgba(C.night, 0.35)
  ctx.beginPath()
  ctx.ellipse(1300, 888, 260, 16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = K.iron
  ctx.lineWidth = 10
  poly(ctx, [
    [1300, 770],
    [1300, 880],
  ])
  poly(ctx, [
    [1230, 882],
    [1370, 882],
  ])
  ctx.fillStyle = K.stoneDim
  ctx.beginPath()
  ctx.ellipse(1300, 762, 230, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.stone
  ctx.beginPath()
  ctx.ellipse(1300, 754, 230, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  for (const cx of [1160, 1438]) {
    ctx.fillStyle = C.stone
    rr(ctx, cx - 18, 712, 36, 38, 6)
    ctx.fill()
    ctx.strokeStyle = C.stone
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(cx + 22, 730, 9, -1.2, 1.2)
    ctx.stroke()
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = rgba(C.stone, 0.25)
      ctx.lineWidth = 3
      const w = Math.sin(t * 2 + k + cx)
      ctx.beginPath()
      ctx.moveTo(cx - 6 + k * 12, 704)
      ctx.quadraticCurveTo(cx - 14 + k * 12 + w * 8, 680, cx - 4 + k * 12, 656)
      ctx.stroke()
    }
  }

  const on = seg(t, 5.5, 5.62)
  const buzz = t > 5.5 && t < 6.4 ? Math.sin(t * 90) * 2.5 * (Math.sin(t * 18) > 0 ? 1 : 0) : 0
  const lightUp = clamp(on + (t > 6.4 ? 0 : 0))
  phone(ctx, 1300 + buzz, 712, 1.6, lightUp, buzz * 0.01)
  if (lightUp > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const g = ctx.createLinearGradient(0, 700, 0, 380)
    g.addColorStop(0, rgba(C.gold, 0.22 * lightUp))
    g.addColorStop(1, rgba(C.gold, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(1280, 700)
    ctx.lineTo(1120, 360)
    ctx.lineTo(1480, 360)
    ctx.lineTo(1320, 700)
    ctx.fill()
    ctx.restore()
  }

  const walk = seg(t, 5.7, 6.7)
  const sx = lerp(820, 1045, eio(walk))
  figure(
    ctx,
    sx,
    890,
    1.3,
    "scarf",
    walk < 1 ? { run: walk * Math.PI * 4, lean: 0.08 } : { lean: 0.32 * eio(seg(t, 6.7, 7.2)), arms: "lean" },
    t,
  )
  const pop1 = back(seg(t, 8.8, 9.12))
  if (pop1 > 0) {
    ctx.save()
    ctx.translate(1565, 890)
    ctx.scale(pop1, pop1)
    figure(ctx, 0, 0, 1.3, "cap", { face: -1, lean: 0.18, arms: "lean" }, t)
    ctx.restore()
  }
  const pop2 = back(seg(t, 9.41, 9.72))
  if (pop2 > 0) {
    ctx.save()
    ctx.translate(1720, 890)
    ctx.scale(pop2, pop2)
    figure(ctx, 0, 0, 1.3, "pack", { face: -1, lean: 0.1, arms: "idle" }, t)
    ctx.restore()
  }
  envelopeAndMap(ctx, t)
  ctx.restore()
}

function alleyHouse(ctx: Ctx, h: AlleyHouse, x: number, t: number, base: number) {
  const top = base - h.h
  ctx.fillStyle = K.wall[h.shade]
  ctx.fillRect(x, top, h.w + 1, h.h)
  ctx.fillStyle = rgba(C.gold, 0.08)
  ctx.fillRect(x, top, 4, h.h)
  ctx.fillStyle = K.roofDim
  ctx.fillRect(x - 10, top - 18, h.w + 20, 22)
  ctx.fillStyle = mix(C.roof, C.night, 0.2)
  for (let i = 0; i < h.w + 20; i += 22) {
    ctx.beginPath()
    ctx.arc(x - 10 + i + 11, top - 18, 11, Math.PI, 0)
    ctx.fill()
  }
  const floors = Math.max(2, Math.floor((h.h - 140) / 135))
  const cols = h.w > 300 ? 3 : 2
  let wi = 0
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + ((c + 0.5) * h.w) / cols - 24
      const wy = top + 46 + f * 135
      const lit = h.lit[wi++ % h.lit.length]
      ctx.fillStyle = lit ? rgba(C.gold, 0.8 + 0.2 * Math.sin(t * 1.3 + wi)) : K.winDark
      rr(ctx, wx, wy, 48, 70, 4)
      ctx.fill()
      if (lit) glow(ctx, wx + 24, wy + 35, 90, C.gold, 0.18)
      ctx.fillStyle = K.shutter
      ctx.fillRect(wx - 18, wy, 16, 70)
      ctx.fillRect(wx + 50, wy, 16, 70)
    }
  }
  if (h.door) {
    ctx.fillStyle = mix(C.sea, C.night, 0.35)
    rr(ctx, x + h.w / 2 - 38, base - 150, 76, 150, 36)
    ctx.fill()
    disc(ctx, x + h.w / 2 + 20, base - 72, 4, C.gold)
  }
  if (h.flower) {
    const r = rng(Math.round(h.x))
    for (let i = 0; i < 46; i++) {
      const fx = x + h.w * 0.15 + r() * h.w * 0.7
      const fy = top + 30 + r() * 140
      disc(ctx, fx + Math.sin(t * 1.7 + i) * 2, fy, 8 + r() * 10, i % 3 ? mix(C.roof, "#B0476A", 0.45) : mix(C.night, C.teal, 0.55))
    }
  }
}

function washing(ctx: Ctx, x0: number, x1: number, y: number, t: number) {
  ctx.strokeStyle = rgba(C.stone, 0.45)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.quadraticCurveTo((x0 + x1) / 2, y + 60, x1, y)
  ctx.stroke()
  const cols = [C.stone, C.sea, C.roof, C.gold]
  for (let i = 1; i < 6; i++) {
    const k = i / 6
    const cx = lerp(x0, x1, k)
    const cy = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * (y + 60) + k * k * y
    const sw = Math.sin(t * 3 + i) * 0.12
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(sw)
    ctx.fillStyle = mix(cols[i % 4], C.night, 0.25)
    ctx.fillRect(-16, 0, 32, 40 + (i % 2) * 12)
    ctx.restore()
  }
}

function cat(ctx: Ctx, x: number, y: number, s: number, t: number, lift: number, alarmed: number) {
  ctx.save()
  ctx.translate(x, y - lift)
  ctx.scale(s, s)
  const col = mix(C.night, "#000000", 0.2)
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.ellipse(0, -16 - alarmed * 6, 28, 14 + alarmed * 6, 0, 0, Math.PI * 2)
  ctx.fill()
  disc(ctx, 24, -32, 12, col)
  ctx.beginPath()
  ctx.moveTo(16, -40)
  ctx.lineTo(20, -56)
  ctx.lineTo(26, -42)
  ctx.moveTo(26, -42)
  ctx.lineTo(32, -55)
  ctx.lineTo(34, -38)
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(-26, -18)
  ctx.quadraticCurveTo(-50, -20 - alarmed * 30, -44 + Math.sin(t * 3) * 6, -52 - alarmed * 20)
  ctx.stroke()
  ctx.lineWidth = 5
  for (const lx of [-16, 14]) poly(ctx, [
    [lx, -8],
    [lx + (alarmed ? (lx < 0 ? -8 : 8) : 0), 0],
  ])
  disc(ctx, 22, -34, 2.6, C.gold)
  disc(ctx, 30, -34, 2.6, C.gold)
  ctx.restore()
}

/** 3. Go! Side-scrolling run through the old town. */
function sceneAlley(ctx: Ctx, t: number) {
  const lt = t - D(4)
  const off = lt * 430
  ctx.save()
  cam(ctx, 960, 540, 1)
  sky(ctx, t)
  ctx.save()
  ctx.translate(-off * 0.04, -60)
  fillRidge(ctx, RIDGE_FAR, K.ridgeFar, 0.08)
  ctx.restore()

  const base = 910
  const mOff = (off * 0.42) % ALLEY_L
  for (const rep of [0, ALLEY_L]) {
    for (let i = 0; i < ALLEY.length; i++) {
      const h = ALLEY[i]
      const x = h.x + rep - mOff
      if (x > W + 100 || x + h.w < -200) continue
      alleyHouse(ctx, h, x, t, base)
    }
  }
  for (const rep of [0, ALLEY_L]) {
    for (let i = 0; i < ALLEY.length - 1; i++) {
      const a = ALLEY[i]
      if (!a.line) continue
      const b = ALLEY[i + 1]
      const x = a.x + rep - mOff
      if (x > W + 300 || x < -700) continue
      const y = base - Math.min(a.h, b.h) + 120
      washing(ctx, x + a.w * 0.5, x + a.w + b.w * 0.5, y, t)
    }
  }

  const catX = 1540 - (off * 0.42 - 900)
  const jumpK = seg(t, D(5), D(5) + 0.5)
  cat(ctx, catX, base - 330, 1.2, t, Math.sin(jumpK * Math.PI) * 120, t > D(5) - 0.05 ? 1 : 0)
  ctx.fillStyle = K.house1
  ctx.fillRect(catX - 70, base - 330, 160, 14)

  ctx.fillStyle = K.stoneDeep
  ctx.fillRect(-100, base, W + 200, 300)
  ctx.fillStyle = rgba(C.night, 0.3)
  const cob = off % 64
  for (let row = 0; row < 4; row++) {
    for (let x = -cob - (row % 2) * 32; x < W + 64; x += 64) {
      rr(ctx, x, base + 14 + row * 40, 56, 30, 12)
      ctx.fill()
    }
  }

  const phase = (lt / BEAT) * Math.PI
  figure(ctx, 1170, base + 20, 1.35, "pack", { run: phase + 0.6 }, t)
  figure(ctx, 1330, base + 16, 1.35, "cap", { run: phase + 2.1 }, t)
  const hand = figure(ctx, 1500, base + 22, 1.35, "scarf", { run: phase, arms: "hold", lean: 0.24 }, t)
  phone(ctx, hand[0] + 6, hand[1] - 8, 1, 1, 0.3)

  const fOff = (off * 1.55) % 1100
  for (let k = -1; k < 3; k++) {
    const x = k * 1100 + 900 - fOff
    ctx.fillStyle = mix(C.night, "#000000", 0.3)
    ctx.fillRect(x, 260, 16, 860)
    ctx.fillRect(x - 40, 250, 70, 14)
    glow(ctx, x - 30, 290, 200, C.gold, 0.35)
    rr(ctx, x - 52, 262, 44, 58, 6)
    ctx.fill()
    ctx.fillStyle = rgba(C.gold, 0.9)
    rr(ctx, x - 46, 270, 32, 42, 4)
    ctx.fill()
  }
  ctx.restore()
}

/** Distance covered in scene 4/7 with ease-in/out stops. */
function travelled(t: number, a: number, stop: number, stopEnd: number, go: number, end: number) {
  let pos = 0
  const v = (x: number) => {
    if (x < stop) return 430
    if (x < stopEnd) return 430 * (1 - eio(seg(x, stop, stopEnd)))
    if (x < go) return 0
    return 430 * eio(seg(x, go, go + 0.35))
  }
  const to = Math.min(t, end)
  for (let x = a; x < to; x += 0.01) pos += v(x) * Math.min(0.01, to - x)
  return pos
}

function tree(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.fillStyle = mix(C.night, "#000000", 0.15)
  ctx.fillRect(x - 6 * s, y - 120 * s, 12 * s, 120 * s)
  const sw = Math.sin(t * 1.2 + x * 0.01) * 4
  disc(ctx, x + sw, y - 150 * s, 62 * s, mix(C.teal, C.sea, 0.25))
  disc(ctx, x - 44 * s + sw, y - 118 * s, 44 * s, C.teal)
  disc(ctx, x + 46 * s + sw, y - 122 * s, 48 * s, mix(C.teal, C.night, 0.2))
  disc(ctx, x + 10 * s + sw, y - 190 * s, 34 * s, mix(C.teal, C.sea, 0.45))
}

function locomotive(ctx: Ctx, x: number, y: number, t: number) {
  const body = mix(C.teal, C.sea, 0.45)
  ctx.fillStyle = mix(C.night, "#000000", 0.2)
  ctx.fillRect(x - 240, y - 40, 470, 26)
  ctx.fillStyle = body
  rr(ctx, x - 220, y - 170, 320, 104, 44)
  ctx.fill()
  ctx.fillStyle = rgba(C.gold, 0.2)
  ctx.fillRect(x - 200, y - 170, 270, 4)
  ctx.fillStyle = body
  ctx.fillRect(x + 90, y - 240, 130, 200)
  ctx.fillStyle = mix(C.roof, C.night, 0.3)
  ctx.fillRect(x + 76, y - 256, 158, 22)
  ctx.fillStyle = rgba(C.gold, 0.85)
  rr(ctx, x + 112, y - 222, 54, 56, 6)
  ctx.fill()
  glow(ctx, x + 139, y - 194, 110, C.gold, 0.25)
  ctx.fillStyle = body
  ctx.fillRect(x - 196, y - 246, 38, 84)
  ctx.fillRect(x - 210, y - 262, 66, 20)
  disc(ctx, x - 70, y - 172, 26, body)
  ctx.fillStyle = mix(C.roof, C.night, 0.3)
  ctx.beginPath()
  ctx.moveTo(x - 220, y - 60)
  ctx.lineTo(x - 270, y - 14)
  ctx.lineTo(x - 210, y - 14)
  ctx.fill()
  glow(ctx, x - 226, y - 120, 120, C.gold, 0.4)
  disc(ctx, x - 226, y - 120, 14, C.gold)
  for (const [wx, wr] of [
    [-150, 44],
    [-40, 44],
    [70, 44],
    [170, 34],
  ] as Pt[]) {
    disc(ctx, x + wx, y - 40, wr, mix(C.night, "#000000", 0.25))
    ctx.strokeStyle = K.stoneDim
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(x + wx, y - 40, wr - 4, 0, Math.PI * 2)
    ctx.stroke()
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI
      poly(ctx, [
        [x + wx - Math.cos(a) * (wr - 6), y - 40 - Math.sin(a) * (wr - 6)],
        [x + wx + Math.cos(a) * (wr - 6), y - 40 + Math.sin(a) * (wr - 6)],
      ])
    }
  }
  ctx.strokeStyle = rgba(C.gold, 0.7)
  ctx.lineWidth = 6
  poly(ctx, [
    [x - 150, y - 40],
    [x + 70, y - 40],
  ])
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.6 + i * 0.25) % 1
    disc(ctx, x - 177 + k * 60 - i * 10, y - 270 - k * 150, 16 + k * 40, rgba(C.stone, 0.16 * (1 - k)))
  }
}

/** 4. Follow the clue. Railway Park. */
function scenePark(ctx: Ctx, t: number) {
  const a = D(6)
  const pos = travelled(t, a, 17.25, 17.62, 18.69, D(8) + 1)
  ctx.save()
  cam(ctx, 960, 540, 1)
  sky(ctx, t)
  moon(ctx, 1500, 160, 34)
  ctx.save()
  ctx.translate(-pos * 0.05, -40)
  fillRidge(ctx, RIDGE_FAR, K.ridgeFar, 0.08)
  fillRidge(ctx, RIDGE_NEAR, K.ridgeNear, 0.05)
  ctx.restore()
  const base = 900
  const tOff = (pos * 0.3) % 520
  for (let k = -1; k < 5; k++) tree(ctx, k * 520 + 200 - tOff, base - 10, 1.1, t)
  ctx.fillStyle = mix(C.teal, C.night, 0.15)
  ctx.fillRect(-100, base - 20, W + 200, 400)

  locomotive(ctx, 1720 - pos * 0.62, base - 4, t)
  ctx.fillStyle = mix(C.night, "#000000", 0.2)
  const sl = (pos * 0.62) % 60
  for (let x = -sl; x < W + 60; x += 60) ctx.fillRect(x, base - 12, 30, 12)
  ctx.fillStyle = K.stoneDim
  ctx.fillRect(-100, base - 18, W + 200, 5)

  ctx.fillStyle = mix(C.teal, C.night, 0.35)
  ctx.fillRect(-100, base + 40, W + 200, 400)

  const signX = 1700 + (travelled(17.62, a, 17.25, 17.62, 18.69, 99) - pos)
  ctx.fillStyle = K.wood
  ctx.fillRect(signX - 7, base - 180, 14, 236)
  const arrow = (dir: number, y: number, active: number) => {
    ctx.save()
    ctx.translate(signX, y)
    ctx.scale(dir, 1)
    ctx.fillStyle = mix(K.wood, C.gold, active * 0.7)
    ctx.beginPath()
    ctx.moveTo(-6, -24)
    ctx.lineTo(110, -24)
    ctx.lineTo(140, 0)
    ctx.lineTo(110, 24)
    ctx.lineTo(-6, 24)
    ctx.fill()
    ctx.restore()
    if (active > 0) glow(ctx, signX + dir * 70, y, 130, C.gold, 0.4 * active)
  }
  const chosen = seg(t, 17.85, 18.1)
  arrow(1, base - 150, chosen)
  arrow(-1, base - 92, 0)

  const runPhase = (pos / 266) * Math.PI
  const moving = t < 17.25 || t > 18.69
  const skidding = t >= 17.25 && t < 17.7
  const pose = (ph: number): Pose => (moving ? { run: runPhase + ph } : skidding ? { skid: true, lean: -0.22 } : {})
  figure(ctx, 1150, base + 64, 1.35, "pack", pose(0.6), t)
  figure(ctx, 1310, base + 60, 1.35, "cap", t > 17.75 && t < 18.69 ? { arms: "point", lean: 0.05 } : pose(2.1), t)
  const hand = figure(ctx, 1470, base + 66, 1.35, "scarf", moving ? { run: runPhase, arms: "hold", lean: 0.24 } : skidding ? { skid: true, lean: -0.22, arms: "hold" } : { arms: "hold" }, t)
  phone(ctx, hand[0] + 6, hand[1] - 8, 1, 1, 0.3)

  const beats = Math.max(0, Math.floor((t - a) / BEAT) + 1)
  const startX = hand[0] + 20
  const dots: Pt[] = []
  if (t < 17.45) {
    const n = Math.min(beats, 4) * 4
    for (let i = 0; i < n; i++) dots.push([startX + 30 + i * 34, base + 66 + Math.sin(i * 0.8) * 4])
    trail(ctx, dots, 1, 1)
  } else {
    const bend = resample(curve([startX + 20, base + 60], [signX - 60, base + 60], [signX + 90, base - 150]), 30)
    trail(ctx, bend, eout(seg(t, 17.5, 18.4)), 1 - seg(t, 19.3, D(8)))
  }
  ctx.restore()
}

/** 5. Solve it. Cryptex rings on a church plaque. */
function sceneCryptex(ctx: Ctx, t: number) {
  const P: Pt = [1290, 470]
  ctx.save()
  cam(ctx, 1230, 520, 1 + 0.08 * eio(seg(t, D(8), D(10))))
  ctx.fillStyle = K.wall[0]
  ctx.fillRect(-200, -200, W + 400, H + 400)
  for (let row = 0; row < 11; row++) {
    const off = row % 2 ? 0 : 130
    for (let x = -260 + off; x < W + 260; x += 260) {
      const r = rng(row * 40 + Math.round(x))
      ctx.fillStyle = K.wall[Math.floor(r() * 3)]
      rr(ctx, x + 4, -60 + row * 118 + 4, 252, 110, 10)
      ctx.fill()
      ctx.fillStyle = rgba(C.gold, 0.05)
      ctx.fillRect(x + 4, -60 + row * 118 + 4, 252, 4)
    }
  }
  ctx.fillStyle = mix(C.night, C.teal, 0.2)
  ctx.beginPath()
  ctx.moveTo(1640, 1200)
  ctx.lineTo(1640, 360)
  ctx.arc(1820, 360, 180, Math.PI, 0)
  ctx.lineTo(2000, 1200)
  ctx.fill()

  ctx.fillStyle = K.stoneDim
  rr(ctx, P[0] - 230, P[1] - 230, 460, 460, 30)
  ctx.fill()
  ctx.strokeStyle = rgba(C.night, 0.35)
  ctx.lineWidth = 6
  rr(ctx, P[0] - 205, P[1] - 205, 410, 410, 22)
  ctx.stroke()

  const locks = [D(8) + BEAT, D(8) + BEAT * 2, D(8) + BEAT * 3]
  const radii = [92, 140, 188]
  const shapes = (ctx2: Ctx, k: number, s: number) => {
    ctx2.beginPath()
    switch (k % 6) {
      case 0:
        ctx2.arc(0, 0, s, 0, Math.PI * 2)
        break
      case 1:
        ctx2.moveTo(0, -s)
        ctx2.lineTo(s, s)
        ctx2.lineTo(-s, s)
        ctx2.closePath()
        break
      case 2:
        ctx2.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7)
        break
      case 3:
        ctx2.moveTo(0, -s)
        ctx2.lineTo(s, 0)
        ctx2.lineTo(0, s)
        ctx2.lineTo(-s, 0)
        ctx2.closePath()
        break
      case 4:
        ctx2.moveTo(-s, 0)
        ctx2.lineTo(s, 0)
        ctx2.moveTo(0, -s)
        ctx2.lineTo(0, s)
        break
      default:
        ctx2.arc(0, 0, s, Math.PI, 0)
        ctx2.closePath()
    }
  }
  const solved = seg(t, D(9), D(9) + 0.3)
  for (let ring = 0; ring < 3; ring++) {
    const L = locks[ring]
    const rot = t < L ? Math.pow(L - t, 1.6) * (ring % 2 ? -2.4 : 2.1) : 0.09 * Math.exp(-(t - L) * 10) * Math.sin((t - L) * 45)
    const locked = t >= L
    const R = radii[ring]
    ctx.beginPath()
    ctx.arc(P[0], P[1], R + 22, 0, Math.PI * 2)
    ctx.arc(P[0], P[1], R - 22, 0, Math.PI * 2, true)
    ctx.fillStyle = mix(C.night, C.teal, locked ? 0.45 : 0.3)
    ctx.fill()
    ctx.strokeStyle = rgba(C.gold, locked ? 0.9 : 0.35)
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(P[0], P[1], R + 22, 0, Math.PI * 2)
    ctx.stroke()
    const n = 8 + ring * 4
    for (let i = 0; i < n; i++) {
      const ang = rot + (i / n) * Math.PI * 2 - Math.PI / 2
      ctx.save()
      ctx.translate(P[0] + Math.cos(ang) * R, P[1] + Math.sin(ang) * R)
      ctx.rotate(ang + Math.PI / 2)
      shapes(ctx, i + ring * 2, 9)
      const top = i === 0
      ctx.strokeStyle = top && locked ? C.gold : rgba(C.stone, 0.55)
      ctx.fillStyle = top && locked ? C.gold : rgba(C.stone, 0.12)
      ctx.lineWidth = 3
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    if (locked) glow(ctx, P[0], P[1] - R, 60, C.gold, 0.5 * Math.exp(-(t - L) * 3))
  }
  ctx.strokeStyle = rgba(C.gold, 0.6 + solved * 0.4)
  ctx.lineWidth = 4
  poly(ctx, [
    [P[0], P[1] - 70],
    [P[0], P[1] - 214],
  ])
  disc(ctx, P[0], P[1], 46, mix(C.night, C.teal, 0.45))
  if (solved > 0) {
    const s = back(solved)
    ctx.save()
    ctx.translate(P[0], P[1])
    ctx.scale(s, s)
    ctx.rotate(0.62)
    ctx.fillStyle = C.gold
    ctx.beginPath()
    ctx.moveTo(0, -38)
    ctx.lineTo(16, 10)
    ctx.lineTo(0, 2)
    ctx.lineTo(-16, 10)
    ctx.fill()
    ctx.restore()
    glow(ctx, P[0], P[1], 520, C.gold, 0.55 * Math.exp(-(t - D(9)) * 2.2))
  }

  const raise = eout(seg(t, D(8), D(8) + 0.6))
  const hx = lerp(1660, 1560, raise)
  const hy = lerp(1160, 860, raise)
  ctx.strokeStyle = C.stone
  ctx.lineWidth = 16
  ctx.lineCap = "round"
  poly(ctx, [
    [1760, 1200],
    [hx + 20, hy + 60],
  ])
  phone(ctx, hx, hy, 2.4, 1, -0.35)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.fillStyle = rgba(C.gold, 0.08 + solved * 0.06)
  ctx.beginPath()
  ctx.moveTo(hx - 10, hy - 40)
  ctx.lineTo(P[0] - 200, P[1] - 80)
  ctx.lineTo(P[0] + 120, P[1] + 220)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  for (const [x, acc] of [
    [1720, "cap"],
    [1850, "pack"],
  ] as [number, Acc][]) {
    figure(ctx, x, 1080, 1.7, acc, { face: -1, lean: -0.05 }, t)
  }
  const bulb = back(seg(t, 23.0, 23.3))
  if (bulb > 0) {
    const bx = 1720
    const by = 740
    ctx.save()
    ctx.translate(bx, by)
    ctx.scale(bulb, bulb)
    glow(ctx, 0, 0, 160, C.gold, 0.6)
    disc(ctx, 0, 0, 30, C.gold)
    ctx.fillStyle = K.stoneDim
    ctx.fillRect(-13, 26, 26, 18)
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 5
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42
      poly(ctx, [
        [Math.cos(a) * 44, Math.sin(a) * 44],
        [Math.cos(a) * 64, Math.sin(a) * 64],
      ])
    }
    ctx.restore()
  }
  ctx.restore()
}

/** 6. You're not alone. Top-down map with rival teams. */
function sceneMap(ctx: Ctx, t: number) {
  const p = seg(t, D(10), D(12))
  ctx.save()
  cam(ctx, 1220, 450, lerp(1.18, 1.0, eio(p)), lerp(-0.05, 0.02, p))
  ctx.fillStyle = K.seaDeep
  ctx.fillRect(-600, -600, W + 1200, H + 1200)
  ctx.beginPath()
  ctx.moveTo(-600, -600)
  ctx.lineTo(W + 600, -600)
  for (let x = W + 600; x >= -600; x -= 30) ctx.lineTo(x, coastY(x))
  ctx.closePath()
  ctx.fillStyle = C.teal
  ctx.fill()
  ctx.strokeStyle = rgba(C.stone, 0.25)
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let x = -600; x <= W + 600; x += 30) (x === -600 ? ctx.moveTo(x, coastY(x)) : ctx.lineTo(x, coastY(x)))
  ctx.stroke()
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = rgba(C.stone, 0.06)
    ctx.beginPath()
    for (let x = -600; x <= W + 600; x += 30) {
      const y = coastY(x) + 24 + i * 26 + Math.sin(t * 1.5 + x / 90 + i) * 4
      x === -600 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  ctx.lineCap = "round"
  for (const [a, b] of MAP_STREETS) {
    if (a[1] > coastY(a[0]) - 10) continue
    ctx.strokeStyle = mix(C.teal, C.stone, 0.13)
    ctx.lineWidth = 3
    poly(ctx, [a, b])
  }
  ctx.strokeStyle = rgba(C.stone, 0.14)
  ctx.lineWidth = 9
  poly(ctx, [
    [-300, 610],
    [700, 560],
    [1290, 470],
  ])
  poly(ctx, [
    [700, -200],
    [980, 260],
    [1290, 420],
    [1900, 520],
  ])
  const r = rng(12)
  for (let i = 0; i < 90; i++) {
    const x = 1100 + r() * 420
    const y = 300 + r() * 300
    ctx.fillStyle = rgba(C.roof, 0.35)
    ctx.fillRect(x, y, 12 + r() * 14, 10 + r() * 12)
  }
  ctx.fillStyle = K.stoneDim
  ctx.fillRect(MAP_CASTLE[0] - 46, MAP_CASTLE[1] - 30, 92, 60)
  for (let i = -46; i < 46; i += 16) ctx.fillRect(MAP_CASTLE[0] + i, MAP_CASTLE[1] - 42, 10, 12)
  glow(ctx, MAP_CASTLE[0], MAP_CASTLE[1], 120, C.gold, 0.3)

  MAP_ROUTES.forEach((route, i) => {
    const prog = 0.18 + 0.55 * eio(seg(t, D(10) + i * 0.12, D(12) + 0.3))
    const n = Math.floor(route.length * prog)
    const ours = i === 0
    trail(ctx, route.slice(Math.max(0, n - 70), n), 1, ours ? 0.95 : 0.45, ours ? 4 : 3)
    const head = route[Math.max(0, n - 1)]
    glow(ctx, head[0], head[1], ours ? 70 : 44, C.gold, ours ? 0.6 : 0.35)
    if (ours) {
      ;[C.roof, C.gold, C.sea].forEach((c, k) => disc(ctx, head[0] + (k - 1) * 13, head[1] + (k === 1 ? -9 : 4), 8, c))
    } else {
      disc(ctx, head[0], head[1], 9, C.stone)
    }
  })

  const RC: Pt = [1290, 420]
  const RR = 400
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2
    const l = i % 5 === 0 ? 24 : 12
    ctx.strokeStyle = rgba(C.stone, 0.35)
    ctx.lineWidth = i % 5 === 0 ? 4 : 2
    poly(ctx, [
      [RC[0] + Math.cos(a) * RR, RC[1] + Math.sin(a) * RR],
      [RC[0] + Math.cos(a) * (RR - l), RC[1] + Math.sin(a) * (RR - l)],
    ])
  }
  const beatsIn = (t - D(10)) / BEAT
  const step = Math.floor(beatsIn) + eout(beatsIn % 1)
  const sweep = (step / 16) * Math.PI * 2
  ctx.beginPath()
  ctx.arc(RC[0], RC[1], RR + 14, -Math.PI / 2, -Math.PI / 2 + sweep)
  ctx.strokeStyle = C.gold
  ctx.lineWidth = 10
  ctx.stroke()
  const tip = -Math.PI / 2 + sweep
  glow(ctx, RC[0] + Math.cos(tip) * (RR + 14), RC[1] + Math.sin(tip) * (RR + 14), 70, C.gold, 0.7)
  ctx.fillStyle = K.stoneDim
  ctx.fillRect(RC[0] - 22, RC[1] - RR - 70, 44, 40)
  ctx.fillRect(RC[0] - 40, RC[1] - RR - 88, 80, 20)
  ctx.restore()
}

/** 7. Getting closer. Seafront, compass lock, tilt up to the castle. */
function sceneSeafront(ctx: Ctx, t: number) {
  const a = D(12)
  const pos = travelled(t, a, 31.4, 31.85, 32.4, D(14) + 1)
  const tilt = eio(seg(t, 32.5, D(14)))
  ctx.save()
  cam(ctx, 960, lerp(540, -380, tilt), 1)
  sky(ctx, t, -1500, 1300)
  ctx.save()
  ctx.translate(0, 760)
  for (const s of STARS) {
    ctx.fillStyle = rgba(C.stone, 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)))
    ctx.fillRect(s.x, s.y - 500, s.r, s.r)
  }
  ctx.restore()
  moon(ctx, 1620, -620, 50)
  ctx.save()
  ctx.translate(0, -60)
  fillRidge(ctx, RIDGE_FAR, K.ridgeFar, 0.08)
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(640, 800)
  ctx.bezierCurveTo(980, -260, 1180, -560, 1400, -560)
  ctx.bezierCurveTo(1620, -560, 1820, -260, 2200, 800)
  ctx.closePath()
  ctx.fillStyle = K.hill
  ctx.fill()
  ctx.strokeStyle = rgba(C.stone, 0.3)
  ctx.lineWidth = 6
  ctx.setLineDash([16, 18])
  poly(ctx, [
    [1060, 200],
    [1500, 40],
    [1150, -140],
    [1520, -300],
    [1300, -470],
  ])
  ctx.setLineDash([])
  const light = seg(t, 32.6, D(14))
  castleBuilding(ctx, 1400, -650, 2.1, 0, t)
  castleBuilding(ctx, 1400, -640, 0, 0.3 + light * 0.9, t)
  glow(ctx, 1400, -600, 900, C.gold, light * 0.35)
  for (let i = 0; i < 3; i++) {
    const k = clamp(seg(t, 32.9 + i * 0.12, D(14)))
    const route: Pt[] = [
      [1060, 200],
      [1500, 40],
      [1150, -140],
      [1520, -300],
      [1300, -470],
    ]
    const pts = resample(route, 6)
    const at = pts[Math.min(pts.length - 1, Math.floor(k * (pts.length - 1)))]
    disc(ctx, at[0] + i * 8, at[1], 6, [C.roof, C.gold, C.sea][i])
  }

  const base = 780
  const pOff = (pos * 0.7) % 260
  ctx.fillStyle = K.stoneDim
  ctx.fillRect(-100, base, W + 200, 30)
  for (let k = -1; k < 9; k++) {
    const x = k * 260 + 80 - pOff
    palm(ctx, x, base, 1.6, t, mix(C.night, "#000000", 0.1))
    const lx = x + 130
    ctx.fillStyle = mix(C.night, "#000000", 0.2)
    ctx.fillRect(lx - 4, base - 170, 8, 170)
    const fl = 0.75 + 0.25 * Math.sin(t * 13 + k * 3) * Math.sin(t * 2 + k)
    glow(ctx, lx, base - 180, 120, C.gold, 0.35 * fl)
    disc(ctx, lx, base - 180, 10, rgba(C.gold, fl))
  }
  const sg = ctx.createLinearGradient(0, base + 30, 0, 1300)
  sg.addColorStop(0, C.sea)
  sg.addColorStop(1, C.night)
  ctx.fillStyle = sg
  ctx.fillRect(-100, base + 30, W + 200, 800)
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = rgba(C.stone, 0.12)
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = -100; x < W + 100; x += 40) {
      const y = base + 60 + i * 34 + Math.sin(t * 2 + x / 70 + i) * 4
      x === -100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const bOff = (pos * 0.5) % 700
  for (let k = -1; k < 4; k++) {
    const bx = k * 700 + 300 - bOff
    const bob = Math.sin(t * 2 + k) * 5
    ctx.fillStyle = K.stoneDim
    ctx.beginPath()
    ctx.moveTo(bx - 70, base + 110 + bob)
    ctx.lineTo(bx + 70, base + 110 + bob)
    ctx.lineTo(bx + 46, base + 140 + bob)
    ctx.lineTo(bx - 46, base + 140 + bob)
    ctx.fill()
    ctx.strokeStyle = K.stoneDim
    ctx.lineWidth = 4
    poly(ctx, [
      [bx, base + 110 + bob],
      [bx, base + 10 + bob],
    ])
    ctx.fillStyle = rgba(C.stone, 0.35)
    ctx.beginPath()
    ctx.moveTo(bx + 4, base + 16 + bob)
    ctx.lineTo(bx + 52, base + 98 + bob)
    ctx.lineTo(bx + 4, base + 98 + bob)
    ctx.fill()
  }

  const runPhase = (pos / 266) * Math.PI
  const moving = t < 31.4 || t > 32.4
  const pose = (ph: number): Pose => (moving ? { run: runPhase + ph } : t < 31.85 ? { skid: true, lean: -0.2 } : {})
  const leave = Math.max(0, t - 32.4) * 520
  figure(ctx, 1150 + leave, base + 4, 1.35, "pack", pose(0.6), t)
  figure(ctx, 1310 + leave, base, 1.35, "cap", pose(2.1), t)
  const hand = figure(
    ctx,
    1470 + leave,
    base + 6,
    1.35,
    "scarf",
    moving ? { run: runPhase, arms: "hold", lean: 0.24 } : { arms: "point", lean: 0.05 },
    t,
  )
  const lockT = D(13)
  const needle = t < lockT ? Math.pow(Math.max(0, lockT - t), 1.5) * 16 + 0.62 : 0.62 + 0.12 * Math.exp(-(t - lockT) * 9) * Math.sin((t - lockT) * 40)
  const cA = back(seg(t, 31.0, 31.35)) * (1 - seg(t, 32.55, 32.85))
  compass(ctx, 1380, 380, 130 * clamp(cA, 0, 1.2), needle, clamp(cA))
  if (t > lockT) glow(ctx, 1380, 380, 420, C.gold, 0.5 * Math.exp(-(t - lockT) * 3))
  phone(ctx, hand[0] + 6, hand[1] - 8, 1, 1, 0.3, needle)
  ctx.restore()
}

function chest(ctx: Ctx, x: number, y: number, open: number, t: number) {
  const w = 240
  const h = 124
  if (open > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const n = 16
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - n / 2) * 0.17 + Math.sin(t * 0.6) * 0.06
      const l = 900 + (i % 3) * 200
      ctx.fillStyle = rgba(C.gold, 0.1 * open)
      ctx.beginPath()
      ctx.moveTo(x, y - h)
      ctx.lineTo(x + Math.cos(a - 0.04) * l, y - h + Math.sin(a - 0.04) * l)
      ctx.lineTo(x + Math.cos(a + 0.04) * l, y - h + Math.sin(a + 0.04) * l)
      ctx.fill()
    }
    ctx.restore()
    glow(ctx, x, y - h, 560, C.gold, 0.7 * open)
  }
  ctx.fillStyle = rgba(C.night, 0.4)
  ctx.beginPath()
  ctx.ellipse(x, y + 4, w * 0.62, 18, 0, 0, Math.PI * 2)
  ctx.fill()
  rr(ctx, x - w / 2, y - h, w, h, 12)
  ctx.fillStyle = K.wood
  ctx.fill()
  ctx.fillStyle = K.woodDark
  ctx.fillRect(x - w / 2, y - h * 0.55, w, 5)
  ctx.fillStyle = K.iron
  ctx.fillRect(x - w / 2 + 26, y - h, 20, h)
  ctx.fillRect(x + w / 2 - 46, y - h, 20, h)
  ctx.fillStyle = rgba(C.gold, 0.15)
  ctx.fillRect(x - w / 2, y - h, 5, h)
  if (open > 0) {
    ctx.fillStyle = C.gold
    ctx.beginPath()
    ctx.ellipse(x, y - h + 6, w / 2 - 10, 16, 0, Math.PI, 0)
    ctx.fill()
  }
  const lidH = 58 * (1 - open * 0.55)
  const lidY = y - h - lidH - open * 74
  if (open > 0) {
    ctx.fillStyle = K.woodDark
    ctx.fillRect(x - w / 2 + 8, lidY + lidH, w - 16, y - h - lidY - lidH + 2)
    ctx.fillStyle = rgba(C.gold, 0.6 * open)
    ctx.fillRect(x - w / 2 + 8, lidY + lidH, w - 16, y - h - lidY - lidH + 2)
  }
  rr(ctx, x - w / 2 - 4, lidY, w + 8, lidH, 26 * (1 - open * 0.6))
  ctx.fillStyle = K.wood
  ctx.fill()
  ctx.fillStyle = K.iron
  ctx.fillRect(x - w / 2 + 26, lidY, 20, lidH)
  ctx.fillRect(x + w / 2 - 46, lidY, 20, lidH)
  if (open < 0.5) {
    ctx.fillStyle = C.gold
    rr(ctx, x - 16, y - h - 6, 32, 34, 6)
    ctx.fill()
  }
}

/** 8. Treasure. Castle top, chest bursts open. */
function sceneTreasure(ctx: Ctx, t: number) {
  const a = D(14)
  const punch = 1 + 0.07 * (1 - eout(seg(t, a, a + 0.7)))
  ctx.save()
  cam(ctx, 1240, 560, punch)
  sky(ctx, t, -200, 1300, 1.2)
  moon(ctx, 1640, 170, 46)
  ctx.save()
  ctx.translate(0, 120)
  fillRidge(ctx, RIDGE_FAR, K.ridgeFar, 0.1)
  ctx.restore()
  ctx.fillStyle = K.stoneDeep
  ctx.fillRect(-200, 860, W + 400, 400)
  ctx.fillStyle = rgba(C.night, 0.25)
  for (let x = -200; x < W + 200; x += 120) ctx.fillRect(x, 860, 3, 400)
  ctx.fillStyle = mix(C.night, "#000000", 0.15)
  for (const [x0, x1] of [
    [-200, 520],
    [1900, 2300],
  ]) {
    ctx.fillRect(x0, 640, x1 - x0, 240)
    for (let x = x0; x < x1; x += 90) ctx.fillRect(x, 590, 54, 60)
  }

  const open = eout(seg(t, a + 0.02, a + 0.32))
  chest(ctx, 1300, 870, open, t)
  const age = t - a
  pulseRing(ctx, 1300, 760, age, 1500, 16)

  for (const c of COINS) {
    const tau = age - 0.05 - c.delay
    if (tau < 0) continue
    let x = 1300 + c.vx * tau
    let y = 760 + c.vy * tau + 0.5 * 1900 * tau * tau
    let w = Math.abs(Math.cos(tau * c.spin)) * 13 + 2
    if (y > c.floor) {
      const land = (-c.vy - Math.sqrt(c.vy * c.vy + 2 * 1900 * (c.floor - 760))) / -1900
      x = 1300 + c.vx * Math.max(0, land)
      y = c.floor
      w = 13
    }
    ctx.fillStyle = C.gold
    ctx.beginPath()
    ctx.ellipse(x, y, w, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = mix(C.gold, C.roof, 0.5)
    ctx.lineWidth = 2
    ctx.stroke()
  }
  for (const c of CONFETTI) {
    const tau = age - c.delay
    if (tau < 0) continue
    const x = c.x + c.vx * tau * Math.exp(-tau * 0.6) + Math.sin(tau * 4 + c.rot) * 30
    const y = 760 + c.vy * tau * Math.exp(-tau * 0.9) + 220 * tau * tau
    if (y > 1200) continue
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(c.rot + c.vr * tau)
    ctx.scale(1, Math.cos(tau * 8 + c.rot))
    ctx.fillStyle = c.color
    ctx.fillRect(-c.w / 2, -5, c.w, 10)
    ctx.restore()
  }

  const crouch = t > 35.7 && t < 35.85
  const pose = (face: 1 | -1, delay: number): Pose => {
    const k = seg(t, 35.85 + delay, 36.55 + delay)
    const l = Math.sin(k * Math.PI) * 150
    if (k > 0 && k < 1) return { face, jump: l, tuck: k < 0.7, arms: "up" }
    if (crouch) return { face, lean: 0.25, skid: true }
    if (t < 35.7) return { face, lean: -0.18, arms: "up" }
    return { face, arms: "cheer", jump: Math.abs(Math.sin(t * 9)) * 10 }
  }
  figure(ctx, 1000, 900, 1.45, "scarf", pose(1, 0), t)
  figure(ctx, 1590, 900, 1.45, "cap", pose(-1, 0.03), t)
  figure(ctx, 1760, 910, 1.45, "pack", pose(-1, 0.06), t)
  ctx.restore()
}

/** 8b-11. Pull back over the lit city, routes converge, ring forms, logo, loop. */
function sceneFinale(ctx: Ctx, t: number, logo: HTMLImageElement | null) {
  const s9 = D(16)
  const s10 = D(17)
  const s11 = D(18)
  const R = 62
  const Zmax = 3.4
  const target: Pt = [CASTLE[0] - 260 / Zmax, CASTLE[1]]
  let cx = 960
  let cy = 540
  let z = 1
  let dim = 0.12
  let light = 1
  let routes = 1
  let ring = 0
  let ringA = 1
  let logoA = 0
  let logoS = 1

  if (t < s9) {
    const p = eio(seg(t, D(15), D(15) + 1.4))
    z = lerp(2.1, 1, p)
    cx = lerp(CASTLE[0], 960, p)
    cy = lerp(CASTLE[1] + 40, 540, p)
  } else if (t < s10) {
    const p = eio(seg(t, s9, s10 - 0.25))
    z = lerp(1, Zmax, p)
    cx = lerp(960, target[0], p)
    cy = lerp(540, target[1], p)
    dim = lerp(0.12, 0.85, p)
    routes = 1 - 0.85 * p
    ring = eio(seg(t, s9 + 0.2, s10 - 0.1))
  } else if (t < s11) {
    z = Zmax * (1 + 0.025 * Math.sin((t - s10) * 2.4))
    cx = target[0]
    cy = target[1]
    dim = 0.95
    light = 1 - seg(t, s10, s10 + 0.35)
    routes = 0.15 * (1 - seg(t, s10, s10 + 0.6))
    ring = 1
    ringA = 1 - seg(t, s10 + 0.05, s10 + 0.5)
    logoA = seg(t, s10, s10 + 0.3)
    logoS = lerp(1.14, 1, eout(seg(t, s10, s10 + 0.6)))
  } else {
    const p = eio(seg(t, s11, FILM_LENGTH - 0.05))
    z = lerp(Zmax, 1, p)
    cx = lerp(target[0], 960, p)
    cy = lerp(target[1], 540, p)
    dim = lerp(0.95, 0, p)
    routes = 0
    ring = 1
    ringA = 0
    const shrink = eio(seg(t, s11, s11 + 0.65))
    logoA = 1 - seg(t, s11 + 0.35, s11 + 0.65)
    logoS = 1 - shrink * 0.94
    light = seg(t, s11 + 0.3, s11 + 0.6) * (1 - seg(t, 45.25, FILM_LENGTH - 0.04))
  }

  ctx.save()
  cam(ctx, cx, cy, z)
  city(ctx, t, light, dim)
  ROUTES_ALL.forEach((r, i) => {
    const prog = eout(seg(t, D(15) + 0.15 + i * 0.09, D(15) + 1.7 + i * 0.09))
    trail(ctx, r, prog, routes, 4.5)
  })
  if (t >= s9 && t < s10) {
    ROUTES_ALL.forEach((r) => {
      const from = eio(seg(t, s9, s10 - 0.3))
      trail(ctx, r, 1, routes, 4.5, from)
    })
  }
  ringArcs(ctx, CASTLE[0], CASTLE[1], R, ring, 4.2, ringA)

  if (t >= s10 && t < s10 + 1.2) {
    const k = t - s10
    pulseRing(ctx, CASTLE[0], CASTLE[1], k, 420, 6)
    glow(ctx, CASTLE[0], CASTLE[1], 260, C.stone, 0.6 * Math.exp(-k * 4))
  }
  if (logo && logo.complete && logo.naturalWidth > 0 && logoA > 0) {
    const size = R * 2.37 * logoS
    const breath = t >= s10 && t < s11 ? 0.18 + 0.1 * Math.sin((t - s10) * 3) : 0.2
    glow(ctx, CASTLE[0], CASTLE[1], size * 1.1, C.gold, breath * logoA)
    ctx.globalAlpha = logoA
    ctx.drawImage(logo, CASTLE[0] - size / 2, CASTLE[1] - (size * (622 / 640)) / 2, size, (size * 622) / 640)
    ctx.globalAlpha = 1
    const g = seg(t, s10 + 0.15, s10 + 0.85)
    if (g > 0 && g < 1) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(CASTLE[0], CASTLE[1], size * 0.5, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalCompositeOperation = "lighter"
      const gx = lerp(CASTLE[0] - size, CASTLE[0] + size, eio(g))
      const lg = ctx.createLinearGradient(gx - 30, 0, gx + 30, 0)
      lg.addColorStop(0, rgba(C.stone, 0))
      lg.addColorStop(0.5, rgba(C.stone, 0.55))
      lg.addColorStop(1, rgba(C.stone, 0))
      ctx.fillStyle = lg
      ctx.translate(gx, CASTLE[1])
      ctx.rotate(0.5)
      ctx.translate(-gx, -CASTLE[1])
      ctx.fillRect(gx - 40, CASTLE[1] - size, 80, size * 2)
      ctx.restore()
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------ timeline */

type Enter = "cut" | "dive" | "whip" | "iris" | "pullback" | "flash"
type Scene = {
  a: number
  b: number
  fx: number
  enter: Enter
  at?: Pt
  draw: (ctx: Ctx, t: number, logo: HTMLImageElement | null) => void
}

const SCENES: Scene[] = [
  { a: 0, b: D(2), fx: 1300, enter: "cut", draw: sceneCity },
  { a: D(2), b: D(4), fx: 1130, enter: "dive", at: [1010, 790], draw: sceneCafe },
  { a: D(4), b: D(6), fx: 1340, enter: "dive", at: [1120, 450], draw: sceneAlley },
  { a: D(6), b: D(8), fx: 1350, enter: "whip", draw: scenePark },
  { a: D(8), b: D(10), fx: 1090, enter: "iris", at: [1300, 470], draw: sceneCryptex },
  { a: D(10), b: D(12), fx: 1080, enter: "pullback", at: [1300, 470], draw: sceneMap },
  { a: D(12), b: D(14), fx: 1320, enter: "iris", at: [1290, 450], draw: sceneSeafront },
  { a: D(14), b: D(15), fx: 1080, enter: "flash", draw: sceneTreasure },
  { a: D(15), b: FILM_LENGTH, fx: 1260, enter: "pullback", at: [1300, 780], draw: sceneFinale },
]

const TR = 0.42

export type FilmEvent = { t: number }

let grain: HTMLCanvasElement | null = null
function grainTile() {
  if (grain || typeof document === "undefined") return grain
  grain = document.createElement("canvas")
  grain.width = 220
  grain.height = 220
  const g = grain.getContext("2d")
  if (!g) return grain
  const img = g.createImageData(220, 220)
  const r = rng(99)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return grain
}

export function renderFilm(ctx: Ctx, time: number, cw: number, ch: number, logo: HTMLImageElement | null) {
  const t = ((time % FILM_LENGTH) + FILM_LENGTH) % FILM_LENGTH
  let i = SCENES.findIndex((s) => t >= s.a && t < s.b)
  if (i < 0) i = SCENES.length - 1
  const scene = SCENES[i]

  const portrait = ch > cw * 1.05
  const s = portrait ? Math.max(cw / W, (ch * 0.8) / H) : Math.max(cw / W, ch / H)
  const vw = W * s
  const vh = H * s
  const ox = vw > cw ? clamp(cw / 2 - scene.fx * s, cw - vw, 0) : (cw - vw) / 2
  const oy = portrait ? 0 : (ch - vh) / 2

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = C.night
  ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, oy, vw, vh)
  ctx.clip()
  ctx.setTransform(s, 0, 0, s, ox, oy)

  const since = t - scene.a
  const prev = SCENES[i - 1]
  if (prev && since < TR && scene.enter !== "cut") {
    const p = eout(since / TR)
    const at = scene.at ?? [W / 2, H / 2]
    if (scene.enter === "dive") {
      scene.draw(ctx, t, logo)
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.translate(at[0], at[1])
      ctx.scale(1 + p * 4, 1 + p * 4)
      ctx.translate(-at[0], -at[1])
      prev.draw(ctx, t, logo)
      ctx.restore()
    } else if (scene.enter === "pullback") {
      scene.draw(ctx, t, logo)
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.translate(at[0], at[1])
      ctx.scale(1 - p * 0.85, 1 - p * 0.85)
      ctx.translate(-at[0], -at[1])
      prev.draw(ctx, t, logo)
      ctx.restore()
    } else if (scene.enter === "whip") {
      ctx.save()
      ctx.translate(-p * W, 0)
      prev.draw(ctx, t, logo)
      ctx.restore()
      ctx.save()
      ctx.translate((1 - p) * W, 0)
      scene.draw(ctx, t, logo)
      ctx.restore()
      ctx.fillStyle = rgba(C.stone, 0.12 * (1 - p))
      for (let k = 0; k < 18; k++) ctx.fillRect(-200, (k * 61) % H, W + 400, 3)
    } else if (scene.enter === "iris") {
      prev.draw(ctx, t, logo)
      ctx.save()
      ctx.beginPath()
      ctx.arc(at[0], at[1], eio(since / TR) * 2300, 0, Math.PI * 2)
      ctx.clip()
      scene.draw(ctx, t, logo)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(at[0], at[1], eio(since / TR) * 2300, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(C.gold, 1 - p)
      ctx.lineWidth = 14
      ctx.stroke()
    } else {
      scene.draw(ctx, t, logo)
      ctx.fillStyle = rgba(C.stone, 0.85 * (1 - p))
      ctx.fillRect(-200, -200, W + 400, H + 400)
    }
  } else {
    scene.draw(ctx, t, logo)
  }

  ctx.setTransform(s, 0, 0, s, ox, oy)
  const v = ctx.createRadialGradient(W * 0.62, H * 0.45, H * 0.35, W * 0.62, H * 0.45, W * 0.75)
  v.addColorStop(0, rgba(C.night, 0))
  v.addColorStop(1, rgba(C.night, 0.55))
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  const tile = grainTile()
  if (tile) {
    ctx.save()
    ctx.globalAlpha = 0.05
    ctx.globalCompositeOperation = "overlay"
    const pat = ctx.createPattern(tile, "repeat")
    if (pat) {
      const f = Math.floor(t * 24)
      ctx.translate((f * 37) % 220, (f * 71) % 220)
      ctx.fillStyle = pat
      ctx.fillRect(-220, -220, cw + 440, ch + 440)
    }
    ctx.restore()
  }
}
