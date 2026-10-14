"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { type ReactNode, useEffect, useState } from "react"
import { DeskStage } from "./hero-desk"
import { EASE, HeroActions, type HeroCopy, type BeamPath, useTypewriter } from "./shared"

/** Variant A's stage: same lamp path, bottom shade and layout, so only the title presentation changes. */
const BEAM: BeamPath = { x: 0.5, y: 0.36, reachX: 0.3, reachY: 0.16, mobileReachX: 0.34, speed: 0.8 }
const SHADE = "bg-gradient-to-t from-background via-background/55 to-transparent"
const TITLE = "font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-7xl lg:text-8xl"

/** Variant A's layout: title block, brass rule, then pitch + buttons in one row. */
function BottomBlock({ copy, title, delay = 2, className = "" }: { copy: HeroCopy; title: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-14 pt-28 md:px-10 ${className}`}>
      {title}
      <motion.div
        className="h-px origin-left bg-brass/50"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: delay - 0.4, duration: 1.2, ease: EASE }}
        aria-hidden="true"
      />
      <motion.div
        className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 1 }}
      >
        <p className="max-w-xl font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty md:text-base">{copy.body}</p>
        <div className="shrink-0">
          <HeroActions copy={copy} delay={delay + 0.2} hint={false} />
        </div>
      </motion.div>
    </div>
  )
}

function Stage({ children }: { children: (mask: string) => ReactNode }) {
  return (
    <DeskStage beam={BEAM} shade={SHADE} clueClassName="left-[26%] top-[26%]" className="items-end">
      {children}
    </DeskStage>
  )
}

/** B. The title is typed onto the case file, line by line, with a blinking caret. */
export function HeroTyped({ copy }: { copy: HeroCopy }) {
  const full = copy.title.join("\n")
  const { typed, done } = useTypewriter(full, 1.2, 20)
  const lines = typed.split("\n")

  const title = (
    <div className="flex flex-col gap-5">
      <motion.p
        className="flex items-center gap-3 font-sans text-xs uppercase tracking-[0.3em] text-brass"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-brass" aria-hidden="true" />
        {copy.eyebrow}
      </motion.p>
      <h1 className={`${TITLE} grid`}>
        <span className="sr-only">{copy.title.join(" ")}</span>
        <span className="invisible [grid-area:1/1]" aria-hidden="true">
          {copy.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
        <span className="[grid-area:1/1]" aria-hidden="true">
          {copy.title.map((line, index) => {
            const shown = lines[index] ?? ""
            const caretHere = !done ? index === lines.length - 1 : index === copy.title.length - 1
            return (
              <span key={line} className={`block ${index === 1 ? "italic text-brass" : ""}`}>
                {shown}
                {caretHere && (
                  <span className="ml-1 inline-block h-[0.8em] w-[0.06em] translate-y-[0.08em] animate-pulse bg-brass" />
                )}
              </span>
            )
          })}
        </span>
      </h1>
    </div>
  )

  return <Stage>{() => <BottomBlock copy={copy} title={title} delay={2.6} />}</Stage>
}

/** C. The last word keeps changing: stories, secrets, puzzles, clues. */
export function HeroRotate({ copy }: { copy: HeroCopy }) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => setIndex((value) => (value + 1) % copy.rotate.length), 2400)
    return () => window.clearInterval(id)
  }, [copy.rotate.length, reduceMotion])

  const longest = copy.rotate.reduce((a, b) => (b.length > a.length ? b : a), "")

  const title = (
    <h1 className={TITLE}>
      <span className="sr-only">{copy.title.join(" ")}</span>
      <span aria-hidden="true">
        <motion.span
          className="block"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1, ease: EASE }}
        >
          {copy.title[0]}
        </motion.span>
        <motion.span
          className="block"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1, ease: EASE }}
        >
          {copy.rotatePrefix}{" "}
          <span className="relative inline-grid overflow-hidden pb-2 align-bottom">
            <span className="invisible [grid-area:1/1]">{longest}</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={copy.rotate[index]}
                className="italic text-brass [grid-area:1/1]"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                {copy.rotate[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.span>
      </span>
    </h1>
  )

  return <Stage>{() => <BottomBlock copy={copy} title={title} />}</Stage>
}

/**
 * D. The title lies dim on the desk; the lamp lights each word as it passes over it.
 * A second, beam-masked copy of the same block sits on top so the lit area lines up exactly.
 */
export function HeroLit({ copy }: { copy: HeroCopy }) {
  const dimTitle = (
    <RevealLines copy={copy} className="text-foreground/30" accent="italic text-brass/40" />
  )
  const litTitle = <RevealLines copy={copy} className="text-foreground" accent="italic text-brass" hidden />

  return (
    <Stage>
      {(mask) => (
        <>
          <BottomBlock copy={copy} title={dimTitle} />
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-end"
            style={{ maskImage: mask, WebkitMaskImage: mask }}
            aria-hidden="true"
          >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-14 pt-28 md:px-10">
              {litTitle}
              <div className="h-px" />
              <div className="invisible flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
                <p className="max-w-xl font-sans text-[15px] leading-relaxed md:text-base">{copy.body}</p>
                <div className="shrink-0">
                  <HeroActions copy={copy} delay={0} hint={false} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Stage>
  )
}

function RevealLines({ copy, className, accent, hidden = false }: { copy: HeroCopy; className: string; accent: string; hidden?: boolean }) {
  const Tag = hidden ? "p" : "h1"
  return (
    <Tag className={`font-serif text-5xl leading-[0.95] text-balance md:text-7xl lg:text-8xl ${className}`}>
      {copy.title.map((line, index) => (
        <span key={line} className="block overflow-hidden pb-2">
          <motion.span
            className={`block ${index === 1 ? accent : ""}`}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 1.4 + index * 0.18, duration: 1.1, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/** E. A case-file tag above the title, and the key word circled in brass ink by hand. */
export function HeroMarker({ copy }: { copy: HeroCopy }) {
  const second = copy.title[1] ?? ""
  const cut = second.lastIndexOf(" ")
  const lead = cut > 0 ? second.slice(0, cut) : ""
  const key = cut > 0 ? second.slice(cut + 1) : second

  const title = (
    <div className="flex flex-col gap-6">
      <motion.div
        className="flex items-center gap-3 font-sans text-xs uppercase tracking-[0.3em]"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
      >
        <span className="border border-brass px-2.5 py-1 text-brass">{copy.caseTag}</span>
        <span className="text-foreground/60">{copy.caseCity}</span>
      </motion.div>
      <h1 className={TITLE}>
        <span className="block overflow-hidden pb-2">
          <motion.span
            className="block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 1.2, duration: 1.1, ease: EASE }}
          >
            {copy.title[0]}
          </motion.span>
        </span>
        <span className="block pb-2">
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 1.1, ease: EASE }}
          >
            {lead}{" "}
            <span className="relative inline-block italic text-brass">
              {key}
              <svg
                viewBox="0 0 300 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -inset-x-[8%] -inset-y-[18%] h-[136%] w-[116%] overflow-visible"
                aria-hidden="true"
              >
                <motion.path
                  d="M 40 18 C 120 2, 260 4, 290 40 C 310 75, 220 98, 140 96 C 50 94, 4 76, 10 48 C 16 24, 70 10, 150 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ delay: 2.3, duration: 1.1, ease: "easeInOut" }}
                />
              </svg>
            </span>
          </motion.span>
        </span>
      </h1>
    </div>
  )

  return <Stage>{() => <BottomBlock copy={copy} title={title} delay={2.4} />}</Stage>
}
