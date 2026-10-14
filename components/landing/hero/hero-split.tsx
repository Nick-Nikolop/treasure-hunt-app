"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRef } from "react"
import { RevealTitle } from "./hero-desk"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, beamMask, useBeam } from "./shared"

/** Text on the left; on the right a dark photograph you search with a flashlight that follows the mouse. */
export function HeroSplit({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLDivElement>(null)
  useBeam(stageRef, { x: 0.5, y: 0.5, reachX: 0.3, reachY: 0.25, speed: 0.9, followPointer: true })
  const mask = beamMask("6rem", "14rem")

  return (
    <section className="relative isolate grid min-h-svh bg-background pt-16 lg:grid-cols-2">
      <div className="order-2 flex items-center px-6 py-14 md:px-10 lg:order-1 lg:py-0 lg:pl-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]">
        <div className="flex max-w-xl flex-col gap-8">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            {copy.eyebrow}
          </motion.p>
          <RevealTitle
            lines={copy.title}
            delay={1.2}
            className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl"
          />
          <motion.p
            className="font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 1 }}
          >
            {copy.body}
          </motion.p>
          <HeroActions copy={copy} delay={2.1} />
        </div>
      </div>

      <motion.div
        ref={stageRef}
        className="relative order-1 h-[46svh] cursor-crosshair overflow-hidden lg:order-2 lg:h-auto"
        initial={{ clipPath: "inset(0 0 0 100%)" }}
        animate={{ clipPath: "inset(0 0 0 0%)" }}
        transition={{ delay: 0.4, duration: 1.6, ease: EASE }}
      >
        <Image unoptimized src="/landing/scene-clue.webp" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover brightness-[0.15] saturate-50" />
        <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
          <Image unoptimized src="/landing/scene-clue.webp" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover brightness-110 sepia-[0.2]" />
        </div>
        <BeamClue mask={mask} className="left-[30%] top-[62%]" />
        <Grain opacity={0.08} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 to-transparent lg:bg-gradient-to-r lg:from-background lg:via-transparent" aria-hidden="true" />
      </motion.div>
    </section>
  )
}
