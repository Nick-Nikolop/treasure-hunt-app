/**
 * A tiny pinhole camera for the desk phone.
 *
 * World space follows CSS: x right, y down, z toward the viewer, in photo pixels of the 1376×768
 * desktop render (scaled by k at runtime). The camera sits at the photo centre, D px in front of it,
 * which is exactly what CSS `perspective(D)` does. Every layer of the phone gets one full matrix3d
 * (perspective included), so the browser just rasterises; depth, foreshortening and thickness are real.
 */

export const PHOTO = { w: 1376, h: 768, cx: 688, cy: 384, d: 1600 }

/** Real phone proportions (71.5 × 147 × 7.4 mm). */
export const PHONE_ASPECT = 2.06
export const PHONE_THICKNESS = 0.05

/** World height of the phone, in photo px. Only fixes the depth scale; the fit below is solved for it. */
const PHONE_WORLD_H = 160

/**
 * Rest pose solved (Levenberg–Marquardt, max error 1.4 px) against the four corners of the phone
 * that was originally photographed on the desk, so the live phone lies on the desk with the photo's
 * own perspective. Top of the phone points right/away; its face normal is the desk normal.
 */
const REST_POS: V3 = [281.2, 826.31, -981.28]
const REST_QUAT: Quat = [0.5251, -0.33938, 0.32785, 0.70824]

type V3 = [number, number, number]
type Quat = [number, number, number, number]
type M4 = number[] // row-major 4×4

export type PhoneFrameInput = {
  /** the desktop stage (photo) rect, in the coordinates of the layer container */
  stage: { left: number; top: number; width: number }
  /** natural pixel size of the phone face element */
  el: { w: number; h: number }
  /** where the phone face centre ends up when held (container coords); unused at t = 0 */
  hold?: { x: number; y: number }
  /** number of body layers behind the face (gives the phone its thickness) */
  layers: number
}

export type PhoneFrame = {
  face: string
  body: string[]
  shadow: string
  /** 0 on the desk → 1 clear of it */
  lift: number
  /** 0 resting orientation → 1 upright */
  turn: number
  restScale: number
  /** stage scale (stage width / photo width) */
  k: number
}

const IDENTITY: Quat = [0, 0, 0, 1]

export function phoneFrame(t: number, input: PhoneFrameInput): PhoneFrame {
  const { stage, el, hold, layers } = input
  const k = stage.width / PHOTO.w
  const cx = stage.left + PHOTO.cx * k
  const cy = stage.top + PHOTO.cy * k
  const d = PHOTO.d * k
  const worldH = PHONE_WORLD_H * k
  const scale = worldH / el.h

  const p0: V3 = [stage.left + REST_POS[0] * k, stage.top + REST_POS[1] * k, REST_POS[2] * k]
  const deskNormal = rotate(REST_QUAT, [0, 0, 1])

  let pos = p0
  let q = REST_QUAT
  const turn = smoothstep(0.03, 0.88, t)
  if (t > 0 && hold) {
    // The path is planned where the eye reads it, on screen, then back-projected into a real 3D pose:
    // apparent size grows evenly (inverse distance is interpolated), the centre rises off the desk first
    // and then arcs up into the hand. Held, the face projects at exactly its natural size (crisp text).
    const dist0 = d - p0[2]
    const distHold = (d * worldH) / el.h
    const s0 = project(p0, cx, cy, d)
    const restLen = (worldH * d) / dist0
    const lift = deskNormal[1] < 0 ? restLen * 0.9 : 0
    const s1: [number, number] = [s0[0], s0[1] - lift]
    const s2: [number, number] = [hold.x + (s0[0] - hold.x) * 0.2, hold.y + el.h * 0.14]
    const sc = bezier2(s0, s1, s2, [hold.x, hold.y], t)
    const grow = smoothstep(0.06, 1, t) ** 0.85
    const dist = 1 / (1 / dist0 + (1 / distHold - 1 / dist0) * grow)
    pos = [cx + ((sc[0] - cx) * dist) / d, cy + ((sc[1] - cy) * dist) / d, d - dist]
    q = slerp(REST_QUAT, IDENTITY, turn)
  }

  const camera = cameraMatrix(cx, cy, d)
  const model = (quat: Quat, at: V3, z: number, grow = 1) =>
    matMul(
      camera,
      matMul(translate(at[0], at[1], at[2]), matMul(rotation(quat), matMul(scaleM(scale * grow), translate(-el.w / 2, -el.h / 2, z)))),
    )

  const thickness = el.h * PHONE_THICKNESS
  const body: string[] = []
  for (let i = layers; i >= 1; i--) body.push(css(model(q, pos, -(thickness * i) / layers)))

  // The contact shadow stays on the desk: it is drawn at the rest pose just under the phone's back.
  const shadow = css(model(REST_QUAT, add(p0, mul(deskNormal, -thickness * scale * 1.05)), 0, 1.05))

  const lift = t === 0 ? 0 : clamp01(t / 0.22)
  // screen px per element px at the rest pose: CSS filters run in local units, so blur must be divided by it
  const restScale = (scale * d) / (d - p0[2])
  return { face: css(model(q, pos, 0)), body, shadow, lift, turn, restScale, k }
}

