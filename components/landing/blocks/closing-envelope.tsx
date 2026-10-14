"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ClueReward } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { EASE } from "../pages/kit"

const POCKET = "polygon(0 0, 50% 62%, 100% 0, 100% 100%, 0 100%)"

/** A letter rises out of a sealed envelope carrying the invitation. */
export function ClosingEnvelope({ copy }: { copy: LandingCopy["closing"] }) {
  const logoSrc = useLogoSrc()
  return (
    <section className="light relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-background px-6 py-8 text-foreground md:py-12">
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="absolute inset-x-0 bottom-0 top-1/3 rounded-sm bg-card shadow-[0_50px_80px_-40px_oklch(0.2_0.03_60/0.7)]" aria-hidden="true" />

        <motion.div
          className="relative mx-4 flex flex-col items-center gap-4 border border-foreground/10 bg-background px-5 pb-32 pt-8 text-center shadow-[0_20px_40px_-20px_oklch(0.2_0.03_60/0.4)] md:mx-10 md:gap-5 md:px-12 md:pb-40 md:pt-10"
          initial={{ y: "28%" }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ delay: 0.3, duration: 1.4, ease: EASE }}
        >
          <span className="h-px w-12 bg-brass" aria-hidden="true" />
          <h2 className="font-serif text-3xl leading-tight text-balance md:text-5xl">{copy.title}</h2>
          <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/75 md:text-base">{copy.body}</p>
          <ClueReward />
          <a
            href="#missions"
            className="rounded-full bg-primary px-8 py-4 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.cta}
          </a>
        </motion.div>

        <div className="relative -mt-28 h-28 md:-mt-36 md:h-36">
          <div className="absolute inset-0 border-t border-foreground/10 bg-card" style={{ clipPath: POCKET }} aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/5 to-transparent" style={{ clipPath: POCKET }} aria-hidden="true" />
          <motion.div
            className="absolute left-1/2 top-[62%] flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brass shadow-[inset_0_-5px_10px_rgba(0,0,0,0.3),0_6px_12px_-4px_rgba(0,0,0,0.5)] md:size-24"
            initial={{ scale: 1.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.5, 0, 0.75, 0] }}
          >
            <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={64} height={62} className="h-auto w-12 opacity-80 mix-blend-multiply md:w-14" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
