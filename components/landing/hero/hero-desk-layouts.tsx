"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { type ReactNode, useRef } from "react"
import { RevealTitle } from "./hero-desk"
import { type BeamPath, EASE, Grain, HeroActions, type HeroCopy, beamMask, useBeam } from "./shared"

const DESK_BEAM: BeamPath = { x: 0.5, y: 0.42, reachX: 0.3, reachY: 0.2, mobileReachX: 0.32, speed: 0.8 }

/** Variant A's lamp-lit desk, but contained in a panel so layouts can give it half, two thirds or a band. */
function DeskPhoto({ className, children }: { className: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useBeam(ref, DESK_BEAM)
  const mask = beamMask("7rem", "17rem")

  return (
    <div ref={ref} className={`relative isolate overflow-hidden bg-background ${className}`}>
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.2, rotate: -2 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 3.2, ease: EASE }}
      >
        <Image unoptimized src="/landing/hero-kalamata-map.webp" alt="" fill priority sizes="(min-width: 768px) 66vw, 100vw" className="object-cover object-center brightness-[0.2] saturate-[0.5]" />
        <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
          <Image unoptimized loading="eager" src="/landing/hero-kalamata-map.webp" alt="" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover object-center brightness-[1.15] saturate-[1.05] sepia-[0.15]" />
        </div>
      </motion.div>
      <Grain opacity={0.07} />
      {children}
    </div>
  )
}

function Rule({ delay = 1.6 }: { delay?: number }) {
  return (
    <motion.div
      className="h-px w-full origin-left bg-brass/50"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay, duration: 1.2, ease: EASE }}
      aria-hidden="true"
    />
  )
}

function Pitch({ copy, delay = 2 }: { copy: HeroCopy; delay?: number }) {
  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 1 }}>
      <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base">{copy.body}</p>
      <HeroActions copy={copy} delay={delay + 0.2} hint={false} />
    </motion.div>
  )
}

/** 50 / 50: text on a quiet left half, the lit desk fills the right half. */
export function HeroHalf({ copy }: { copy: HeroCopy }) {
  return (
    <section className="flex min-h-svh flex-col bg-background pt-16 md:flex-row">
      <DeskPhoto className="h-[40svh] shrink-0 md:order-last md:h-auto md:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent to-40% md:bg-gradient-to-r md:to-25%" aria-hidden="true" />
      </DeskPhoto>
      <div className="flex flex-1 items-center px-6 py-8 md:w-1/2 md:px-12 lg:px-20">
        <div className="flex w-full max-w-xl flex-col gap-6 md:gap-8">
          <RevealTitle lines={copy.title} className="font-serif text-4xl leading-[0.95] text-foreground text-balance md:text-6xl lg:text-7xl" />
          <Rule />
          <Pitch copy={copy} />
        </div>
      </div>
    </section>
  )
}

/** Desk takes two thirds on the left; a narrow brass-ruled column on the right carries the text. */
export function HeroTwoThirds({ copy }: { copy: HeroCopy }) {
  return (
    <section className="flex min-h-svh flex-col bg-background pt-16 md:flex-row">
      <DeskPhoto className="h-[40svh] shrink-0 md:h-auto md:w-2/3">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent to-40% md:bg-gradient-to-l md:to-20%" aria-hidden="true" />
      </DeskPhoto>
      <div className="flex flex-1 flex-col justify-end gap-6 px-6 py-8 md:w-1/3 md:justify-center md:gap-8 md:border-l md:border-brass/20 md:px-10 lg:px-12">
        <RevealTitle lines={copy.title} className="font-serif text-4xl leading-[0.95] text-foreground text-balance md:text-5xl lg:text-6xl" />
        <Rule />
        <Pitch copy={copy} />
      </div>
    </section>
  )
}

/** Wide band of desk across the top, title and pitch side by side underneath. */
export function HeroBand({ copy }: { copy: HeroCopy }) {
  return (
    <section className="flex min-h-svh flex-col bg-background pt-16">
      <DeskPhoto className="h-[40svh] shrink-0 md:h-[54svh]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent to-35%" aria-hidden="true" />
      </DeskPhoto>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between md:gap-16 md:px-10 md:pb-12 md:pt-6">
        <RevealTitle lines={copy.title} className="font-serif text-4xl leading-[0.95] text-foreground text-balance md:max-w-3xl md:text-6xl lg:text-7xl" />
        <div className="flex shrink-0 flex-col gap-6 md:w-96 md:border-l md:border-brass/30 md:pl-8">
          <Pitch copy={copy} delay={1.8} />
        </div>
      </div>
    </section>
  )
}

/** The desk sits in a brass frame on the right; the title runs over its edge like a caption laid on a photo. */
export function HeroFramed({ copy }: { copy: HeroCopy }) {
  return (
    <section className="flex min-h-svh items-center bg-background pt-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:gap-0 md:px-10 md:py-10">
        <motion.div
          className="border border-brass/40 p-1.5 md:order-last md:flex-1 md:p-2"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          <DeskPhoto className="h-[32svh] md:h-[72svh]" />
        </motion.div>
        <div className="relative z-10 flex flex-col gap-6 md:-mr-40 md:w-5/12 md:shrink-0 md:gap-8">
          <RevealTitle
            lines={copy.title}
            className="font-serif text-4xl leading-[0.95] text-foreground text-balance [text-shadow:0_2px_28px_var(--background),0_0_8px_var(--background)] md:w-max md:whitespace-nowrap md:text-6xl lg:text-7xl"
          />
          <div className="flex flex-col gap-6 md:mr-40 md:gap-8">
            <Rule />
            <Pitch copy={copy} />
          </div>
        </div>
      </div>
    </section>
  )
}
