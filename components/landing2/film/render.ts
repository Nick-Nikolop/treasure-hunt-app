/**
 * The Hunt hero film. A deterministic canvas render: `renderFilm(ctx, t, ...)`
 * draws the frame for time `t` (0..FILM_LENGTH). Environments are painted
 * plates (`/landing2/film/*.webp`); characters, props, light and motion are
 * drawn live on top. Scene changes sit on the 97 BPM bar grid of
 * "The Four-Note Question" (bar = 2.472 s, first downbeat 0.15 s).
 */

export const FILM_LENGTH = 46
export const BEAT = 0.618
export const BAR = 2.472
export const D = (n: number) => 0.15 + n * BAR
export const STILL_TIME = 38.6

export type PlateId = "city" | "cafe" | "alley" | "park" | "cryptex" | "map" | "seafront" | "treasure"
export const PLATE_IDS: PlateId[] = ["city", "cafe", "alley", "park", "cryptex", "map", "seafront", "treasure"]
export type FilmAssets = { logo: HTMLImageElement | null; plates: Partial<Record<PlateId, HTMLImageElement>> }

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
function disc(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2)
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

/** Glowing gold trail. `prog` draws it in, `alpha` fades it, newest dots swell. */
function trail(ctx: Ctx, pts: Pt[], prog: number, alpha: number, r = 4.5, from = 0) {
  if (alpha <= 0 || prog <= 0) return
  const n = Math.floor(pts.length * clamp(prog))
  const start = Math.floor(pts.length * from)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.fillStyle = rgba(C.gold, alpha * 0.22)
  for (let i = start; i < n; i++) {
    ctx.beginPath()
    ctx.arc(pts[i][0], pts[i][1], r * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  for (let i = start; i < n; i++) {
    const head = n - i
    const rad = head < 4 ? r * (1 + (4 - head) * 0.2) : r
    disc(ctx, pts[i][0], pts[i][1], rad, rgba(C.gold, alpha))
    if (head < 6) disc(ctx, pts[i][0], pts[i][1], rad * 0.5, rgba("#FFF4D6", alpha * (1 - head / 6)))
  }
  if (n > start && n < pts.length) glow(ctx, pts[n - 1][0], pts[n - 1][1], 60, C.gold, 0.6 * alpha)
}

/* ------------------------------------------------------------- plates */

const PLATE_ASPECT = 1116 / 2000

const ready = (img?: HTMLImageElement | null): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0

/** Painted backdrop. Default framing has 40px of overscan for camera drift. */
function plate(ctx: Ctx, A: FilmAssets, id: PlateId, x = -40, y = -18, w = 2000, flip = false) {
  const img = A.plates[id]
  const h = w * PLATE_ASPECT
  if (!ready(img)) {
    ctx.fillStyle = C.night
    ctx.fillRect(x, y, w, h)
    return
  }
  if (flip) {
    ctx.save()
    ctx.translate(x + w, y)
    ctx.scale(-1, 1)
    ctx.drawImage(img, 0, 0, w, h)
    ctx.restore()
  } else {
    ctx.drawImage(img, x, y, w, h)
  }
}

/* ------------------------------------------------------------------- data */

const R0 = rng(7)
const STARS = Array.from({ length: 70 }, () => ({
  x: R0() * 1920,
  y: R0() * 420,
  r: 0.8 + R0() * 1.3,
  ph: R0() * 6.28,
  sp: 0.5 + R0() * 1.6,
}))

const MOTES = Array.from({ length: 46 }, (_, i) => {
  const r = rng(700 + i)
  return { x: r(), y: r(), sp: 0.3 + r() * 0.7, ph: r() * 6.28, s: 1.4 + r() * 2.6 }
})

/** City plate geometry (film coordinates). */
const CASTLE: Pt = [1312, 478]
const ROUTE_A = resample(curve([CASTLE[0], CASTLE[1] + 26], [1050, 640], [720, 790]), 17)
const ROUTE_B = resample(curve([CASTLE[0], CASTLE[1] + 26], [1150, 640], [1010, 790]), 17)
const ROUTES_ALL = (
  [
    [[200, 700], [640, 560]],
    [[520, 860], [880, 700]],
    [[860, 760], [1060, 620]],
    [[1120, 740], [1200, 640]],
    [[1720, 760], [1520, 640]],
    [[1960, 640], [1640, 540]],
    [[1600, 790], [1450, 680]],
  ] as [Pt, Pt][]
).map(([p0, c]) => resample(curve(p0, c, [CASTLE[0], CASTLE[1] + 24]), 16))

/** Map plate geometry. */
const MAP_X = -140
const MAP_Y = -60
const MAP_W = 2200
const MAP_CASTLE: Pt = [1499, 215]
const MAP_ROUTES = (
  [
    [1950, 820],
    [180, 150],
    [300, 800],
    [900, 40],
    [1300, 850],
  ] as Pt[]
).map((s, i) => {
  const r = rng(90 + i)
  const pts: Pt[] = [s]
  let [x, y] = s
  for (let k = 0; k < 18; k++) {
    const dx = MAP_CASTLE[0] - x
    const dy = MAP_CASTLE[1] + 40 - y
    if ((k + i) % 2 === 0) x += Math.sign(dx) * Math.min(Math.abs(dx), 80 * (1 + Math.floor(r() * 2)))
    else y += Math.sign(dy) * Math.min(Math.abs(dy), 80 * (1 + Math.floor(r() * 2)))
    pts.push([x + (r() - 0.5) * 12, y + (r() - 0.5) * 12])
  }
  return resample(pts, 9)
})

/* Climax particles */
const COINS = Array.from({ length: 56 }, (_, i) => {
  const r = rng(300 + i)
  return { vx: (r() - 0.5) * 1100, vy: -780 - r() * 760, delay: r() * 0.25, spin: 6 + r() * 12, floor: 905 + r() * 55 }
})
const CONFETTI = Array.from({ length: 90 }, (_, i) => {
  const r = rng(500 + i)
  const colors = [C.roof, C.gold, C.stone, "#2E8A88"]
  return {
    x: 1290 + (r() - 0.5) * 300,
    vx: (r() - 0.5) * 900,
    vy: -600 - r() * 700,
    rot: r() * 6,
    vr: (r() - 0.5) * 14,
    color: colors[i % 4],
    delay: 0.1 + r() * 0.5,
    w: 8 + r() * 10,
  }
})

/* ------------------------------------------------------------ ambience */

/** Twinkling cross sparkles over a painted sky. */
function twinkle(ctx: Ctx, t: number, yMax: number, a = 1) {
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  for (const s of STARS) {
    if (s.y > yMax) continue
    const k = Math.sin(t * s.sp + s.ph)
    if (k < 0.55) continue
    const al = ((k - 0.55) / 0.45) * 0.85 * a
    ctx.fillStyle = rgba("#FFF4D6", al)
    ctx.fillRect(s.x - s.r * 2.4, s.y - 0.7, s.r * 4.8, 1.4)
    ctx.fillRect(s.x - 0.7, s.y - s.r * 2.4, 1.4, s.r * 4.8)
    glow(ctx, s.x, s.y, s.r * 5, C.stone, al * 0.5)
  }
  ctx.restore()
}

/** Drifting dust caught in a light. */
function motes(ctx: Ctx, t: number, cx: number, cy: number, rx: number, ry: number, a: number) {
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  for (const m of MOTES) {
    const x = cx + (m.x - 0.5) * 2 * rx + Math.sin(t * m.sp + m.ph) * 24
    const yy = (((m.y - t * 0.035 * m.sp) % 1) + 1) % 1
    const y = cy + (yy - 0.5) * 2 * ry
    const fade = Math.sin(yy * Math.PI)
    disc(ctx, x, y, m.s, rgba("#FFE9B8", a * fade * (0.35 + 0.35 * Math.sin(t * 2 + m.ph))))
  }
  ctx.restore()
}

/** Horizontal glints on water. */
function shimmer(ctx: Ctx, t: number, x: number, y: number, n: number, spread: number, a: number) {
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < n; i++) {
    const yy = y + i * 12
    const w = 40 + (n - i) * spread + Math.sin(t * 2 + i * 1.7) * 18
    const xx = x + Math.sin(t * 0.8 + i * 1.3) * 16
    ctx.fillStyle = rgba("#FFE9B8", a * (0.4 + 0.6 * Math.max(0, Math.sin(t * 3 + i * 2.1))))
    ctx.fillRect(xx - w / 2, yy, w, 2.2)
  }
  ctx.restore()
}

function castleGlow(ctx: Ctx, x: number, y: number, light: number, t: number, s = 1) {
  if (light <= 0) return
  const fl = light * (0.86 + 0.14 * Math.sin(t * 11) * Math.sin(t * 3.3))
  glow(ctx, x, y, 240 * s * (0.7 + fl * 0.5), C.gold, 0.5 * fl)
  glow(ctx, x, y, 70 * s, "#FFF4D6", 0.45 * fl)
  disc(ctx, x, y - 6 * s, 5 * s * (0.6 + fl * 0.5), rgba(C.gold, fl))
  disc(ctx, x, y - 6 * s, 2.4 * s, rgba("#FFF4D6", fl))
}

/** Wide night view of Kalamata. Used at the opening and the finale. */
function cityView(ctx: Ctx, A: FilmAssets, t: number, light: number, dim: number) {
  plate(ctx, A, "city")
  twinkle(ctx, t, 300)
  shimmer(ctx, t, 1413, 846, 12, 6, 0.16)
  if (dim > 0) {
    ctx.fillStyle = rgba(C.night, dim * 0.85)
    ctx.fillRect(-600, -1200, W + 1200, H + 2400)
  }
  castleGlow(ctx, CASTLE[0], CASTLE[1], light, t)
}

function pulseRing(ctx: Ctx, x: number, y: number, age: number, maxR = 360, lw = 5) {
  if (age < 0 || age > 1.4) return
  const k = eout(age / 1.4)
  ctx.beginPath()
  ctx.arc(x, y, 10 + k * maxR, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(C.gold, (1 - k) * 0.25)
  ctx.lineWidth = (lw * (1 - k) + 1) * 4
  ctx.stroke()
  ctx.strokeStyle = rgba("#FFF4D6", (1 - k) * 0.75)
  ctx.lineWidth = lw * (1 - k) + 1
  ctx.stroke()
}

/* ------------------------------------------------------------- characters */

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

type Look = {
  skin: string
  skinSh: string
  hair: string
  top: string
  topSh: string
  pants: string
  pantsSh: string
  shoe: string
  blink: number
}
const LOOKS: Record<Acc, Look> = {
  scarf: {
    skin: "#F2C29C",
    skinSh: "#D69F78",
    hair: "#2A1810",
    top: "#2E8A88",
    topSh: "#1F6563",
    pants: "#22314A",
    pantsSh: "#172236",
    shoe: "#EFE3C8",
    blink: 0,
  },
  cap: {
    skin: "#C88A5E",
    skinSh: "#A66D45",
    hair: "#1B120D",
    top: "#EADFC6",
    topSh: "#C4B697",
    pants: "#2F4560",
    pantsSh: "#213247",
    shoe: "#C4683F",
    blink: 1.1,
  },
  pack: {
    skin: "#8A5638",
    skinSh: "#6C4029",
    hair: "#140D0A",
    top: "#6A9A58",
    topSh: "#4D7640",
    pants: "#262F3E",
    pantsSh: "#1A212D",
    shoe: "#EFE3C8",
    blink: 2.2,
  },
}

function limb(ctx: Ctx, a: Pt, b: Pt, c: Pt, w1: number, w2: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = w1
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.stroke()
  ctx.lineWidth = w2
  ctx.beginPath()
  ctx.moveTo(b[0], b[1])
  ctx.lineTo(c[0], c[1])
  ctx.stroke()
}

function shoe(ctx: Ctx, knee: Pt, foot: Pt, color: string) {
  const ang = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]) - Math.PI / 2
  ctx.save()
  ctx.translate(foot[0], foot[1])
  ctx.rotate(ang * 0.6)
  rr(ctx, -8, -5, 24, 11, 5.5)
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = "rgba(10,14,22,0.45)"
  ctx.fillRect(-7, 3.5, 22, 2.5)
  ctx.restore()
}

