"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import type { LandingCopy } from "./copy"

const OPEN_MS = 3200
const SHOT_MS = 3600
const CLOSE_MS = 4200

/** Self-playing film: starts when the section comes into view, loops, and ignores scroll position. */
export function FilmSequence({ copy }: { copy: LandingCopy["film"] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { amount: 0.55 })
  const reduceMotion = useReducedMotion()
  const count = copy.frames.length
  const closePhase = count + 1
  const [phase, setPhase] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!inView) {
      setPhase(0)
      return
    }
    const duration = phase === 0 ? OPEN_MS : phase === closePhase ? CLOSE_MS : SHOT_MS
    const timer = window.setTimeout(() => {
      if (phase === closePhase) {
        setPhase(0)
        setCycle((c) => c + 1)
      } else {
        setPhase((p) => p + 1)
      }
    }, duration)
    return () => window.clearTimeout(timer)
  }, [phase, inView, closePhase])

  const shotIndex = phase === 0 ? -1 : Math.min(phase - 1, count - 1)
  const totalMs = OPEN_MS + SHOT_MS * count + CLOSE_MS

  return (
    <section ref={sectionRef} className="relative h-svh overflow-hidden bg-background" aria-label={copy.open}>
      <AnimatePresence>
        {shotIndex >= 0 && (
          <motion.div
            key={`${cycle}-${shotIndex}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-0"
              initial={reduceMotion ? false : { scale: 1.16, x: shotIndex % 2 === 0 ? "-2%" : "2%" }}
              animate={{ scale: 1, x: shotIndex % 2 === 0 ? "2%" : "-2%" }}
              transition={{ duration: (SHOT_MS + (shotIndex === count - 1 ? CLOSE_MS : 0)) / 1000 + 1, ease: "linear" }}
            >
              <Image unoptimized loading="eager" src={copy.frames[shotIndex].image} alt={copy.frames[shotIndex].alt} fill sizes="100vw" className="object-cover brightness-[0.6] grayscale sepia-[0.4] contrast-[1.15]" />
            </motion.div>

            <AnimatePresence>
              {phase !== closePhase && (
                <motion.div
                  className="absolute bottom-[14svh] left-0 z-10 flex flex-col gap-3 px-6 md:left-10 md:px-0"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                >
                  <span className="font-sans text-xs uppercase tracking-[0.35em] text-brass">
                    {copy.take} {shotIndex + 1} / {count}
                  </span>
                  <span className="font-serif text-5xl text-foreground md:text-8xl">{copy.frames[shotIndex].title}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 z-20 h-[7svh] bg-background" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[7svh] items-center bg-background px-6 md:px-10">
        <div className="h-px w-full bg-border/60">
          {inView && (
            <motion.div
              key={cycle}
              className="h-px bg-brass"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: totalMs / 1000, ease: "linear" }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === 0 && inView && (
          <motion.p
            key={`open-${cycle}`}
            className="absolute inset-x-0 top-1/2 z-10 mx-auto max-w-4xl -translate-y-1/2 px-6 text-center font-serif text-3xl leading-tight text-foreground text-balance md:text-6xl"
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 1 }}
          >
            {copy.open}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === closePhase && (
          <motion.p
            key={`close-${cycle}`}
            className="absolute inset-x-0 bottom-[14svh] z-10 mx-auto max-w-4xl px-6 text-center font-serif text-3xl italic leading-tight text-brass text-balance md:text-5xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            {copy.close}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}
