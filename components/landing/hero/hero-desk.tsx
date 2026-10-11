"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRef } from "react"
import { BeamClue, EASE, HeroActions, type HeroCopy, HiddenMarks, beamMask, useBeam } from "./shared"

/** Pencil and ink notes on the map that only show under the lamp. */
const MARKS = [
  { x: "53%", y: "30%", text: "ΙΙ · ΧΙV", className: "text-2xl", rotate: -8 },
  { x: "70%", y: "62%", text: "→ 7", className: "text-4xl", rotate: -4 },
  { x: "46%", y: "66%", text: "N 37°02′", className: "text-xl", rotate: 6 },
  { x: "62%", y: "44%", text: "X", className: "text-6xl", rotate: 0 },
]

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

        <motion.p
          className="max-w-md font-sans text-lg leading-relaxed text-foreground/80 text-pretty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 1 }}
        >
          {copy.body}
        </motion.p>
        <HeroActions copy={copy} delay={2.1} />
      </div>
    </section>
  )
}
