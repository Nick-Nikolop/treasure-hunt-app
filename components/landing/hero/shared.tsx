"use client"

import { motion, useReducedMotion } from "framer-motion"
import { type RefObject, useEffect } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"

export const EASE = [0.16, 1, 0.3, 1] as const

export type HeroCopy = LandingCopy["hero"]

type BeamPath = {
  /** Centre of the sweep as a fraction of the stage width / height. */
  x: number
  y: number
  /** Half-width / half-height of the sweep as fractions. */
  reachX: number
  reachY: number
  mobileX?: number
  mobileReachX?: number
  speed?: number
}

/** Drives the --beam-x / --beam-y custom properties on the stage element along a slow figure-of-eight. */
export function useBeam(ref: RefObject<HTMLElement | null>, path: BeamPath) {
  const reduceMotion = useReducedMotion()
  const { x, y, reachX, reachY, mobileX, mobileReachX, speed = 1 } = path

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    let frame = 0
    const start = performance.now()

    const place = (px: number, py: number) => {
      stage.style.setProperty("--beam-x", `${px}px`)
      stage.style.setProperty("--beam-y", `${py}px`)
    }

    const sweep = (now: number) => {
      const { width, height } = stage.getBoundingClientRect()
      const t = ((now - start) / 1000) * speed
      const mobile = width < 768
      const cx = mobile ? (mobileX ?? x) : x
      const rx = mobile ? (mobileReachX ?? reachX) : reachX
      place(width * (cx + rx * Math.sin(t * 0.4)), height * (y + reachY * Math.sin(t * 0.8)))
      frame = requestAnimationFrame(sweep)
    }

    if (reduceMotion) {
      const { width, height } = stage.getBoundingClientRect()
      place(width * x, height * y)
    } else {
      frame = requestAnimationFrame(sweep)
    }
    return () => cancelAnimationFrame(frame)
  }, [ref, reduceMotion, x, y, reachX, reachY, mobileX, mobileReachX, speed])
}

export function beamMask(inner = "9rem", outer = "19rem") {
  return `radial-gradient(circle at var(--beam-x, 60%) var(--beam-y, 55%), #000 0, #000 ${inner}, transparent ${outer})`
}

export type Mark = { x: string; y: string; text: string; className?: string; rotate?: number }

export function HiddenMarks({ marks, tone = "brass" }: { marks: Mark[]; tone?: "brass" | "ink" }) {
  return (
    <>
      {marks.map((mark) => (
        <span
          key={mark.text}
          className={`absolute font-serif italic ${tone === "ink" ? "text-[oklch(0.45_0.17_28)]" : "text-brass/90"} ${mark.className ?? "text-3xl"}`}
          style={{
            left: mark.x,
            top: mark.y,
            transform: `rotate(${mark.rotate ?? 0}deg)`,
            textShadow: tone === "ink" ? "none" : "0 0 18px oklch(0.78 0.13 78 / 0.6)",
          }}
        >
          {mark.text}
        </span>
      ))}
    </>
  )
}

/** The hero's hidden symbol: rendered inside a beam-masked layer so it only shows in the light. */
export function BeamClue({ mask, className }: { mask: string; className: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[15]" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>
        <Clue id="hero" large />
      </div>
    </div>
  )
}

export function HeroActions({ copy, centered = false, delay = 2 }: { copy: HeroCopy; centered?: boolean; delay?: number }) {
  return (
    <motion.div
      className={`flex flex-col gap-6 ${centered ? "items-center text-center" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 1, ease: EASE }}
    >
      <div className={`flex flex-wrap items-center gap-4 ${centered ? "justify-center" : ""}`}>
        <a
          href="#missions"
          className="rounded-full bg-primary px-7 py-3.5 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {copy.primary}
        </a>
        <a
          href="#how"
          className="rounded-full border border-foreground/30 px-7 py-3.5 font-sans text-sm text-foreground transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.secondary}
        </a>
      </div>
      <p className="font-serif text-sm italic text-muted-foreground text-pretty">{copy.hint}</p>
    </motion.div>
  )
}

/** Greek all-caps must drop accents. */
export function toCaps(text: string) {
  return text.normalize("NFD").replace(/[\u0301\u0308]/g, "").toUpperCase().normalize("NFC")
}
