"use client"

import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, Check, Compass, Copy, Mail, RotateCcw, X } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { LANDING_CONTACT, type LandingCopy } from "./copy"

/** Hidden-symbol puzzle is switched off for now; flip to true to bring every placement back. */
export const CLUES_ENABLED = false

export const CLUE_IDS = ["hero", "story", "scene", "code", "file", "faq", "footer"] as const
export type ClueId = (typeof CLUE_IDS)[number]

/** Which word of the hidden sentence each clue carries. Page order deliberately differs from sentence order. */
const WORD_OF: Record<ClueId, number> = { hero: 3, story: 6, scene: 0, code: 5, file: 1, faq: 4, footer: 2 }

type RealKind = "ring" | "triangle" | "diamond" | "wave" | "crescent" | "bars" | "chevron"
type DecoyKind =
  | "circle"
  | "triangleDown"
  | "diamondDot"
  | "zigzag"
  | "crescentFlip"
  | "bars2"
  | "chevronSingle"
  | "square"
  | "hexagon"
  | "hourglass"
  | "eye"
  | "cross"
  | "drop"
  | "infinity"
type SymbolKind = RealKind | DecoyKind

const SYMBOL_OF: Record<ClueId, RealKind> = {
  hero: "ring",
  story: "triangle",
  scene: "diamond",
  code: "wave",
  file: "crescent",
  faq: "bars",
  footer: "chevron",
}

/** Decoys are chosen to be easy to confuse with the real symbols. Index matches `copy.decoyWords`. */
const DECOY_KINDS: DecoyKind[] = [
  "circle",
  "triangleDown",
  "diamondDot",
  "zigzag",
  "crescentFlip",
  "bars2",
  "chevronSingle",
  "square",
  "hexagon",
  "hourglass",
  "eye",
  "cross",
  "drop",
  "infinity",
]

const STORAGE_KEY = "thehunt:landing-hunt-v2"
const COUNT = CLUE_IDS.length
const EASE = [0.16, 1, 0.3, 1] as const

type Point = { x: number; y: number }

/** Sentence word j sits on KEY[j]. Connected in order, they trace an old key: bow, shaft, bit. */
const KEY: Point[] = [
  { x: 30, y: 70 },
  { x: 12, y: 50 },
  { x: 30, y: 30 },
  { x: 48, y: 50 },
  { x: 88, y: 50 },
  { x: 88, y: 66 },
  { x: 76, y: 66 },
]
/** Strokes drawn automatically once the key is complete (closing the bow, joining the bit to the shaft). */
const KEY_FINISH: [Point, Point][] = [
  [KEY[0], KEY[3]],
  [KEY[6], { x: 76, y: 50 }],
]

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Deterministic decoy placement that keeps every straight key stroke free of decoys. */
const DECOY_POSITIONS: Point[] = (() => {
  let seed = 20260
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const strokes = [...KEY.slice(1).map((point, index) => [KEY[index], point] as [Point, Point]), ...KEY_FINISH]
  const candidates: Point[] = []
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      candidates.push({ x: 8 + col * 14 + (random() - 0.5) * 6, y: 8 + row * 14 + (random() - 0.5) * 6 })
    }
  }
  candidates.sort(() => random() - 0.5)
  const chosen: Point[] = []
  for (const candidate of candidates) {
    if (chosen.length === DECOY_KINDS.length) break
    const clearOfStrokes = strokes.every(([a, b]) => distanceToSegment(candidate, a, b) >= 9)
    const clearOfNodes = [...KEY, ...chosen].every((node) => Math.hypot(node.x - candidate.x, node.y - candidate.y) >= 12)
    if (clearOfStrokes && clearOfNodes) chosen.push(candidate)
  }
  return chosen
})()

type ClueState = {
  found: ClueId[]
  solved: boolean
  copy: LandingCopy["clues"]
  find: (id: ClueId) => void
  reset: () => void
  markSolved: () => void
  openChart: () => void
}

