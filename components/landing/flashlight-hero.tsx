"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { LandingCopy } from "./copy"

const EASE = [0.16, 1, 0.3, 1] as const

/** Details painted into the scene that only show inside the beam. */
const HIDDEN_MARKS = [
  { x: "58%", y: "70%", text: "→ 7", size: "text-4xl", rotate: -6 },
  { x: "78%", y: "62%", text: "N 37°02′", size: "text-xl", rotate: 4 },
  { x: "66%", y: "40%", text: "X", size: "text-5xl", rotate: 0 },
  { x: "86%", y: "34%", text: "ΙΙ · ΧΙV", size: "text-2xl", rotate: -3 },
]

export function FlashlightHero({ copy }: { copy: LandingCopy["hero"] }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let pointerActive = false
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    const start = performance.now()

    const place = (x: number, y: number) => {
      stage.style.setProperty("--beam-x", `${x}px`)
      stage.style.setProperty("--beam-y", `${y}px`)
    }

    const sweep = (now: number) => {
      if (!pointerActive) {
        const { width, height } = stage.getBoundingClientRect()
        const t = (now - start) / 1000
        const left = width < 768 ? 0.5 : 0.72
        const reach = width < 768 ? 0.3 : 0.16
        place(width * (left + reach * Math.sin(t * 0.4)), height * (0.5 + 0.18 * Math.sin(t * 0.8)))
      }
      frame = requestAnimationFrame(sweep)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const rect = stage.getBoundingClientRect()
      pointerActive = true
      place(event.clientX - rect.left, event.clientY - rect.top)
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => (pointerActive = false), 3500)
    }

    if (reduceMotion) {
      const { width, height } = stage.getBoundingClientRect()
      place(width * 0.62, height * 0.55)
    } else {
      frame = requestAnimationFrame(sweep)
    }
    stage.addEventListener("pointermove", onMove)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(idleTimer)
      stage.removeEventListener("pointermove", onMove)
    }
  }, [reduceMotion])

  const beamMask =
    "radial-gradient(circle at var(--beam-x, 60%) var(--beam-y, 55%), #000 0, #000 9rem, transparent 19rem)"

  return (
    <section ref={stageRef} className="relative isolate flex min-h-svh items-end overflow-hidden bg-background">
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.12 }}
        animate={{ scale: 1.02 }}
        transition={{ duration: 9, ease: "easeOut" }}
      >
        <Image
          src="/landing/hero-city.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.32] saturate-[0.7]"
        />
        <div
          className="absolute inset-0"
          style={{ maskImage: beamMask, WebkitMaskImage: beamMask }}
          aria-hidden="true"
        >
          <Image src="/landing/hero-city.png" alt="" fill sizes="100vw" className="object-cover brightness-[1.35] saturate-[1.15]" />
          {HIDDEN_MARKS.map((mark) => (
            <span
              key={mark.text}
              className={`absolute font-serif italic text-brass/90 ${mark.size}`}
              style={{ left: mark.x, top: mark.y, transform: `rotate(${mark.rotate}deg)`, textShadow: "0 0 18px oklch(0.78 0.13 78 / 0.6)" }}
            >
              {mark.text}
            </span>
          ))}
        </div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/25 to-transparent"
        aria-hidden="true"
      />

      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-background"
        initial={{ height: "50svh" }}
        animate={{ height: "5svh" }}
        transition={{ duration: 1.6, ease: EASE }}
        aria-hidden="true"
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-background"
        initial={{ height: "50svh" }}
        animate={{ height: "5svh" }}
        transition={{ duration: 1.6, ease: EASE }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-[14svh] md:px-10">
        <motion.p
          className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          {copy.eyebrow}
        </motion.p>

        <h1 className="font-serif text-6xl leading-[0.95] text-foreground text-balance md:text-8xl lg:text-9xl">
          {copy.title.map((line, index) => (
            <span key={line} className="block overflow-hidden pb-2">
              <motion.span
                className={`block ${index === 1 ? "italic text-brass" : ""}`}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ delay: 1.3 + index * 0.18, duration: 1.1, ease: EASE }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="flex max-w-xl flex-col gap-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, ease: EASE }}
        >
          <p className="font-sans text-lg leading-relaxed text-foreground/80 text-pretty">{copy.body}</p>
          <div className="flex flex-wrap items-center gap-4">
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
          <p className="font-serif text-sm italic text-muted-foreground">{copy.hint}</p>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-[7svh] right-6 z-10 hidden flex-col items-center gap-3 md:right-10 md:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 1 }}
        aria-hidden="true"
      >
        <span className="font-sans text-[11px] uppercase tracking-[0.35em] text-foreground/60 [writing-mode:vertical-rl]">{copy.scroll}</span>
        <span className="relative h-16 w-px overflow-hidden bg-foreground/20">
          <motion.span
            className="absolute inset-x-0 top-0 h-6 bg-brass"
            animate={{ y: ["-100%", "300%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  )
}
