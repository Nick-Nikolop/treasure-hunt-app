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

/** The cork board only holds the current case; solved cases live in the archive drawer. */
export type BoardLayout = {
  /** board width / height */
  ratio: number
  /** text unit, in container-width units */
  unit: string
  title: Spot
  current: CaseSpots
}

/** Every paper has a fixed shape so pins and strings can be computed instead of measured. */
export const SHAPE = { photo: 1.12, folder: 0.64, note: 0.8, title: 0.4 }

export const WIDE: BoardLayout = {
  ratio: 1.5,
  unit: "1.3cqw",
  title: { x: 31, y: 14, w: 34, r: -1.5 },
  current: {
    photo: { x: 33, y: 58, w: 29, r: -3 },
    folder: { x: 71, y: 69, w: 36, r: 2.5 },
    notes: [
      { x: 68, y: 21, w: 15, r: 5 },
      { x: 88, y: 32, w: 14, r: -4, link: 0 },
      { x: 9.5, y: 46, w: 13.5, r: -6, link: "title" },
    ],
    focus: { x: 55, y: 60, s: 1.25 },
  },
}

export const TALL: BoardLayout = {
  ratio: 0.74,
  unit: "2.6cqw",
  title: { x: 50, y: 11, w: 64, r: -1.5 },
  current: {
    photo: { x: 37, y: 44, w: 54, r: -3 },
    folder: { x: 62, y: 84, w: 60, r: 2 },
    notes: [
      { x: 83, y: 31, w: 28, r: 6 },
      { x: 84, y: 53, w: 27, r: -5, link: 0 },
      { x: 15, y: 82, w: 25, r: -6, link: null },
    ],
    focus: { x: 50, y: 62, s: 1.2 },
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
