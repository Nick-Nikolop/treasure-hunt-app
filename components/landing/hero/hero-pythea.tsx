"use client"

import { type ReactNode, type RefObject, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { EASE, Grain, type HeroCopy, beamMask, useBeam } from "./shared"

const MAP_SRC = "/landing/hero-kalamata-map.png"

/** Splits "is full of stories." into a quiet lead-in and the one word that gets the gold treatment. */
function splitAccent(line: string) {
  const words = line.trim().split(/\s+/)
  const accent = words.pop() ?? ""
  return { lead: words.join(" "), accent }
}

function rise(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 1, ease: EASE },
  }
}

/** Shared centred composition: city name, a quiet italic connective, one huge gilded word, pitch, actions. */
function PytheaFrame({
  copy,
  backdrop,
  sectionRef,
  scrim,
}: {
  copy: HeroCopy
  backdrop: ReactNode
  sectionRef?: RefObject<HTMLElement | null>
  scrim: string
}) {
  const [first, second = ""] = copy.title
  const { lead, accent } = splitAccent(second)

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 pb-12 pt-16 text-center md:pb-14"
    >
      {backdrop}
      <div className={`pointer-events-none absolute inset-0 -z-10 ${scrim}`} aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 md:h-72"
        style={{
          background:
            "linear-gradient(to top, var(--ink) 0%, color-mix(in oklab, var(--ink) 88%, transparent) 16%, color-mix(in oklab, var(--ink) 55%, transparent) 45%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <Grain opacity={0.06} />

      <div className="flex max-w-4xl flex-col items-center gap-6 md:gap-8">
        <h1 className="flex flex-col items-center font-serif text-foreground">
          <motion.span
            className="block text-4xl font-black leading-none tracking-[-0.01em] text-shadow-vintage sm:text-5xl md:text-6xl"
            {...rise(0.6)}
          >
            {first}
          </motion.span>
          {lead ? (
            <motion.span
              className="mt-3 flex items-center gap-4 text-xl font-medium italic leading-none text-foreground/75 md:text-3xl"
              {...rise(0.85)}
            >
              <span className="h-px w-8 bg-brass/60 md:w-14" aria-hidden="true" />
              {lead}
              <span className="h-px w-8 bg-brass/60 md:w-14" aria-hidden="true" />
            </motion.span>
          ) : null}
          <motion.span
            className="mt-1 block bg-[linear-gradient(180deg,color-mix(in_oklab,var(--brass)_55%,var(--foreground))_0%,var(--brass)_48%,color-mix(in_oklab,var(--brass)_72%,var(--ink))_100%)] bg-clip-text pb-2 text-[14vw] font-black leading-[1.05] tracking-[-0.02em] text-transparent drop-shadow-[0_6px_18px_color-mix(in_oklab,var(--ink)_70%,transparent)] sm:text-7xl md:text-8xl"
            initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.3, duration: 1.4, ease: EASE }}
          >
            {accent}
          </motion.span>
        </h1>

        <motion.p
          className="max-w-[34rem] font-serif text-[17px] italic leading-relaxed text-foreground/75 text-pretty text-shadow-vintage md:text-lg"
          {...rise(1.9)}
        >
          {copy.body}
        </motion.p>

        <motion.div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row" {...rise(2.2)}>
          <a
            href="#missions"
            className="w-full rounded-sm bg-brass px-7 py-3.5 font-sans text-[13px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            {copy.primary}
          </a>
          <a
            href="#how"
            className="w-full rounded-sm border border-border bg-background/60 px-7 py-3.5 font-sans text-[13px] font-bold uppercase tracking-[0.18em] text-foreground backdrop-blur-sm transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {copy.secondary}
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#what"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-brass"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
      >
        {copy.scroll}
        <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}>
          <ChevronDown className="size-4" aria-hidden="true" />
        </motion.span>
      </motion.a>
    </section>
  )
}

function MapImage({ className }: { className: string }) {
  return <Image unoptimized src={MAP_SRC} alt="" fill priority sizes="100vw" className={`object-cover object-center ${className}`} />
}

/** Centred, map-backed hero modelled on the Pythea landing. */
export function HeroPythea({ copy }: { copy: HeroCopy }) {
  return (
    <PytheaFrame
      copy={copy}
      scrim="bg-[radial-gradient(ellipse_55%_60%_at_50%_48%,var(--background)_0%,color-mix(in_oklab,var(--background)_75%,transparent)_45%,transparent_100%)]"
      backdrop={
        <motion.div
          className="absolute inset-0 -z-20"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1.03 }}
          transition={{ duration: 6, ease: EASE }}
          aria-hidden="true"
        >
          <MapImage className="brightness-[0.55] saturate-[0.8] sepia-[0.25]" />
        </motion.div>
      }
    />
  )
}

/** Same composition, but the room is dark and a lamp's spotlight drifts across the map on its own. */
export function HeroPytheaSpotlight({ copy }: { copy: HeroCopy }) {
  const sectionRef = useRef<HTMLElement>(null)
  useBeam(sectionRef, { x: 0.5, y: 0.5, reachX: 0.34, reachY: 0.3, mobileReachX: 0.3, speed: 0.9, followPointer: false })
  const mask = beamMask("clamp(4rem, 12vw, 8rem)", "clamp(11rem, 30vw, 20rem)")

  return (
    <PytheaFrame
      copy={copy}
      sectionRef={sectionRef}
      scrim="bg-[radial-gradient(ellipse_90%_42%_at_50%_50%,color-mix(in_oklab,var(--background)_85%,transparent)_0%,transparent_100%)] md:bg-[radial-gradient(ellipse_42%_46%_at_50%_48%,color-mix(in_oklab,var(--background)_70%,transparent)_0%,transparent_100%)]"
      backdrop={
        <div className="absolute inset-0 -z-20" aria-hidden="true">
          <MapImage className="brightness-[0.22] saturate-[0.5] sepia-[0.3]" />
          <motion.div
            className="absolute inset-0"
            style={{ maskImage: mask, WebkitMaskImage: mask }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1.6, ease: EASE }}
          >
            <MapImage className="brightness-[1.05] saturate-[1.05] sepia-[0.1]" />
            <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--brass)_14%,transparent)] mix-blend-overlay" />
          </motion.div>
        </div>
      }
    />
  )
}
