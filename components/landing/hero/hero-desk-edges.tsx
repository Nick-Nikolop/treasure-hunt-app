"use client"

import { motion } from "framer-motion"
import { DeskStage, RevealTitle } from "./hero-desk"
import { EASE, HeroActions, type HeroCopy } from "./shared"

/** C: the title is torn across the frame, first word top-left and the rest bottom-right, with the map lit between them. */
export function HeroDeskSplit({ copy }: { copy: HeroCopy }) {
  const [first, ...rest] = copy.title
  return (
    <DeskStage
      beam={{ x: 0.52, y: 0.48, reachX: 0.24, reachY: 0.2, mobileReachX: 0.3, speed: 0.8 }}
      shade="bg-gradient-to-b from-background/85 via-background/10 to-background/90"
      clueClassName="left-[24%] top-[62%]"
      className="items-stretch"
    >
      {() => (
        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-between gap-10 px-6 pb-14 pt-28 md:px-10">
          <h1 className="sr-only">{copy.title.join(" ")}</h1>
          <RevealTitle as="p" lines={[first]} className="font-serif text-7xl leading-[0.9] text-foreground md:text-9xl" />
          <div className="flex flex-col-reverse gap-10 md:flex-row md:items-end md:justify-between">
            <HeroActions copy={copy} delay={2.2} hint={false} />
            <RevealTitle
              as="p"
              lines={[rest.join(" ")]}
              className="font-serif text-6xl italic leading-[0.9] text-brass text-balance md:text-right md:text-8xl lg:text-9xl"
              delay={1.5}
            />
          </div>
        </div>
      )}
    </DeskStage>
  )
}

/** E: bookends: the title holds the top edge, the pitch and buttons hold the bottom, the map owns the middle. */
export function HeroDeskBookends({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.55, y: 0.5, reachX: 0.26, reachY: 0.14, mobileReachX: 0.32, speed: 0.8 }}
      shade="bg-gradient-to-b from-background via-transparent to-background"
      clueClassName="left-[20%] top-[50%]"
      className="items-stretch"
    >
      {() => (
        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-between gap-12 px-6 pb-14 pt-28 text-center">
          <RevealTitle
            lines={copy.title}
            className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"
            lineClassName="block md:inline-block md:px-[0.12em]"
          />
          <div className="flex flex-col items-center gap-8">
            <motion.span
              className="h-10 w-px origin-top bg-brass/70"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1.9, duration: 0.9, ease: EASE }}
              aria-hidden="true"
            />
            <motion.p
              className="max-w-xl font-sans text-[15px] leading-relaxed text-foreground/80 text-pretty md:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.1, duration: 1 }}
            >
              {copy.body}
            </motion.p>
            <HeroActions copy={copy} centered delay={2.3} hint={false} />
          </div>
        </div>
      )}
    </DeskStage>
  )
}
