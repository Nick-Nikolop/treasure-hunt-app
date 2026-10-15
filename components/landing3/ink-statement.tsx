"use client"

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { caps } from "./copy"

type Props = {
  text: string
  className?: string
  as?: "h2" | "p"
}

export function InkStatement({ text, className, as = "h2" }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.3"] })
  const rotate = useTransform(scrollYProgress, (v) => (reduced ? 0 : (1 - v) * -2.4))
  const skew = useTransform(scrollYProgress, (v) => (reduced ? 0 : (1 - v) * 4))
  const words = caps(text).split(" ")
  const Tag = as === "h2" ? motion.h2 : motion.p

  return (
    <div ref={ref} className="[perspective:1200px]">
      <Tag
        style={{ rotate, rotateX: skew }}
        className={cn(
          "mx-auto max-w-6xl text-balance text-center font-plate text-[clamp(1.6rem,4vw,3.5rem)] font-light leading-[1.12] tracking-[0.03em] text-hill-ink",
          className,
        )}
      >
        {words.map((word, i) => (
          <Word key={`${word}-${i}`} progress={scrollYProgress} start={i / words.length} end={(i + 1.6) / words.length} still={!!reduced}>
            {word}
          </Word>
        ))}
      </Tag>
    </div>
  )
}

function Word({
  progress,
  start,
  end,
  still,
  children,
}: {
  progress: MotionValue<number>
  start: number
  end: number
  still: boolean
  children: string
}) {
  const opacity = useTransform(progress, (v) => {
    if (still) return 1
    const t = Math.min(1, Math.max(0, (v - start) / (end - start)))
    return 0.16 + 0.84 * t
  })
  return (
    <>
      <motion.span style={{ opacity }} className="inline-block">
        {children}
      </motion.span>{" "}
    </>
  )
}
