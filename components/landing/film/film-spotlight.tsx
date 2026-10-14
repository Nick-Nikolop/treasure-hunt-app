"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"
import { useScrollPhase } from "./use-scroll-phase"

const IDLE_MS = 1600
const DARK_MASK = "radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 0, transparent 8rem, black 21rem)"
const GLOW = "radial-gradient(circle at var(--x, 50%) var(--y, 50%), color-mix(in oklch, var(--brass) 22%, transparent), transparent 16rem)"

/** The city in the dark: a flashlight follows the pointer (or drifts on its own) while scrolling changes the place. */
export function FilmSpotlight({ copy }: { copy: LandingCopy["film"] }) {
  const ref = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.1 })
  const reduceMotion = useReducedMotion()
  const count = copy.frames.length
  const phase = useScrollPhase(ref, count + 2)
  const shot = Math.min(Math.max(phase - 1, 0), count - 1)
  const isOpen = phase === 0
  const isClose = phase === count + 1

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !inView) return
    const place = (x: number, y: number) => {
      stage.style.setProperty("--x", `${x}%`)
      stage.style.setProperty("--y", `${y}%`)
    }
    if (reduceMotion) {
      place(50, 45)
      return
    }
    let lastPointer = 0
    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const rect = stage.getBoundingClientRect()
      lastPointer = performance.now()
      place(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100)
    }
    const drift = (time: number) => {
      if (time - lastPointer > IDLE_MS) {
        place(50 + 26 * Math.sin(time * 0.00031), 46 + 16 * Math.sin(time * 0.00047 + 1.2))
      }
      frame = requestAnimationFrame(drift)
    }
    window.addEventListener("pointermove", onMove)
    frame = requestAnimationFrame(drift)
    return () => {
      window.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(frame)
    }
  }, [inView, reduceMotion])

  return (
    <section ref={ref} className="relative bg-background" style={{ height: `${(count + 2) * 100}svh` }} aria-label={copy.open}>
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={shot}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <Image
              src={copy.frames[shot].image}
              alt={copy.frames[shot].alt}
              fill
              sizes="100vw"
              className="object-cover sepia-[0.45] contrast-[1.1]"
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 bg-background/[0.97]" style={{ maskImage: DARK_MASK, WebkitMaskImage: DARK_MASK }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: GLOW }} aria-hidden="true" />

        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="open"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <p className="max-w-4xl font-serif text-3xl leading-tight text-foreground text-balance md:text-6xl">{copy.open}</p>
              <span className="hidden font-sans text-xs uppercase tracking-[0.35em] text-brass pointer-fine:inline">{copy.spot}</span>
            </motion.div>
          )}
          {!isOpen && !isClose && (
            <motion.div
              key={`shot-${shot}`}
              className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 bg-gradient-to-t from-background via-background/80 to-transparent px-6 pb-12 pt-24 md:px-10 md:pb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Label>
                {copy.take} {shot + 1} / {count}
              </Label>
              <h3 className="font-serif text-5xl text-foreground md:text-8xl">{copy.frames[shot].title}</h3>
              <p className="max-w-lg font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base">{copy.frames[shot].hint}</p>
            </motion.div>
          )}
          {isClose && (
            <motion.p
              key="close"
              className="absolute inset-x-0 top-1/2 z-10 mx-auto max-w-4xl -translate-y-1/2 px-6 text-center font-serif text-3xl italic leading-tight text-brass text-balance md:text-5xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              {copy.close}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
