export type ChapterId = "mission" | "riddle" | "route" | "scan" | "ending"

/** `gate` = the moment the video stops and waits for the viewer to act. */
export type Chapter = { id: ChapterId; duration: number; gate?: number }

export const CHAPTERS: Chapter[] = [
  { id: "mission", duration: 6800 },
  { id: "riddle", duration: 8200, gate: 3600 },
  { id: "route", duration: 7200 },
  { id: "scan", duration: 7600, gate: 2600 },
  { id: "ending", duration: 7000 },
]

/** If nobody acts at a gate, the video makes the move itself after this long. */
export const GATE_TIMEOUT = 9000

export type Solve = { option?: string; auto: boolean }
export type Solved = Partial<Record<ChapterId, Solve>>

export type Clock = { chapter: number; t: number; wait: number; ended: boolean }
export const START_CLOCK: Clock = { chapter: 0, t: 0, wait: 0, ended: false }

export function chapterById(id: ChapterId): Chapter {
  return CHAPTERS.find((chapter) => chapter.id === id) ?? CHAPTERS[0]
}

export function advance(clock: Clock, dt: number, solved: Solved): Clock {
  if (clock.ended) return clock
  const chapter = CHAPTERS[clock.chapter]
  const next = clock.t + dt

  if (chapter.gate !== undefined && !solved[chapter.id] && next >= chapter.gate) {
    const waited = clock.t >= chapter.gate ? clock.wait + dt : clock.wait
    return { ...clock, t: chapter.gate, wait: waited }
  }
  if (next < chapter.duration) return { ...clock, t: next, wait: 0 }
  if (clock.chapter === CHAPTERS.length - 1) return { ...clock, t: chapter.duration, ended: true }
  return { chapter: clock.chapter + 1, t: 0, wait: 0, ended: false }
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const span = (t: number, from: number, length: number) => clamp01((t - from) / length)
export const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3)
export const easeInOut = (value: number) => {
  const v = clamp01(value)
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