const ClueContext = createContext<ClueState | null>(null)

function useClues() {
  const value = useContext(ClueContext)
  if (!value) throw new Error("useClues must be used inside ClueProvider")
  return value
}

function clueForWord(word: number) {
  return CLUE_IDS.find((id) => WORD_OF[id] === word) ?? CLUE_IDS[0]
}

const CRESCENT = "M15.5 4a8.5 8.5 0 1 0 4.5 13A7 7 0 0 1 15.5 4Z"

export function HuntSymbol({ kind, className = "" }: { kind: SymbolKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {kind === "ring" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      )}
      {kind === "circle" && <circle cx="12" cy="12" r="8" />}
      {kind === "triangle" && <path d="M12 4 20 19H4Z" />}
      {kind === "triangleDown" && <path d="M12 20 20 5H4Z" />}
      {kind === "diamond" && <path d="M12 3 20 12 12 21 4 12Z" />}
      {kind === "diamondDot" && (
        <>
          <path d="M12 3 20 12 12 21 4 12Z" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </>
      )}
      {kind === "wave" && <path d="M3 12c2.25-4 4.5-4 6.75 0s4.5 4 6.75 0S19.5 8 21 9" />}
      {kind === "zigzag" && <path d="m3 14 4.5-5 4.5 5 4.5-5 4.5 5" />}
      {kind === "crescent" && <path d={CRESCENT} />}
      {kind === "crescentFlip" && <path d={CRESCENT} transform="translate(24 0) scale(-1 1)" />}
      {kind === "bars" && <path d="M5 8h14M5 12h14M5 16h14" />}
      {kind === "bars2" && <path d="M5 9h14M5 15h14" />}
      {kind === "chevron" && <path d="m5 11 7-6 7 6M5 18l7-6 7 6" />}
      {kind === "chevronSingle" && <path d="m5 15 7-6 7 6" />}
      {kind === "square" && <rect x="5" y="5" width="14" height="14" />}
      {kind === "hexagon" && <path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9Z" />}
      {kind === "hourglass" && <path d="M6 4h12L6 20h12Z" />}
      {kind === "eye" && (
        <>
          <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
      {kind === "cross" && <path d="M6 6l12 12M18 6 6 18" />}
      {kind === "drop" && <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />}
      {kind === "infinity" && <path d="M12 12c-2.5-3.5-8-3.5-8 0s5.5 3.5 8 0 8-3.5 8 0-5.5 3.5-8 0Z" />}
    </svg>
  )
}

export function ClueProvider({ copy, children }: { copy: LandingCopy["clues"]; children: React.ReactNode }) {
  const [found, setFound] = useState<ClueId[]>([])
  const [solved, setSolved] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [toast, setToast] = useState<{ id: ClueId; count: number; key: number } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { found?: string[]; solved?: boolean }
      setFound(CLUE_IDS.filter((id) => saved.found?.includes(id)))
      setSolved(Boolean(saved.solved))
    } catch {
      setFound([])
    }
  }, [])

  const persist = (nextFound: ClueId[], nextSolved: boolean) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ found: nextFound, solved: nextSolved }))

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.count === COUNT ? 6500 : 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const foundRef = useRef<ClueId[]>([])
  const solvedRef = useRef(false)
  foundRef.current = found
  solvedRef.current = solved

  const find = useCallback((id: ClueId) => {
    const current = foundRef.current
    if (current.includes(id)) return
    const next = CLUE_IDS.filter((clue) => clue === id || current.includes(clue))
    foundRef.current = next
    setFound(next)
    persist(next, solvedRef.current)
    setToast({ id, count: next.length, key: Date.now() })
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    foundRef.current = []
    setFound([])
    setSolved(false)
  }, [])

  const markSolved = useCallback(() => {
    solvedRef.current = true
    setSolved(true)
    persist([...CLUE_IDS], true)
  }, [])

  const openChart = useCallback(() => setChartOpen(true), [])

  const value = useMemo(
    () => ({ found, solved, copy, find, reset, markSolved, openChart }),
    [found, solved, copy, find, reset, markSolved, openChart],
  )

  return (
    <ClueContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="pointer-events-auto flex max-w-md items-center gap-4 rounded-full border border-brass/50 bg-background/95 py-3 pl-3 pr-6 shadow-2xl backdrop-blur"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brass text-primary-foreground">
                <HuntSymbol kind={SYMBOL_OF[toast.id]} className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">
                  {copy.found} {toast.count}/{COUNT}
                </span>
                {toast.count === COUNT ? (
                  <button
                    type="button"
                    onClick={() => {
                      setToast(null)
                      setChartOpen(true)
                    }}
                    className="text-left font-serif text-base italic leading-snug text-foreground underline decoration-brass underline-offset-4"
                  >
                    {copy.unlocked}
                  </button>
                ) : (
                  <span className="font-serif text-base italic text-foreground">{copy.toastNote}</span>
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{chartOpen && <SymbolMap onClose={() => setChartOpen(false)} />}</AnimatePresence>
    </ClueContext.Provider>
  )
}

type ClueProps = { id: ClueId; large?: boolean; className?: string }

export function Clue(props: ClueProps) {
  return CLUES_ENABLED ? <ClueButton {...props} /> : null
}

function ClueButton({ id, large = false, className = "" }: ClueProps) {
  const { found, copy, find } = useClues()
  const isFound = found.includes(id)

  return (
    <button
      type="button"
      onClick={() => find(id)}
      aria-label={isFound ? copy.found : copy.mark}
      className={`group/clue pointer-events-auto ${className.includes("absolute") ? "" : "relative"} z-10 inline-flex ${
        large ? "size-16" : "size-8"
      } shrink-0 items-center justify-center align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {!isFound && (
        <span className="absolute inset-1.5 animate-ping rounded-full bg-brass/20 [animation-duration:3.2s]" aria-hidden="true" />
      )}
      <HuntSymbol
        kind={SYMBOL_OF[id]}
        className={`relative ${large ? "size-10 drop-shadow-[0_0_10px_oklch(0.78_0.13_78/0.8)]" : "size-4"} transition-all duration-500 group-hover/clue:scale-125 ${
          isFound ? "text-brass" : large ? "text-brass/90 group-hover/clue:text-brass" : "text-brass/60 group-hover/clue:text-brass"
        }`}
      />
    </button>
  )
}

export function ClueTracker() {
  return CLUES_ENABLED ? <ClueTrackerPanel /> : null
}

function ClueTrackerPanel() {
  const { found, solved, copy, reset, openChart } = useClues()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const complete = found.length === COUNT

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={copy.tracker}
        className={`relative flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-xs tracking-[0.15em] transition-colors ${
          complete ? "border-brass bg-brass text-primary-foreground" : "border-foreground/30 text-foreground hover:border-brass hover:text-brass"
        }`}
      >
        {complete && !solved && (
          <span className="absolute -inset-1 animate-ping rounded-full border border-brass/60 [animation-duration:2.4s]" aria-hidden="true" />
        )}
        <motion.span
          key={found.length}
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex"
        >
          <Compass className="size-3.5" aria-hidden="true" />
        </motion.span>
        {found.length}/{COUNT}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-3 w-[min(20rem,calc(100vw-3rem))] rounded-sm border border-border bg-card p-5 shadow-2xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">{copy.tracker}</p>
            <p className="pt-2 font-sans text-sm leading-relaxed text-muted-foreground">
              {solved ? copy.solvedNote : complete ? copy.complete : copy.hint}
            </p>

            <ul className="grid grid-cols-7 gap-1 pt-4" aria-label={copy.tracker}>
              {CLUE_IDS.map((id) => {
                const isFound = found.includes(id)
                return (
                  <li
                    key={id}
                    className={`flex aspect-square items-center justify-center rounded-sm border ${
                      isFound ? "border-brass/60 text-brass" : "border-dashed border-foreground/20 text-foreground/15"
                    }`}
                    title={isFound ? undefined : copy.missing}
                  >
                    <HuntSymbol kind={SYMBOL_OF[id]} className="size-4" />
                    <span className="sr-only">{isFound ? copy.found : copy.missing}</span>
                  </li>
                )
              })}
            </ul>

            {complete && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openChart()
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-4 py-3 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Compass className="size-4" aria-hidden="true" />
                {solved ? copy.reopen : copy.openChart}
              </button>
            )}

            {found.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="mt-3 flex items-center gap-2 font-sans text-xs text-muted-foreground hover:text-brass"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                {copy.reset}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type MapNode = { id: string; kind: SymbolKind; point: Point; word: number | null }

function SymbolMap({ onClose }: { onClose: () => void }) {
  const { solved, copy, markSolved } = useClues()

  const nodes = useMemo<MapNode[]>(
    () => [
      ...KEY.map((point, word) => ({ id: `w${word}`, kind: SYMBOL_OF[clueForWord(word)], point, word })),
      ...DECOY_POSITIONS.map((point, index) => ({ id: `d${index}`, kind: DECOY_KINDS[index], point, word: null })),
    ],
    [],
  )

  const dictionary = useMemo(() => {
    const entries = [
      ...KEY.map((_, word) => ({ kind: SYMBOL_OF[clueForWord(word)] as SymbolKind, word: copy.fragments[word] })),
      ...DECOY_KINDS.map((kind, index) => ({ kind: kind as SymbolKind, word: copy.decoyWords[index] })),
    ]
    const plain = (word: string) => word.replace(/[.,]/g, "").toLocaleLowerCase()
    return entries.sort((a, b) => plain(a.word).localeCompare(plain(b.word)))
  }, [copy])

  const allWords = useMemo(() => KEY.map((_, word) => word), [])
  const [path, setPath] = useState<number[]>(() => (solved ? allWords : []))
  const [cursor, setCursor] = useState<Point | null>(null)
  const [error, setError] = useState(false)
  const [revealed, setRevealed] = useState(solved)
  const pathRef = useRef(path)
  const errorRef = useRef(false)
  const dragging = useRef(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const done = path.length === COUNT

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const select = useCallback(
    (node: MapNode) => {
      const current = pathRef.current
      if (errorRef.current || current.length === COUNT) return
      if (node.word !== null && current.includes(node.word)) return
      if (node.word !== current.length) {
        errorRef.current = true
        dragging.current = false
        setCursor(null)
        setError(true)
        window.setTimeout(() => {
          errorRef.current = false
          pathRef.current = []
          setPath([])
          setError(false)
        }, 800)
        return
      }
      const next = [...current, node.word]
      pathRef.current = next
      setPath(next)
      if (next.length === COUNT) {
        dragging.current = false
        setCursor(null)
        markSolved()
        window.setTimeout(() => setRevealed(true), 2600)
      }
    },
    [markSolved],
  )

  const toBoard = (event: React.PointerEvent) => {
    const rect = boardRef.current!.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }
  }

  const hit = (point: Point) => {
    const node = nodes.find((candidate) => Math.hypot(candidate.point.x - point.x, candidate.point.y - point.y) < 4.2)
    if (node) select(node)
  }

  const last = path.length ? KEY[path[path.length - 1]] : null
  const segments: [Point, Point][] = path.slice(1).map((word, index) => [KEY[path[index]], KEY[word]])
  if (done) segments.push(...KEY_FINISH)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={copy.chartTitle}
      className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-background/95 px-5 py-16 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-5 top-5 z-10 flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-brass hover:text-brass"
        aria-label={copy.close}
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <div className="my-auto flex w-full max-w-5xl flex-col items-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="map"
              className="flex w-full flex-col gap-8"
              exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
              transition={{ duration: 0.6 }}
            >
              <header className="flex flex-col items-center gap-3 text-center">
                <p className="font-sans text-xs uppercase tracking-[0.35em] text-brass">{copy.chartEyebrow}</p>
                <h2 className="font-serif text-3xl text-foreground text-balance md:text-4xl">{copy.chartTitle}</h2>
                <p className="max-w-xl font-sans text-sm leading-relaxed text-muted-foreground text-pretty">{copy.chartBody}</p>
              </header>

              <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    ref={boardRef}
                    className="relative aspect-square w-[min(90vw,32rem)] touch-none select-none rounded-sm border border-border bg-card"
                    animate={error ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.5 }}
                    onPointerDown={(event) => {
                      if (done) return
                      event.currentTarget.setPointerCapture(event.pointerId)
                      dragging.current = true
                      const point = toBoard(event)
                      setCursor(point)
                      hit(point)
                    }}
                    onPointerMove={(event) => {
                      if (!dragging.current) return
                      const point = toBoard(event)
                      setCursor(point)
                      hit(point)
                    }}
                    onPointerUp={() => {
                      dragging.current = false
                      setCursor(null)
                    }}
                    onPointerCancel={() => {
                      dragging.current = false
                      setCursor(null)
                    }}
                  >
                    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, index) => (index + 1) * 10).map((line) => (
                        <g key={line} className="text-foreground/[0.07]" stroke="currentColor" strokeWidth="0.2">
                          <line x1={line} y1="0" x2={line} y2="100" />
                          <line x1="0" y1={line} x2="100" y2={line} />
                        </g>
                      ))}
                      {segments.map(([from, to], index) => (
                        <motion.line
                          key={`${index}-${done}`}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="currentColor"
                          strokeWidth={done ? 1.4 : 0.7}
                          strokeLinecap="round"
                          className={error ? "text-foreground/30" : "text-brass"}
                          style={done ? { filter: "drop-shadow(0 0 2px oklch(0.78 0.13 78 / 0.9))" } : undefined}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: done ? 0.4 : 0.25, delay: done ? index * 0.1 : 0 }}
                        />
                      ))}
                      {last && cursor && !done && (
                        <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1" className="text-brass/70" />
                      )}
                    </svg>

                    {nodes.map((node) => {
                      const active = node.word !== null && path.includes(node.word)
                      const fade = done && node.word === null
                      return (
                        <motion.div
                          key={node.id}
                          className="absolute aspect-square w-[8%] -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${node.point.x}%`, top: `${node.point.y}%` }}
                          animate={{ opacity: fade ? 0 : 1, scale: fade ? 0.6 : 1 }}
                          transition={{ duration: 0.8, delay: fade ? 0.4 : 0 }}
                        >
                          <button
                            type="button"
                            tabIndex={fade ? -1 : 0}
                            onClick={(event) => event.detail === 0 && select(node)}
                            aria-pressed={active}
                            aria-label={node.kind}
                            className={`flex size-full items-center justify-center rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              active
                                ? "border-brass bg-brass text-primary-foreground"
                                : error
                                  ? "border-foreground/20 bg-background text-foreground/30"
                                  : "border-foreground/25 bg-background text-brass hover:border-brass"
                            }`}
                          >
                            <HuntSymbol kind={node.kind} className="size-[58%]" />
                          </button>
                          {active && node.word !== null && (
                            <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-serif text-xs italic text-brass md:text-sm">
                              {copy.fragments[node.word]}
                            </span>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>

                  <p className="min-h-6 font-sans text-sm text-muted-foreground" aria-live="polite">
                    {error ? copy.wrong : done ? copy.right : path.length === 0 ? copy.chartHint : `${path.length}/${COUNT}`}
                  </p>
                </div>

                <aside className="flex w-full max-w-md flex-col gap-6 lg:w-80">
                  <section className="flex flex-col gap-3">
                    <h3 className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">{copy.yourSymbols}</h3>
                    <ul className="grid grid-cols-7 gap-1">
                      {CLUE_IDS.map((id) => (
                        <li key={id} className="flex aspect-square items-center justify-center rounded-sm border border-brass/60 text-brass">
                          <HuntSymbol kind={SYMBOL_OF[id]} className="size-4" />
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
                    <h3 className="flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.3em] text-brass">
                      <BookOpen className="size-3.5" aria-hidden="true" />
                      {copy.dictionary}
                    </h3>
                    <p className="font-serif text-sm italic text-muted-foreground">{copy.dictionaryNote}</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {dictionary.map((entry) => (
                        <div key={entry.kind} className="flex items-center gap-3 border-b border-border/60 py-1.5">
                          <dt className="text-foreground/80">
                            <HuntSymbol kind={entry.kind} className="size-4" />
                            <span className="sr-only">{entry.kind}</span>
                          </dt>
                          <dd className="font-serif text-sm text-foreground">{entry.word}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </aside>
              </div>
            </motion.div>
          ) : (
            <RevealFile key="file" />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function RevealFile() {
  const { copy } = useClues()
  const [copied, setCopied] = useState(false)
  const subject = encodeURIComponent(`${copy.secretSubject} ${copy.secretCode}`)

  return (
    <motion.article
      className="flex w-full max-w-xl flex-col items-center gap-6 rounded-sm border border-brass/40 bg-card px-6 py-10 text-center md:px-12"
      initial={{ opacity: 0, y: 30, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, ease: EASE }}
    >
      <p className="font-sans text-xs uppercase tracking-[0.35em] text-brass">{copy.secretEyebrow}</p>
      <h2 className="font-serif text-3xl text-foreground text-balance md:text-4xl">{copy.secretTitle}</h2>
      <p className="font-serif text-xl italic text-brass text-balance">{copy.fragments.join(" ")}</p>
      <p className="max-w-md font-sans text-base leading-relaxed text-foreground/80 text-pretty">{copy.secretBody}</p>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{copy.secretCodeLabel}</span>
        <div className="flex items-stretch overflow-hidden rounded-sm border border-brass">
          <motion.span
            className="flex flex-1 items-center justify-center py-4 font-mono text-xl tracking-[0.3em] text-brass md:text-2xl"
            initial={{ letterSpacing: "1em", opacity: 0 }}
            animate={{ letterSpacing: "0.3em", opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
          >
            {copy.secretCode}
          </motion.span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(copy.secretCode)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            }}
            className="flex items-center gap-2 border-l border-brass bg-brass px-4 font-sans text-xs font-medium text-primary-foreground"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? copy.copied : copy.copyCode}
          </button>
        </div>
      </div>

      <a
        href={`mailto:${LANDING_CONTACT.email}?subject=${subject}`}
        className="flex items-center gap-2 font-sans text-sm text-foreground underline decoration-brass underline-offset-4 hover:text-brass"
      >
        <Mail className="size-4" aria-hidden="true" />
        {copy.secretSend} {LANDING_CONTACT.email}
      </a>
    </motion.article>
  )
}

export function ClueReward() {
  return CLUES_ENABLED ? <ClueRewardPanel /> : null
}

function ClueRewardPanel() {
  const { found, solved, copy, openChart } = useClues()
  const remaining = COUNT - found.length

  if (remaining > 0) {
    return <p className="font-sans text-sm text-muted-foreground">{copy.remaining.replace("{n}", String(remaining))}</p>
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.4 }}
    >
      {solved && <p className="font-serif text-2xl italic text-brass text-balance md:text-3xl">{copy.fragments.join(" ")}</p>}
      <button
        type="button"
        onClick={openChart}
        className="flex items-center gap-2 rounded-full border border-brass px-5 py-2 font-sans text-sm text-brass transition-colors hover:bg-brass hover:text-primary-foreground"
      >
        <Compass className="size-4" aria-hidden="true" />
        {solved ? copy.reopen : copy.openChart}
      </button>
    </motion.div>
  )
}
