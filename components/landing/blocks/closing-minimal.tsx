"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { ClueReward } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE } from "../pages/kit"

/** Nothing but type: the line set huge, word by word, and a single arrow to the hunts. */
export function ClosingMinimal({ copy }: { copy: LandingCopy["closing"] }) {
  const words = copy.title.split(" ")
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center border-t border-border/60 bg-background py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:gap-12 md:px-10">
        <h2 className="font-serif text-5xl leading-[0.92] text-foreground text-balance md:text-7xl lg:text-8xl">
          {words.map((word, index) => (
            <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-2 pr-[0.22em] align-bottom">
              <motion.span
                className={`inline-block ${index === words.length - 1 ? "italic text-brass" : ""}`}
                initial={{ y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ delay: index * 0.08, duration: 1, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h2>
        <div className="flex flex-col gap-6 border-t border-border/60 pt-6 md:flex-row md:items-end md:justify-between md:gap-10 md:pt-8">
          <div className="flex max-w-md flex-col gap-4 md:gap-5">
            <p className="font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.body}</p>
            <ClueReward />
          </div>
          <a
            href="#missions"
            className="group flex items-center gap-4 font-serif text-3xl text-foreground hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-4xl"
          >
            <span className="border-b border-brass pb-1">{copy.cta}</span>
            <ArrowRight className="size-8 text-brass transition-transform duration-500 group-hover:translate-x-2" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
