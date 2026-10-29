"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { OfficeCopy } from "./copy"

const SEEN_KEY = "office:title-seen"
const CARD_MS = 3800
const LIGHTS_MS = 1400
const CARD_SCALE = 1.6

type Phase = "pending" | "card" | "lights" | "room"

/**
 * Desktop opening: the office is dark and the title stands alone in the middle like a film's cold open.
 * Then the lights flicker on, the title shrinks back into its corner and the objects in the room become the
 * way in. Plays once per session; reduced motion, deep links and the board camera go straight to the room.
 */
export function RoomTitle({ copy, reduce, skip, status }: { copy: OfficeCopy; reduce: boolean; skip: boolean; status: ReactNode }) {
  const h = copy.hero
  const blockRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("pending")
  const [cardTransform, setCardTransform] = useState<string>("none")

  useLayoutEffect(() => {
    const block = blockRef.current
    const stage = block?.offsetParent as HTMLElement | null
    if (!block || !stage) return
    const measure = () => {
      const tx = stage.clientWidth / 2 - (block.offsetLeft + block.offsetWidth / 2)
      const ty = stage.clientHeight / 2 - (block.offsetTop + block.offsetHeight / 2)
      setCardTransform(`translate(${tx}px, ${ty}px) scale(${CARD_SCALE})`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const decided = useRef(false)
  useEffect(() => {
    if (decided.current) return
    decided.current = true
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1"
      sessionStorage.setItem(SEEN_KEY, "1")
    } catch {}
    const desktop = window.matchMedia("(min-width: 1280px)").matches
    setPhase(skip || reduce || seen || !desktop ? "room" : "card")
    // decided once on arrival; later navigation never replays the opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lightsOn = useCallback(() => setPhase((p) => (p === "card" ? "lights" : p)), [])

  useEffect(() => {
    if (phase === "card") {
      const timer = window.setTimeout(lightsOn, CARD_MS)
      window.addEventListener("keydown", lightsOn)
      window.addEventListener("wheel", lightsOn, { passive: true })
      return () => {
        window.clearTimeout(timer)
        window.removeEventListener("keydown", lightsOn)
        window.removeEventListener("wheel", lightsOn)
      }
    }
    if (phase === "lights") {
      const timer = window.setTimeout(() => setPhase("room"), LIGHTS_MS)
      return () => window.clearTimeout(timer)
    }
  }, [phase, lightsOn])

  const dark = phase === "pending" || phase === "card"
  const intro = phase === "card" || phase === "lights"
  const reveal = (delay: number): CSSProperties | undefined => (phase === "card" ? { animationDelay: `${delay}ms` } : undefined)

  return (
    <>
      {/* the room before the lights come on; any click lights it up early */}
      <div
        aria-hidden="true"
        onPointerDown={lightsOn}
        className={cn(
          "absolute inset-0 z-[25] bg-[#0b0a09]",
          phase === "room" && "pointer-events-none opacity-0 transition-opacity duration-300",
          phase === "lights" && "office-lights-on pointer-events-none",
          dark && "opacity-[0.93]",
        )}
      />

      <div
        ref={blockRef}
        data-phase={phase}
        className="absolute left-[4%] top-[14%] z-[26] flex w-[27%] origin-center flex-col gap-[1.4cqw]"
        style={{
          transform: dark ? cardTransform : "none",
          transition: phase === "lights" ? `transform ${LIGHTS_MS - 200}ms cubic-bezier(0.65, 0, 0.25, 1) 150ms` : undefined,
          opacity: phase === "pending" ? 0 : 1,
        }}
      >
        <p className={cn("font-sans text-[max(13px,0.9cqw)] font-bold uppercase tracking-[0.28em] text-reel-gold", phase === "card" && "office-reveal")} style={reveal(150)}>
          {h.eyebrow}
        </p>
        <h1 id="office-title-desktop" className="font-serif text-[max(32px,2.85cqw)] font-black leading-[1.02] text-reel-white [text-shadow:0_2px_24px_rgb(0_0_0/0.7)]">
          <span className={cn("block", phase === "card" && "office-reveal")} style={reveal(450)}>
            {h.title[0]}
          </span>
          <span className={cn("block", phase === "card" && "office-reveal")} style={reveal(950)}>
            {h.title[1]}
          </span>
        </h1>
        <p
          className={cn("text-pretty font-sans text-[max(15px,1.12cqw)] leading-relaxed text-reel-white/85 [text-shadow:0_1px_12px_rgb(0_0_0/0.8)]", phase === "card" && "office-reveal")}
          style={reveal(1500)}
        >
          {h.body}
        </p>

        <div className="relative">
          {/* once the room is lit, the objects are the buttons */}
          <div className={cn("flex flex-col gap-3 transition-opacity duration-500", intro ? "opacity-0" : "opacity-100 delay-300")} inert={intro}>
            <p className="text-pretty font-serif text-[max(15px,1.05cqw)] italic leading-relaxed text-reel-gold">{h.hint}</p>
            {status}
          </div>
          {phase === "card" && (
            <button
              type="button"
              onClick={lightsOn}
              className="office-reveal absolute left-0 top-0 flex min-h-9 items-center rounded-full px-0 font-sans text-[max(12px,0.75cqw)] font-bold uppercase tracking-[0.24em] text-reel-white/60 transition hover:text-reel-white focus-visible:outline-2 focus-visible:outline-reel-gold"
              style={reveal(2100)}
            >
              {h.enter}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
