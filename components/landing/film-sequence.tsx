"use client"

import Image from "next/image"
import { useRef } from "react"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import type { LandingCopy } from "./copy"

type Frame = LandingCopy["film"]["frames"][number]

/** Scroll-scrubbed sequence: the section pins and each frame plays as one shot. */
export function FilmSequence({ copy }: { copy: LandingCopy["film"] }) {
  const trackRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] })

  const openOpacity = useTransform(scrollYProgress, [0, 0.04, 0.14, 0.2], [0, 1, 1, 0])
  const closeOpacity = useTransform(scrollYProgress, [0.84, 0.92], [0, 1])
  const closeY = useTransform(scrollYProgress, [0.84, 0.95], [30, 0])
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const count = copy.frames.length

  return (
    <section ref={trackRef} className="relative h-[400svh]" aria-label={copy.open}>
      <div className="sticky top-0 flex h-svh items-center overflow-hidden bg-background">
        {copy.frames.map((frame, index) => (
          <Shot key={frame.image} frame={frame} index={index} count={count} progress={scrollYProgress} take={copy.take} />
        ))}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-20 h-[7svh] bg-background" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[7svh] items-center bg-background px-6 md:px-10">
          <div className="h-px w-full bg-border/60">
            <motion.div className="h-px bg-brass" style={{ width: progressWidth }} />
          </div>
        </div>

        <motion.p
          className="absolute inset-x-0 z-10 mx-auto max-w-4xl px-6 text-center font-serif text-3xl leading-tight text-foreground text-balance md:text-6xl"
          style={{ opacity: openOpacity }}
        >
          {copy.open}
        </motion.p>

        <motion.p
          className="absolute inset-x-0 bottom-[14svh] z-10 mx-auto max-w-4xl px-6 text-center font-serif text-3xl italic leading-tight text-brass text-balance md:text-5xl"
          style={{ opacity: closeOpacity, y: closeY }}
        >
          {copy.close}
        </motion.p>
      </div>
    </section>
  )
}

function Shot({
  frame,
  index,
  count,
  progress,
  take,
}: {
  frame: Frame
  index: number
  count: number
  progress: MotionValue<number>
  take: string
}) {
  const span = 0.8 / count
  const start = 0.14 + index * span
  const end = start + span
  const isLast = index === count - 1

  const opacity = useTransform(
    progress,
    isLast ? [start - 0.04, start + 0.03] : [start - 0.04, start + 0.03, end - 0.02, end + 0.04],
    isLast ? [0, 1] : [0, 1, 1, 0],
  )
  const scale = useTransform(progress, [start - 0.04, end + 0.1], [1.18, 1])
  const x = useTransform(progress, [start, end], index % 2 === 0 ? ["-2%", "2%"] : ["2%", "-2%"])
  const titleOpacity = useTransform(progress, [start + 0.02, start + 0.07, end - 0.05, end], isLast ? [0, 1, 1, 0] : [0, 1, 1, 0])
  const titleY = useTransform(progress, [start + 0.02, start + 0.08], [24, 0])

  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <motion.div className="absolute inset-0" style={{ scale, x }}>
        <Image src={frame.image} alt={frame.alt} fill sizes="100vw" className="object-cover brightness-[0.6]" />
      </motion.div>
      <motion.div
        className="absolute bottom-[14svh] left-0 z-10 flex flex-col gap-3 px-6 md:left-10 md:px-0"
        style={{ opacity: titleOpacity, y: titleY }}
      >
        <span className="font-sans text-xs uppercase tracking-[0.35em] text-brass">
          {take} {index + 1} / {count}
        </span>
        <span className="font-serif text-5xl text-foreground md:text-8xl">{frame.title}</span>
      </motion.div>
    </motion.div>
  )
}
