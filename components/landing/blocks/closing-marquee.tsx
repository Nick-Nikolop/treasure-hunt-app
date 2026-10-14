"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { ClueReward } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { Rise } from "../pages/kit"

/** A brass band with the closing line rolling past endlessly, then the call to action beneath it. */
export function ClosingMarquee({ copy }: { copy: LandingCopy["closing"] }) {
  const logoSrc = useLogoSrc()
  const reduceMotion = useReducedMotion()
  const run = Array.from({ length: 4 })

  return (
    <section className="border-t border-border/60 bg-background">
      <div className="overflow-hidden bg-brass py-8 text-ink md:py-12">
        <h2 className="sr-only">{copy.title}</h2>
        <motion.div
          className="flex w-max"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 36, ease: "linear", repeat: Infinity }}
          aria-hidden="true"
        >
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0">
              {run.map((_, index) => (
                <span key={index} className="flex items-center gap-10 whitespace-nowrap pr-10 font-serif text-5xl italic md:gap-16 md:pr-16 md:text-8xl">
                  {copy.title}
                  <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={64} height={62} className="h-auto w-10 mix-blend-multiply md:w-16" />
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
        <Rise>
          <p className="max-w-lg font-sans text-lg leading-relaxed text-foreground/80">{copy.body}</p>
        </Rise>
        <ClueReward />
        <Rise delay={0.1}>
          <a
            href="#missions"
            className="inline-block rounded-full bg-primary px-8 py-4 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.cta}
          </a>
        </Rise>
      </div>
    </section>
  )
}
