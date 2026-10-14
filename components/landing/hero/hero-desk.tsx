"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { type ReactNode, useRef } from "react"
import { BeamClue, type BeamPath, EASE, Grain, HeroActions, type HeroCopy, beamMask, useBeam, useTypewriter } from "./shared"

/** Typed like a case report; the invisible full copy reserves the space so nothing jumps. */
export function TypedBody({ text, className = "" }: { text: string; className?: string }) {
  const { typed, done } = useTypewriter(text, 1.9)
  return (
    <p className={`relative max-w-md font-sans text-base leading-relaxed text-foreground/80 text-pretty md:text-lg ${className}`}>
      <span className="invisible">{text}</span>
      <span className="absolute inset-0" aria-hidden="true">
        {typed}
        {!done && <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-brass" />}
      </span>
      <span className="sr-only">{text}</span>
    </p>
  )
}

/** Title lines that slide up from behind a mask; `accent` styles the second line. */
export function RevealTitle({
  lines,
  className,
  lineClassName = "block",
  accent = "italic text-brass",
  delay = 1.4,
  as: Tag = "h1",
}: {
  lines: string[]
  className: string
  lineClassName?: string
  accent?: string
  delay?: number
  as?: "h1" | "p"
}) {
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <span key={line} className={`overflow-hidden pb-2 ${lineClassName}`}>
          <motion.span
            className={`block ${index === 1 ? accent : ""}`}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: delay + index * 0.18, duration: 1.1, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/**
 * Overhead shot of an investigator's desk: the beam is a desk lamp drifting over the Kalamata map.
 * `children` receives the beam mask so a layout can light its own elements too.
 */
export function DeskStage({
  beam,
  shade,
  clueClassName = "left-[46%] top-[83%]",
  maskSize = ["10rem", "22rem"],
  className = "items-center",
  children,
}: {
  beam: BeamPath
  shade: string
  clueClassName?: string
  maskSize?: [string, string]
  className?: string
  children: (mask: string) => ReactNode
}) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, beam)
  const mask = beamMask(...maskSize)

  return (
    <section ref={stageRef} className={`relative isolate flex min-h-svh overflow-hidden bg-background ${className}`}>
      <motion.div
        className="absolute inset-x-0 bottom-0 top-16 -z-10 overflow-hidden"
        initial={{ scale: 1.2, rotate: -2 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 3.2, ease: EASE }}
      >
        <Image unoptimized src="/landing/hero-desk.webp" alt="" fill priority sizes="100vw" className="object-cover object-top brightness-[0.2] saturate-[0.5]" />
        <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
          <Image unoptimized loading="eager" src="/landing/hero-desk.webp" alt="" fill sizes="100vw" className="object-cover object-top brightness-[1.15] saturate-[1.05] sepia-[0.15]" />
        </div>
      </motion.div>

      <div className={`pointer-events-none absolute inset-0 ${shade}`} aria-hidden="true" />
      <BeamClue mask={mask} className={clueClassName} />
      <Grain opacity={0.07} />
      {children(mask)}
    </section>
  )
}

/** A: the original desk layout, left column over a dark fade. */
export function HeroDesk({ copy }: { copy: HeroCopy }) {
  return (
    <DeskStage
      beam={{ x: 0.66, y: 0.5, reachX: 0.2, reachY: 0.26, mobileX: 0.55, mobileReachX: 0.3, speed: 0.8 }}
      shade="bg-background/75 md:bg-transparent md:bg-gradient-to-r md:from-background md:via-background/30 md:to-transparent"
    >
      {() => (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-28 md:px-10">
          <RevealTitle lines={copy.title} className="font-serif text-6xl leading-[0.95] text-foreground text-balance md:text-8xl" />
          <TypedBody text={copy.body} />
          <HeroActions copy={copy} delay={2.1} />
        </div>
      )}
    </DeskStage>
  )
}