/** Flat-vector character (Kurzgesagt-ish). Returns the front hand position in world space. */
function figure(ctx: Ctx, x: number, y: number, s: number, acc: Acc, p: Pose, t: number): Pt {
  const L = LOOKS[acc]
  const face = p.face ?? 1
  const lift = p.jump ?? 0

  const sf = clamp(1 - lift / 280)
  oval(ctx, x, y + 3 * s, 36 * s * (0.6 + 0.4 * sf), 7 * s, `rgba(4,8,16,${0.34 * sf})`)

  ctx.save()
  ctx.translate(x, y - lift)
  ctx.scale(s * face, s)
  const run = p.run
  const bob = run !== undefined ? -Math.abs(Math.cos(run)) * 7 : 0
  const lean = p.lean ?? (run !== undefined ? 0.2 : 0)
  const hip: Pt = [0, -66 + bob]
  const sh: Pt = [hip[0] + Math.sin(lean) * 52, hip[1] - Math.cos(lean) * 52]
  const head: Pt = [sh[0] + Math.sin(lean) * 31, sh[1] - Math.cos(lean) * 31]
  const armRoot: Pt = [sh[0] - Math.sin(lean) * 5, sh[1] + Math.cos(lean) * 5]

  const legs = [0, Math.PI].map((side) => {
    let th: number
    let kn: number
    if (p.tuck) {
      th = side ? 0.7 : -0.25
      kn = 1.35
    } else if (run !== undefined) {
      const ph = run + side
      th = Math.sin(ph) * 0.8
      kn = 0.2 + Math.max(0, Math.sin(ph + 1.7)) * 1.1
    } else if (p.skid) {
      th = side ? 0.78 : -0.14
      kn = side ? 0.05 : 0.6
    } else {
      th = side ? 0.12 : -0.12
      kn = 0.04
    }
    const knee: Pt = [hip[0] + Math.sin(th) * 33, hip[1] + Math.cos(th) * 33]
    const foot: Pt = [knee[0] + Math.sin(th - kn) * 33, knee[1] + Math.cos(th - kn) * 33]
    return { knee, foot }
  })

  const arms = p.arms ?? (run !== undefined ? "run" : "idle")
  const armJoints = [1, 0].map((side) => {
    let ua = 0
    let fa = 0
    if (arms === "run") {
      const ph = (run ?? 0) + (side ? 0 : Math.PI)
      ua = Math.sin(ph) * 0.9
      fa = ua + 1.3
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
      ua = side ? 0.14 : -0.1
      fa = ua + 0.12
    }
    const el: Pt = [armRoot[0] + Math.sin(ua) * 27, armRoot[1] + Math.cos(ua) * 27]
    const hd: Pt = [el[0] + Math.sin(fa) * 26, el[1] + Math.cos(fa) * 26]
    return { el, hd }
  })
  const backArm = armJoints[0]
  const frontArm = armJoints[1]

  // Torso frame helper: origin at hip, rotated by lean (up = -y).
  const torso = (fn: () => void) => {
    ctx.save()
    ctx.translate(hip[0], hip[1])
    ctx.rotate(lean)
    fn()
    ctx.restore()
  }

  if (acc === "pack") {
    torso(() => {
      rr(ctx, -37, -56, 24, 46, 10)
      const g = ctx.createLinearGradient(-37, 0, -13, 0)
      g.addColorStop(0, "#8E4528")
      g.addColorStop(1, C.roof)
      ctx.fillStyle = g
      ctx.fill()
      rr(ctx, -37, -56, 24, 15, 8)
      ctx.fillStyle = "#A9532F"
      ctx.fill()
      rr(ctx, -34, -30, 16, 14, 4)
      ctx.fillStyle = "#B65D37"
      ctx.fill()
    })
  }

  limb(ctx, armRoot, backArm.el, backArm.hd, 13, 12, L.topSh)
  disc(ctx, backArm.hd[0], backArm.hd[1], 6.5, L.skinSh)

  limb(ctx, hip, legs[1].knee, legs[1].foot, 17, 15, L.pantsSh)
  shoe(ctx, legs[1].knee, legs[1].foot, mix(L.shoe, C.night, 0.3))
  limb(ctx, hip, legs[0].knee, legs[0].foot, 17, 15, L.pants)
  shoe(ctx, legs[0].knee, legs[0].foot, L.shoe)

  torso(() => {
    rr(ctx, -5, -64, 10, 12, 4)
    ctx.fillStyle = L.skinSh
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-16, 9)
    ctx.lineTo(16, 9)
    ctx.quadraticCurveTo(22, -20, 19, -47)
    ctx.quadraticCurveTo(16, -60, 0, -60)
    ctx.quadraticCurveTo(-16, -60, -19, -47)
    ctx.quadraticCurveTo(-22, -20, -16, 9)
    ctx.closePath()
    const g = ctx.createLinearGradient(-21, 0, 21, 0)
    g.addColorStop(0, L.topSh)
    g.addColorStop(0.55, L.top)
    g.addColorStop(1, L.top)
    ctx.fillStyle = g
    ctx.fill()

    ctx.fillStyle = L.pants
    rr(ctx, -16, 2, 32, 9, 4)
    ctx.fill()

    if (acc === "cap") {
      rr(ctx, -2, -24, 18, 13, 5)
      ctx.fillStyle = L.topSh
      ctx.fill()
      ctx.strokeStyle = L.topSh
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(6, -58)
      ctx.lineTo(8, -44)
      ctx.stroke()
    } else if (acc === "scarf") {
      ctx.strokeStyle = L.topSh
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(9, -52)
      ctx.lineTo(10, 2)
      ctx.stroke()
      disc(ctx, 13, -22, 1.8, C.gold)
      disc(ctx, 13, -10, 1.8, C.gold)
    } else {
      ctx.strokeStyle = "#8E4528"
      ctx.lineWidth = 5
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(-6, -58)
      ctx.quadraticCurveTo(8, -46, 6, -16)
      ctx.stroke()
    }

    ctx.strokeStyle = rgba(C.gold, 0.6)
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(16, 7)
    ctx.quadraticCurveTo(22, -20, 19, -47)
    ctx.quadraticCurveTo(16, -60, 2, -60)
    ctx.stroke()
  })

  // Head
  ctx.save()
  ctx.translate(head[0], head[1])
  ctx.rotate(lean * 0.35)
  const faceGrad = ctx.createRadialGradient(8, -6, 2, 2, 1, 22)
  faceGrad.addColorStop(0, mix(L.skin, "#FFFFFF", 0.12))
  faceGrad.addColorStop(0.7, L.skin)
  faceGrad.addColorStop(1, L.skinSh)
  if (acc === "scarf") {
    disc(ctx, -15, -16, 10.5, L.hair)
    disc(ctx, -3, -3, 22.5, L.hair)
    disc(ctx, 2, 1, 19.5, faceGrad)
    oval(ctx, 3, -15, 16, 7.5, L.hair, -0.25)
    oval(ctx, -8, -2, 10, 17, L.hair, 0.2)
  } else if (acc === "cap") {
    disc(ctx, -9, 3, 13, L.hair)
    disc(ctx, 0, 0, 20, faceGrad)
    disc(ctx, -6, 3, 4.5, L.skinSh)
    ctx.beginPath()
    ctx.arc(0, -4, 21.5, Math.PI, 0)
    ctx.closePath()
    const cg = ctx.createLinearGradient(-21, 0, 21, 0)
    cg.addColorStop(0, "#B9893A")
    cg.addColorStop(1, C.gold)
    ctx.fillStyle = cg
    ctx.fill()
    rr(ctx, 9, -9, 26, 7, 3.5)
    ctx.fillStyle = "#B9893A"
    ctx.fill()
    disc(ctx, 0, -25, 3, "#B9893A")
    ctx.strokeStyle = rgba("#FFF4D6", 0.5)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, -4, 19, -1.2, -0.25)
    ctx.stroke()
  } else {
    for (const [cx, cy, r] of [
      [-12, -8, 12],
      [-4, -16, 12],
      [8, -17, 10],
      [-17, 4, 10],
      [-15, -18, 9],
    ])
      disc(ctx, cx, cy, r, L.hair)
    disc(ctx, 2, 1, 19.5, faceGrad)
    disc(ctx, -5, 4, 4.5, L.skinSh)
    disc(ctx, 4, -17, 8, L.hair)
    disc(ctx, 13, -15, 6, L.hair)
    disc(ctx, -6, -14, 7, L.hair)
  }

  disc(ctx, 21, 3, 3, L.skinSh)
  const blinkK = (t + L.blink) % 3.4 < 0.11 ? 0.15 : 1
  for (const ex of [8, 15]) {
    oval(ctx, ex, -1, 2.5, 3.4 * blinkK, "#1A120E")
    if (blinkK === 1) disc(ctx, ex + 0.9, -2.3, 0.95, "#FFF6E6")
  }
  disc(ctx, 9, 8, 4.4, "rgba(214,96,80,0.28)")
  const shout = arms === "cheer" || arms === "up"
  if (shout) {
    oval(ctx, 13, 10, 3.6, 4.2, "#4A2219")
  } else {
    ctx.strokeStyle = "#5A2E22"
    ctx.lineWidth = 1.8
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.arc(13, 7, 4, 0.35, Math.PI - 0.7)
    ctx.stroke()
  }
  ctx.restore()

  if (acc === "scarf") {
    const flap = Math.sin(t * 13) * (run !== undefined ? 1 : 0.35)
    ctx.save()
    ctx.translate(sh[0], sh[1])
    ctx.rotate(lean)
    ctx.lineCap = "round"
    ctx.strokeStyle = C.roof
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(-6, -2)
    ctx.quadraticCurveTo(-28, 4 + flap * 6, -52, -2 + flap * 12)
    ctx.stroke()
    ctx.strokeStyle = "#E08A5E"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-10, -2)
    ctx.quadraticCurveTo(-28, 3 + flap * 6, -48, -2 + flap * 12)
    ctx.stroke()
    rr(ctx, -12, -9, 26, 13, 6)
    ctx.fillStyle = C.roof
    ctx.fill()
    ctx.fillStyle = "#A9532F"
    ctx.fillRect(-12, 0, 26, 4)
    ctx.restore()
  }

  limb(ctx, armRoot, frontArm.el, frontArm.hd, 13, 12, L.top)
  disc(ctx, frontArm.hd[0], frontArm.hd[1], 6.8, L.skin)

  ctx.restore()
  const hand = frontArm.hd
  return [x + hand[0] * s * face, y - lift + hand[1] * s]
}

