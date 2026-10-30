"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "../copy"

// separate from the desktop key: both rooms are mounted, so they would mark each other as seen
const SEEN_KEY = "office:title-seen-mobile"
const CARD_MS = 3800
const LIGHTS_MS = 1400
const TRAVEL_MS = 1100
const CARD_SCALE = 1.06

type Phase = "pending" | "card" | "lights" | "room"

/**
 * Phone opening, the same cold open as desktop: the page is dark and the title stands alone in the middle of the
 * screen. A tap (or a few seconds) flickers the lights on and the title glides up into the hero, where an identical
 * block takes over, so the hand-off is invisible. Once per session; reduced motion and deep links skip it.
 */
export function MobileTitle({
  copy,
  reduce,
  skip,
  heroRef,
  restRef,
}: {
  copy: OfficeCopy
  reduce: boolean
  skip: boolean
  heroRef: RefObject<HTMLDivElement | null>
  /** the hero's buttons: they wait until the title has landed, then fade in */
  restRef: RefObject<HTMLDivElement | null>
}) {
  const h = copy.hero
  const cardRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("pending")
  const [travel, setTravel] = useState(0)

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
    }
    setPhase(play ? "card" : "room")
    // decided once on arrival; later navigation never replays the opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the real hero waits underneath until the card lands on it
  useLayoutEffect(() => {
    const hero = heroRef.current
    const rest = restRef.current
    const hidden = phase === "card" || phase === "lights"
    if (hero) hero.style.opacity = hidden ? "0" : ""
    if (rest) {
      rest.style.transition = "opacity 600ms ease-out 100ms"
      rest.style.opacity = hidden ? "0" : ""
    }
  }, [phase, heroRef, restRef])

  useEffect(() => {
    if (phase !== "card" && phase !== "lights") return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = prev
    }
  }, [phase])

  const lightsOn = useCallback(() => {
    const card = cardRef.current
    const hero = heroRef.current
    // origin is top-left, so the scale does not move the card's top edge
    if (card && hero) setTravel(hero.getBoundingClientRect().top - card.getBoundingClientRect().top)
    setPhase((p) => (p === "card" ? "lights" : p))
  }, [heroRef])

  useEffect(() => {
    if (phase === "card") {
      const timer = window.setTimeout(lightsOn, CARD_MS)
      return () => window.clearTimeout(timer)
    }
    if (phase === "lights") {
      const timer = window.setTimeout(() => setPhase("room"), LIGHTS_MS)
      return () => window.clearTimeout(timer)
    }
  }, [phase, lightsOn])

  if (phase === "pending" || phase === "room") return null

  const reveal = (delay: number): CSSProperties | undefined => (phase === "card" ? { animationDelay: `${delay}ms` } : undefined)
  const lit = phase === "lights"

  return (
    <div className="fixed inset-0 z-[60] xl:hidden" onPointerDown={phase === "card" ? lightsOn : undefined}>
      {/* the office before the lights come on: the board is only just there behind it */}
      <div aria-hidden="true" className={cn("absolute inset-0 bg-[#0b0a09] opacity-[0.96]", lit && "office-lights-on")} />

      <div className="relative flex h-full items-center">
        <div
          ref={cardRef}
          aria-hidden="true"
          className="mx-auto flex w-full max-w-xl origin-top-left flex-col gap-3 px-5"
          style={{
            transform: lit ? `translateY(${travel}px)` : `scale(${CARD_SCALE})`,
            transition: lit ? `transform ${TRAVEL_MS}ms cubic-bezier(0.65, 0, 0.25, 1) 150ms` : undefined,
          }}
        >
          <p className={cn("font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-reel-gold", !lit && "office-reveal")} style={reveal(150)}>
            {h.eyebrow}
          </p>
          <p className="font-serif text-[2rem] font-black leading-[1.05] text-reel-white sm:text-5xl">
            <span className={cn("block", !lit && "office-reveal")} style={reveal(450)}>
              {h.title[0]}
            </span>
            <span className={cn("block", !lit && "office-reveal")} style={reveal(950)}>
              {h.title[1]}
            </span>
          </p>
          <p className={cn("text-pretty font-sans text-base leading-relaxed text-reel-white/80", !lit && "office-reveal")} style={reveal(1500)}>
            {h.body}
          </p>
        </div>
      </div>

      <button
        type="button"
        data-track="office.title-enter"
        onClick={lightsOn}
        className={cn(
          "absolute inset-x-0 bottom-[calc(2.5rem+env(safe-area-inset-bottom))] mx-auto flex min-h-12 w-fit items-center gap-3 rounded-full px-5 font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-reel-white/70 transition-opacity duration-300 focus-visible:outline-2 focus-visible:outline-reel-gold",
          lit ? "opacity-0" : "office-reveal",
        )}
        style={reveal(2100)}
      >
        <span aria-hidden="true" className="h-px w-6 bg-reel-gold/70" />
        {h.enter}
        <span aria-hidden="true" className="h-px w-6 bg-reel-gold/70" />
      </button>
    </div>
  )
}
