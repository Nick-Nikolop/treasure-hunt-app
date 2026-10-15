"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowDown } from "lucide-react"
import { useRef } from "react"
import { caps, type TrailCopy } from "./copy"

export function Hero({ copy, ready }: { copy: TrailCopy["hero"]; ready: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1.22])
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"])
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 28, filter: "blur(6px)" },
    animate: ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined,
    transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] as const },
  })

  return (
    <section id="top" ref={ref} className="relative flex h-[100svh] min-h-[560px] items-center justify-center overflow-hidden bg-hill-ink">
      <motion.div className="absolute inset-0" style={{ scale, y }}>
        <Image src="/landing3/hero.webp" alt={copy.alt} fill priority sizes="100vw" className="object-cover" />
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-hill-ink/70 via-hill-ink/25 to-hill-ink/75" />

      <motion.div style={{ opacity: fade }} className="relative z-10 flex flex-col items-center gap-4 px-6 text-center text-hill-paper">
        <motion.p {...rise(0.1)} className="font-plate text-lg tracking-[0.22em] md:text-2xl">
          {caps(copy.eyebrow)}
        </motion.p>
        <motion.h1 {...rise(0.25)} className="font-plate text-[clamp(4.5rem,15vw,12rem)] font-light leading-[0.9] tracking-[-0.01em]">
          {copy.title}
        </motion.h1>
        <motion.p {...rise(0.45)} className="font-plate text-base tracking-[0.2em] md:text-xl">
          {caps(copy.tag)}
        </motion.p>
        <motion.p {...rise(0.6)} className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-hill-paper/85 md:text-base">
          {copy.plain}
        </motion.p>
      </motion.div>

      <motion.div
        {...rise(0.85)}
        className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-hill-paper/80 md:bottom-20"
      >
        <span className="text-xs font-medium uppercase tracking-[0.2em]">{copy.scroll}</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowDown className="size-4" aria-hidden />
        </motion.span>
      </motion.div>

      <svg
        aria-hidden
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 z-10 h-8 w-full fill-hill-paper md:h-12"
      >
        <path d="M0 60 V34 C120 20 220 44 360 30 C520 14 640 42 800 28 C960 14 1080 40 1220 26 C1320 16 1390 30 1440 24 V60 Z" />
      </svg>
    </section>
  )
}