/* ------------------------------------------------------------------ props */

function phone(ctx: Ctx, x: number, y: number, s: number, light: number, rot = 0, needle?: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  if (light > 0) glow(ctx, 0, 0, 120, C.gold, 0.5 * light)
  rr(ctx, -15, -26, 30, 52, 7)
  ctx.fillStyle = "#0A1220"
  ctx.fill()
  ctx.strokeStyle = "#3A4A5E"
  ctx.lineWidth = 2
  ctx.stroke()
  rr(ctx, -11, -21, 22, 42, 3)
  const g = ctx.createLinearGradient(0, -21, 0, 21)
  g.addColorStop(0, mix(C.night, "#FFE7A8", 0.15 + light * 0.85))
  g.addColorStop(1, mix(C.night, C.gold, 0.15 + light * 0.8))
  ctx.fillStyle = g
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
  glow(ctx, x, y, r * 2.6, C.gold, 0.4)
  const bz = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
  bz.addColorStop(0, "#F6D98A")
  bz.addColorStop(0.5, "#B9893A")
  bz.addColorStop(1, "#7A5520")
  disc(ctx, x, y, r * 1.08, bz)
  const face = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  face.addColorStop(0, "#21485B")
  face.addColorStop(1, "#0C1828")
  disc(ctx, x, y, r * 0.96, face)
  for (let i = 0; i < 32; i++) {
    const ang = (i / 32) * Math.PI * 2
    const l = i % 8 === 0 ? 0.2 : i % 2 === 0 ? 0.12 : 0.07
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(ang) * r * 0.9, y + Math.sin(ang) * r * 0.9)
    ctx.lineTo(x + Math.cos(ang) * r * (0.9 - l), y + Math.sin(ang) * r * (0.9 - l))
    ctx.strokeStyle = rgba(C.stone, i % 8 === 0 ? 0.95 : 0.55)
    ctx.lineWidth = r * (i % 8 === 0 ? 0.035 : 0.022)
    ctx.stroke()
  }
  ctx.fillStyle = C.gold
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.2)
  ctx.lineTo(x - r * 0.09, y - r * 1.04)
  ctx.lineTo(x + r * 0.09, y - r * 1.04)
  ctx.fill()
  ctx.translate(x, y)
  ctx.rotate(needle)
  ctx.fillStyle = C.roof
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.74)
  ctx.lineTo(r * 0.12, 0)
  ctx.lineTo(-r * 0.12, 0)
  ctx.fill()
  ctx.fillStyle = "#E88A5C"
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.74)
  ctx.lineTo(r * 0.12, 0)
  ctx.lineTo(0, 0)
  ctx.fill()
  ctx.fillStyle = C.stone
  ctx.beginPath()
  ctx.moveTo(0, r * 0.74)
  ctx.lineTo(r * 0.12, 0)
  ctx.lineTo(-r * 0.12, 0)
  ctx.fill()
  disc(ctx, 0, 0, r * 0.08, bz)
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

