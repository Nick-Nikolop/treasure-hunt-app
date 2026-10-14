"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRef } from "react"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, HiddenMarks, beamMask, toCaps, useBeam } from "./shared"

const IMAGE = "/landing/hero-desk.webp"

const MARKS = [
  { x: "14%", y: "22%", text: "N 37°02′", className: "text-xl", rotate: 4 },
  { x: "84%", y: "18%", text: "ΙΙ · ΧΙV", className: "text-2xl", rotate: -3 },
  { x: "70%", y: "70%", text: "→ 7", className: "text-4xl", rotate: -6 },
  { x: "30%", y: "72%", text: "X", className: "text-5xl" },
]

/** The city is only visible through the giant title and wherever the beam passes. */
export function HeroLetters({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, { x: 0.5, y: 0.45, reachX: 0.36, reachY: 0.3, mobileReachX: 0.36, speed: 0.9 })
  const mask = beamMask("8rem", "18rem")
  const words = copy.title.join(" ").split(" ").map(toCaps)
  const [first, ...rest] = words

  const letterFill = {
    backgroundImage: `url(${IMAGE})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextStroke: "1px oklch(0.78 0.13 78 / 0.45)",
    filter: "drop-shadow(0 0 30px oklch(0.78 0.13 78 / 0.18))",
  } as const

  return (
    <section ref={stageRef} className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
        <Image unoptimized src={IMAGE} alt="" fill priority sizes="100vw" className="object-cover brightness-[0.4] saturate-[0.7]" />
        <HiddenMarks marks={MARKS} />
      </div>

      <motion.h1
        className="relative flex flex-1 flex-col items-center justify-center px-4 pb-4 pt-24 text-center md:absolute md:inset-0 md:pb-48 md:pt-16 font-serif font-extrabold leading-[0.9] tracking-tight"
        style={letterFill}
        initial={{ opacity: 0, letterSpacing: "0.12em", backgroundPosition: "50% 30%" }}
        animate={{ opacity: 1, letterSpacing: "-0.02em", backgroundPosition: ["50% 30%", "40% 70%", "60% 45%"] }}
        transition={{
          opacity: { delay: 0.3, duration: 2.4, ease: EASE },
          letterSpacing: { delay: 0.3, duration: 2.4, ease: EASE },
          backgroundPosition: { duration: 26, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
        }}
      >
        <span className="block py-[0.04em] text-[25vw] md:text-[17vw]">{first}</span>
        {rest.map((word) => (
          <span key={word} className="block py-[0.04em] text-[16vw] md:hidden">
            {word}
          </span>
        ))}
        <span className="hidden py-[0.04em] md:block md:text-[9.5vw]">{rest.join(" ")}</span>
      </motion.h1>
      <div className="pointer-events-none absolute inset-0 bg-background/10" aria-hidden="true" />

      <BeamClue mask={mask} className="left-[88%] top-[56%]" />
      <Grain opacity={0.08} />

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 pb-10 md:mt-auto md:pb-12 text-center">
        <motion.p
          className="max-w-xl font-sans text-base leading-relaxed text-foreground/80 text-pretty md:text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, ease: EASE }}
        >
          <span className="mb-3 block font-sans text-xs uppercase tracking-[0.35em] text-brass">{copy.eyebrow}</span>
          {copy.body}
        </motion.p>
        <HeroActions copy={copy} centered delay={2.3} />
      </div>
    </section>
  )
}
