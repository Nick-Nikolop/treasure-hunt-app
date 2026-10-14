"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, HiddenMarks, beamMask, useBeam } from "./shared"

const MARKS = [
  { x: "52%", y: "70%", text: "→ 7", className: "text-3xl md:text-4xl", rotate: -6 },
  { x: "74%", y: "64%", text: "N 37°02′", className: "text-lg md:text-xl", rotate: 4 },
  { x: "62%", y: "34%", text: "X", className: "text-4xl md:text-5xl" },
  { x: "84%", y: "26%", text: "ΙΙ · ΧΙV", className: "text-xl md:text-2xl", rotate: -3 },
]

function Timecode() {
  const [frames, setFrames] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setFrames(Math.floor(((performance.now() - start) / 1000) * 24)), 1000 / 24)
    return () => window.clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, "0")
  const s = Math.floor(frames / 24)
  return (
    <span className="tabular-nums">
      00:{pad(Math.floor(s / 60))}:{pad(s % 60)}:{pad(frames % 24)}
    </span>
  )
}

function CropMarks() {
  const corners = ["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"]
  return (
    <>
      {corners.map((corner) => (
        <span key={corner} className={`pointer-events-none absolute size-5 border-brass/60 md:size-7 ${corner}`} aria-hidden="true" />
      ))}
      <span className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 opacity-40" aria-hidden="true">
        <span className="absolute left-1/2 top-0 h-full w-px bg-foreground" />
        <span className="absolute left-0 top-1/2 h-px w-full bg-foreground" />
      </span>
    </>
  )
}

/** Film subtitles that come and go over the frame. */
function Subtitles({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(-1)
  useEffect(() => {
    let id = 0
    const first = window.setTimeout(() => {
      setIndex(0)
      id = window.setInterval(() => setIndex((value) => (value + 1) % lines.length), 3600)
    }, 3200)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [lines.length])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex justify-center px-6" aria-hidden="true">
      <AnimatePresence mode="wait">
        {index >= 0 && (
          <motion.p
            key={index}
            className="font-sans text-sm text-foreground md:text-lg"
            style={{ textShadow: "0 1px 2px oklch(0 0 0 / 0.9), 0 0 12px oklch(0 0 0 / 0.8)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {lines[index]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** A letterboxed 2.39:1 frame with credit-style titles beneath, like the opening of a film. */
export function HeroWidescreen({ copy }: { copy: HeroCopy }) {
  const frameRef = useRef<HTMLDivElement>(null)
  useBeam(frameRef, { x: 0.66, y: 0.5, reachX: 0.24, reachY: 0.28, mobileX: 0.55, mobileReachX: 0.32 })
  const mask = beamMask("7rem", "15rem")

  return (
    <section className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 pb-10 pt-24 md:gap-8 md:px-10">
      <motion.div
        className="flex w-full items-center justify-between font-sans text-[11px] uppercase tracking-[0.35em] text-foreground/50"
        style={{ maxWidth: "min(100%, calc((100svh - 33rem) * 2.39))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
      >
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-brass" aria-hidden="true" />
          {copy.slate}
        </span>
        <Timecode />
      </motion.div>

      <motion.div
        ref={frameRef}
        className="relative aspect-square w-full overflow-hidden bg-foreground/5 md:aspect-[2.39/1]"
        style={{ maxWidth: "min(100%, calc((100svh - 33rem) * 2.39))" }}
        initial={{ clipPath: "inset(50% 0 50% 0)" }}
        animate={{ clipPath: "inset(0% 0 0% 0)" }}
        transition={{ delay: 0.2, duration: 1.6, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.15, filter: "blur(14px)" }}
          animate={{ scale: 1.03, filter: "blur(0px)" }}
          transition={{ scale: { duration: 10, ease: "easeOut" }, filter: { delay: 0.9, duration: 1.4, ease: EASE } }}
        >
          <Image unoptimized src="/landing/hero-desk.webp" alt="" fill priority sizes="100vw" className="object-cover brightness-[0.28] saturate-[0.6]" />
          <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
            <Image unoptimized loading="eager" src="/landing/hero-desk.webp" alt="" fill sizes="100vw" className="object-cover brightness-[1.3] saturate-[1.1]" />
            <HiddenMarks marks={MARKS} />
          </div>
        </motion.div>
        <BeamClue mask={mask} className="left-[78%] top-[46%]" />
        <Grain opacity={0.12} />
        <CropMarks />
        <Subtitles lines={copy.subtitles} />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/10" aria-hidden="true" />
      </motion.div>

      <div className="flex max-w-3xl flex-col items-center gap-5 text-center">
        <motion.p
          className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          {copy.eyebrow}
        </motion.p>
        <h1 className="font-serif text-5xl leading-none text-foreground text-balance md:text-7xl">
          {copy.title.map((line, index) => (
            <motion.span
              key={line}
              className={`inline-block ${index === 1 ? "italic text-brass" : ""}`}
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 1.8 + index * 0.35, duration: 1.4, ease: EASE }}
            >
              {line}
              {index === 0 ? "\u00a0" : ""}
            </motion.span>
          ))}
        </h1>
        <HeroActions copy={copy} centered delay={2.6} />
      </div>
    </section>
  )
}
