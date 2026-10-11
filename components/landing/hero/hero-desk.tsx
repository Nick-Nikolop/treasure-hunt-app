"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRef } from "react"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, HiddenMarks, beamMask, useBeam, useTypewriter } from "./shared"

/** Pencil and ink notes on the map that only show under the lamp. */
const MARKS = [
  { x: "53%", y: "30%", text: "ΙΙ · ΧΙV", className: "text-2xl", rotate: -8 },
  { x: "70%", y: "62%", text: "→ 7", className: "text-4xl", rotate: -4 },
  { x: "46%", y: "66%", text: "N 37°02′", className: "text-xl", rotate: 6 },
  { x: "62%", y: "44%", text: "X", className: "text-6xl", rotate: 0 },
]

/** Typed like a case report; the invisible full copy reserves the space so nothing jumps. */
function TypedBody({ text }: { text: string }) {
  const { typed, done } = useTypewriter(text, 1.9)
  return (
    <p className="relative max-w-md font-sans text-base leading-relaxed text-foreground/80 text-pretty md:text-lg">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0" aria-hidden="true">
        {typed}
        {!done && <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-brass" />}
      </span>
      <span className="sr-only">{text}</span>
    </p>
  )
}

/** Overhead shot of an investigator's desk: the beam is a desk lamp drifting over the map. */
export function HeroDesk({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, { x: 0.66, y: 0.5, reachX: 0.2, reachY: 0.26, mobileX: 0.55, mobileReachX: 0.3, speed: 0.8 })
  const mask = beamMask("10rem", "22rem")

  return (
    <section ref={stageRef} className="relative isolate flex min-h-svh items-center overflow-hidden bg-background">
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.25, rotate: -2 }}
        animate={{ scale: 1.05, rotate: 0 }}
        transition={{ duration: 3.2, ease: EASE }}
      >
        <Image unoptimized src="/landing/hero-desk.webp" alt="" fill priority sizes="100vw" className="object-cover brightness-[0.2] saturate-[0.5]" />
        <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
          <Image unoptimized loading="eager" src="/landing/hero-desk.webp" alt="" fill sizes="100vw" className="object-cover brightness-[1.15] saturate-[1.05] sepia-[0.15]" />
          <HiddenMarks marks={MARKS} tone="ink" />
        </div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 bg-background/75 md:bg-transparent md:bg-gradient-to-r md:from-background md:via-background/30 md:to-transparent"
        aria-hidden="true"
      />

      <BeamClue mask={mask} className="left-[82%] top-[36%]" />
      <Grain opacity={0.07} />

      <motion.figure
        className="absolute bottom-[9%] right-[6%] z-[5] hidden w-56 bg-foreground p-2.5 pb-4 shadow-2xl lg:block xl:w-64"
        initial={{ opacity: 0, y: -80, rotate: -24, scale: 1.2 }}
        animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
        transition={{ delay: 2.6, type: "spring", stiffness: 120, damping: 14 }}
      >
        <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 bg-brass/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="relative aspect-square overflow-hidden">
          <Image unoptimized src="/landing/scene-clue.webp" alt="" fill sizes="16rem" className="object-cover saturate-[0.7] sepia-[0.25]" />
        </div>
        <figcaption className="pt-3 text-center font-serif text-sm italic text-background">{copy.evidenceCaption}</figcaption>
      </motion.figure>

      <motion.p
        className="absolute bottom-[12%] right-[26%] z-[5] hidden -rotate-6 font-serif text-2xl italic text-brass lg:block xl:right-[24%]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.3, duration: 1, ease: EASE }}
        aria-hidden="true"
      >
        {copy.deskNote} ↘
      </motion.p>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-28 md:px-10">
        <motion.div
          className="flex w-fit -rotate-2 items-center gap-3 border-2 border-brass/70 px-4 py-2 font-sans text-xs uppercase tracking-[0.3em] text-brass"
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.35, ease: [0.5, 0, 0.75, 0] }}
        >
          {copy.caseLabel}
        </motion.div>

        <h1 className="font-serif text-6xl leading-[0.95] text-foreground text-balance md:text-8xl">
          {copy.title.map((line, index) => (
            <span key={line} className="block overflow-hidden pb-2">
              <motion.span
                className={`block ${index === 1 ? "italic text-brass" : ""}`}
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ delay: 1.4 + index * 0.18, duration: 1.1, ease: EASE }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <TypedBody text={copy.body} />
        <HeroActions copy={copy} delay={2.1} />
      </div>
    </section>
  )
}
