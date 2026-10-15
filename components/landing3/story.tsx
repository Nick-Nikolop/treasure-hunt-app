"use client"

import Image from "next/image"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { COORDS, type TrailCopy } from "./copy"
import { InkStatement } from "./ink-statement"

export function FirstStatement({ copy }: { copy: TrailCopy }) {
  return (
    <section className="relative z-10 flex min-h-[100svh] flex-col justify-center gap-8 px-5 py-28 md:px-12">
      <InkStatement text={copy.first.statement} />
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.9 }}
        className="mx-auto max-w-xl text-pretty text-center text-[15px] font-medium leading-relaxed text-hill-ink/75 md:text-base"
      >
        {copy.first.sub}
      </motion.p>
      <div className="mx-auto mt-10 flex w-full max-w-5xl items-center justify-between gap-6 text-sm font-medium tracking-[0.04em] text-hill-ink/80 md:mt-20 md:text-[15px]">
        <span>
          {COORDS.lat} {copy.lat}
        </span>
        <span aria-hidden className="h-px w-12 bg-hill-ink/30" />
        <span>
          {COORDS.lng} {copy.lng}
        </span>
      </div>
    </section>
  )
}

export function SecondStatement({ copy }: { copy: TrailCopy }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const slow = useTransform(scrollYProgress, [0, 1], [60, -60])
  const fast = useTransform(scrollYProgress, [0, 1], [140, -140])
  const plateRotate = useTransform(scrollYProgress, [0, 1], [5, -2])
  const s = copy.second

  return (
    <section className="relative z-10 px-5 pb-28 pt-10 md:px-12 md:pb-40">
      <InkStatement text={s.statement} />

      <div ref={ref} className="mx-auto mt-16 grid max-w-7xl gap-12 md:mt-24 md:grid-cols-12 md:gap-8">
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-4 md:col-span-4 md:mx-0 md:flex-col md:gap-20 md:overflow-visible md:px-0 md:pb-0">
          <SlideMount slide={s.slides[0]} roll={s.roll} y={slow} className="md:-rotate-3" />
          <SlideMount slide={s.slides[1]} roll={s.roll} y={fast} className="md:ml-28 md:rotate-2" />
          <SlideMount slide={s.slides[2]} roll={s.roll} y={slow} className="md:ml-6 md:-rotate-1" />
        </div>

        <motion.figure
          style={{ rotate: plateRotate }}
          className="relative mx-auto aspect-[4/5] w-full max-w-sm self-center bg-hill-card p-3 shadow-[0_24px_60px_-20px] shadow-hill-ink/40 md:col-span-4 md:max-w-none"
        >
          <div className="relative h-full w-full overflow-hidden">
            <Image src="/landing/old-map.webp" alt={s.plateAlt} fill sizes="(min-width: 768px) 33vw, 90vw" className="object-cover sepia-[.35]" />
            <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-hill-ink/15" />
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-hill-ink/10" />
          </div>
        </motion.figure>

        <div className="flex flex-col justify-end gap-5 md:col-span-4 md:pb-10 md:pl-6">
          {s.body.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.8, delay: i * 0.12 }}
              className="max-w-[42ch] text-pretty text-[15px] leading-[1.75] text-hill-ink/90 md:text-base"
            >
              {p}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  )
}

function SlideMount({
  slide,
  roll,
  y,
  className,
}: {
  slide: TrailCopy["second"]["slides"][number]
  roll: string
  y: MotionValue<number>
  className?: string
}) {
  return (
    <motion.figure
      style={{ y }}
      className={cn(
        "flex w-52 shrink-0 flex-col gap-2 rounded-lg border border-hill-deep bg-hill-card p-3 shadow-[0_18px_40px_-18px] shadow-hill-ink/50 md:w-56",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-sm bg-hill-paper px-2 py-0.5 font-field text-xs font-semibold tracking-[0.08em] text-hill-ink">{slide.code}</span>
        <span className="font-plate text-sm italic text-hill-ink/70">A</span>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-hill-ink">
        <Image src={slide.src} alt={slide.alt} fill sizes="224px" className="object-cover sepia-[.25]" />
      </div>
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-hill-ink">{roll}</span>
        <span className="text-xs text-hill-ink/60">{slide.place}</span>
      </figcaption>
    </motion.figure>
  )
}
