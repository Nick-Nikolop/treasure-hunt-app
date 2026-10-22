"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Flashlight, FlashlightOff, Lightbulb, Minus, NotebookPen, Plus, Scan, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"
import { createPortal } from "react-dom"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { UV_COMPASS, UV_MARKS } from "@/lib/carnival-intro/poster"
import { cn } from "@/lib/utils"
import { Notebook } from "./notebook"
import { EASE, PALETTE } from "./palette"

export const POSTER_SRC = "/carnival/poster.webp"
const ASPECT = 0.4
const PAD = 28
const Z_MIN = 1
const Z_MAX = 8
const COMPASS_INDEX = UV_MARKS.length

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/** Fluorescent ink: near-white core with a cyan-blue bloom, the way UV marker glows under a 395nm torch. */
const INK_GLOW =
  "0 0 1px #ffffff, 0 0 4px rgba(170,240,255,0.95), 0 0 10px rgba(90,200,255,0.8), 0 0 22px rgba(60,140,255,0.7), 0 0 40px rgba(60,120,255,0.35)"

/** One static filter on the single poster image: cheap on phones (no masks, blend layers or per-frame repaints). */
const UV_FILTER = "grayscale(1) brightness(0.42) contrast(1.3) sepia(1) hue-rotate(215deg) saturate(3.2)"

function UvCompass() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" className="size-full" aria-hidden="true">
      <circle cx="32" cy="34" r="22" strokeWidth="2.2" />
      <circle cx="32" cy="34" r="2.4" fill="currentColor" stroke="none" />
      <path d="M32 9v5M32 54v5M7 34h5M52 34h5" strokeWidth="2.2" />
      <path d="M32 34 46 20" strokeWidth="3" />
      <path d="M40 19.5 47 19l-.5 7" strokeWidth="3" strokeLinejoin="round" />
      <text x="32" y="7.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none" fontFamily="sans-serif">
        N
      </text>
    </svg>
  )
}

