"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useRef } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { useScrollPhase } from "../film/use-scroll-phase"
import { EASE, Label } from "../pages/kit"

/** The section pins and shows one sentence at a time, each blurring in as the last one leaves. */
export function StoryOneLine({ copy }: { copy: LandingCopy["story"] }) {
  const ref = useRef<HTMLDivElement>(null)
  const count = copy.lines.length + 1
  const phase = useScrollPhase(ref, count)
  const last = phase === count - 1

  return (
    <section className="bg-background">
      <div ref={ref} className="relative" style={{ height: `${count * 70}svh` }}>
        <div className="sticky top-0 flex h-svh items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 md:grid-cols-[9rem_1fr] md:px-10">
            <div className="flex items-center gap-5 md:flex-col md:items-start">
              <Label>{copy.label}</Label>
              <div className="flex gap-2 md:flex-col" aria-hidden="true">
                {Array.from({ length: count }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-px w-8 transition-colors duration-500 md:h-8 md:w-px ${index <= phase ? "bg-brass" : "bg-foreground/20"}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex min-h-[50svh] items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  {last ? (
                    <div className="flex flex-col gap-6">
                      <p className="font-serif text-5xl italic leading-none text-brass md:text-8xl">{copy.close}</p>
                      <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">
                        {copy.after} <Clue id="story" className="-my-2" />
                      </p>
                    </div>
                  ) : (
                    <p className="font-serif text-4xl leading-[1.1] text-foreground text-balance md:text-7xl">{copy.lines[phase]}</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
