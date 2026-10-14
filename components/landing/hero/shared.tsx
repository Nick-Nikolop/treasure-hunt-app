"use client"

import { motion, useReducedMotion } from "framer-motion"
import { type RefObject, useEffect, useState } from "react"
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
  /** Set false to keep the beam on its own sweep and ignore the mouse. */
  followPointer?: boolean
}

/** How long the beam keeps following a still mouse before drifting back to its own sweep. */
const POINTER_HOLD_MS = 2400

/**
 * Drives the --beam-x / --beam-y custom properties on the stage element along a slow figure-of-eight.
 * With a mouse, the beam eases toward the cursor and returns to its sweep once the cursor rests or leaves.
 */
export function useBeam(ref: RefObject<HTMLElement | null>, path: BeamPath) {
  const reduceMotion = useReducedMotion()
  const { x, y, reachX, reachY, mobileX, mobileReachX, speed = 1, followPointer = false } = path

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    let frame = 0
    const start = performance.now()
    let current: { x: number; y: number } | null = null
    let pointer: { x: number; y: number; at: number } | null = null

    const place = (px: number, py: number) => {
      stage.style.setProperty("--beam-x", `${px}px`)
      stage.style.setProperty("--beam-y", `${py}px`)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const rect = stage.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, at: performance.now() }
    }
    const onLeave = () => {
      pointer = null
    }

    const sweep = (now: number) => {
      const { width, height } = stage.getBoundingClientRect()
      const t = ((now - start) / 1000) * speed
      const mobile = width < 768
      const cx = mobile ? (mobileX ?? x) : x
      const rx = mobile ? (mobileReachX ?? reachX) : reachX
      let tx = width * (cx + rx * Math.sin(t * 0.4))
      let ty = height * (y + reachY * Math.sin(t * 0.8))
      if (pointer && now - pointer.at < POINTER_HOLD_MS) {
        tx = pointer.x
        ty = pointer.y
      }
      current = current ? { x: current.x + (tx - current.x) * 0.08, y: current.y + (ty - current.y) * 0.08 } : { x: tx, y: ty }
      place(current.x, current.y)
      frame = requestAnimationFrame(sweep)
    }

    if (reduceMotion) {
      const { width, height } = stage.getBoundingClientRect()
      place(width * x, height * y)
      return
    }
    if (followPointer) {
      stage.addEventListener("pointermove", onMove)
      stage.addEventListener("pointerleave", onLeave)
    }
    frame = requestAnimationFrame(sweep)
    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerleave", onLeave)
    }
  }, [ref, reduceMotion, x, y, reachX, reachY, mobileX, mobileReachX, speed, followPointer])
}

export function beamMask(inner = "9rem", outer = "19rem") {
  return `radial-gradient(circle at var(--beam-x, 60%) var(--beam-y, 55%), #000 0, #000 ${inner}, transparent ${outer})`
}

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const stepped = (t: number) => Math.floor(t * 5) / 5

/** Film grain that jitters a few times a second. */
export function Grain({ opacity = 0.09 }: { opacity?: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -inset-1/2 mix-blend-overlay"
        style={{ backgroundImage: NOISE, opacity }}
        animate={reduceMotion ? undefined : { x: ["0%", "-6%", "4%", "-3%", "0%"], y: ["0%", "5%", "-4%", "6%", "0%"] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: stepped }}
      />
    </div>
  )
}

/** Types `text` out at `cps` characters per second after `delay` seconds. */
export function useTypewriter(text: string, delay: number, cps = 38) {
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setCount(text.length)
      return
    }
    setCount(0)
    const begin = performance.now()
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - begin) / 1000 - delay
      const next = Math.min(text.length, Math.max(0, Math.floor(elapsed * cps)))
      setCount(next)
      if (next === text.length) window.clearInterval(id)
    }, 30)
    return () => window.clearInterval(id)
  }, [text, delay, cps, reduceMotion])

  return { typed: text.slice(0, count), done: count >= text.length }
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

/** `centered: "mobile"` centres below md and left-aligns above it. */
export function HeroActions({ copy, centered = false, delay = 2 }: { copy: HeroCopy; centered?: boolean | "mobile"; delay?: number }) {
  const column = centered === "mobile" ? "items-center text-center md:items-start md:text-left" : centered ? "items-center text-center" : ""
  const row = centered === "mobile" ? "justify-center md:justify-start" : centered ? "justify-center" : ""
  return (
    <motion.div
      className={`flex flex-col gap-6 ${column}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 1, ease: EASE }}
    >
      <div className={`flex flex-wrap items-center gap-4 ${row}`}>
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

