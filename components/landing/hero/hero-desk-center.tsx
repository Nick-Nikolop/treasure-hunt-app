"use client"

import { motion } from "framer-motion"
import { DeskStage, RevealTitle } from "./hero-desk"
import { HeroActions, type HeroCopy } from "./shared"

/** The desk lamp follows the mouse; everything is stacked in the middle of the frame. */
export function HeroDeskCenter({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.5, y: 0.5, reachX: 0.32, reachY: 0.22, speed: 0.7, followPointer: true }}
      shade="bg-[radial-gradient(ellipse_at_center,transparent_10%,var(--background)_92%)]"
      clueClassName="left-[78%] top-[28%]"
      className="items-center justify-center"
    >
      {() => (
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-6 pb-16 pt-28 text-center">
          <motion.p
            className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 1 }}
          >
            {copy.eyebrow}
          </motion.p>
          <RevealTitle
            lines={copy.title}
            className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
          />
          <motion.p
            className="max-w-xl font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            {copy.body}
          </motion.p>
          <HeroActions copy={copy} centered delay={2.2} />
        </div>
      )}
    </DeskStage>
  )
}