/** Plain 2D placement used once the phone is held, so the live screen renders pixel-sharp. */
export function heldPlacement(input: PhoneFrameInput) {
  const { el, hold } = input
  if (!hold) return "none"
  return `translate(${Math.round(hold.x - el.w / 2)}px, ${Math.round(hold.y - el.h / 2)}px)`
}

/* ---------- easing ---------- */

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (s: number) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3
  const by = (s: number) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (bx(mid) < x) lo = mid
      else hi = mid
    }
    return by((lo + hi) / 2)
  }
}

export function smoothstep(a: number, b: number, x: number) {
  const s = clamp01((x - a) / (b - a))
  return s * s * (3 - 2 * s)
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/* ---------- vectors, quaternions, matrices ---------- */

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]

type V2 = [number, number]

function bezier2(a: V2, b: V2, c: V2, e: V2, t: number): V2 {
  const u = 1 - t
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  return [0, 1].map((i) => a[i] * w[0] + b[i] * w[1] + c[i] * w[2] + e[i] * w[3]) as V2
}

const project = (p: V3, cx: number, cy: number, d: number): V2 => {
  const s = d / (d - p[2])
  return [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]
}

function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  let bb = b
  if (dot < 0) {
    dot = -dot
    bb = [-b[0], -b[1], -b[2], -b[3]]
  }
  if (dot > 0.9995) {
    const r = a.map((v, i) => v + (bb[i] - v) * t) as Quat
    const n = Math.hypot(...r)
    return r.map((v) => v / n) as Quat
  }
  const theta = Math.acos(dot)
  const s = Math.sin(theta)
  const wa = Math.sin((1 - t) * theta) / s
  const wb = Math.sin(t * theta) / s
  return a.map((v, i) => v * wa + bb[i] * wb) as Quat
}

function rotationRows([x, y, z, w]: Quat) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ]
}

function rotate(q: Quat, v: V3): V3 {
  const r = rotationRows(q)
  return [0, 1, 2].map((i) => r[i][0] * v[0] + r[i][1] * v[1] + r[i][2] * v[2]) as V3
}

function rotation(q: Quat): M4 {
  const r = rotationRows(q)
  return [...r[0], 0, ...r[1], 0, ...r[2], 0, 0, 0, 0, 1]
}

const translate = (x: number, y: number, z: number): M4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]
const scaleM = (s: number): M4 => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]

/** translate(c) · perspective(d) · translate(-c), i.e. CSS `perspective` with its origin at the camera. */
function cameraMatrix(cx: number, cy: number, d: number): M4 {
  const persp: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / d, 1]
  return matMul(translate(cx, cy, 0), matMul(persp, translate(-cx, -cy, 0)))
}

function matMul(a: M4, b: M4): M4 {
  const out = new Array(16).fill(0)
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      let s = 0
      for (let i = 0; i < 4; i++) s += a[r * 4 + i] * b[i * 4 + c]
      out[r * 4 + c] = s
    }
  return out
}

/** CSS matrix3d is column-major. */
function css(m: M4) {
  const cols = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15].map((i) => +m[i].toFixed(7))
  return `matrix3d(${cols.join(",")})`
}
