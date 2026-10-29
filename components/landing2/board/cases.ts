import type { LandingCopy } from "@/components/landing/copy"
import type { HuntRef, ReelCopy } from "../copy"

export type BoardCase = {
  ref: HuntRef
  live: boolean
  title: string
  status: string
  body: string
  tags: string[]
  notes: string[]
  facts: { label: string; value: string }[]
}

export function buildCases(missions: LandingCopy["missions"], reel: ReelCopy): BoardCase[] {
  const { next, past, fields, archive } = missions
  return [
    {
      ref: "#1",
      live: false,
      title: past.title,
      status: past.status,
      body: past.body,
      tags: reel.hunts.tags["#1"],
      notes: [reel.hunts.tags["#1"][0], `${reel.board.prize}: ${archive.prizeValue}`, reel.hunts.tags["#1"][1]],
      facts: [
        { label: fields.period, value: past.period },
        { label: fields.entry, value: past.entry },
        { label: archive.prizeLabel, value: archive.prizeValue },
        { label: reel.top.stations, value: "10" },
      ],
    },
    {
      ref: "#2",
      live: true,
      title: next.title,
      status: next.status,
      body: next.body,
      tags: reel.hunts.tags["#2"],
      notes: [reel.hunts.tags["#2"][1], reel.board.unknown, reel.hunts.tags["#2"][2]],
      facts: [
        { label: fields.period, value: next.period },
        { label: fields.entry, value: next.entry },
      ],
    },
  ]
}

/** x/y = centre in % of the board, w = width in % of the board width, r = rotation in degrees. */
export type Spot = { x: number; y: number; w: number; r: number }

/** What a note's string runs to: the case photo (default), another note by index, the title card, or nothing. */
export type NoteSpot = Spot & { link?: number | "title" | null }

export type CaseSpots = { photo: Spot; folder: Spot; notes: [NoteSpot, NoteSpot, NoteSpot]; focus: { x: number; y: number; s: number } }

/** Solved cases share one corner of the board: a label card, a tied bundle, and the spread-out files once opened. */
export type ArchiveSpots = {
  label: Spot
  bundle: Spot
  /** spread positions, indexed by how many solved cases there are (1, 2, 3+) */
  spread: Spot[][]
  /** where the "close archive" chip sits while the files are spread out */
  close: { x: number; y: number }
  /** start of the archive area along the split axis, in board % (x on wide boards, y on tall ones) */
  edge: number
}

/** One cork board: the current case on one side, the archive of solved cases on the other. */
export type BoardLayout = {
  /** board width / height */
  ratio: number
  /** text unit, in container-width units */
  unit: string
  title: Spot
  current: CaseSpots
  archive: ArchiveSpots
}

/** Every paper has a fixed shape so pins and strings can be computed instead of measured. */
export const SHAPE = { photo: 1.12, folder: 0.64, note: 0.8, title: 0.4, file: 1 }

export const WIDE: BoardLayout = {
  ratio: 1.6,
  unit: "1cqw",
  title: { x: 25, y: 13, w: 22, r: -1.5 },
  current: {
    photo: { x: 23, y: 50, w: 22, r: -3 },
    folder: { x: 44, y: 71, w: 21, r: 2.5 },
    notes: [
      { x: 45, y: 29, w: 10.5, r: 5 },
      { x: 52.5, y: 45, w: 10, r: -4, link: 0 },
      { x: 8.5, y: 80, w: 10, r: -6, link: null },
    ],
    focus: { x: 31, y: 50, s: 1.45 },
  },
  archive: {
    label: { x: 81, y: 14, w: 19, r: 1.5 },
    bundle: { x: 81, y: 53, w: 25, r: -2 },
    spread: [
      [{ x: 81, y: 55, w: 22, r: -2 }],
      [
        { x: 73, y: 54, w: 15, r: -3 },
        { x: 89, y: 56, w: 15, r: 3 },
      ],
      [
        { x: 71, y: 44, w: 13, r: -3 },
        { x: 90, y: 46, w: 13, r: 3 },
        { x: 80.5, y: 77, w: 13, r: -1 },
      ],
    ],
    close: { x: 81, y: 88 },
    edge: 62,
  },
}

export const TALL: BoardLayout = {
  ratio: 0.52,
  unit: "2.6cqw",
  title: { x: 50, y: 6.5, w: 58, r: -1.5 },
  current: {
    photo: { x: 38, y: 28, w: 50, r: -3 },
    folder: { x: 60, y: 48, w: 56, r: 2 },
    notes: [
      { x: 84, y: 19, w: 26, r: 6 },
      { x: 85, y: 33.5, w: 25, r: -5, link: 0 },
      { x: 14, y: 52, w: 22, r: -6, link: null },
    ],
    focus: { x: 50, y: 30, s: 1.3 },
  },
  archive: {
    label: { x: 28, y: 66, w: 42, r: 1.5 },
    bundle: { x: 57, y: 86, w: 54, r: -2 },
    spread: [
      [{ x: 56, y: 84, w: 40, r: -2 }],
      [
        { x: 28, y: 85, w: 34, r: -3 },
        { x: 72, y: 85, w: 34, r: 3 },
      ],
      [
        { x: 18, y: 85, w: 28, r: -3 },
        { x: 50, y: 85, w: 28, r: 1 },
        { x: 82, y: 85, w: 28, r: 3 },
      ],
    ],
    close: { x: 78, y: 66 },
    edge: 60,
  },
}

/** Height of a paper in % of the board height. */
export function heightOf(spot: Spot, shape: number, layout: BoardLayout) {
  return spot.w * shape * layout.ratio
}

/** Where the push pin sits on a paper (top centre, a little in), in board %. */
export function pinOf(spot: Spot, shape: number, layout: BoardLayout) {
  const h = heightOf(spot, shape, layout)
  const d = h / 2 - Math.min(h * 0.09, 3)
  const a = (spot.r * Math.PI) / 180
  return { x: spot.x + (d / layout.ratio) * Math.sin(a), y: spot.y - d * Math.cos(a) }
}
