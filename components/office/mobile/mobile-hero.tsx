"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"
import { DESKTOP, pct } from "../scenes"

// separate from the desktop key: both rooms are mounted, so they would mark each other as seen
const SEEN_KEY = "office:title-seen-mobile"
/** lamp catches → room fills → camera settles on the board → title lands */
const INTRO_MS = 4600

/** horizontal centres of the lamp and the board in the room render, % of its width */
const LAMP_X = 14
const BOARD_X = 51.6

/** the two case files pinned to the cork, positions as % of the cork */
const PINNED = [
  { src: "/landing2/mission-pythea.webp", left: "14%", top: "14%", width: "27%", rotate: -5 },
  { src: "/landing2/mission-carnival.webp", left: "56%", top: "22%", width: "27%", rotate: 4 },
]

type Phase = "pending" | "intro" | "room"

/**
 * Phone opening: you walk into the dark office, the desk lamp clicks on, the room fills with light and the camera
 * pulls back from the lamp to the case board while the title lands over the desk. Scrolling pushes you into the
 * room, straight onto the board scene below. Once per session; reduced motion, deep links and scrolled arrivals
 * get the lit room straight away. A tap anywhere skips to the end.
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
            "office-hero-room absolute left-0 top-0 aspect-[1376/768] h-[max(68%,55.82vw)] origin-[14%_62%]",
            intro && "office-hero-pan",
            pending && "opacity-0",
          )}
          style={
            {
              "--pan-from": `clamp(calc(100vw - 100%), calc(50vw - ${LAMP_X}%), 0px)`,
              "--pan-to": `clamp(calc(100vw - 100%), calc(50vw - ${BOARD_X}%), 0px)`,
            } as CSSProperties
          }
        >
          <Image src={DESKTOP.src} alt="" fill priority sizes="200vw" className="object-cover" />
          <div className="absolute" style={pct(DESKTOP.cork!)}>
            {PINNED.map((p) => (
              <div
                key={p.src}
                className="absolute bg-reel-white p-[3%] pb-[7%] shadow-[0_6px_14px_rgb(0_0_0/0.55)]"
                style={{ left: p.left, top: p.top, width: p.width, transform: `rotate(${p.rotate}deg)` }}
              >
                <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#9b1c1c] shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Image src={p.src} alt="" fill sizes="120px" className="object-cover sepia-[0.25]" />
                </div>
              </div>
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
