"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { OfficeFilm } from "./hero-film/office-film"
import { INTRO_END } from "./hero-film/render"

// separate from the desktop key: both rooms are mounted, so they would mark each other as seen
const SEEN_KEY = "office:title-seen-mobile"
const INTRO_MS = INTRO_END * 1000

type Phase = "pending" | "intro" | "room"

/**
 * Phone opening: a camera film over the desktop office render. Dark room, rain on the arched window, headlights on
 * the wall; the camera pans past the board to the lamp, the lamp catches, the camera settles and the title lands
 * over the desk. Then the room idles (dust in the beam, slow drift, a passing car).
 * Opening once per session; reduced motion, deep links and scrolled arrivals start on the calm frame. Tap skips.
 */
export function MobileHero({
  copy,
  reduce,
  skip,
  header,
  actions,
  nextId,
}: {
  copy: OfficeCopy
  reduce: boolean
  skip: boolean
  header: ReactNode
  /** CTAs, rendered under the body */
  actions: ReactNode
  /** id of the section the scroll cue leads to */
  nextId: string
}) {
  const h = copy.hero
  const ref = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<Phase>("pending")
  const [played, setPlayed] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const started = useRef(0)

  const decided = useRef(false)
  useEffect(() => {
    if (decided.current) return
    decided.current = true
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1"
    } catch {}
    const phone = !window.matchMedia("(min-width: 1280px)").matches
    const play = phone && !skip && !reduce && !seen && window.scrollY < 40
    if (play) {
      try {
        sessionStorage.setItem(SEEN_KEY, "1")
      } catch {}
      started.current = performance.now()
      setPlayed(true)
    }
    setPhase(play ? "intro" : "room")
    // decided once on arrival; later navigation never replays the opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback((action: "finished" | "skipped") => {
    setPhase((p) => {
      if (p !== "intro") return p
      track(EV.officeIntro, { action, device: "phone" }, { durationMs: Math.round(performance.now() - started.current) })
      return "room"
    })
    if (action === "skipped") setSkipped(true)
  }, [])

  useEffect(() => {
    if (phase !== "intro") return
    const timer = window.setTimeout(() => finish("finished"), INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [phase, finish])

  // walking in: the room grows as you scroll past the hero and the title steps aside
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const roomScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.2])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const copyY = useTransform(scrollYProgress, [0, 0.55], [0, reduce ? 0 : -40])

  const intro = phase === "intro"
  const pending = phase === "pending"
  const step = (delay: number, className: string): { className: string; style?: CSSProperties } =>
    intro ? { className: cn(className, "office-reveal"), style: { animationDelay: `${delay}ms` } } : { className }

  const goNext = () => {
    document.getElementById(nextId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  return (
    <section
      ref={ref}
      aria-labelledby="office-title-mobile"
      className="relative isolate flex h-[100svh] min-h-[34rem] flex-col overflow-hidden bg-reel"
      onPointerDown={intro ? () => finish("skipped") : undefined}
    >
      <motion.div aria-hidden="true" className="absolute inset-0 -z-10 origin-[50%_30%]" style={{ scale: roomScale }}>
        <OfficeFilm
          mode={pending ? "pending" : played ? "play" : "still"}
          reduce={reduce}
          skipped={skipped}
          className={cn("size-full transition-opacity duration-500", pending && "opacity-0")}
        />
        {/* legibility: a dark ceiling for the header, the desk front falls into shadow under the title */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-reel/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-reel from-50% via-reel/75 to-transparent" />
      </motion.div>

      <div className={cn("relative z-10", intro && "office-fade-late", pending && "opacity-0")}>{header}</div>

      <motion.div
        className={cn(
          "relative z-10 mx-auto mt-auto flex w-full max-w-xl flex-col gap-4 px-5 pb-[calc(4.25rem+env(safe-area-inset-bottom))]",
          pending && "invisible",
        )}
        style={{ opacity: copyOpacity, y: copyY }}
      >
        <p className="sr-only">{h.status}</p>
        <div className="flex flex-col gap-3">
          <p {...step(3800, "flex items-center gap-3 font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-reel-gold")}>
            <span className="shrink-0">{h.eyebrow}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-reel-gold/40" />
          </p>
          <h1 id="office-title-mobile" className="text-balance font-serif text-[2.25rem] font-black leading-[1.04] text-reel-white sm:text-5xl">
            <span {...step(4100, "block")}>{h.title[0]}</span>
            <span {...step(4450, "block italic text-reel-gold")}>{h.title[1]}</span>
          </h1>
          <p {...step(4800, "text-pretty font-sans text-base leading-relaxed text-reel-white/80")}>{h.body}</p>
        </div>
        <div {...step(5150, "flex flex-col gap-4")}>{actions}</div>
        <button
          type="button"
          data-track="office.hero-enter"
          onClick={goNext}
          {...step(5500, "mx-auto flex min-h-11 items-center gap-2 font-sans text-[13px] font-bold uppercase tracking-[0.22em] text-reel-white/65 transition-colors hover:text-reel-white")}
        >
          {h.enter}
          <ChevronDown className="office-hero-cue size-4 text-reel-gold" aria-hidden="true" />
        </button>
      </motion.div>
    </section>
  )
}
