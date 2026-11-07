"use client"

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion"
import { Minus, Pause, Plus, RotateCcw, ScrollText, Undo2, Volume2, X, ZoomIn } from "lucide-react"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { EASE } from "./palette"

const INK = "#1f1207"
const RED = "#7a1a12"
const LINE = "#6e2a17"
const INKED = "[filter:url(#ci-ink-bleed)]"

type Segment = string | { mark: string }

const RIDDLE: Segment[][] = [
  ["Δύο φρουροί σφράγισαν το μυστικό."],
  ["Ο πρώτος ακολούθησε ", { mark: "επτά" }, " βήματα προς την πύλη."],
  ["Ο δεύτερος ακολούθησε τα ", { mark: "ίδια ίχνη" }, " για να επιστρέψει."],
  ["Κανείς τους δεν παρέλειψε βήμα."],
  ["Και οι δύο κράτησαν το ίδιο όνομα."],
  ["Όμως όποιος ακολούθησε μόνο τον έναν,"],
  ["έμεινε για πάντα έξω."],
]

/** Positions of the guards, stones and ground inside the original artwork, so the scene stays exact. */
const STONE_X = [346, 424, 496, 566, 639, 712, 786]
const SCENE = { x: 150, y: 672, w: 935, h: 430 }
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`

function InkFilter() {
  return (
    <svg aria-hidden="true" className="absolute size-0">
      <filter id="ci-ink-bleed">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.3" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

function Corner({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={`absolute size-10 sm:size-14 ${className}`} fill="none" stroke={LINE} strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 52V26C3 12 12 3 26 3h22" />
      <path d="M26 3c-6 7-4 15 4 15 6 0 6-8 0-8" />
      <path d="M3 26c7-6 15-4 15 4 0 6-8 6-8 0" />
      <path d="M12 12c6 4 10 10 12 16" opacity="0.7" />
      <circle cx="52" cy="3" r="1.8" fill={LINE} stroke="none" />
      <circle cx="3" cy="56" r="1.8" fill={LINE} stroke="none" />
    </svg>
  )
}

function TowerEmblem() {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 64" className="h-9 w-full max-w-[12rem] sm:h-12 sm:max-w-[15rem]" fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 58H214" strokeWidth="1.5" />
      <path d="M26 58c-7 0-9-8-3-10 4-1 6 3 3 5" strokeWidth="1.5" />
      <path d="M214 58c7 0 9-8 3-10-4-1-6 3-3 5" strokeWidth="1.5" />
      <path d="M58 58c4-5 10-6 14-2M182 58c-4-5-10-6-14-2" strokeWidth="1.5" />
      <path d="M46 58l3-3 3 3-3 3zM188 58l3-3 3 3-3 3z" fill={INK} strokeWidth="1" />
      <path d="M104 22V8h6v6h6V8h8v6h6V8h6v14" />
      <path d="M106 22h28v36h-28z" />
      <path d="M116 58V48a4 4 0 0 1 8 0v10" fill={INK} />
      <path d="M118 30h4v7h-4z" fill={INK} strokeWidth="1" />
    </svg>
  )
}

function CrossDivider() {
  return (
    <div aria-hidden="true" className="flex w-full max-w-xs items-center gap-2">
      <span className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${INK})` }} />
      <span className="size-1.5 rotate-45" style={{ background: INK }} />
      <svg viewBox="0 0 24 24" className="size-5 sm:size-7" fill={INK}>
        <path d="M9 1h6l-2 9 10-1v6l-10-1 2 9H9l2-9-10 1V9l10 1z" />
      </svg>
      <span className="size-1.5 rotate-45" style={{ background: INK }} />
      <span className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${INK})` }} />
    </div>
  )
}

function FleurDivider() {
  return (
    <div aria-hidden="true" className="flex w-full items-center gap-2">
      <span className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${LINE})` }} />
      <svg viewBox="0 0 40 48" className="h-8 w-7 sm:h-10 sm:w-9" fill={LINE}>
        <path d="M20 2c6 8 6 18 0 28-6-10-6-20 0-28z" />
        <path d="M18 29C10 31 2 25 4 17c2-6 9-4 8 2-1 4 3 6 6 4z" />
        <path d="M22 29c8 2 16-4 14-12-2-6-9-4-8 2 1 4-3 6-6 4z" />
        <rect x="10" y="29" width="20" height="4" rx="1" />
        <path d="M20 33l-5 13 5-4 5 4z" />
      </svg>
      <span className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${LINE})` }} />
    </div>
  )
}

const FADE =
  "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent), linear-gradient(to bottom, transparent, #000 6%, #000 92%, transparent)"
const fade = (mask: string): CSSProperties => ({
  maskImage: mask,
  WebkitMaskImage: mask,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
})

/** Makes the colour guards read as painted onto the parchment: muted pigment, soft feet, paper showing through. */
const PAINTED: CSSProperties = {
  mixBlendMode: "multiply",
  filter: "sepia(0.7) saturate(0.6) contrast(1.02) brightness(1.12)",
  opacity: 0.8,
  maskImage: "linear-gradient(to bottom, #000 70%, rgba(0,0,0,0.5) 88%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, #000 70%, rgba(0,0,0,0.5) 88%, transparent 100%)",
}

function GuardScene({ show, reduce, base }: { show: boolean; reduce: boolean; base: number }) {
  const at = (x: number, y: number, w: number, h: number): CSSProperties => ({
    left: pct(x - SCENE.x, SCENE.w),
    top: pct(y - SCENE.y, SCENE.h),
    width: pct(w, SCENE.w),
    height: pct(h, SCENE.h),
  })
  return (
    <div
      role="img"
      aria-label="Δύο φρουροί στέκονται αντικριστά, με επτά πέτρινα βήματα ανάμεσά τους. Από τη ζώνη του καθενός κρέμεται ένα κλειδί."
      className="relative w-full"
      style={{ aspectRatio: `${SCENE.w} / ${SCENE.h}` }}
    >
      <img src="/carnival/scroll-ground.webp" alt="" draggable={false} className="absolute" style={{ ...at(360, 974, 520, 103), ...fade(FADE) }} />
      {STONE_X.map((x, i) => (
        <img
          key={x}
          src={`/carnival/scroll-stone-${i + 1}.webp`}
          alt=""
          draggable={false}
          className="absolute"
          style={{ ...at(x, 914, 78, 58), ...fade("radial-gradient(ellipse 50% 50% at 50% 52%, #000 66%, transparent 100%)") }}
        />
      ))}
      <img src="/carnival/scroll-guard-b.webp" alt="" draggable={false} className="absolute" style={{ ...at(150, 672, 209, 430), ...PAINTED }} />
      <img src="/carnival/scroll-guard-p.webp" alt="" draggable={false} className="absolute" style={{ ...at(889, 672, 196, 430), ...PAINTED }} />
    </div>
  )
}

function Line({ parts }: { parts: Segment[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <span key={i} className="font-bold" style={{ color: RED }}>
            {p.mark}
          </span>
        ),
      )}
    </>
  )
}

/** Ink is already on the paper: no entrance animation, the unroll reveals it. */
function Reveal({ children, className }: { i: number; open: boolean; variants: Variants; children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

function RolledScroll({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      key="rolled"
      initial={reduce ? false : { opacity: 0, scaleY: 0.6, y: -20 }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.55, scaleX: 1.04, transition: { duration: 0.45, ease: EASE } }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative mx-auto w-full max-w-[36rem] origin-top"
    >
      <motion.div
        className="relative"
        animate={reduce ? { rotate: 0, y: 0 } : { rotate: [-0.6, 0.6, -0.6], y: [0, -4, 0] }}
        transition={reduce ? { duration: 0.2 } : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src="/carnival/scroll-rolled-seal.webp"
          alt="Ένας παλιός πάπυρος, τυλιγμένος και δεμένος με σπάγκο, σφραγισμένος με κόκκινο κερί που φέρει το σήμα του The Hunt."
          width={1400}
          height={463}
          draggable={false}
          className="h-auto w-full select-none [filter:drop-shadow(0_18px_22px_rgba(0,0,0,0.75))]"
        />
      </motion.div>
    </motion.div>
  )
}

function SheetBody({ open, reduce, base, id }: { open: boolean; reduce: boolean; base: number; id?: string }) {
  const item: Variants = {
    hidden: { opacity: 0, filter: "blur(3px)" },
    shown: (i: number) => ({
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: reduce ? 0 : 1, delay: reduce ? 0 : base + i * 0.14, ease: EASE },
    }),
  }
  const shared = { open, variants: item }

  return (
    <div id={id} className="relative isolate bg-[url('/carnival/scroll-sheet.webp')] bg-[length:100%_100%] bg-no-repeat" style={{ aspectRatio: "707 / 1000" }}>
      <div className="relative flex flex-col items-center px-[12%] pb-[10%] pt-[11%] text-center mix-blend-multiply">
        <span aria-hidden="true" className={`pointer-events-none absolute inset-x-[7%] inset-y-[5%] ${INKED}`}>
          <Corner className="left-0 top-0" />
          <Corner className="right-0 top-0 -scale-x-100" />
          <Corner className="bottom-0 left-0 -scale-y-100" />
          <Corner className="bottom-0 right-0 -scale-100" />
        </span>

        <Reveal {...shared} i={0} className={`flex w-full justify-center ${INKED}`}>
          <TowerEmblem />
        </Reveal>

        <Reveal {...shared} i={1} className={`mt-2 sm:mt-4 ${INKED}`}>
          <h3 className="text-balance font-serif text-[1.75rem] font-bold italic leading-tight sm:text-[2.6rem]" style={{ color: RED }}>
            Η Πύλη των Δύο Φρουρών
          </h3>
        </Reveal>

        <Reveal {...shared} i={2} className={`mt-2.5 flex w-full justify-center sm:mt-4 ${INKED}`}>
          <CrossDivider />
        </Reveal>

        <div className={`mt-3 flex flex-col gap-0.5 font-serif text-[15px] font-bold italic leading-snug sm:mt-5 sm:gap-1.5 sm:text-xl ${INKED}`} style={{ color: INK }}>
          {RIDDLE.map((parts, i) => (
            <Reveal key={i} {...shared} i={3 + i}>
              <p className="text-balance">
                <Line parts={parts} />
              </p>
            </Reveal>
          ))}
        </div>

        <div className="-mx-[11%] mt-2 w-[122%] sm:mt-3">
          <GuardScene show={open} reduce={reduce} base={base + 0.4 + RIDDLE.length * 0.14} />
        </div>

        <Reveal {...shared} i={5 + RIDDLE.length + 7} className={`-mt-1 w-full ${INKED}`}>
          <FleurDivider />
        </Reveal>
      </div>
    </div>
  )
}

function OpenSheet({ reduce, base, onZoom }: { reduce: boolean; base: number; onZoom: () => void }) {
  const unroll = reduce ? 0 : 1.7
  return (
    <motion.div
      key="sheet"
      initial={reduce ? false : { clipPath: "inset(0% 0% 100% 0%)", rotateX: 18, opacity: 0.6 }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", rotateX: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)", opacity: 0.7, transition: { duration: 0.9, ease: EASE } }}
      transition={{ duration: unroll, ease: EASE }}
      style={{ transformPerspective: 1200, transformOrigin: "50% 0%" }}
      className="relative mx-auto w-full max-w-[38rem] [filter:drop-shadow(0_22px_28px_rgba(0,0,0,0.75))]"
    >
      <div onClick={onZoom} data-track="carnival-scroll-zoom-sheet" className="cursor-zoom-in">
        <SheetBody open reduce={reduce} base={base} id="ci-guard-scroll" />
      </div>
      <button
        type="button"
        onClick={onZoom}
        aria-label="Άνοιξε τον πάπυρο σε μεγέθυνση"
        data-track="carnival-scroll-zoom"
        className="absolute right-[6%] top-[4%] grid size-10 place-items-center rounded-full bg-[var(--ci-night)]/75 text-[var(--ci-cream)] backdrop-blur-sm transition hover:bg-[var(--ci-night)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </button>

      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[2%] h-10 rounded-[50%] bg-[url('/carnival/scroll-sheet.webp')] bg-[length:100%_2400%] bg-bottom brightness-75 [box-shadow:0_10px_18px_-6px_rgba(0,0,0,0.8),inset_0_-8px_12px_rgba(40,18,4,0.6),inset_0_6px_8px_rgba(255,230,190,0.25)]"
          initial={{ top: "0%", opacity: 1 }}
          animate={{ top: "100%", opacity: [1, 1, 0] }}
          transition={{ duration: unroll, ease: EASE, opacity: { duration: unroll, times: [0, 0.85, 1] } }}
          style={{ translateY: "-60%" }}
        />
      )}
    </motion.div>
  )
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5

function ZoomViewer({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; s: number; x: number; y: number; mx: number; my: number } | null>(null)
  const lastTap = useRef(0)
  const moved = useRef(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  const clamp = (s: number, x: number, y: number) => {
    const stage = stageRef.current?.getBoundingClientRect()
    const sheet = sheetRef.current
    if (!stage || !sheet) return { s, x, y }
    const maxX = Math.max(0, (sheet.offsetWidth * s - stage.width) / 2) + 24
    const maxY = Math.max(0, (sheet.offsetHeight * s - stage.height) / 2) + 24
    return { s, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }

  /** Zoom keeping the point (px, py), relative to the stage centre, fixed on screen. */
  const zoomAt = (next: number, px: number, py: number, from = view) => {
    const s = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
    const k = s / from.s
    return clamp(s, px - (px - from.x) * k, py - (py - from.y) * k)
  }

  const centre = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { px: clientX - r.left - r.width / 2, py: clientY - r.top - r.height / 2 }
  }

  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = "hidden"
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "+" || e.key === "=") setView((v) => zoomAt(v.s * 1.4, 0, 0, v))
      if (e.key === "-") setView((v) => zoomAt(v.s / 1.4, 0, 0, v))
    }
    const stage = stageRef.current
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { px, py } = centre(e.clientX, e.clientY)
      setView((v) => (e.ctrlKey || Math.abs(e.deltaY) > 0 ? zoomAt(v.s * Math.exp(-e.deltaY * 0.0018), px, py, v) : v))
    }
    window.addEventListener("keydown", onKey)
    stage?.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      root.style.overflow = prev
      window.removeEventListener("keydown", onKey)
      stage?.removeEventListener("wheel", onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGesture = () => {
    const pts = [...pointers.current.values()]
    if (pts.length === 0) return (gesture.current = null)
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { dist, s: view.s, x: view.x, y: view.y, mx, my }
  }

  const onDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    startGesture()
  }

  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const pts = [...pointers.current.values()]
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length
    if (Math.hypot(mx - g.mx, my - g.my) > 4) moved.current = true
    if (pts.length > 1 && g.dist > 0) {
      moved.current = true
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const { px, py } = centre(g.mx, g.my)
      const zoomed = zoomAt(g.s * (dist / g.dist), px, py, { s: g.s, x: g.x, y: g.y })
      setView(clamp(zoomed.s, zoomed.x + (mx - g.mx), zoomed.y + (my - g.my)))
    } else {
      setView(clamp(g.s, g.x + (mx - g.mx), g.y + (my - g.my)))
    }
  }

  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (!moved.current && pointers.current.size === 0) {
      const now = performance.now()
      if (now - lastTap.current < 320) {
        const { px, py } = centre(e.clientX, e.clientY)
        setView((v) => (v.s > 1.5 ? clamp(1, 0, 0) : zoomAt(2.6, px, py, v)))
        lastTap.current = 0
      } else lastTap.current = now
    }
    startGesture()
  }

  const step = (factor: number) => setView((v) => zoomAt(v.s * factor, 0, 0, v))

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Ο πάπυρος σε μεγέθυνση"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex flex-col bg-[#0b0806]/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#f3e6cc]/60">
          <span className="hidden sm:inline">Κύλισε ή πάτα δύο φορές για μεγέθυνση</span>
          <span className="sm:hidden">Τσίμπησε ή πάτα δύο φορές</span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο μεγέθυνσης"
          data-track="carnival-scroll-zoom-close"
          className="grid size-11 place-items-center rounded-full bg-[#f3e6cc]/10 text-[#f3e6cc] transition hover:bg-[#f3e6cc]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b54a]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden ${view.s > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
      >
        <div
          ref={sheetRef}
          className="w-[min(94vw,40rem)] shrink-0 [filter:drop-shadow(0_22px_28px_rgba(0,0,0,0.75))]"
          style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})` }}
        >
          <SheetBody open reduce base={0} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 px-4 pb-5 pt-3">
        <ZoomButton label="Σμίκρυνση" onClick={() => step(1 / 1.4)} disabled={view.s <= MIN_ZOOM}>
          <Minus className="size-5" aria-hidden="true" />
        </ZoomButton>
        <span className="w-14 text-center font-sans text-sm tabular-nums text-[#f3e6cc]/80" aria-live="polite">
          {Math.round(view.s * 100)}%
        </span>
        <ZoomButton label="Μεγέθυνση" onClick={() => step(1.4)} disabled={view.s >= MAX_ZOOM}>
          <Plus className="size-5" aria-hidden="true" />
        </ZoomButton>
        <ZoomButton label="Επαναφορά" onClick={() => setView({ s: 1, x: 0, y: 0 })} disabled={view.s === 1 && view.x === 0 && view.y === 0}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </ZoomButton>
      </div>
    </motion.div>,
    document.body,
  )
}

function ZoomButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full bg-[#f3e6cc]/10 text-[#f3e6cc] transition hover:bg-[#f3e6cc]/20 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b54a]"
    >
      {children}
    </button>
  )
}

export function GuardScroll() {
  const reduce = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(false)
  const base = reduce ? 0 : 1.2

  const openScroll = () => {
    track(EV.carnivalScroll, { action: "open" })
    setOpen(true)
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [narrating, setNarrating] = useState(false)

  useEffect(() => () => audioRef.current?.pause(), [])

  const stopNarration = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setNarrating(false)
  }

  const toggleNarration = () => {
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio("/carnival/scroll-narration.mp3")
      audio.preload = "auto"
      audio.addEventListener("ended", () => {
        setNarrating(false)
        track(EV.carnivalScroll, { action: "narrate_end" })
      })
      audioRef.current = audio
    }
    if (audio.paused) {
      audio.play().then(
        () => setNarrating(true),
        () => setNarrating(false),
      )
      track(EV.carnivalScroll, { action: "narrate_play", from: Math.round(audio.currentTime) })
    } else {
      audio.pause()
      setNarrating(false)
      track(EV.carnivalScroll, { action: "narrate_pause", at: Math.round(audio.currentTime) })
    }
  }

  const closeScroll = () => {
    stopNarration()
    setOpen(false)
    track(EV.carnivalScroll, { action: "close" })
  }

  const openZoom = () => {
    setZoom(true)
    track(EV.carnivalScroll, { action: "zoom" })
  }

  return (
    <div className="relative w-full">
      <InkFilter />
      <AnimatePresence mode="wait" initial={false}>
        {open ? <OpenSheet key="sheet" reduce={reduce} base={base} onZoom={openZoom} /> : <RolledScroll key="rolled" reduce={reduce} />}
      </AnimatePresence>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8">
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : base + 3.4, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={toggleNarration}
              aria-pressed={narrating}
              data-track="carnival-scroll-narrate"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-b from-[#f2cf7a] to-[var(--ci-gold)] px-5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--ci-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
            >
              {narrating ? <Pause className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
              {narrating ? "Παύση" : "Άκου τον πάπυρο"}
            </button>
            <button
              type="button"
              onClick={openZoom}
              data-track="carnival-scroll-zoom"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--ci-gold)]/50 px-5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--ci-gold)] transition hover:bg-[var(--ci-gold)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
              Μεγέθυνση
            </button>
            <button
              type="button"
              onClick={closeScroll}
              aria-controls="ci-guard-scroll"
              aria-expanded={open}
              data-track="carnival-scroll-close"
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--ci-cream)]/60 transition hover:text-[var(--ci-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Τύλιξε τον πάπυρο
            </button>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            onClick={openScroll}
            aria-controls="ci-guard-scroll"
            aria-expanded={open}
              data-track="carnival-scroll-open"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
            whileTap={{ scale: 0.97 }}
            className="relative inline-flex h-14 items-center gap-3 rounded-full bg-gradient-to-b from-[#f2cf7a] to-[var(--ci-gold)] px-7 font-sans text-sm font-bold uppercase tracking-[0.18em] text-[var(--ci-night)] shadow-[0_0_40px_-8px_var(--ci-gold)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
          >
              {!reduce && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[var(--ci-gold)]/25 [animation-duration:2.4s]" />}
              <ScrollText className="relative size-5" aria-hidden="true" />
              <span className="relative">Άνοιξε τον πάπυρο</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>{zoom && <ZoomViewer key="zoom" onClose={() => setZoom(false)} />}</AnimatePresence>
    </div>
  )
}