function cat(ctx: Ctx, x: number, y: number, s: number, t: number, lift: number, alarmed: number) {
  ctx.save()
  ctx.translate(x, y - lift)
  ctx.scale(s, s)
  const col = "#0B1018"
  ctx.strokeStyle = col
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(-26, -18)
  ctx.quadraticCurveTo(-50, -20 - alarmed * 30, -44 + Math.sin(t * 3) * 6, -52 - alarmed * 20)
  ctx.stroke()
  oval(ctx, 0, -16 - alarmed * 6, 28, 14 + alarmed * 6, col)
  disc(ctx, 24, -32, 12, col)
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(16, -40)
  ctx.lineTo(19, -56)
  ctx.lineTo(26, -43)
  ctx.lineTo(32, -55)
  ctx.lineTo(34, -38)
  ctx.fill()
  ctx.lineWidth = 5
  for (const lx of [-16, 14])
    poly(ctx, [
      [lx, -8],
      [lx + (alarmed ? (lx < 0 ? -8 : 8) : 0), 0],
    ])
  ctx.strokeStyle = rgba(C.gold, 0.45)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(0, -16 - alarmed * 6, 28, 14 + alarmed * 6, 0, -2.6, -0.5)
  ctx.stroke()
  glow(ctx, 26, -34, 14, C.gold, 0.6)
  oval(ctx, 22, -34, 2.2, 2.8 - alarmed * 0.4, "#F6D98A")
  oval(ctx, 30, -34, 2.2, 2.8 - alarmed * 0.4, "#F6D98A")
  ctx.restore()
}

function chest(ctx: Ctx, x: number, y: number, open: number, t: number) {
  const w = 250
  const h = 128
  if (open > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const n = 18
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - n / 2) * 0.16 + Math.sin(t * 0.6) * 0.06
      const l = 900 + (i % 3) * 220
      ctx.fillStyle = rgba(C.gold, 0.09 * open)
      ctx.beginPath()
      ctx.moveTo(x, y - h)
      ctx.lineTo(x + Math.cos(a - 0.045) * l, y - h + Math.sin(a - 0.045) * l)
      ctx.lineTo(x + Math.cos(a + 0.045) * l, y - h + Math.sin(a + 0.045) * l)
      ctx.fill()
    }
    ctx.restore()
    glow(ctx, x, y - h, 600, C.gold, 0.7 * open)
  }
  oval(ctx, x, y + 4, w * 0.64, 18, "rgba(4,8,16,0.45)")
  const wood = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  wood.addColorStop(0, "#4E2C18")
  wood.addColorStop(0.5, "#7A4A2C")
  wood.addColorStop(1, "#5A3420")
  rr(ctx, x - w / 2, y - h, w, h, 12)
  ctx.fillStyle = wood
  ctx.fill()
  ctx.fillStyle = "rgba(20,10,4,0.35)"
  for (let k = 1; k < 4; k++) ctx.fillRect(x - w / 2 + 6, y - h + (k * h) / 4, w - 12, 2.5)
  const brass = ctx.createLinearGradient(0, y - h, 0, y)
  brass.addColorStop(0, "#F6D98A")
  brass.addColorStop(1, "#9C7030")
  ctx.fillStyle = brass
  ctx.fillRect(x - w / 2 + 26, y - h, 20, h)
  ctx.fillRect(x + w / 2 - 46, y - h, 20, h)
  ctx.fillRect(x - w / 2, y - 14, w, 8)
  for (const bx of [x - w / 2 + 36, x + w / 2 - 36])
    for (let k = 0; k < 3; k++) disc(ctx, bx, y - h + 22 + k * 38, 2.6, "#6E4E1E")
  if (open > 0) {
    oval(ctx, x, y - h + 6, w / 2 - 10, 18, C.gold)
    for (let i = 0; i < 9; i++) disc(ctx, x - 90 + i * 22, y - h + 2 - (i % 2) * 8, 11, i % 2 ? "#F6D98A" : C.gold)
  }
  const lidH = 60 * (1 - open * 0.55)
  const lidY = y - h - lidH - open * 78
  if (open > 0) {
    ctx.fillStyle = "#3A2010"
    ctx.fillRect(x - w / 2 + 8, lidY + lidH, w - 16, y - h - lidY - lidH + 2)
    ctx.fillStyle = rgba(C.gold, 0.6 * open)
    ctx.fillRect(x - w / 2 + 8, lidY + lidH, w - 16, y - h - lidY - lidH + 2)
  }
  rr(ctx, x - w / 2 - 4, lidY, w + 8, lidH, 28 * (1 - open * 0.6))
  const lid = ctx.createLinearGradient(0, lidY, 0, lidY + lidH)
  lid.addColorStop(0, "#8A5634")
  lid.addColorStop(1, "#5A3420")
  ctx.fillStyle = lid
  ctx.fill()
  ctx.fillStyle = brass
  ctx.fillRect(x - w / 2 + 26, lidY, 20, lidH)
  ctx.fillRect(x + w / 2 - 46, lidY, 20, lidH)
  ctx.strokeStyle = rgba("#FFF4D6", 0.35)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - w / 2 + 14, lidY + 6)
  ctx.lineTo(x + w / 2 - 14, lidY + 6)
  ctx.stroke()
  if (open < 0.5) {
    rr(ctx, x - 17, y - h - 8, 34, 38, 7)
    ctx.fillStyle = brass
    ctx.fill()
    disc(ctx, x, y - h + 8, 4.5, "#3A2010")
  }
}

/* --------------------------------------------------------------- scenes */

