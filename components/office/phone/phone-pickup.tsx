"use client"

import { usePresence } from "framer-motion"
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import type { LandingCopy } from "@/components/landing/copy"
import { StepVignette } from "@/components/landing2/step-vignettes"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { setPhoneInHand } from "./desk-phone"
import { PHONE_ASPECT, cubicBezier, heldPlacement, phoneFrame, smoothstep, type PhoneFrameInput } from "./pose"
import { BODY_LAYERS, PhoneRig, type PhoneRigHandle } from "./phone-rig"

const PICKUP_MS = 640
const PUTDOWN_MS = 540
const pickupEase = cubicBezier(0.3, 0.02, 0.12, 1)
const putdownEase = cubicBezier(0.45, 0, 0.22, 1)

type Props = {
  copy: OfficeCopy
  how: LandingCopy["how"]
  reduce: boolean
  onClose: () => void
  onCase: () => void
}

/**
 * Desktop "How it works": the phone on the desk is picked up, turned and brought up to the eye;
 * its screen is the live four-step explainer. Closing (button, Esc, browser back) plays the exact
 * reverse and lays it back on the desk before the view unmounts.
 */
export function PhonePickup({ copy, how, reduce, onClose, onCase }: Props) {
  const h = copy.how
  const [isPresent, safeToRemove] = usePresence()
  const rootRef = useRef<HTMLDivElement>(null)
  const rig = useRef<PhoneRigHandle>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tRef = useRef(0)
  const [geo, setGeo] = useState<PhoneFrameInput | null>(null)
  const [settled, setSettled] = useState(false)
  const [active, setActive] = useState(0)

  // One physical phone: the desk copy disappears the moment this one exists.
  useLayoutEffect(() => {
    setPhoneInHand(true)
    return () => setPhoneInHand(false)
  }, [])

  // Measure the room and choose the held size before the first paint (and again if the window changes).
  useLayoutEffect(() => {
    const measure = () => {
      const stage = document.querySelector<HTMLElement>("[data-office-stage]")?.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const elH = Math.round(Math.min(vh * 0.84, 860))
      const elW = Math.round(elH / PHONE_ASPECT)
      setGeo({
        stage: stage ? { left: stage.left, top: stage.top, width: stage.width } : { left: 0, top: vh - (vw * 768) / 1376, width: vw },
        el: { w: elW, h: elH },
        hold: { x: Math.round(vw * 0.33), y: Math.round(vh / 2 + 6) },
        layers: BODY_LAYERS,
      })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const setVars = (t: number) => {
    const root = rootRef.current
    if (!root) return
    root.style.setProperty("--dim", smoothstep(0, 0.7, t).toFixed(3))
    root.style.setProperty("--screen", smoothstep(0.55, 0.95, t).toFixed(3))
    root.style.setProperty("--panel", smoothstep(0.72, 1, t).toFixed(3))
  }

  const draw = (t: number) => {
    if (!geo) return
    tRef.current = t
    setVars(t)
    if (t >= 1) rig.current?.hold(heldPlacement(geo))
    else rig.current?.apply(phoneFrame(t, geo))
  }

  /** Animate from the current t to `to`; resolves when done (or immediately with reduced motion). */
  const run = (to: 0 | 1, done: () => void) => {
    const from = tRef.current
    if (reduce) {
      draw(to)
      done()
      return () => {}
    }
    const ms = (to === 1 ? PICKUP_MS : PUTDOWN_MS) * Math.abs(to - from)
    const ease = to === 1 ? pickupEase : putdownEase
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = ms === 0 ? 1 : Math.min(1, (now - start) / ms)
      draw(from + (to - from) * ease(p))
      if (p < 1) raf = requestAnimationFrame(tick)
      else done()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }

  // Pick up on mount, put down when the view is removed (any route out of it).
  useLayoutEffect(() => {
    if (!geo) return
    if (isPresent) {
      // keyboard (Esc) works from the first frame; the heading takes focus once the panel is usable
      if (tRef.current === 0) rootRef.current?.focus({ preventScroll: true })
      draw(tRef.current)
      return run(1, () => setSettled(true))
    }
    setSettled(false)
    const finish = () => {
      setPhoneInHand(false)
      safeToRemove?.()
    }
    if (reduce) {
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished.then(finish, finish)
      return
    }
    return run(0, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per presence change only
  }, [geo, isPresent])

  const focusedOnce = useRef(false)
  useEffect(() => {
    if (!settled || focusedOnce.current) return
    focusedOnce.current = true
    if (rootRef.current?.contains(document.activeElement)) headingRef.current?.focus({ preventScroll: true })
  }, [settled])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== "Tab" || !rootRef.current) return
    const items = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.closest("[inert]") && el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!geo) return null
  const steps = how.steps
  const usable = settled && isPresent
  const panelLeft = geo.hold!.x + geo.el.w / 2 + 72

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-view-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 font-sans text-reel-white outline-none"
      style={{ ["--dim" as string]: 0, ["--screen" as string]: 0, ["--panel" as string]: 0 }}
    >
  {/* depth of field: the eye focuses on the phone at arm's length, so the room behind goes soft and darker
      (the office still reads as a place, but its labels and hero copy no longer compete with the text) */}
  <div
  aria-hidden="true"
  className="absolute inset-0"
  style={{
  opacity: "var(--dim)",
  backdropFilter: "blur(14px) saturate(0.85)",
  WebkitBackdropFilter: "blur(14px) saturate(0.85)",
  background:
  "linear-gradient(90deg, rgb(8 6 4 / 0) 28%, rgb(8 6 4 / 0.5) 50%, rgb(8 6 4 / 0.7) 100%), radial-gradient(ellipse 55% 80% at 33% 52%, rgb(10 7 4 / 0.38), rgb(8 6 4 / 0.72) 100%)",
  }}
  />

      <PhoneRig
        ref={rig}
        w={geo.el.w}
        h={geo.el.h}
        screen={
          <div inert={!usable} className="size-full">
            <HowScreen copy={copy} steps={steps} active={active} onActive={setActive} onCase={onCase} w={geo.el.w} />
          </div>
        }
      />

      <button
        type="button"
        onClick={onClose}
        inert={!isPresent}
        className="absolute left-6 top-5 flex min-h-11 items-center gap-2 rounded-full bg-reel/60 px-4 font-sans text-base font-bold text-reel-white ring-1 ring-reel-white/25 backdrop-blur-sm transition hover:bg-reel-white/10 focus-visible:ring-2 focus-visible:ring-reel-gold"
        style={{ opacity: "var(--panel)" }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {h.putDown}
      </button>

      <section
        inert={!usable}
        className="absolute top-1/2 flex max-h-[86svh] flex-col gap-5 overflow-y-auto pr-2"
        style={{
          left: panelLeft,
          right: "6vw",
          maxWidth: 560,
          opacity: "var(--panel)",
          translate: "calc((1 - var(--panel)) * 16px) -50%",
        }}
      >
        <div className="flex flex-col gap-3">
          <h2
            id="office-view-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-sans text-sm font-bold uppercase tracking-[0.24em] text-reel-gold outline-none"
          >
            {h.title}
          </h2>
          <p className="text-balance font-serif text-4xl font-black leading-tight [text-shadow:0_2px_20px_rgb(0_0_0/0.6)]">{h.lead}</p>
        </div>
        <ol className="flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "step" : undefined}
                className={cn(
                  "flex w-full gap-4 rounded-lg px-4 py-3 text-left transition",
                  i === active ? "bg-reel/70 ring-1 ring-reel-gold/60" : "hover:bg-reel/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full font-serif text-base font-black",
                    i === active ? "bg-reel-gold text-reel" : "text-reel-white/80 ring-1 ring-reel-white/30",
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-serif text-lg font-bold leading-tight">{s.title}</span>
                  <span className="text-pretty font-sans text-[15px] leading-relaxed text-reel-white/75">{s.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="border-l-2 border-reel-gold pl-4 font-serif text-lg italic leading-snug text-reel-white/90">{h.note}</p>
        <div className="flex flex-col gap-2.5">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-mute">{h.need}</p>
          <ul className="flex flex-wrap gap-2">
            {h.needs.map((need) => (
              <li key={need} className="rounded-full bg-reel/50 px-3 py-1.5 font-sans text-sm text-reel-white/90 ring-1 ring-reel-white/20">
                {need}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onCase} className="reel-cta flex min-h-12 w-fit items-center gap-2 rounded-full px-5 font-sans text-base font-bold">
          <FileText className="size-4" aria-hidden="true" />
          {h.toCase}
        </button>
      </section>
    </div>,
    document.body,
  )
}

/** What the phone's own display shows: a small field app stepping through the four stages. */
function HowScreen({
  copy,
  steps,
  active,
  onActive,
  onCase,
  w,
}: {
  copy: OfficeCopy
  steps: LandingCopy["how"]["steps"]
  active: number
  onActive: (i: number) => void
  onCase: () => void
  w: number
}) {
  const h = copy.how
  const step = steps[active]
  const last = active === steps.length - 1
  const screenW = w * (1 - 0.072)
  const k = Math.min(1.05, (screenW - 28) / 320)

  return (
    <div className="flex size-full flex-col bg-[linear-gradient(180deg,#201914,#14100d_55%,#0f0c0a)] text-reel-white">
      <div aria-hidden="true" className="flex h-11 shrink-0 items-end justify-between px-7 pb-1 font-sans text-[13px] font-bold">
        <span>21:40</span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-end gap-[2px]">
            {[4, 6, 8, 10].map((bar) => (
              <span key={bar} className="w-[3px] rounded-sm bg-reel-white" style={{ height: bar }} />
            ))}
          </span>
          <span className="relative h-[11px] w-[22px] rounded-[3px] ring-1 ring-reel-white/70">
            <span className="absolute inset-[2px] right-[6px] rounded-[1px] bg-reel-white" />
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 pt-3">
        <span className="font-serif text-[15px] font-black tracking-[0.14em] text-brass">THE HUNT</span>
        <span className="rounded-full px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.16em] text-reel-gold ring-1 ring-reel-gold/40">
          {h.step} {active + 1}/{steps.length}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[340px] w-[320px] -translate-x-1/2 -translate-y-1/2" style={{ scale: k }}>
          <StepVignette key={active} index={active} active />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 px-5" aria-live="polite">
        <p className="font-serif text-[22px] font-bold leading-tight">{step.title}</p>
        <p className="line-clamp-3 text-pretty font-sans text-[15px] leading-relaxed text-reel-white/75">{step.body}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={() => onActive(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label={h.prev}
          className="flex size-11 items-center justify-center rounded-full bg-reel-white/10 transition hover:bg-reel-white/20 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="flex gap-1.5">
          {steps.map((s, i) => (
            <span key={s.title} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-reel-gold" : "w-1.5 bg-reel-white/30")} />
          ))}
        </span>
        {last ? (
          <button type="button" onClick={onCase} className="reel-cta flex min-h-11 items-center gap-1.5 rounded-full px-4 font-sans text-sm font-bold">
            <FileText className="size-4" aria-hidden="true" />
            {h.toCaseShort}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onActive(active + 1)}
            aria-label={h.next}
            className="flex size-11 items-center justify-center rounded-full bg-reel-gold text-reel transition hover:brightness-110"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <span aria-hidden="true" className="mx-auto mb-2 mt-1 h-1 w-28 shrink-0 rounded-full bg-reel-white/60" />
    </div>
  )
}
