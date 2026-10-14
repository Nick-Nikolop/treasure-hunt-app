"use client"

import { motion } from "framer-motion"
import { DeskStage, RevealTitle } from "./hero-desk"
import { EASE, HeroActions, type HeroCopy } from "./shared"

/** One wide title line across the bottom, with the pitch and buttons in a single row beneath a brass rule. */
export function HeroDeskLine({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.5, y: 0.36, reachX: 0.3, reachY: 0.16, mobileReachX: 0.34, speed: 0.8 }}
      shade="bg-gradient-to-t from-background via-background/55 to-transparent"
      clueClassName="left-[26%] top-[26%]"
      className="items-end"
    >
      {() => (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-14 pt-28 md:px-10">
          <RevealTitle
            lines={copy.title}
            className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
            lineClassName="block"
          />
          <motion.div
            className="h-px origin-left bg-brass/50"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.6, duration: 1.2, ease: EASE }}
            aria-hidden="true"
          />
          <motion.div
            className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            <p className="max-w-xl font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base">
              {copy.body}
            </p>
            <div className="shrink-0">
              <HeroActions copy={copy} delay={2.2} hint={false} />
            </div>
          </motion.div>
        </div>
      )}
    </DeskStage>
  )
}
