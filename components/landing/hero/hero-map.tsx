"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Clue } from "../clues"
import { RevealTitle } from "./hero-desk"
import { EASE, HeroActions, type HeroCopy } from "./shared"

const ROUTE = "M 40 520 C 160 460, 180 340, 300 330 S 470 400, 540 290 S 620 120, 760 110"

/** Parchment opening: a brass route inks itself across an old map and ends on an X. */
export function HeroMap({ copy }: { copy: HeroCopy }) {
  return (
    <section className="light relative isolate flex min-h-svh items-center overflow-hidden bg-background text-foreground">
      <Image
        unoptimized
        src="/landing/old-map.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover opacity-30 mix-blend-multiply"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/20" aria-hidden="true" />

      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMaxYMid meet"
        className="pointer-events-none absolute bottom-0 right-0 -z-10 h-2/3 w-full opacity-40 md:opacity-70 lg:inset-y-0 lg:h-full lg:w-1/2"
        aria-hidden="true"
      >
        <path d={ROUTE} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" className="text-foreground/30" />
        <motion.path
          d={ROUTE}
          fill="none"
          stroke="var(--brass)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1, duration: 3.4, ease: EASE }}
        />
        <motion.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 4.2, duration: 0.6, ease: EASE }}
          style={{ transformOrigin: "760px 110px" }}
          stroke="var(--brass)"
          strokeWidth="5"
          strokeLinecap="round"
        >
          <line x1="742" y1="92" x2="778" y2="128" />
          <line x1="778" y1="92" x2="742" y2="128" />
        </motion.g>
      </svg>

      <Clue id="hero" large className="absolute bottom-[14%] right-[10%] z-10 opacity-70" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-28 md:px-10">
        <motion.p
          className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          {copy.eyebrow}
        </motion.p>
        <RevealTitle
          lines={copy.title}
          delay={1}
          className="max-w-4xl font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
        />
        <motion.p
          className="max-w-lg font-sans text-[15px] leading-relaxed text-foreground/80 text-pretty md:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          {copy.body}
        </motion.p>
        <HeroActions copy={copy} delay={2} />
      </div>
    </section>
  )
}
