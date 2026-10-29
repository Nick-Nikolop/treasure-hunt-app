/**
 * The sealed envelope in the letter tray. The photo is not a perfect pinhole render, so no flat rectangle
 * projects exactly onto the envelope we see. The envelope therefore moves as a real 3D plane (a fitted
 * W×H rectangle, scripts/office/fit-envelope.ts), but its four screen corners carry the leftover offset to
 * the measured corners at rest, fading it out as it lifts. Each frame the envelope element is mapped onto
 * those four corners with one homography matrix3d, so the paper stays perspective-correct the whole way.
 */
import { rotationOf } from "../map/pose"
import { PHOTO, matMul, project, slerp, smoothstep, translate, type Quat, type V2, type V3 } from "../phone/pose"
import GEO from "./geometry.json"

/** Envelope proportions (W / H); the hand-size envelope uses the same. */
export const ENV_ASPECT = GEO.aspect
/** Where the wax seal sits on the envelope (share of W, H). */
export const SEAL = { x: GEO.seal[0], y: GEO.seal[1] }
/** Photo-px boxes of the painted-out tray and the wall overlay (scripts/office/contact-assets.py). */
export const TRAY_EMPTY = { x: GEO.empty[0], y: GEO.empty[1], w: GEO.empty[2], h: GEO.empty[3] }
export const TRAY_WALLS = { x: GEO.walls[0], y: GEO.walls[1], w: GEO.walls[2], h: GEO.walls[3] }
const SEEN = GEO.corners as V2[]

/** Fitted rest pose (photo px world, fixed aspect 1.42). */
const FIT = {
  pos: [1215.18, 788.96, -731.47] as V3,
  quat: [0.552509, 0.214465, -0.102573, 0.798885] as Quat,
  w: 267.17,
  h: 188.15,
}
const IDENTITY: Quat = [0, 0, 0, 1]

/** How far it rises out of the tray before travelling (share of its height), and the peek on hover (lift a). */
const RISE = 0.55
export const PEEK_A = 0.13

export type Stage = { left: number; top: number; width: number }
export type Hand = { x: number; y: number; w: number; h: number }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * Screen corners (TL, TR, BR, BL, container px) of the envelope at lift progress a (0 in the tray → 1 held
 * face-on at `hand`, exactly hand.w × hand.h). `hand` may be omitted for the in-room peek.
 */
export function envelopeCorners(a: number, stage: Stage, hand?: Hand): V2[] {
  const k = stage.width / PHOTO.w
  const cx = stage.left + PHOTO.cx * k
  const cy = stage.top + PHOTO.cy * k
  const d = PHOTO.d * k
  const W = FIT.w * k
  const H = FIT.h * k
  const p0: V3 = [stage.left + FIT.pos[0] * k, stage.top + FIT.pos[1] * k, FIT.pos[2] * k]
  const R0 = rotationOf(FIT.quat)
  let n: V3 = [R0[2], R0[6], R0[10]]
  if (dot(n, sub([cx, cy, d], p0)) < 0) n = [-n[0], -n[1], -n[2]]

  const rise = smoothstep(0, 0.34, a)
  const move = hand ? smoothstep(0.2, 1, a) : 0
  const lifted: V3 = [p0[0] + n[0] * RISE * H * rise, p0[1] + n[1] * RISE * H * rise, p0[2] + n[2] * RISE * H * rise]

  let pos = lifted
  let quat = FIT.quat
  let cam = { x: cx, y: cy, d }
  if (hand && move > 0) {
    const s0 = project(lifted, cx, cy, d)
    // arcs up a little on its way to the hands, the way a letter is lifted towards the face
    const sx = s0[0] + (hand.x - s0[0]) * move
    const sy = s0[1] + (hand.y - s0[1]) * move - hand.h * 0.35 * Math.sin(Math.PI * move) * (1 - move * 0.4)
    cam = { x: cx + (sx - cx) * move, y: cy + (sy - cy) * move, d: d * (1 + 0.8 * move) }
    const dist0 = cam.d - lifted[2]
    const distHold = (cam.d * H) / hand.h
    const dist = 1 / (1 / dist0 + (1 / distHold - 1 / dist0) * move ** 0.85)
    pos = [cam.x + ((sx - cam.x) * dist) / cam.d, cam.y + ((sy - cam.y) * dist) / cam.d, cam.d - dist]
    quat = slerp(FIT.quat, IDENTITY, smoothstep(0.05, 0.92, move))
  }

  const m = matMul(translate(...pos), rotationOf(quat))
  const local: V3[] = [
    [-W / 2, -H / 2, 0],
    [W / 2, -H / 2, 0],
    [W / 2, H / 2, 0],
    [-W / 2, H / 2, 0],
  ]
  const fade = 1 - smoothstep(0, 0.5, a)
  return local.map((c, i) => {
    const w = [m[0] * c[0] + m[1] * c[1] + m[2] * c[2] + m[3], m[4] * c[0] + m[5] * c[1] + m[6] * c[2] + m[7], m[8] * c[0] + m[9] * c[1] + m[10] * c[2] + m[11]] as V3
    const [x, y] = project(w, cam.x, cam.y, cam.d)
    // residual to the photographed corners (taken through the photo camera at rest)
    const restW = [R0[0] * c[0] + R0[1] * c[1] + R0[2] * c[2] + p0[0], R0[4] * c[0] + R0[5] * c[1] + R0[6] * c[2] + p0[1], R0[8] * c[0] + R0[9] * c[1] + R0[10] * c[2] + p0[2]] as V3
    const [rx, ry] = project(restW, cx, cy, d)
    const seen: V2 = [stage.left + SEEN[i][0] * k, stage.top + SEEN[i][1] * k]
    return [x + (seen[0] - rx) * fade, y + (seen[1] - ry) * fade]
  })
}

/** CSS matrix3d mapping an element of w × h (transform-origin 0 0) onto the quad TL, TR, BR, BL. */
export function quadTransform(w: number, h: number, [p0, p1, p2, p3]: V2[]) {
  const dx1 = p1[0] - p2[0]
  const dx2 = p3[0] - p2[0]
  const dx3 = p0[0] - p1[0] + p2[0] - p3[0]
  const dy1 = p1[1] - p2[1]
  const dy2 = p3[1] - p2[1]
  const dy3 = p0[1] - p1[1] + p2[1] - p3[1]
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const hh = (dx1 * dy3 - dx3 * dy1) / den
  const a = (p1[0] - p0[0] + g * p1[0]) / w
  const b = (p3[0] - p0[0] + hh * p3[0]) / h
  const d = (p1[1] - p0[1] + g * p1[1]) / w
  const e = (p3[1] - p0[1] + hh * p3[1]) / h
  const gw = g / w
  const hw = hh / h
  const f = (v: number) => (Math.abs(v) < 1e-12 ? "0" : v.toPrecision(10))
  return `matrix3d(${[a, d, 0, gw, b, e, 0, hw, 0, 0, 1, 0, p0[0], p0[1], 0, 1].map(f).join(",")})`
}

/** Phases of the full pickup timeline (0 in the tray → 1 letter out). */
export const PHASE = {
  lift: [0, 0.5],
  crack: [0.5, 0.56],
  flap: [0.54, 0.68],
  lower: [0.64, 0.82],
  letter: [0.72, 1],
} as const
/** Lift progress a for a timeline t, and back (for starting from the hover peek). */
export const liftOf = (t: number) => Math.min(1, t / PHASE.lift[1])
export const tOfLift = (a: number) => a * PHASE.lift[1]
