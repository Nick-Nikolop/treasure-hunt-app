"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { Clue } from "../clues"
import { RevealTitle } from "./hero-desk"
import { EASE, Grain, HeroActions, type HeroCopy } from "./shared"

/** An old photograph of the port develops out of black, then drifts slowly while the title rises over it. */
export function HeroPhoto({ copy }: { copy: HeroCopy }) {
  const reduceMotion = useReducedMotion()
  return (
    <section className="relative isolate flex min-h-svh items-end overflow-hidden bg-background">
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0, filter: "brightness(0) sepia(1)" }}
        animate={{ opacity: 1, filter: "brightness(0.55) sepia(0.55)" }}
        transition={{ duration: 3.2, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.15 }}
          animate={reduceMotion ? { scale: 1.05 } : { scale: [1.15, 1.05, 1.1] }}
          transition={{ duration: 28, ease: "easeInOut", repeat: reduceMotion ? 0 : Infinity, repeatType: "mirror" }}
        >
          <Image unoptimized src="/landing/limani.webp" alt="" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-background/30" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 shadow-[inset_0_0_180px_60px_var(--background)]" aria-hidden="true" />
      <Grain opacity={0.1} />

      <Clue id="hero" large className="absolute right-[18%] top-[30%] z-10 opacity-60 md:right-[24%]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 pb-14 pt-28 md:px-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="flex flex-col gap-6">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
          >
            {copy.eyebrow}
          </motion.p>
          <RevealTitle
            lines={copy.title}
            delay={1.8}
            className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
          />
        </div>
        <motion.div
          className="flex flex-col gap-6 border-l border-brass/50 pl-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.4, duration: 1, ease: EASE }}
        >
          <p className="font-sans text-[15px] leading-relaxed text-foreground/80 text-pretty md:text-base">{copy.body}</p>
          <HeroActions copy={copy} delay={2.6} />
        </motion.div>
      </div>
    </section>
  )
}
