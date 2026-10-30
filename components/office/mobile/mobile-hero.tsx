"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { DESKTOP } from "../scenes"

// separate from the desktop key: both rooms are mounted, so they would mark each other as seen
const SEEN_KEY = "office:title-seen-mobile"
/** lamp catches → room fills → camera eases back from the lamp → title lands */
const INTRO_MS = 4600

/** horizontal centre of the lamp in the room render, % of its width; the shot settles a little right of it,
 * still short of the board, so the board is first seen in its own scene below */
const LAMP_X = 14
const REST_X = 17.5

/** fixed (not random) so server and client render the same motes; positions are % of the beam box */
const DUST = [
  { x: 18, y: 72, size: 3.5, dur: 11, delay: 1 },
  { x: 42, y: 58, size: 4.5, dur: 14, delay: 6 },
  { x: 63, y: 80, size: 3.5, dur: 12, delay: 3 },
  { x: 30, y: 40, size: 3.5, dur: 16, delay: 9 },
  { x: 75, y: 50, size: 4, dur: 13, delay: 2 },
  { x: 52, y: 88, size: 3.5, dur: 10, delay: 7 },
  { x: 12, y: 30, size: 3, dur: 15, delay: 4 },
  { x: 85, y: 68, size: 3, dur: 12, delay: 10 },
  { x: 36, y: 64, size: 3.5, dur: 17, delay: 12 },
  { x: 58, y: 34, size: 3, dur: 14, delay: 5 },
]

type Phase = "pending" | "intro" | "room"

/**
 * Phone opening: you step into the dark office and the desk lamp clicks on. The room comes up around it and the
 * camera eases back while the title lands over the desk. The board stays out of frame; scrolling down is looking
 * up at it in the board scene below. Once per session; reduced motion, deep links and scrolled arrivals
 * get the lit room straight away. A tap anywhere skips to the end.
 */
export function MobileHero({
  copy,
  reduce,
  skip,
  header,
  actions,
  slip,
  nextId,
}: {
  /** the case slip that slides in under the lamp, above the title */
  slip: ReactNode
  copy: OfficeCopy
  reduce: boolean
  skip: boolean
  header: ReactNode
  /** CTAs + status, rendered under the body */
  actions: ReactNode
  /** id of the section the scroll cue leads to */
  nextId: string
}) {
  const h = copy.hero
  const ref = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<Phase>("pending")
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
  }, [])

  useEffect(() => {
    if (phase !== "intro") return
    const timer = window.setTimeout(() => finish("finished"), INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [phase, finish])

  // walking in: the room grows as you scroll past the hero and the title steps aside
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const roomScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.22])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const copyY = useTransform(scrollYProgress, [0, 0.55], [0, reduce ? 0 : -40])

  const intro = phase === "intro"
  const pending = phase === "pending"
  const reveal = (delay: number): { className?: string; style?: CSSProperties } =>
    intro ? { className: "office-reveal", style: { animationDelay: `${delay}ms` } } : {}
  const step = (delay: number, className: string) => {
    const r = reveal(delay)
    return { className: cn(className, r.className), style: r.style }
  }

  const goNext = () => {
    document.getElementById(nextId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  return (
    <section
      ref={ref}
      aria-labelledby="office-title-mobile"
      className="relative isolate flex h-[100svh] min-h-[34rem] flex-col overflow-hidden"
      onPointerDown={intro ? () => finish("skipped") : undefined}
    >
      <motion.div aria-hidden="true" className="absolute inset-0 -z-10 origin-[50%_35%]" style={{ scale: roomScale }}>
        <div
          className={cn(
            "office-hero-room absolute left-0 top-[-36%] aspect-[1376/768] h-[max(100%,55.82vw)] origin-[14%_70%]",
            intro && "office-hero-pan",
            pending && "opacity-0",
          )}
          style={
            {
              "--pan-from": `clamp(calc(100vw - 100%), calc(50vw - ${LAMP_X}%), 0px)`,
              "--pan-to": `clamp(calc(100vw - 100%), calc(50vw - ${REST_X}%), 0px)`,
            } as CSSProperties
          }
        >
          <Image src={DESKTOP.src} alt="" fill priority sizes="200vw" className="object-cover" />
          {/* dust drifting through the lamp's beam; under the dark layers so it only shows once the lamp is on */}
          <div className="absolute" style={{ left: `${LAMP_X - 6}%`, top: "60%", width: "17%", height: "30%" }}>
            {DUST.map((d, i) => (
              <span
                key={i}
                className="office-dust absolute rounded-full bg-reel-gold"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: d.size,
                  height: d.size,
                  animationDuration: `${d.dur}s`,
                  animationDelay: `-${d.delay}s`,
                }}
              />
            ))}
          </div>
          {/* only the lamp's pool of light at first, then the rest of the room comes up */}
          <div
            className={cn("absolute inset-0", intro ? "office-hero-dark" : "opacity-0")}
            style={{
              background: `radial-gradient(circle at ${LAMP_X}% 60%, transparent 0, rgb(11 10 9 / 0.55) 9%, rgb(11 10 9 / 0.97) 24%)`,
            }}
          />
        </div>
        {/* lights off: the lamp catching on two short flickers */}
        <div className={cn("absolute inset-0 bg-[#0b0a09]", intro ? "office-hero-off" : "opacity-0")} />
        {/* legibility: a dark ceiling for the header, the desk falls into shadow under the title */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-reel/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-reel from-45% via-reel/70 to-transparent" />
      </motion.div>

      <div className={cn("relative z-10", intro && "office-fade-late", pending && "opacity-0")}>{header}</div>

      <motion.div
        className={cn(
          "relative z-10 mx-auto mt-auto flex w-full max-w-xl flex-col gap-4 px-5 pb-[calc(4.25rem+env(safe-area-inset-bottom))]",
          pending && "invisible",
        )}
        style={{ opacity: copyOpacity, y: copyY }}
      >
        <div className={cn("flex flex-col", intro && "office-slip-in")}>{slip}</div>
        <div className="flex flex-col gap-3">
          <p {...step(2500, "flex items-center gap-3 font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-reel-gold")}>
            <span className="shrink-0">{h.eyebrow}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-reel-gold/40" />
          </p>
          <h1 id="office-title-mobile" className="text-balance font-serif text-[2.25rem] font-black leading-[1.04] text-reel-white sm:text-5xl">
            <span {...step(2800, "block")}>{h.title[0]}</span>
            <span {...step(3150, "block italic text-reel-gold")}>{h.title[1]}</span>
          </h1>
          <p {...step(3500, "text-pretty font-sans text-base leading-relaxed text-reel-white/80")}>{h.body}</p>
        </div>
        <div {...step(3850, "flex flex-col gap-4")}>{actions}</div>
        <button
          type="button"
          data-track="office.hero-enter"
          onClick={goNext}
          {...step(4200, "mx-auto flex min-h-11 items-center gap-2 font-sans text-[13px] font-bold uppercase tracking-[0.22em] text-reel-white/65 transition-colors hover:text-reel-white")}
        >
          {h.enter}
          <ChevronDown className="office-hero-cue size-4 text-reel-gold" aria-hidden="true" />
        </button>
      </motion.div>
    </section>
  )
}