function UvInk() {
  return (
    <div className="absolute inset-0">
      {UV_MARKS.map((m) => (
        <span
          key={m.code}
          className="absolute whitespace-nowrap font-serif font-bold italic leading-none text-[#e6fbff]"
          style={{
            left: `${m.x * 100}%`,
            top: `${m.y * 100}%`,
            fontSize: `${m.size}cqw`,
            opacity: m.ink,
            transform: `translate(-50%, -50%) rotate(${m.rot}deg)`,
            textShadow: INK_GLOW,
          }}
        >
          {m.code}
        </span>
      ))}
      <span
        className="absolute text-[#e6fbff]"
        style={{
          left: `${UV_COMPASS.x * 100}%`,
          top: `${UV_COMPASS.y * 100}%`,
          width: `${UV_COMPASS.size}cqw`,
          height: `${UV_COMPASS.size}cqw`,
          transform: `translate(-50%, -50%) rotate(${UV_COMPASS.rot}deg)`,
          filter: "drop-shadow(0 0 1px #fff) drop-shadow(0 0 4px rgba(170,240,255,0.95)) drop-shadow(0 0 12px rgba(70,160,255,0.7))",
        }}
      >
        <UvCompass />
      </span>
    </div>
  )
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
  className,
  pressed,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "grid size-11 place-items-center rounded-full text-[var(--ci-cream)]/80 transition hover:bg-[var(--ci-cream)]/10 hover:text-[var(--ci-cream)] disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function PosterViewer({
  found,
  onFound,
  notes,
  onNotes,
  onClose,
}: {
  found: number[]
  onFound: (index: number) => void
  notes: string
  onNotes: (v: string) => void
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  const size = useRef({ w: 0, h: 0 })
  const target = useRef({ x: 0.5, y: 0.35 })
  const cur = useRef({ x: 0.5, y: 0.35 })
  const zoom = useRef(Z_MIN)
  const zoomCur = useRef(Z_MIN)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; z: number } | null>(null)
  const miniRef = useRef<HTMLSpanElement>(null)
  const miniShown = useRef(false)
  const [tipOpen, setTipOpen] = useState(false)
  const tipReopened = useRef(false)
  const reported = useRef(new Set(found))
  const onFoundRef = useRef(onFound)
  onFoundRef.current = onFound

  const [uv, setUv] = useState(false)
  const uvRef = useRef(false)
  uvRef.current = uv
  const uvUsed = useRef(false)
  const [uvSeen, setUvSeen] = useState(false)
  const maxZoom = useRef(Z_MIN)
  const [zoomUi, setZoomUi] = useState(Z_MIN)
  const [notesOpen, setNotesOpen] = useState(false)
  const [touch, setTouch] = useState(false)
  const openedAt = useRef(0)

  const layout = (z: number) => {
    const { w: sw, h: sh } = size.current
    let h0 = sh - PAD * 2
    let w0 = h0 * ASPECT
    if (w0 > sw - PAD * 2) {
      w0 = sw - PAD * 2
      h0 = w0 / ASPECT
    }
    return { sw, sh, W: w0 * z, H: h0 * z }
  }

  const offset = (view: number, len: number, p: number) => (len <= view - PAD * 2 ? (view - len) / 2 : PAD + (view - PAD * 2 - len) * p)

  const focusFromScreen = (clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const { sw, sh, W, H } = layout(zoom.current)
    const x = clientX - rect.left
    const y = clientY - rect.top
    const inv = (pos: number, view: number, len: number) =>
      len <= view - PAD * 2 ? (pos - (view - len) / 2) / len : (pos - PAD) / (view - PAD * 2)
    target.current = { x: clamp(inv(x, sw, W)), y: clamp(inv(y, sh, H)) }
  }

  const setZoom = (z: number) => {
    const next = clamp(z, Z_MIN, Z_MAX)
    zoom.current = next
    maxZoom.current = Math.max(maxZoom.current, next)
    setZoomUi(next)
  }

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches)
    openedAt.current = performance.now()
    document.documentElement.style.overflow = "hidden"
    track(EV.carnivalPosterOpen, { fullscreen: false })
    return () => {
      document.documentElement.style.overflow = ""
      track(
        EV.carnivalPosterClose,
        { uv: uvUsed.current, zoomed: maxZoom.current > 1.2 },
        { durationMs: Math.round(performance.now() - openedAt.current) },
      )
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const r = stage.getBoundingClientRect()
      size.current = { w: r.width, h: r.height }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(zoom.current * Math.exp(-e.deltaY * 0.0018))
      focusFromScreen(e.clientX, e.clientY)
    }
    stage.addEventListener("wheel", onWheel, { passive: false })
    const onMouseMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return
      focusFromScreen(e.clientX, e.clientY)
    }
    window.addEventListener("pointermove", onMouseMove, { passive: true })

    let raf = 0
    const tick = () => {
      const k = reduce ? 1 : 0.22
      cur.current.x += (target.current.x - cur.current.x) * k
      cur.current.y += (target.current.y - cur.current.y) * k
      zoomCur.current += (zoom.current - zoomCur.current) * (reduce ? 1 : 0.2)
      paint()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      stage.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointermove", onMouseMove)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const last = useRef({ W: 0, H: 0, left: NaN, top: NaN })

  const paint = () => {
    const el = posterRef.current
    if (!el) return
    const { sw, sh, W, H } = layout(zoomCur.current)
    if (W <= 0 || H <= 0) return
    const p = cur.current
    const left = offset(sw, W, p.x)
    const top = offset(sh, H, p.y)
    const prev = last.current
    // Skip style writes when the camera is at rest, so an idle poster costs nothing per frame.
    if (Math.abs(prev.W - W) < 0.1 && Math.abs(prev.H - H) < 0.1 && Math.abs(prev.left - left) < 0.1 && Math.abs(prev.top - top) < 0.1) return
    last.current = { W, H, left, top }
    el.style.width = `${W}px`
    el.style.height = `${H}px`
    el.style.transform = `translate3d(${left}px, ${top}px, 0)`
    const mini = miniRef.current
    if (mini) {
      const vw = Math.min(1, sw / W)
      const vh = Math.min(1, sh / H)
      mini.style.left = `${clamp(-left / W, 0, 1 - vw) * 100}%`
      mini.style.top = `${clamp(-top / H, 0, 1 - vh) * 100}%`
      mini.style.width = `${vw * 100}%`
      mini.style.height = `${vh * 100}%`
    }
  }

  // The UV light now covers the whole poster, so switching it on reveals every mark at once.
  useEffect(() => {
    if (!uv) return
    for (let i = 0; i <= COMPASS_INDEX; i++) {
      if (reported.current.has(i)) continue
      reported.current.add(i)
      onFoundRef.current(i)
    }
  }, [uv])

  const toggleUv = () => {
    const next = !uvRef.current
    const first = next && !uvUsed.current
    setUv(next)
    if (next) uvUsed.current = true
    // The tip ("you may not need UV for everything") only makes sense once they've seen the UV view.
    if (first) {
      setUvSeen(true)
      setTipOpen(true)
    }
    track(EV.carnivalUv, { on: next, first })
  }

  const openNotes = () => {
    setNotesOpen(true)
    track(EV.carnivalNotesOpen, { where: "poster" })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return
      if (e.key === "Escape") {
        if (notesOpen) setNotesOpen(false)
        else onClose()
        return
      }
      if (e.key === "u" || e.key === "U" || e.key === "υ" || e.key === "Υ") {
        toggleUv()
        return
      }
      if (e.key === "+" || e.key === "=") return setZoom(zoom.current * 1.4)
      if (e.key === "-" || e.key === "_") return setZoom(zoom.current / 1.4)
      const step = e.shiftKey ? 0.12 : 0.04
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step / 2], ArrowDown: [0, step / 2] }[e.key]
      if (!d) return
      e.preventDefault()
      target.current = { x: clamp(target.current.x + d[0]), y: clamp(target.current.y + d[1]) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [notesOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Capturing on the stage would retarget the click away from overlaid controls (the close button).
    if ((e.target as HTMLElement).closest("button, a, [data-viewer-ui]")) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom.current }
      return
    }
    focusFromScreen(e.clientX, e.clientY)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      setZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d))
      focusFromScreen((a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }
    if (e.pointerType !== "touch" || !pointers.current.has(e.pointerId)) return
    focusFromScreen(e.clientX, e.clientY)
  }

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, [data-viewer-ui]")) return
    setZoom(zoom.current > 1.6 ? Z_MIN : 3)
    focusFromScreen(e.clientX, e.clientY)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  if (typeof document === "undefined") return null

  // Separate show/hide thresholds so a pinch hovering near one value doesn't make the minimap blink.
  if (zoomUi > 1.3) miniShown.current = true
  else if (zoomUi < 1.15) miniShown.current = false
  const showMini = miniShown.current

  const hint = !uvSeen
    ? "Κάτι είναι γραμμένο με αόρατο μελάνι. Άναψε το UV φως από κάτω."
    : touch
      ? "Τσίμπησε για ζουμ, σύρε για να κινηθείς, διπλό πάτημα για κοντινό"
      : "Ροδέλα για ζουμ, κίνησε το ποντίκι για να κινηθείς, διπλό κλικ για κοντινό"

  return createPortal(
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Η αφίσα σε πλήρη οθόνη"
      style={{ ...PALETTE, colorScheme: "dark" } as CSSProperties}
      className="fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-[var(--ci-night)] font-sans text-[var(--ci-cream)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: uv ? 0 : 1,
          background: "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(107,16,36,0.55) 0%, transparent 75%)",
        }}
      />

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden [contain:paint] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: uv ? 1 : 0,
            background: "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(139,92,255,0.18) 0%, rgba(139,92,255,0.05) 50%, transparent 78%)",
          }}
        />

        <div
          ref={posterRef}
          role="img"
          aria-label={uv ? "Η αφίσα κάτω από UV φως" : "Η αφίσα του The Hunt για το Καλαματιανό Καρναβάλι"}
          className="absolute left-0 top-0 overflow-hidden rounded-[2px] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(224,176,74,0.12)] will-change-transform"
          style={{ containerType: "inline-size" } as CSSProperties}
        >
          <Image
            src={POSTER_SRC}
            alt=""
            fill
            priority
            unoptimized
            draggable={false}
            className="pointer-events-none object-cover"
            style={{ filter: uv ? UV_FILTER : "none" }}
          />

          <AnimatePresence>
            {uv && (
              <motion.div
                key="uv-ink"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.4, 1, 0.85, 1] }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={reduce ? { duration: 0.2 } : { duration: 0.55, times: [0, 0.2, 0.35, 0.55, 0.75, 1] }}
              >
                <UvInk />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-[var(--ci-night)] via-[var(--ci-night)]/60 to-transparent px-4 pb-10 pt-4 sm:px-6 sm:pt-5">
          <div className="flex flex-col gap-1">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.35em] text-[var(--ci-gold)]">Η αφίσα</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={hint}
                className="font-sans text-sm text-[var(--ci-cream)]/65"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                {hint}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <AnimatePresence>
            {!tipOpen && uvSeen && (
              <motion.button
                key="tip"
                type="button"
                onClick={() => {
                  tipReopened.current = true
                  setTipOpen(true)
                  track(EV.carnivalTip, { action: "open", uv })
                }}
                data-track="carnival-tip-open"
                data-viewer-ui
                aria-label="Δες ξανά τη συμβουλή"
                className="pointer-events-auto relative z-10 inline-flex size-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--ci-gold)]/45 bg-[var(--ci-night)] font-sans text-sm font-bold text-[var(--ci-gold)] shadow-[0_10px_40px_-8px_rgba(0,0,0,0.8)] transition hover:bg-[var(--ci-gold)]/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] sm:h-14 sm:w-auto sm:px-5"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: reduce ? 0.15 : 0.35, ease: EASE }}
              >
                <Lightbulb className="size-5" aria-hidden="true" />
                <span className="hidden sm:inline">Συμβουλή</span>
              </motion.button>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={onClose}
            data-track="carnival-poster-close"
            data-viewer-ui
            aria-label="Κλείσιμο αφίσας"
            className="group/close pointer-events-auto relative z-10 inline-flex h-12 cursor-pointer items-center gap-3 rounded-full bg-[var(--ci-cream)] pl-4 pr-2 font-sans text-sm font-bold text-[var(--ci-night)] shadow-[0_10px_40px_-8px_rgba(0,0,0,0.8)] transition hover:bg-[var(--ci-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)] sm:h-14 sm:pl-5 sm:pr-2.5 sm:text-base"
          >
            <X className="size-5" aria-hidden="true" />
            <span>Κλείσιμο</span>
            <kbd className="hidden h-8 items-center rounded-full bg-[var(--ci-night)]/10 px-3 font-sans text-xs font-bold uppercase tracking-widest text-[var(--ci-night)]/70 sm:inline-flex">
              Esc
            </kbd>
          </button>
          </div>
        </div>

        <AnimatePresence>
          {tipOpen && (
            <motion.aside
              data-viewer-ui
              aria-label="Συμβουλή"
              className="pointer-events-auto absolute bottom-4 left-4 right-4 z-10 flex max-w-sm items-start gap-3 rounded-2xl border border-[var(--ci-gold)]/35 bg-[var(--ci-night)] p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] [transform:translateZ(0)] sm:right-auto"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduce || tipReopened.current ? 0 : 1.4, duration: 0.5, ease: EASE } }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ci-gold)]/15 text-[var(--ci-gold)]">
                <Lightbulb className="size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--ci-gold)]">Συμβουλή</p>
                <p className="text-pretty font-sans text-sm leading-relaxed text-[var(--ci-cream)]/85">
                  Ίσως δεν χρειάζεται να αποκαλυφθούν όλα από το <span className="font-bold text-[#b9a4ff]">UV φως</span>. Σβήσε το, κάνε ζουμ και
                  κοίτα την αφίσα από κοντά.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTipOpen(false)
                  track(EV.carnivalTip, { action: "close", uv })
                }}
                data-track="carnival-tip-close"
                aria-label="Κλείσιμο συμβουλής"
                className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-[var(--ci-cream)]/60 transition hover:bg-[var(--ci-cream)]/10 hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        <div
          data-viewer-ui
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-4 z-10 aspect-[2/5] w-14 overflow-hidden rounded-md border border-[var(--ci-cream)]/20 bg-[var(--ci-night)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] transition-all duration-300 sm:w-16",
            tipOpen ? "bottom-36 sm:bottom-4" : "bottom-4",
            showMini ? "opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <Image src={POSTER_SRC} alt="" fill sizes="64px" className="object-cover opacity-60" />
          <span ref={miniRef} className="absolute rounded-[2px] border-2 border-[var(--ci-gold)] shadow-[0_0_0_999px_rgba(14,4,10,0.45)]" />
        </div>
      </div>

      <div className="relative z-10 flex justify-center bg-[var(--ci-night)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 [transform:translateZ(0)]">
        <div className="flex items-center gap-1 rounded-full border border-[var(--ci-cream)]/12 bg-[var(--ci-night)] p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]">
          <ToolButton label="Σμίκρυνση" onClick={() => setZoom(zoom.current / 1.5)} disabled={zoomUi <= Z_MIN + 0.01}>
            <Minus className="size-5" aria-hidden="true" />
          </ToolButton>
          <input
            type="range"
            min={Z_MIN}
            max={Z_MAX}
            step={0.1}
            value={zoomUi}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Επίπεδο ζουμ"
            className="hidden h-1 w-28 cursor-pointer accent-[var(--ci-gold)] sm:block"
          />
          <span className="w-9 text-center font-sans text-xs font-bold tabular-nums sm:w-11 text-[var(--ci-cream)]/60" aria-live="polite">
            {zoomUi.toFixed(1)}×
          </span>
          <ToolButton label="Μεγέθυνση" onClick={() => setZoom(zoom.current * 1.5)} disabled={zoomUi >= Z_MAX - 0.01}>
            <Plus className="size-5" aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Ολόκληρη η αφίσα" onClick={() => setZoom(Z_MIN)} disabled={zoomUi <= Z_MIN + 0.01}>
            <Scan className="size-5" aria-hidden="true" />
          </ToolButton>

          <span aria-hidden="true" className="mx-1 h-7 w-px bg-[var(--ci-cream)]/12" />

          <button
            type="button"
            onClick={toggleUv}
            aria-pressed={uv}
            aria-label={uv ? "UV φως: ανοιχτό. Πάτα για να το σβήσεις" : "UV φως: κλειστό. Πάτα για να το ανάψεις"}
            data-track={uv ? "carnival-uv-off" : "carnival-uv-on"}
            className={cn(
              "relative inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 font-sans text-sm font-bold transition sm:gap-2.5 sm:px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]",
              uv
                ? "bg-[var(--ci-uv)] text-[var(--ci-cream)] shadow-[0_0_30px_-2px_var(--ci-uv)]"
                : "bg-[var(--ci-gold)] text-[var(--ci-night)] hover:brightness-110",
            )}
          >
            {!uvSeen && !reduce && (
              <span aria-hidden="true" className="absolute -inset-1.5 animate-ping rounded-full ring-2 ring-[var(--ci-gold)]/70 [animation-duration:1.8s]" />
            )}
            <AnimatePresence>
              {!uvSeen && (
                <motion.span
                  key="uv-cta"
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-4 flex -translate-x-1/2 flex-col items-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: reduce ? 0 : 0.9, duration: 0.5, ease: EASE } }}
                  exit={{ opacity: 0, y: 6, transition: { duration: 0.2 } }}
                >
                  <motion.span
                    className="flex flex-col items-center"
                    animate={reduce ? undefined : { y: [0, -6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--ci-uv)] px-4 py-2.5 font-sans text-sm font-bold text-[var(--ci-cream)] shadow-[0_0_36px_-4px_var(--ci-uv)]">
                      <Flashlight className="size-4" aria-hidden="true" />
                      Άναψε το UV φως
                    </span>
                    <span className="-mt-1.5 size-3 rotate-45 bg-[var(--ci-uv)]" />
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
            {uv ? <FlashlightOff className="relative size-5" aria-hidden="true" /> : <Flashlight className="relative size-5" aria-hidden="true" />}
            <span className="relative tracking-wide sm:hidden">{uv ? "UV ON" : "UV OFF"}</span>
            <span className="relative hidden sm:inline">{uv ? "Σβήσε το UV" : "Άναψε το UV"}</span>
          </button>

          <span aria-hidden="true" className="mx-1 h-7 w-px bg-[var(--ci-cream)]/12" />

          <ToolButton label="Σημειωματάριο" onClick={openNotes} pressed={notesOpen}>
            <NotebookPen className="size-5" aria-hidden="true" />
          </ToolButton>
        </div>
      </div>

      <AnimatePresence>{notesOpen && <Notebook value={notes} onChange={onNotes} onClose={() => setNotesOpen(false)} />}</AnimatePresence>
    </motion.div>,
    document.body,
  )
}
