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

export type BoardLayout = {
  /** board width / height */
  ratio: number
  /** text unit, in container-width units */
  unit: string
  title: Spot
  /** cases whose photo hangs from the title card */
  titleLinks: HuntRef[]
  cases: Record<HuntRef, CaseSpots>
}

/** Every paper has a fixed shape so pins and strings can be computed instead of measured. */
export const SHAPE = { photo: 1.12, folder: 0.64, note: 0.8, title: 0.4 }

export const WIDE: BoardLayout = {
  ratio: 16 / 10,
  unit: "1cqw",
  title: { x: 50, y: 13, w: 24, r: -1.5 },
  titleLinks: ["#1", "#2"],
  cases: {
    "#1": {
      photo: { x: 26, y: 41, w: 24, r: -4 },
      folder: { x: 28, y: 80, w: 23, r: 2.5 },
      notes: [
        { x: 8.5, y: 26, w: 11, r: -7 },
        { x: 9, y: 66, w: 11, r: 5, link: 0 },
        { x: 45, y: 60, w: 10.5, r: -3, link: "title" },
      ],
      focus: { x: 27, y: 58, s: 1.5 },
    },
    "#2": {
      photo: { x: 73, y: 40, w: 24, r: 3.5 },
      folder: { x: 71, y: 80, w: 23, r: -2 },
      notes: [
        { x: 91.5, y: 27, w: 11, r: 6 },
        { x: 56, y: 36, w: 10.5, r: 4 },
        { x: 91, y: 66, w: 11, r: -5, link: 0 },
      ],
      focus: { x: 72, y: 58, s: 1.5 },
    },
  },
}

export const TALL: BoardLayout = {
  ratio: 10 / 21,
  unit: "2.6cqw",
  title: { x: 50, y: 5.5, w: 62, r: -1.5 },
  titleLinks: ["#2"],
  cases: {
    "#2": {
      photo: { x: 40, y: 27, w: 54, r: -3 },
      folder: { x: 56, y: 47.5, w: 60, r: 2 },
      notes: [
        { x: 84, y: 17, w: 27, r: 7 },
        { x: 85, y: 34.5, w: 27, r: -5, link: 0 },
        { x: 14, y: 45, w: 25, r: -6, link: null },
      ],
      focus: { x: 48, y: 37, s: 1.3 },
    },
    "#1": {
      photo: { x: 60, y: 70, w: 54, r: 3 },
      folder: { x: 44, y: 90.5, w: 60, r: -2 },
      notes: [
        { x: 16, y: 61, w: 27, r: -6 },
        { x: 15, y: 77, w: 26, r: 5, link: 0 },
        { x: 86, y: 95, w: 24, r: 6, link: null },
      ],
      focus: { x: 52, y: 80, s: 1.3 },
    },
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
