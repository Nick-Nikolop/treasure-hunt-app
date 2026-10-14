"use client"

import { motion } from "framer-motion"
import { DeskStage, RevealTitle } from "./hero-desk"
import { EASE, HeroActions, type HeroCopy } from "./shared"

/** B: the map gets the whole frame; one huge centred title and the two buttons along the bottom. */
export function HeroDeskCenter({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.5, y: 0.4, reachX: 0.28, reachY: 0.16, mobileReachX: 0.32, speed: 0.8 }}
      shade="bg-gradient-to-t from-background via-background/50 to-transparent"
      clueClassName="left-[30%] top-[30%]"
      className="items-end"
    >
      {() => (
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 pb-16 pt-28 text-center md:pb-20">
          <RevealTitle
            lines={copy.title}
            className="font-serif text-6xl leading-[0.9] text-foreground text-balance md:text-8xl lg:text-9xl"
            lineClassName="block md:inline-block md:px-[0.12em]"
          />
          <HeroActions copy={copy} centered delay={2} hint={false} />
        </div>
      )}
    </DeskStage>
  )
}

/** D: a low editorial band: title on the left, pitch and buttons on the right, split by a brass rule. */
export function HeroDeskBand({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.55, y: 0.36, reachX: 0.28, reachY: 0.14, mobileReachX: 0.32, speed: 0.8 }}
      shade="bg-gradient-to-t from-background via-background/60 to-transparent"
      clueClassName="left-[78%] top-[24%]"
      className="items-end"
    >
      {() => (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-14 pt-28 md:px-10">
          <motion.div
            className="h-px origin-left bg-brass/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.2, duration: 1.4, ease: EASE }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-16">
            <RevealTitle
              lines={copy.title}
              className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
              lineClassName="block lg:inline-block lg:pr-[0.25em]"
            />
            <motion.div
              className="flex max-w-sm shrink-0 flex-col gap-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 1, ease: EASE }}
            >
              <p className="font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base">{copy.body}</p>
              <HeroActions copy={copy} delay={2.2} hint={false} />
            </motion.div>
          </div>
        </div>
      )}
    </DeskStage>
  )
}
