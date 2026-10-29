/**
 * Fits the envelope in the letter tray: a flat W×H rectangle lying on the desk plane (raised by the tray
 * floor), seen through the photo camera. Prints the parameters for components/office/contact/pose.ts and
 * the projected corners for scripts/office/contact-assets.py.
 *
 *   npx tsx scripts/office/fit-envelope.ts
 */
import { apply, deskPose, rotationOf } from "../../components/office/map/pose"
import { PHOTO, matMul, project, translate, type Quat, type V3 } from "../../components/office/phone/pose"

/** Corners measured on the plate (photo px of the 1376×768 render): TL, TR, BR, BL as seen on screen. */
const SEEN: [number, number][] = [
  [946.7, 630],
  [1075, 629.3],
  [1177, 696.7],
  [999, 696.7],
]
/** The bottom corners sit behind the tray's front wall and were extrapolated, so they count less. */
const WEIGHT = [1, 1, 0.35, 0.35]

type P = [number, number, number, number, number, number] // u, v, yaw, W, H, raise

function corners([u, v, yaw, W, H, raise]: P) {
  const pose = deskPose([u, v], yaw, raise)
  const m = matMul(translate(...pose.pos), rotationOf(pose.quat))
  const local: V3[] = [
    [-W / 2, -H / 2, 0],
    [W / 2, -H / 2, 0],
    [W / 2, H / 2, 0],
    [-W / 2, H / 2, 0],
  ]
  return local.map((c) => project(apply(m, c), PHOTO.cx, PHOTO.cy, PHOTO.d))
}

function cost(p: P) {
  if (p[3] < 10 || p[4] < 10 || p[5] < 0 || p[5] > 30) return 1e9
  return corners(p).reduce((s, [x, y], i) => s + WEIGHT[i] * ((x - SEEN[i][0]) ** 2 + (y - SEEN[i][1]) ** 2), 0)
}

function nelderMead(start: P, step: number[], iters = 6000): P {
  const n = start.length
  let simplex: P[] = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v + step[i] : v)) as P)]
  for (let k = 0; k < iters; k++) {
    simplex.sort((a, b) => cost(a) - cost(b))
    const best = simplex[0]
    const worst = simplex[n]
    const centroid = best.map((_, j) => simplex.slice(0, n).reduce((s, p) => s + p[j], 0) / n) as P
    const at = (f: number) => centroid.map((c, j) => c + f * (worst[j] - c)) as P
    const r = at(-1)
    if (cost(r) < cost(best)) {
      const e = at(-2)
      simplex[n] = cost(e) < cost(r) ? e : r
    } else if (cost(r) < cost(simplex[n - 1])) simplex[n] = r
    else {
      const c = at(0.5)
      if (cost(c) < cost(worst)) simplex[n] = c
      else simplex = simplex.map((p) => p.map((v, j) => best[j] + 0.5 * (v - best[j])) as P)
    }
  }
  simplex.sort((a, b) => cost(a) - cost(b))
  return simplex[0]
}

let best: P | null = null
for (const yaw of [-1.2, -0.6, 0, 0.6, 1.2, 2.4, -2.4]) {
  const p = nelderMead([1060, 662, yaw, 220, 150, 8], [20, 20, 0.3, 40, 30, 4])
  if (!best || cost(p) < cost(best)) best = p
}
const p = best!
console.log("desk fit", JSON.stringify(p.map((v) => +v.toFixed(4))), "rms", Math.sqrt(cost(p) / WEIGHT.reduce((a, b) => a + b)).toFixed(2))

/* The tray floor is not exactly parallel to the desk plane: refine to a free pose (position, rotation, W, H). */
const desk = deskPose([p[0], p[1]], p[2], p[5])
type F = [number, number, number, number, number, number, number, number] // x, y, z, rx, ry, rz, W, H
const qMul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const fromRotvec = (rx: number, ry: number, rz: number): Quat => {
  const a = Math.hypot(rx, ry, rz)
  if (a < 1e-9) return [0, 0, 0, 1]
  const s = Math.sin(a / 2) / a
  return [rx * s, ry * s, rz * s, Math.cos(a / 2)]
}
const freeQuat = (f: F) => qMul(fromRotvec(f[3], f[4], f[5]), desk.quat)
function freeCorners(f: F) {
  const m = matMul(translate(f[0], f[1], f[2]), rotationOf(freeQuat(f)))
  const [W, H] = [f[6], f[7]]
  const local: V3[] = [
    [-W / 2, -H / 2, 0],
    [W / 2, -H / 2, 0],
    [W / 2, H / 2, 0],
    [-W / 2, H / 2, 0],
  ]
  return local.map((c) => project(apply(m, c), PHOTO.cx, PHOTO.cy, PHOTO.d))
}
const freeCost = (f: F) =>
  f[6] < 10 || f[7] < 10 ? 1e9 : freeCorners(f).reduce((s, [x, y], i) => s + WEIGHT[i] * ((x - SEEN[i][0]) ** 2 + (y - SEEN[i][1]) ** 2), 0)

