"use client"

import Image from "next/image"
import { useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"
import { useScrollPhase } from "./use-scroll-phase"

const TILT = [-3, 2.5, -1.5]

/** Three old postcards stacked on the table; each scroll step deals the top one away to reveal the next. */
export function FilmPostcards({ copy }: { copy: LandingCopy["film"] }) {
  const ref = useRef<HTMLElement>(null)
  const count = copy.frames.length
  const phase = useScrollPhase(ref, count + 1)
  const top = Math.min(phase, count - 1)
  const closing = phase === count

  return (
    <section ref={ref} className="relative bg-background" style={{ height: `${(count + 1) * 100}svh` }} aria-label={copy.open}>
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 pt-16 md:grid-cols-[1fr_1.15fr] md:gap-16 md:px-10">
          <div className="order-2 flex flex-col gap-6 md:order-1">
            <p className="font-serif text-2xl leading-tight text-foreground text-balance md:text-4xl">{copy.open}</p>
            <div className="h-px w-16 bg-brass" aria-hidden="true" />
            <div className="min-h-44 md:min-h-56" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={closing ? "close" : top}
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  {closing ? (
                    <p className="font-serif text-3xl italic leading-tight text-brass text-balance md:text-5xl">{copy.close}</p>
                  ) : (
                    <>
                      <Label>
                        {copy.take} {top + 1} / {count}
                      </Label>
                      <h3 className="font-serif text-4xl text-foreground md:text-6xl">{copy.frames[top].title}</h3>
                      <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/70 text-pretty md:text-base">
                        {copy.frames[top].hint}
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative order-1 mx-auto aspect-[4/3] w-[86%] max-w-[34rem] md:order-2 md:w-full">
            {copy.frames.map((frame, index) => {
              const gone = index < top
              const depth = index - top
              return (
                <motion.figure
                  key={frame.image}
                  className="light absolute inset-0 bg-background p-2.5 shadow-2xl shadow-black/60 md:p-3.5"
                  style={{ zIndex: count - index }}
                  initial={false}
                  animate={
                    gone
                      ? { x: "-135%", y: "8%", rotate: -16, opacity: 0 }
                      : { x: depth * 12, y: depth * -10, rotate: TILT[index % TILT.length], scale: 1 - depth * 0.04, opacity: 1 }
                  }
                  transition={{ duration: 0.85, ease: EASE }}
                  aria-hidden={index !== top}
                >
                  <div className="flex h-full flex-col gap-2.5">
                    <div className="relative flex-1 overflow-hidden">
                      <Image
                        src={frame.image}
                        alt={frame.alt}
                        fill
                        sizes="(min-width: 768px) 34rem, 86vw"
                        className="object-cover sepia-[0.55] contrast-[1.05] brightness-[0.9]"
                      />
                    </div>
                    <figcaption className="flex items-baseline justify-between gap-4 px-1">
                      <span className="font-serif text-base italic text-foreground md:text-lg">{frame.title}</span>
                      <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-foreground/55">{copy.place}</span>
                    </figcaption>
                  </div>
                </motion.figure>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
