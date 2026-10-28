/**
 * The folded field map: same pinhole camera as the desk phone (phone/pose.ts), so it lies on the
 * desk with the photo's own perspective, is lifted into a real 3D pose and then opens on its two
 * creases. Every face (front and back of the four panels) gets one full matrix3d; depth order and
 * facing are solved here, not left to preserve-3d.
 *
 * Sheet space (element px): origin at the centre of the unfolded map, x right, y down, z out of the
 * printed side. Panels: TL, TR, BL, BR, each q.w × q.h. It is folded right-over-left first, then the
 * top row down, so folded the cover (back of BR) is on top and the packet covers the BL panel.
 */
import {
  PHONE_THICKNESS,
  PHONE_WORLD_H,
  PHOTO,
  REST_POS,
  REST_QUAT,
  type M4,
  type Quat,
  type V3,
  cameraMatrix,
  css,
  matMul,
  project,
  rotate,
  scaleM,
  slerp,
  smoothstep,
  translate,
} from "../phone/pose"

/** Full map print = the street plan's own proportions (236 × 294). */
export const MAP_ASPECT = 236 / 294

/** World height of one folded panel, photo px (the phone is 160, so the folded map is ~18 cm tall). */
const PANEL_WORLD_H = 200
/** Where the folded map lies: the screen point (photo px) under its centre, and its turn on the desk. */
const REST_SCREEN: [number, number] = [676, 676]
const REST_YAW = -0.26
/** Paper thickness between stacked layers, element px. */
const PLY = 1.4

export type FaceId = "bl" | "tl" | "tl-back" | "br" | "br-back" | "tr" | "tr-back"
export const FACE_IDS: FaceId[] = ["bl", "tl", "tl-back", "br", "br-back", "tr", "tr-back"]

export type MapFrameInput = {
  stage: { left: number; top: number; width: number }
  /** one panel's natural element size */
  q: { w: number; h: number }
  /** screen point where the folded packet is held (container coords) */
  hold?: { x: number; y: number }
  /** screen centre of the fully opened map */
  open?: { x: number; y: number }
}

export type MapFace = { transform: string; z: number; visible: boolean; shade: number }

export type MapFrame = {
  faces: Record<FaceId, MapFace>
  shadow: string
  /** 0 on the desk → 1 clear of it */
  lift: number
}

/* ---------- desk plane ---------- */

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}

function quatFromBasis(x: V3, y: V3, z: V3): Quat {
  // rotation matrix with columns x, y, z
  const m00 = x[0], m01 = y[0], m02 = z[0]
  const m10 = x[1], m11 = y[1], m12 = z[1]
  const m20 = x[2], m21 = y[2], m22 = z[2]
  const tr = m00 + m11 + m22
  let q: Quat
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2
    q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2
    q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2
    q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]
  }
  const l = Math.hypot(...q)
  return q.map((v) => v / l) as Quat
}

/** Rest pose of the packet in photo px: lying flat on the desk plane the phone was solved against. */
const REST = (() => {
  const camera: V3 = [PHOTO.cx, PHOTO.cy, PHOTO.d]
  let n = rotate(REST_QUAT, [0, 0, 1])
  if (dot(n, sub(camera, REST_POS)) < 0) n = [-n[0], -n[1], -n[2]]
  const onDesk = sub(REST_POS, [n[0] * PHONE_WORLD_H * PHONE_THICKNESS, n[1] * PHONE_WORLD_H * PHONE_THICKNESS, n[2] * PHONE_WORLD_H * PHONE_THICKNESS])
  const screen: V3 = [REST_SCREEN[0], REST_SCREEN[1], 0]
  const ray = sub(screen, camera)
  const s = dot(n, sub(onDesk, camera)) / dot(n, ray)
  const pos: V3 = [camera[0] + ray[0] * s, camera[1] + ray[1] * s, camera[2] + ray[2] * s]
  let r = norm(sub([1, 0, 0], [n[0] * n[0], n[0] * n[1], n[0] * n[2]]))
  let y = cross(n, r)
  if (y[2] < 0) {
    r = [-r[0], -r[1], -r[2]]
    y = [-y[0], -y[1], -y[2]]
  }
  const c = Math.cos(REST_YAW)
  const sn = Math.sin(REST_YAW)
  const r2: V3 = [r[0] * c + y[0] * sn, r[1] * c + y[1] * sn, r[2] * c + y[2] * sn]
  const y2: V3 = [y[0] * c - r[0] * sn, y[1] * c - r[1] * sn, y[2] * c - r[2] * sn]
  return { pos, quat: quatFromBasis(r2, y2, n), normal: n }
})()