function nm<T extends number[]>(start: T, step: number[], f: (p: T) => number, iters = 20000): T {
  const n = start.length
  let simplex: T[] = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v + step[i] : v)) as T)]
  for (let k = 0; k < iters; k++) {
    simplex.sort((a, b) => f(a) - f(b))
    const best = simplex[0]
    const worst = simplex[n]
    const centroid = best.map((_, j) => simplex.slice(0, n).reduce((s, p) => s + p[j], 0) / n) as T
    const at = (g: number) => centroid.map((c, j) => c + g * (worst[j] - c)) as T
    const r = at(-1)
    if (f(r) < f(best)) {
      const e = at(-2)
      simplex[n] = f(e) < f(r) ? e : r
    } else if (f(r) < f(simplex[n - 1])) simplex[n] = r
    else {
      const c = at(0.5)
      if (f(c) < f(worst)) simplex[n] = c
      else simplex = simplex.map((p) => p.map((v, j) => best[j] + 0.5 * (v - best[j])) as T)
    }
  }
  simplex.sort((a, b) => f(a) - f(b))
  return simplex[0]
}

/* Aspect sweep: free pose with a fixed W/H, scored by corner error and by how far it tilts off the desk. */
const deskN = desk.normal
for (const r of [0.72, 1, 1.2, 1.42, 1.6, 1.9]) {
  type G = [number, number, number, number, number, number, number]
  const toF = (g: G): F => [g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[6] / r]
  let g: G = [...desk.pos, 0, 0, 0, 200] as G
  for (let round = 0; round < 4; round++) g = nm(g, [10, 10, 10, 0.05, 0.05, 0.05, 10], (x) => freeCost(toF(x)))
  const f = toF(g)
  const m = rotationOf(freeQuat(f))
  const n: V3 = [m[2], m[6], m[10]]
  const tilt = (Math.acos(Math.abs(n[0] * deskN[0] + n[1] * deskN[1] + n[2] * deskN[2])) * 180) / Math.PI
  console.log(
    "aspect", r, "rms", Math.sqrt(freeCost(f) / WEIGHT.reduce((a, b) => a + b)).toFixed(2), "tilt°", tilt.toFixed(1),
    "pos", JSON.stringify(f.slice(0, 3).map((v) => +v.toFixed(2))), "quat", JSON.stringify(freeQuat(f).map((v) => +v.toFixed(6))),
    "size", JSON.stringify([+f[6].toFixed(2), +f[7].toFixed(2)]), "corners", JSON.stringify(freeCorners(f).map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)])),
  )
}

let fit: F = [...desk.pos, 0, 0, 0, p[3], p[4]] as F
for (let round = 0; round < 6; round++) fit = nm(fit, [10, 10, 10, 0.05, 0.05, 0.05, 10, 10], freeCost)
const q = freeQuat(fit)
console.log("pos", JSON.stringify(fit.slice(0, 3).map((v) => +v.toFixed(3))))
console.log("quat", JSON.stringify(q.map((v) => +v.toFixed(6))))
console.log("size", JSON.stringify([+fit[6].toFixed(3), +fit[7].toFixed(3)]), "aspect W/H", (fit[6] / fit[7]).toFixed(4))
console.log("rms px", Math.sqrt(freeCost(fit) / WEIGHT.reduce((a, b) => a + b)).toFixed(3))
console.log("corners", JSON.stringify(freeCorners(fit).map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)])))
console.log("normal z", +rotationOf(q)[10].toFixed(4), "desk normal", JSON.stringify(desk.normal.map((v) => +v.toFixed(4))))
