"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ClueReward } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE } from "../pages/kit"

const ROUTE = "M 40 360 C 120 300, 90 200, 190 180 S 330 260, 380 160 S 420 60, 520 50"
const STOPS = [
  [40, 360],
  [190, 180],
  [380, 160],
]

/** Parchment: the route inks itself from stop to stop and lands on the X beside the invitation. */
export function ClosingRoute({ copy }: { copy: LandingCopy["closing"] }) {
  const viewport = { once: true, margin: "-20% 0px" }
  return (
    <section className="light relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-background py-8 text-foreground md:py-12">
      <Image unoptimized loading="eager" src="/landing/old-map.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30 mix-blend-multiply" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-6 md:px-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4 md:gap-6">
          <h2 className="font-serif text-4xl leading-[1.02] text-balance md:text-6xl">{copy.title}</h2>
          <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/75 md:text-base">{copy.body}</p>
          <ClueReward />
          <a
            href="#missions"
            className="w-fit rounded-full bg-primary px-8 py-4 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.cta}
          </a>
        </div>

        <svg viewBox="0 0 560 400" className="max-h-[32svh] w-full lg:max-h-[60svh]" aria-hidden="true">
          <path d={ROUTE} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" className="text-foreground/35" />
          <motion.path
            d={ROUTE}
            fill="none"
            stroke="var(--brass)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={viewport}
            transition={{ duration: 2.6, ease: EASE }}
          />
          {STOPS.map(([cx, cy], index) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={cy}
              r="7"
              fill="var(--background)"
              stroke="var(--brass)"
              strokeWidth="3"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={viewport}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              transition={{ delay: 0.2 + index * 0.75, duration: 0.4, ease: EASE }}
            />
          ))}
          <motion.g
            stroke="var(--brass)"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewport}
            style={{ transformOrigin: "520px 50px" }}
            transition={{ delay: 2.5, duration: 0.5, ease: EASE }}
          >
            <line x1="500" y1="30" x2="540" y2="70" />
            <line x1="540" y1="30" x2="500" y2="70" />
          </motion.g>
        </svg>
      </div>
    </section>
  )
}