/* ---------- hinges ---------- */

const rotX = (a: number): M4 => {
  const c = Math.cos(a), s = Math.sin(a)
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]
}
const rotY = (a: number): M4 => {
  const c = Math.cos(a), s = Math.sin(a)
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]
}
/** rotation about a hinge line lifted `h` off the sheet, so folded layers stack instead of z-fighting */
const hinge = (rot: M4, h: number) => matMul(translate(0, 0, h), matMul(rot, translate(0, 0, -h)))
const apply = (m: M4, p: V3): V3 => {
  const w = m[12] * p[0] + m[13] * p[1] + m[14] * p[2] + m[15]
  return [0, 1, 2].map((r) => (m[r * 4] * p[0] + m[r * 4 + 1] * p[1] + m[r * 4 + 2] * p[2] + m[r * 4 + 3]) / w) as V3
}
const applyDir = (m: M4, v: V3): V3 => [0, 1, 2].map((r) => m[r * 4] * v[0] + m[r * 4 + 1] * v[1] + m[r * 4 + 2] * v[2]) as V3

const IDENTITY: Quat = [0, 0, 0, 1]

/** Phases of the 0→1 timeline: lift off the desk, open the vertical crease, then the horizontal one. */
export const PHASE = { lift: [0, 0.42], vertical: [0.4, 0.7], horizontal: [0.64, 0.96] } as const

