// ─────────────────────────────────────────────────────────────────────────
//  Voyage chart geometry — the hand-plotted nine-stop sea route shared by the
//  journal map page and the leaderboard map. The stop coordinates and the
//  route path are drawn through the same points, so they must move together;
//  keeping them here means both views stay in sync from one source of truth.
//
//  All values are expressed in the chart's own viewBox: "0 0 400 480".
// ─────────────────────────────────────────────────────────────────────────

/** The chart viewBox both maps render into. */
export const MAP_VIEWBOX = "0 0 400 480"

/** Hand-plotted positions of the nine stops on the chart, in stop order. */
export const STOP_XY: ReadonlyArray<readonly [number, number]> = [
  [62, 64],
  [190, 88],
  [318, 64],
  [338, 168],
  [212, 196],
  [84, 186],
  [66, 296],
  [198, 318],
  [330, 296],
]

/** The full course, sketched as one winding stroke through every stop. */
export const ROUTE_D =
  "M62 64 C105 40 150 100 190 88 C235 76 280 40 318 64 C350 85 355 130 338 168 " +
  "C322 205 255 180 212 196 C170 212 120 165 84 186 C50 207 52 255 66 296 " +
  "C78 330 155 300 198 318 C240 335 300 320 330 296"

/** The last leg home to the treasure, only inked when the course is complete. */
export const TAIL_D = "M330 296 C355 275 300 395 212 420"

/** Where the treasure X sits (Kalamata, journey's end). */
export const TREASURE_XY: readonly [number, number] = [212, 420]
