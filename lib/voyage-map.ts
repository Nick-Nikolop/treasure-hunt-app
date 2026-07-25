// ─────────────────────────────────────────────────────────────────────────
//  Voyage chart geometry — the hand-plotted sea route shared by the journal
//  map page and the leaderboard map. The stop coordinates and the route path
//  are derived from the same points, so they always move together.
//
//  The chart is generated for however many stops the hunt currently has, so
//  admins can add or remove leads without the route breaking or a stop
//  floating loose in the middle of the page.
//
//  All values are expressed in the chart's own viewBox: "0 0 400 480".
// ─────────────────────────────────────────────────────────────────────────

/** The chart viewBox both maps render into. */
export const MAP_VIEWBOX = "0 0 400 480"

/** Where the treasure X sits (Kalamata, journey's end). */
export const TREASURE_XY: readonly [number, number] = [212, 420]

export type Point = readonly [number, number]

/**
 * Plotting frame. The top edge sits low enough that a label above the first
 * row still clears the compass rose in the corner, and the bottom edge leaves
 * room for the final leg down to the treasure.
 */
const X_LEFT = 62
const X_RIGHT = 338
const Y_TOP = 94
const Y_BOTTOM = 326
/** At most three stops per row keeps labels from colliding side to side. */
const MAX_PER_ROW = 3

/**
 * A small, stable offset per stop so the plotted course reads as hand-drawn
 * rather than as a grid. Deterministic, so the chart never shifts between
 * renders or between the journal and the leaderboard.
 */
function jitter(i: number): Point {
  const a = Math.sin((i + 1) * 12.9898) * 43758.5453
  const b = Math.sin((i + 1) * 78.233) * 12345.6789
  const jx = ((a - Math.floor(a)) - 0.5) * 13
  const jy = ((b - Math.floor(b)) - 0.5) * 14
  return [jx, jy]
}

/**
 * Split `count` stops into balanced rows of at most three, so the last row is
 * never left with a single lonely node when it can be avoided.
 */
function rowSizes(count: number): number[] {
  const rows = Math.max(1, Math.ceil(count / MAX_PER_ROW))
  const base = Math.floor(count / rows)
  const extra = count % rows
  return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0))
}

/**
 * Plot `count` stops as a serpentine course: left to right, then back again on
 * the next row, so the route winds down the page without crossing itself.
 */
export function buildStops(count: number): Point[] {
  if (count <= 0) return []
  if (count === 1) return [[200, 190]]

  const sizes = rowSizes(count)
  const rows = sizes.length
  const rowGap = rows > 1 ? (Y_BOTTOM - Y_TOP) / (rows - 1) : 0

  // One shared column step, so a short row keeps the same horizontal rhythm as
  // a full one instead of stretching across the whole chart.
  const step = (X_RIGHT - X_LEFT) / (MAX_PER_ROW - 1)
  const midX = (X_LEFT + X_RIGHT) / 2

  const out: Point[] = []
  let i = 0
  sizes.forEach((size, r) => {
    const y = rows > 1 ? Y_TOP + r * rowGap : (Y_TOP + Y_BOTTOM) / 2
    const startX = midX - ((size - 1) * step) / 2
    for (let k = 0; k < size; k++) {
      // Even rows run left to right, odd rows run right to left.
      const slot = r % 2 === 0 ? k : size - 1 - k
      const x = startX + slot * step
      const [jx, jy] = jitter(i)
      out.push([Math.round((x + jx) * 10) / 10, Math.round((y + jy) * 10) / 10])
      i++
    }
  })
  return out
}

/**
 * A smooth cubic path through every point (Catmull-Rom converted to Béziers),
 * which gives the course its flowing, charted-by-hand curve.
 */
export function splinePath(points: readonly Point[]): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]}`

  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d +=
      ` C${Math.round(c1x * 10) / 10} ${Math.round(c1y * 10) / 10}` +
      ` ${Math.round(c2x * 10) / 10} ${Math.round(c2y * 10) / 10}` +
      ` ${p2[0]} ${p2[1]}`
  }
  return d
}

/** The last leg home, sweeping out from the final stop down to the treasure. */
export function buildTail(last: Point | undefined): string {
  const [tx, ty] = TREASURE_XY
  if (!last) return `M${tx} ${ty}`
  const side = last[0] >= 200 ? 1 : -1
  const c1x = last[0] + side * 26
  const c1y = last[1] + 22
  const c2x = tx + side * 78
  const c2y = ty - 46
  return `M${last[0]} ${last[1]} C${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`
}

export type VoyageRoute = {
  /** Plotted position of every stop, in stop order. */
  stops: Point[]
  /** The full course through every stop. */
  routeD: string
  /** The final leg from the last stop to the treasure. */
  tailD: string
}

/** Build the whole chart for a hunt of `count` stops. */
export function buildVoyageRoute(count: number): VoyageRoute {
  const stops = buildStops(count)
  return {
    stops,
    routeD: splinePath(stops),
    tailD: buildTail(stops[stops.length - 1]),
  }
}

/** How many stops the chart falls back to when a total is not supplied. */
export const DEFAULT_STOP_COUNT = 10

const fallback = buildVoyageRoute(DEFAULT_STOP_COUNT)

/** Back-compatible static chart, plotted for the default stop count. */
export const STOP_XY: ReadonlyArray<Point> = fallback.stops
export const ROUTE_D = fallback.routeD
export const TAIL_D = fallback.tailD