export function mapFrame(t: number, input: MapFrameInput): MapFrame {
  const { stage, q, hold, open } = input
  const k = stage.width / PHOTO.w
  const cx = stage.left + PHOTO.cx * k
  const cy = stage.top + PHOTO.cy * k
  const d = PHOTO.d * k
  const worldH = PANEL_WORLD_H * k
  const scale = worldH / q.h

  const p0: V3 = [stage.left + REST.pos[0] * k, stage.top + REST.pos[1] * k, REST.pos[2] * k]
  const lift = smoothstep(PHASE.lift[0], PHASE.lift[1], t)
  const vOpen = smoothstep(PHASE.vertical[0], PHASE.vertical[1], t)
  const hOpen = smoothstep(PHASE.horizontal[0], PHASE.horizontal[1], t)

  // The anchor is the centre of the BL panel, which the folded packet covers.
  let pos = p0
  let quat = REST.quat
  // On the desk the map is seen through the photo's camera. In the hands the eye looks straight at it
  // from further back, so the opening flaps foreshorten evenly instead of smearing towards the room centre.
  let cam = { x: cx, y: cy, d }
  if (t > 0 && hold && open) {
    const s0 = project(p0, cx, cy, d)
    const openAnchor: [number, number] = [open.x - q.w / 2, open.y + q.h / 2]
    // rises straight off the desk, then arcs to the hold point; once opened it slides so the whole sheet centres
    const rise = (worldH * d) / (d - p0[2])
    const a = lift
    const u = (vOpen + hOpen) / 2
    const lx = s0[0] + (hold.x - s0[0]) * smoothstep(0.15, 1, a)
    const ly = s0[1] + (hold.y - s0[1]) * a - rise * 0.9 * Math.sin(Math.PI * Math.min(1, a * 1.2)) * (1 - a)
    const sx = lx + (openAnchor[0] - hold.x) * u
    const sy = ly + (openAnchor[1] - hold.y) * u
    const seen = [sx + (q.w / 2) * vOpen, sy - (q.h / 2) * hOpen]
    cam = { x: cx + (seen[0] - cx) * a, y: cy + (seen[1] - cy) * a, d: d * (1 + 0.8 * a) }
    const dist0 = cam.d - p0[2]
    const distHold = (cam.d * worldH) / q.h
    const dist = 1 / (1 / dist0 + (1 / distHold - 1 / dist0) * smoothstep(0.05, 1, a) ** 0.85)
    pos = [cam.x + ((sx - cam.x) * dist) / cam.d, cam.y + ((sy - cam.y) * dist) / cam.d, cam.d - dist]
    quat = slerp(REST.quat, IDENTITY, smoothstep(0.02, 0.9, a))
  }

  const sheetToWorld = matMul(translate(pos[0], pos[1], pos[2]), matMul(rotationOf(quat), matMul(scaleM(scale), translate(q.w / 2, -q.h / 2, 0))))
  const camera = cameraMatrix(cam.x, cam.y, cam.d)
  const eye: V3 = [cam.x, cam.y, cam.d]

  const vHinge = hinge(rotY(-Math.PI * (1 - vOpen)), PLY * 1.5)
  const hHinge = hinge(rotX(-Math.PI * (1 - hOpen)), PLY * 0.5)
  const back = matMul(translate(q.w, 0, 0), rotY(Math.PI))
  const local: Record<FaceId, M4> = {
    bl: translate(-q.w, 0, 0),
    tl: matMul(hHinge, translate(-q.w, -q.h, 0)),
    "tl-back": matMul(hHinge, matMul(translate(-q.w, -q.h, 0), back)),
    br: vHinge,
    "br-back": matMul(vHinge, back),
    tr: matMul(vHinge, matMul(hHinge, translate(0, -q.h, 0))),
    "tr-back": matMul(vHinge, matMul(hHinge, matMul(translate(0, -q.h, 0), back))),
  }

  const faces = {} as Record<FaceId, MapFace>
  for (const id of FACE_IDS) {
    const world = matMul(sheetToWorld, local[id])
    const centre = apply(world, [q.w / 2, q.h / 2, 0])
    const normal = norm(applyDir(world, [0, 0, 1]))
    const facing = dot(normal, sub(eye, centre))
    faces[id] = {
      transform: css(matMul(camera, world)),
      z: centre[2],
      visible: facing > 0,
      // a panel darkens as it turns edge-on to the lamp/eye, and lightens back when it lies open
      shade: Math.max(0, 1 - Math.abs(normal[2])) * 0.55,
    }
  }

  // contact shadow: stays on the desk at the rest pose, a little larger than the packet
  const shadowWorld = matMul(
    translate(p0[0], p0[1], p0[2]),
    matMul(rotationOf(REST.quat), matMul(scaleM(scale * 1.04), translate(-q.w / 2, -q.h / 2, -0.5))),
  )
  return { faces, shadow: css(matMul(cameraMatrix(cx, cy, d), shadowWorld)), lift: t === 0 ? 0 : Math.min(1, t / 0.12) }
}

function rotationOf(q: Quat): M4 {
  const x = rotate(q, [1, 0, 0])
  const y = rotate(q, [0, 1, 0])
  const z = rotate(q, [0, 0, 1])
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, 0, 0, 0, 1]
}

/** Where the folded packet lies, as a stage-% rect (for the hotspot). */
export function restFootprint(q: { w: number; h: number }) {
  const scale = PANEL_WORLD_H / q.h
  const corners: V3[] = [
    [-q.w / 2, -q.h / 2, 0],
    [q.w / 2, -q.h / 2, 0],
    [q.w / 2, q.h / 2, 0],
    [-q.w / 2, q.h / 2, 0],
  ]
  const m = matMul(translate(...REST.pos), matMul(rotationOf(REST.quat), scaleM(scale)))
  const pts = corners.map((c) => project(apply(m, c), PHOTO.cx, PHOTO.cy, PHOTO.d))
  return pts.map(([x, y]) => [+((x / PHOTO.w) * 100).toFixed(2), +((y / PHOTO.h) * 100).toFixed(2)])
}