/** 1. The city keeps a secret. */
function sceneCity(ctx: Ctx, t: number, A: FilmAssets) {
  const p = eio(seg(t, 0, D(2)))
  ctx.save()
  cam(ctx, lerp(960, 1060, p), lerp(540, 570, p), 1 + 0.07 * p)
  const light = t < 0.15 ? 0 : seg(t, 0.15, 0.5) * (t < 0.42 ? (Math.sin(t * 70) > 0 ? 1 : 0.3) : 1)
  cityView(ctx, A, t, light, 0)
  pulseRing(ctx, CASTLE[0], CASTLE[1], t - D(1), 420)
  pulseRing(ctx, CASTLE[0], CASTLE[1], t - D(2) + 0.05, 260)
  trail(ctx, ROUTE_A, eio(seg(t, D(1), D(1) + 1.6)), 1 - seg(t, D(1) + 1.9, D(2) - 0.1))
  trail(ctx, ROUTE_B, eio(seg(t, D(2) - 0.3, D(2) + 0.3)), 1)
  ctx.restore()
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
  glow(ctx, 0, 0, 360, C.gold, 0.3)
  ctx.fillStyle = "rgba(4,8,16,0.35)"
  rr(ctx, -w / 2 + 10, -h / 2 + 16, w, h, 6)
  ctx.fill()
  const paper = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
  paper.addColorStop(0, "#F7EEDA")
  paper.addColorStop(1, "#E2D3B0")
  rr(ctx, -w / 2, -h / 2, w, h, 6)
  ctx.fillStyle = paper
  ctx.fill()

  if (unfold < 1) {
    ctx.globalAlpha = 1 - unfold
    ctx.fillStyle = "rgba(120,90,50,0.12)"
    ctx.beginPath()
    ctx.moveTo(-w / 2, -h / 2)
    ctx.lineTo(0, 10)
    ctx.lineTo(w / 2, -h / 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "rgba(120,90,50,0.35)"
    ctx.lineWidth = 2.5
    poly(ctx, [
      [-w / 2, -h / 2],
      [0, 10],
      [w / 2, -h / 2],
    ])
    const crack = seg(t, 8.05, 8.12)
    disc(ctx, 0, 8, 25, "#8E3A22")
    disc(ctx, 0, 8, 19, C.roof)
    disc(ctx, -5, 3, 6, "rgba(255,220,190,0.35)")
    if (crack > 0) {
      ctx.strokeStyle = C.stone
      ctx.lineWidth = 3
      poly(ctx, [
        [-10, -10],
        [2, 6],
        [-4, 14],
        [8, 30],
      ])
    }
    ctx.globalAlpha = 1
  }
  if (unfold > 0) {
    ctx.globalAlpha = unfold
    ctx.strokeStyle = "rgba(120,90,50,0.2)"
    ctx.lineWidth = 2
    for (const fx of [-w / 6, w / 6])
      poly(ctx, [
        [fx, -h / 2],
        [fx, h / 2],
      ])
    ctx.fillStyle = "rgba(31,92,115,0.55)"
    ctx.beginPath()
    ctx.moveTo(-w / 2, h * 0.18)
    for (let i = 0; i <= 20; i++) {
      const xx = -w / 2 + (w * i) / 20
      ctx.lineTo(xx, h * 0.18 + Math.sin(i * 0.9) * 8 - Math.exp(-(((i - 14) / 3) ** 2)) * 22)
    }
    ctx.lineTo(w / 2, h / 2)
    ctx.lineTo(-w / 2, h / 2)
    ctx.fill()
    for (let i = 0; i < 30; i++) {
      const r = rng(60 + i)
      ctx.fillStyle = i % 3 ? "rgba(196,104,63,0.45)" : "rgba(120,90,50,0.25)"
      rr(ctx, -w / 2 + 20 + r() * (w - 60), -h / 2 + 20 + r() * (h * 0.55), 8 + r() * 14, 6 + r() * 8, 2)
      ctx.fill()
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
    trail(ctx, route, eio(seg(t, 8.6, 9.5)), unfold, 3)
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

function cafeTable(ctx: Ctx, t: number) {
  oval(ctx, 1300, 888, 260, 16, "rgba(4,8,16,0.4)")
  const iron = ctx.createLinearGradient(1290, 0, 1310, 0)
  iron.addColorStop(0, "#0E151F")
  iron.addColorStop(0.5, "#3A4656")
  iron.addColorStop(1, "#0E151F")
  rr(ctx, 1292, 760, 16, 124, 6)
  ctx.fillStyle = iron
  ctx.fill()
  oval(ctx, 1300, 884, 74, 11, "#1A2430")
  oval(ctx, 1300, 764, 232, 28, "#A99D84")
  const top = ctx.createLinearGradient(1070, 0, 1530, 0)
  top.addColorStop(0, "#D9CDB2")
  top.addColorStop(0.6, "#F7EFDD")
  top.addColorStop(1, "#E3D7BE")
  oval(ctx, 1300, 755, 230, 25, top)
  ctx.strokeStyle = rgba(C.gold, 0.4)
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(1300, 755, 228, 24, 0, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
  for (const cx of [1160, 1438]) {
    oval(ctx, cx, 750, 34, 7, "#CFC3A8")
    const cup = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0)
    cup.addColorStop(0, "#D7CCB4")
    cup.addColorStop(0.6, "#FBF4E6")
    cup.addColorStop(1, "#E6DCC6")
    rr(ctx, cx - 18, 710, 36, 40, 9)
    ctx.fillStyle = cup
    ctx.fill()
    oval(ctx, cx, 712, 15, 4, "#5A3422")
    ctx.strokeStyle = "#E6DCC6"
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(cx + 22, 728, 9, -1.2, 1.2)
    ctx.stroke()
    for (let k = 0; k < 2; k++) {
      const w = Math.sin(t * 2 + k + cx)
      ctx.strokeStyle = rgba(C.stone, 0.3)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx - 6 + k * 12, 702)
      ctx.quadraticCurveTo(cx - 14 + k * 12 + w * 8, 678, cx - 4 + k * 12, 654)
      ctx.stroke()
    }
  }
}

/** 2. The invitation. */
function sceneCafe(ctx: Ctx, t: number, A: FilmAssets) {
  ctx.save()
  cam(ctx, 1030, 545, 1.08 + 0.035 * seg(t, D(2), D(4)))
  plate(ctx, A, "cafe")
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 2.7)
  glow(ctx, 614, 331, 340, C.gold, 0.22 * fl)
  motes(ctx, t, 700, 420, 420, 300, 0.7)

  ctx.save()
  ctx.translate(0, 40)
  cafeTable(ctx, t)

  const on = seg(t, 5.5, 5.62)
  const buzz = t > 5.5 && t < 6.4 ? Math.sin(t * 90) * 2.5 * (Math.sin(t * 18) > 0 ? 1 : 0) : 0
  phone(ctx, 1300 + buzz, 712, 1.6, on, buzz * 0.01)
  if (on > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    const g = ctx.createLinearGradient(0, 700, 0, 360)
    g.addColorStop(0, rgba(C.gold, 0.24 * on))
    g.addColorStop(1, rgba(C.gold, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(1280, 700)
    ctx.lineTo(1100, 340)
    ctx.lineTo(1500, 340)
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
  ctx.restore()
}

const ALLEY_W = 2150
const ALLEY_Y = -120

function streetLamp(ctx: Ctx, x: number, t: number, k: number) {
  const iron = "#070B12"
  ctx.fillStyle = iron
  ctx.fillRect(x - 9, 250, 18, 900)
  ctx.fillRect(x - 46, 240, 80, 14)
  ctx.beginPath()
  ctx.moveTo(x - 60, 262)
  ctx.lineTo(x - 2, 262)
  ctx.lineTo(x - 10, 248)
  ctx.lineTo(x - 52, 248)
  ctx.fill()
  const fl = 0.8 + 0.2 * Math.sin(t * 13 + k * 3) * Math.sin(t * 2 + k)
  glow(ctx, x - 31, 296, 240, C.gold, 0.4 * fl)
  rr(ctx, x - 56, 262, 50, 66, 8)
  ctx.fill()
  const g = ctx.createLinearGradient(0, 270, 0, 320)
  g.addColorStop(0, "#FFF0C2")
  g.addColorStop(1, C.gold)
  rr(ctx, x - 49, 270, 36, 50, 5)
  ctx.fillStyle = g
  ctx.fill()
}

/** 3. Go! Side-scrolling run through the old town. */
function sceneAlley(ctx: Ctx, t: number, A: FilmAssets) {
  const lt = t - D(4)
  const off = lt * 430
  const sOff = off * 0.42
  ctx.save()
  cam(ctx, 960, 540, 1)
  const first = Math.floor((sOff + 115) / ALLEY_W) - 1
  for (let i = first; i < first + 3; i++) {
    const x = i * ALLEY_W - sOff - 115
    if (x > W || x + ALLEY_W < 0) continue
    plate(ctx, A, "alley", x, ALLEY_Y, ALLEY_W, Math.abs(i) % 2 === 1)
  }
  twinkle(ctx, t, 150, 0.8)

  const catX = 1971 - sOff
  const jumpK = seg(t, D(5), D(5) + 0.5)
  cat(ctx, catX, 502, 1.1, t, Math.sin(jumpK * Math.PI) * 120, t > D(5) - 0.05 ? 1 : 0)

  const base = 968
  const phase = (lt / BEAT) * Math.PI
  figure(ctx, 1170, base + 6, 1.3, "pack", { run: phase + 0.6 }, t)
  figure(ctx, 1330, base + 2, 1.3, "cap", { run: phase + 2.1 }, t)
  const hand = figure(ctx, 1500, base + 8, 1.3, "scarf", { run: phase, arms: "hold", lean: 0.24 }, t)
  phone(ctx, hand[0] + 6, hand[1] - 8, 1, 1, 0.3)

  const fOff = (off * 1.55) % 1300
  for (let k = -1; k < 3; k++) streetLamp(ctx, k * 1300 + 900 - fOff, t, k)
  ctx.restore()
}

/** Distance covered in scenes 4/7 with ease-in/out stops. */
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

/** 4. Follow the clue. Railway Park. */
function scenePark(ctx: Ctx, t: number, A: FilmAssets) {
  const a = D(6)
  const pos = travelled(t, a, 17.25, 17.62, 18.69, D(8) + 1)
  ctx.save()
  cam(ctx, 960, 540, 1)
  plate(ctx, A, "park", -clamp(pos * 0.25, 0, 375), -190, 2300)
  twinkle(ctx, t, 260, 0.8)

  const feet = 1035
  const g = ctx.createLinearGradient(0, 992, 0, 1080)
  g.addColorStop(0, "#3B4556")
  g.addColorStop(1, "#1C232E")
  ctx.fillStyle = g
  ctx.fillRect(-100, 992, W + 200, 200)
  ctx.fillStyle = "rgba(239,227,200,0.18)"
  ctx.fillRect(-100, 992, W + 200, 2)
  ctx.fillStyle = "rgba(4,8,16,0.35)"
  const so = pos % 150
  for (let row = 0; row < 3; row++) {
    ctx.fillRect(-100, 1022 + row * 30, W + 200, 2)
    for (let x = -so - (row % 2) * 75; x < W + 150; x += 150) ctx.fillRect(x, 994 + row * 30, 2, 28)
  }

  const signX = 1700 + (travelled(17.62, a, 17.25, 17.62, 18.69, 99) - pos)
  const wood = ctx.createLinearGradient(signX - 8, 0, signX + 8, 0)
  wood.addColorStop(0, "#4E2C18")
  wood.addColorStop(1, "#7A4A2C")
  ctx.fillStyle = wood
  ctx.fillRect(signX - 8, feet - 250, 16, 262)
  oval(ctx, signX, feet + 10, 40, 7, "rgba(4,8,16,0.4)")
  const arrow = (dir: number, y: number, active: number) => {
    ctx.save()
    ctx.translate(signX, y)
    ctx.scale(dir, 1)
    const bg = ctx.createLinearGradient(0, -24, 0, 24)
    bg.addColorStop(0, mix("#8A5634", C.gold, active * 0.75))
    bg.addColorStop(1, mix("#5A3420", "#B9893A", active * 0.75))
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.moveTo(-6, -24)
    ctx.lineTo(110, -24)
    ctx.lineTo(140, 0)
    ctx.lineTo(110, 24)
    ctx.lineTo(-6, 24)
    ctx.fill()
    ctx.fillStyle = "rgba(255,240,200,0.25)"
    ctx.fillRect(-6, -24, 116, 4)
    disc(ctx, 6, 0, 3, "#2A160A")
    ctx.restore()
    if (active > 0) glow(ctx, signX + dir * 70, y, 150, C.gold, 0.45 * active)
  }
  const chosen = seg(t, 17.85, 18.1)
  arrow(1, feet - 214, chosen)
  arrow(-1, feet - 156, 0)

  const runPhase = (pos / 266) * Math.PI
  const moving = t < 17.25 || t > 18.69
  const skidding = t >= 17.25 && t < 17.7
  const pose = (ph: number): Pose => (moving ? { run: runPhase + ph } : skidding ? { skid: true, lean: -0.22 } : {})
  figure(ctx, 1150, feet - 2, 1.35, "pack", pose(0.6), t)
  figure(ctx, 1310, feet - 6, 1.35, "cap", t > 17.75 && t < 18.69 ? { arms: "point", lean: 0.05 } : pose(2.1), t)
  const hand = figure(
    ctx,
    1470,
    feet,
    1.35,
    "scarf",
    moving ? { run: runPhase, arms: "hold", lean: 0.24 } : skidding ? { skid: true, lean: -0.22, arms: "hold" } : { arms: "hold" },
    t,
  )
  phone(ctx, hand[0] + 6, hand[1] - 8, 1, 1, 0.3)

  const beats = Math.max(0, Math.floor((t - a) / BEAT) + 1)
  const startX = hand[0] + 20
  if (t < 17.45) {
    const dots: Pt[] = []
    const n = Math.min(beats, 4) * 4
    for (let i = 0; i < n; i++) dots.push([startX + 30 + i * 34, feet - 2 + Math.sin(i * 0.8) * 4])
    trail(ctx, dots, 1, 1)
  } else {
    const bend = resample(curve([startX + 20, feet - 6], [signX - 60, feet - 6], [signX + 90, feet - 214]), 30)
    trail(ctx, bend, eout(seg(t, 17.5, 18.4)), 1 - seg(t, 19.3, D(8)))
  }
  ctx.restore()
}

/** 5. Solve it. Cryptex rings in the church medallion. */
function sceneCryptex(ctx: Ctx, t: number, A: FilmAssets) {
  const P: Pt = [1277, 508]
  ctx.save()
  cam(ctx, 1030, 530, 1.02 + 0.08 * eio(seg(t, D(8), D(10))))
  plate(ctx, A, "cryptex")
  const fl = 0.85 + 0.15 * Math.sin(t * 10) * Math.sin(t * 3.1)
  glow(ctx, 280, 650, 220, C.gold, 0.3 * fl)

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
  for (let ring = 2; ring >= 0; ring--) {
    const L = locks[ring]
    const rot = t < L ? Math.pow(L - t, 1.6) * (ring % 2 ? -2.4 : 2.1) : 0.09 * Math.exp(-(t - L) * 10) * Math.sin((t - L) * 45)
    const locked = t >= L
    const R = radii[ring]
    ctx.beginPath()
    ctx.arc(P[0], P[1], R + 23, 0, Math.PI * 2)
    ctx.arc(P[0], P[1], R - 23, 0, Math.PI * 2, true)
    const bronze = ctx.createLinearGradient(P[0] - R, P[1] - R, P[0] + R, P[1] + R)
    bronze.addColorStop(0, locked ? "#9C7030" : "#5E4320")
    bronze.addColorStop(0.5, locked ? "#E2B552" : "#8A6430")
    bronze.addColorStop(1, locked ? "#7A5520" : "#3E2C16")
    ctx.fillStyle = bronze
    ctx.fill()
    ctx.strokeStyle = "rgba(20,12,4,0.6)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(P[0], P[1], R - 23, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = rgba("#FFF4D6", locked ? 0.7 : 0.25)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(P[0], P[1], R + 22, Math.PI * 1.05, Math.PI * 1.7)
    ctx.stroke()
    const n = 8 + ring * 4
    for (let i = 0; i < n; i++) {
      const ang = rot + (i / n) * Math.PI * 2 - Math.PI / 2
      ctx.save()
      ctx.translate(P[0] + Math.cos(ang) * R, P[1] + Math.sin(ang) * R)
      ctx.rotate(ang + Math.PI / 2)
      shapes(ctx, i + ring * 2, 9)
      const top = i === 0
      ctx.strokeStyle = top && locked ? "#FFF4D6" : "rgba(30,18,6,0.75)"
      ctx.fillStyle = top && locked ? "#FFF4D6" : "rgba(30,18,6,0.35)"
      ctx.lineWidth = 3
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    if (locked) glow(ctx, P[0], P[1] - R, 70, C.gold, 0.6 * Math.exp(-(t - L) * 3))
  }
  ctx.strokeStyle = rgba(C.gold, 0.6 + solved * 0.4)
  ctx.lineWidth = 4
  poly(ctx, [
    [P[0], P[1] - 70],
    [P[0], P[1] - 214],
  ])
  const hub = ctx.createRadialGradient(P[0] - 14, P[1] - 14, 4, P[0], P[1], 48)
  hub.addColorStop(0, "#2A5468")
  hub.addColorStop(1, "#0C1828")
  disc(ctx, P[0], P[1], 48, hub)
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
    glow(ctx, P[0], P[1], 560, C.gold, 0.55 * Math.exp(-(t - D(9)) * 2.2))
  }

  const raise = eout(seg(t, D(8), D(8) + 0.6))
  const hx = lerp(1660, 1560, raise)
  const hy = lerp(1160, 860, raise)
  ctx.lineCap = "round"
  ctx.strokeStyle = LOOKS.scarf.top
  ctx.lineWidth = 34
  poly(ctx, [
    [1790, 1220],
    [hx + 24, hy + 66],
  ])
  disc(ctx, hx + 14, hy + 44, 17, LOOKS.scarf.skin)
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
    [1640, "cap"],
    [1810, "pack"],
  ] as [number, Acc][]) {
    figure(ctx, x, 1090, 1.7, acc, { face: -1, lean: -0.05 }, t)
  }
  const bulb = back(seg(t, 23.0, 23.3))
  if (bulb > 0) {
    ctx.save()
    ctx.translate(1640, 740)
    ctx.scale(bulb, bulb)
    glow(ctx, 0, 0, 180, C.gold, 0.65)
    const bg = ctx.createRadialGradient(-8, -10, 3, 0, 0, 30)
    bg.addColorStop(0, "#FFF4D6")
    bg.addColorStop(1, C.gold)
    disc(ctx, 0, 0, 30, bg)
    rr(ctx, -13, 24, 26, 20, 4)
    ctx.fillStyle = "#9AA3AE"
    ctx.fill()
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 5
    ctx.lineCap = "round"
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
function sceneMap(ctx: Ctx, t: number, A: FilmAssets) {
  const p = seg(t, D(10), D(12))
  ctx.save()
  cam(ctx, 1080, 520, lerp(1.18, 1.0, eio(p)), lerp(-0.05, 0.02, p))
  plate(ctx, A, "map", MAP_X, MAP_Y, MAP_W)
  ctx.fillStyle = "rgba(8,14,26,0.28)"
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_W * PLATE_ASPECT)
  glow(ctx, MAP_CASTLE[0], MAP_CASTLE[1], 200, C.gold, 0.35)

  MAP_ROUTES.forEach((route, i) => {
    const prog = 0.18 + 0.55 * eio(seg(t, D(10) + i * 0.12, D(12) + 0.3))
    const n = Math.floor(route.length * prog)
    const ours = i === 0
    trail(ctx, route.slice(Math.max(0, n - 70), n), 1, ours ? 0.95 : 0.5, ours ? 4.5 : 3)
    const head = route[Math.max(0, n - 1)]
    glow(ctx, head[0], head[1], ours ? 80 : 50, C.gold, ours ? 0.6 : 0.35)
    if (ours) {
      ;[C.roof, C.gold, "#2E8A88"].forEach((c, k) => {
        disc(ctx, head[0] + (k - 1) * 14, head[1] + (k === 1 ? -9 : 4), 9.5, "#0A1220")
        disc(ctx, head[0] + (k - 1) * 14, head[1] + (k === 1 ? -9 : 4), 8, c)
      })
    } else {
      disc(ctx, head[0], head[1], 10.5, "#0A1220")
      disc(ctx, head[0], head[1], 9, C.stone)
    }
  })

  const RC = MAP_CASTLE
  const RR = 200
  ctx.beginPath()
  ctx.arc(RC[0], RC[1], RR, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(239,227,200,0.18)"
  ctx.lineWidth = 2
  ctx.stroke()
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2
    const l = i % 5 === 0 ? 20 : 10
    ctx.strokeStyle = rgba(C.stone, 0.45)
    ctx.lineWidth = i % 5 === 0 ? 3.5 : 1.8
    poly(ctx, [
      [RC[0] + Math.cos(a) * RR, RC[1] + Math.sin(a) * RR],
      [RC[0] + Math.cos(a) * (RR - l), RC[1] + Math.sin(a) * (RR - l)],
    ])
  }
  const beatsIn = (t - D(10)) / BEAT
  const step = Math.floor(beatsIn) + eout(beatsIn % 1)
  const sweep = (step / 16) * Math.PI * 2
  ctx.beginPath()
  ctx.arc(RC[0], RC[1], RR + 12, -Math.PI / 2, -Math.PI / 2 + sweep)
  ctx.strokeStyle = rgba(C.gold, 0.3)
  ctx.lineWidth = 26
  ctx.stroke()
  ctx.strokeStyle = C.gold
  ctx.lineWidth = 9
  ctx.stroke()
  const tip = -Math.PI / 2 + sweep
  glow(ctx, RC[0] + Math.cos(tip) * (RR + 12), RC[1] + Math.sin(tip) * (RR + 12), 80, C.gold, 0.75)
  ctx.restore()
}

/** 7. Getting closer. Seafront, compass lock, push in to the castle. */
function sceneSeafront(ctx: Ctx, t: number, A: FilmAssets) {
  const a = D(12)
  const pos = travelled(t, a, 31.4, 31.85, 32.4, D(14) + 1)
  const pStop = travelled(31.4, a, 31.4, 31.85, 32.4, D(14) + 1)
  const push = eio(seg(t, 32.5, D(14)))
  const castle: Pt = [1661, 392]
  ctx.save()
  cam(ctx, lerp(960, 1390, push), lerp(540, 440, push), lerp(1, 1.7, push))
  plate(ctx, A, "seafront")
  twinkle(ctx, t, 330)
  shimmer(ctx, t, 760, 880, 9, 8, 0.12)
  shimmer(ctx, t, 1640, 640, 7, 5, 0.1)

  const light = seg(t, 32.6, D(14))
  castleGlow(ctx, castle[0], castle[1] + 10, 0.35 + light * 0.9, t, 0.9)
  glow(ctx, castle[0], castle[1], 700, C.gold, light * 0.3)

  const path = resample(
    [
      [1300, 648],
      [1420, 580],
      [1480, 520],
      [1560, 455],
      [castle[0], castle[1] + 14],
    ],
    12,
  )
  if (light > 0) {
    trail(ctx, path, eio(seg(t, 32.6, D(14) - 0.2)), 0.9, 3.5)
    for (let i = 0; i < 3; i++) {
      const k = clamp(seg(t, 32.9 + i * 0.12, D(14)))
      const at = path[Math.min(path.length - 1, Math.floor(k * (path.length - 1)))]
      disc(ctx, at[0] + i * 9, at[1] - 4, 6.5, [C.roof, C.gold, "#2E8A88"][i])
    }
  }

  const feetY = (x: number) => 694 - (x - 469) * 0.0512
  const scaleAt = (x: number) => clamp(1.12 - (x - 469) * 0.00018, 0.8, 1.15)
  const runPhase = (pos / 230) * Math.PI
  const moving = t < 31.4 || t > 32.4
  const pose = (ph: number): Pose => (moving ? { run: runPhase + ph } : t < 31.85 ? { skid: true, lean: -0.2 } : {})
  const shift = pos - pStop
  const xs = [950, 1100, 1250].map((x0) => x0 + shift)
  figure(ctx, xs[0], feetY(xs[0]), scaleAt(xs[0]), "pack", pose(0.6), t)
  figure(ctx, xs[1], feetY(xs[1]), scaleAt(xs[1]), "cap", pose(2.1), t)
  const hand = figure(
    ctx,
    xs[2],
    feetY(xs[2]),
    scaleAt(xs[2]),
    "scarf",
    moving ? { run: runPhase, arms: "hold", lean: 0.24 } : { arms: "point", lean: 0.05 },
    t,
  )
  const lockT = D(13)
  const needle =
    t < lockT
      ? Math.pow(Math.max(0, lockT - t), 1.5) * 16 + 0.62
      : 0.62 + 0.12 * Math.exp(-(t - lockT) * 9) * Math.sin((t - lockT) * 40)
  const cA = back(seg(t, 31.0, 31.35)) * (1 - seg(t, 32.55, 32.85))
  compass(ctx, 1010, 300, 120 * clamp(cA, 0, 1.2), needle, clamp(cA))
  if (t > lockT) glow(ctx, 1010, 300, 440, C.gold, 0.5 * Math.exp(-(t - lockT) * 3))
  phone(ctx, hand[0] + 5, hand[1] - 7, 0.85, 1, 0.3, needle)
  ctx.restore()
}

/** 8. Treasure. Castle top, chest bursts open. */
function sceneTreasure(ctx: Ctx, t: number, A: FilmAssets) {
  const a = D(14)
  const punch = 1 + 0.07 * (1 - eout(seg(t, a, a + 0.7)))
  const O: Pt = [1290, 790]
  ctx.save()
  cam(ctx, 960, 540, punch)
  plate(ctx, A, "treasure")
  twinkle(ctx, t, 300, 1.2)

  const open = eout(seg(t, a + 0.02, a + 0.32))
  chest(ctx, 1290, 905, open, t)
  const age = t - a
  pulseRing(ctx, O[0], O[1], age, 1500, 16)

  const G = 1900
  for (const c of COINS) {
    const tau = age - 0.05 - c.delay
    if (tau < 0) continue
    let x = O[0] + c.vx * tau
    let y = O[1] + c.vy * tau + 0.5 * G * tau * tau
    let w = Math.abs(Math.cos(tau * c.spin)) * 13 + 2
    if (y > c.floor && tau > 0.2) {
      const land = (-c.vy + Math.sqrt(c.vy * c.vy + 2 * G * (c.floor - O[1]))) / G
      x = O[0] + c.vx * Math.max(0, land)
      y = c.floor
      w = 13
    }
    const cg = ctx.createLinearGradient(x - w, y - 13, x + w, y + 13)
    cg.addColorStop(0, "#FFF0C2")
    cg.addColorStop(1, "#B9893A")
    oval(ctx, x, y, w, 13, cg)
    ctx.strokeStyle = "#8C6424"
    ctx.lineWidth = 2
    ctx.stroke()
  }
  for (const c of CONFETTI) {
    const tau = age - c.delay
    if (tau < 0) continue
    const x = c.x + c.vx * tau * Math.exp(-tau * 0.6) + Math.sin(tau * 4 + c.rot) * 30
    const y = O[1] + c.vy * tau * Math.exp(-tau * 0.9) + 220 * tau * tau
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
  figure(ctx, 1020, 975, 1.45, "scarf", pose(1, 0), t)
  figure(ctx, 1540, 975, 1.45, "cap", pose(-1, 0.03), t)
  figure(ctx, 1690, 990, 1.45, "pack", pose(-1, 0.06), t)
  ctx.restore()
}

/** 8b-11. Pull back over the lit city, routes converge, ring forms, logo, loop. */
function sceneFinale(ctx: Ctx, t: number, A: FilmAssets) {
  const logo = A.logo
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
  cityView(ctx, A, t, light, dim)
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
  if (logo && ready(logo) && logoA > 0) {
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
  draw: (ctx: Ctx, t: number, A: FilmAssets) => void
}

const SCENES: Scene[] = [
  { a: 0, b: D(2), fx: 1300, enter: "cut", draw: sceneCity },
  { a: D(2), b: D(4), fx: 1150, enter: "dive", at: [1010, 790], draw: sceneCafe },
  { a: D(4), b: D(6), fx: 1340, enter: "dive", at: [1300, 470], draw: sceneAlley },
  { a: D(6), b: D(8), fx: 1350, enter: "whip", draw: scenePark },
  { a: D(8), b: D(10), fx: 1300, enter: "iris", at: [1277, 508], draw: sceneCryptex },
  { a: D(10), b: D(12), fx: 1380, enter: "pullback", at: [1277, 508], draw: sceneMap },
  { a: D(12), b: D(14), fx: 820, enter: "iris", at: [1100, 420], draw: sceneSeafront },
  { a: D(14), b: D(15), fx: 1300, enter: "flash", draw: sceneTreasure },
  { a: D(15), b: FILM_LENGTH, fx: 1312, enter: "pullback", at: [1290, 790], draw: sceneFinale },
]

const TR = 0.42

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

let bloomA: HTMLCanvasElement | null = null
let bloomB: HTMLCanvasElement | null = null
/** Cheap bloom: downsample, cube the values (keeps only highlights), add back blurred. */
function bloom(ctx: Ctx, cw: number, ch: number) {
  if (typeof document === "undefined") return
  bloomA ??= document.createElement("canvas")
  bloomB ??= document.createElement("canvas")
  const w1 = Math.max(1, Math.round(cw / 5))
  const h1 = Math.max(1, Math.round(ch / 5))
  const w2 = Math.max(1, Math.round(w1 / 4))
  const h2 = Math.max(1, Math.round(h1 / 4))
  if (bloomA.width !== w1 || bloomA.height !== h1) {
    bloomA.width = w1
    bloomA.height = h1
  }
  if (bloomB.width !== w2 || bloomB.height !== h2) {
    bloomB.width = w2
    bloomB.height = h2
  }
  const ga = bloomA.getContext("2d")
  const gb = bloomB.getContext("2d")
  if (!ga || !gb) return
  ga.globalCompositeOperation = "copy"
  ga.drawImage(ctx.canvas, 0, 0, w1, h1)
  ga.globalCompositeOperation = "multiply"
  ga.drawImage(bloomA, 0, 0)
  ga.drawImage(bloomA, 0, 0)
  ga.drawImage(bloomA, 0, 0)
  gb.globalCompositeOperation = "copy"
  gb.imageSmoothingQuality = "high"
  gb.drawImage(bloomA, 0, 0, w2, h2)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = "lighter"
  ctx.imageSmoothingQuality = "high"
  ctx.globalAlpha = 0.22
  ctx.drawImage(bloomB, 0, 0, cw, ch)
  ctx.globalAlpha = 0.06
  ctx.drawImage(bloomA, 0, 0, cw, ch)
  ctx.restore()
}

export function renderFilm(ctx: Ctx, time: number, cw: number, ch: number, A: FilmAssets) {
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
  ctx.imageSmoothingQuality = "high"
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
      scene.draw(ctx, t, A)
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.translate(at[0], at[1])
      ctx.scale(1 + p * 4, 1 + p * 4)
      ctx.translate(-at[0], -at[1])
      prev.draw(ctx, t, A)
      ctx.restore()
    } else if (scene.enter === "pullback") {
      scene.draw(ctx, t, A)
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.translate(at[0], at[1])
      ctx.scale(1 - p * 0.85, 1 - p * 0.85)
      ctx.translate(-at[0], -at[1])
      prev.draw(ctx, t, A)
      ctx.restore()
    } else if (scene.enter === "whip") {
      ctx.save()
      ctx.translate(-p * W, 0)
      prev.draw(ctx, t, A)
      ctx.restore()
      ctx.save()
      ctx.translate((1 - p) * W, 0)
      scene.draw(ctx, t, A)
      ctx.restore()
      ctx.fillStyle = rgba(C.stone, 0.12 * (1 - p))
      for (let k = 0; k < 18; k++) ctx.fillRect(-200, (k * 61) % H, W + 400, 3)
    } else if (scene.enter === "iris") {
      prev.draw(ctx, t, A)
      ctx.save()
      ctx.beginPath()
      ctx.arc(at[0], at[1], eio(since / TR) * 2300, 0, Math.PI * 2)
      ctx.clip()
      scene.draw(ctx, t, A)
      ctx.restore()
      ctx.beginPath()
      ctx.arc(at[0], at[1], eio(since / TR) * 2300, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(C.gold, 1 - p)
      ctx.lineWidth = 14
      ctx.stroke()
    } else {
      scene.draw(ctx, t, A)
      ctx.fillStyle = rgba(C.stone, 0.85 * (1 - p))
      ctx.fillRect(-200, -200, W + 400, H + 400)
    }
  } else {
    scene.draw(ctx, t, A)
  }

  ctx.setTransform(s, 0, 0, s, ox, oy)
  const v = ctx.createRadialGradient(W * 0.55, H * 0.48, H * 0.4, W * 0.55, H * 0.48, W * 0.78)
  v.addColorStop(0, rgba(C.night, 0))
  v.addColorStop(1, rgba("#050A14", 0.6))
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  bloom(ctx, cw, ch)

  const tile = grainTile()
  if (tile) {
    ctx.save()
    ctx.globalAlpha = 0.045
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
