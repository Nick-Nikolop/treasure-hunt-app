"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, HiddenMarks, beamMask, isGreek, toCaps, useBeam, useScramble } from "./shared"

const GREEK = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const KEY = 7
const DECODE_START = 0.8
const DECODE_LENGTH = 2.6

const MARKS = [
  { x: "10%", y: "18%", text: "N 37°02′", className: "text-lg md:text-xl", rotate: -4 },
  { x: "86%", y: "80%", text: "→ 7", className: "text-3xl md:text-4xl", rotate: 6 },
]

function Ring({ letters, radius, size, className }: { letters: string; radius: number; size: number; className: string }) {
  const step = 360 / letters.length
  return (
    <>
      {[...letters].map((letter, index) => (
        <span
          key={letter}
          className={`absolute left-1/2 top-1/2 font-serif leading-none ${className}`}
          style={{ fontSize: `${size}cqw`, transform: `translate(-50%, -50%) rotate(${index * step}deg) translateY(-${radius}cqw)` }}
        >
          {letter}
        </span>
      ))}
    </>
  )
}

/** A brass cipher wheel: the inner ring spins, locks onto the key, and the title decodes. */
function CipherWheel({ alphabet, keyLabel, locked }: { alphabet: string; keyLabel: string; locked: boolean }) {
  const reduceMotion = useReducedMotion()
  const step = 360 / alphabet.length

  return (
    <motion.div
      className="relative aspect-square w-[min(58vw,15rem)] md:w-[min(40vw,32rem)]"
      style={{ containerType: "inline-size" }}
      initial={{ opacity: 0, scale: 0.85, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.6, ease: EASE }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border border-brass/50 bg-background/60 shadow-[0_0_80px_oklch(0.78_0.13_78/0.12)] backdrop-blur-sm" />
        <div className="absolute inset-[3%] rounded-full border border-dashed border-brass/30" />
        <Ring letters={alphabet} radius={41} size={5.4} className="text-brass" />

        <div className="absolute inset-[16%] rounded-full border border-brass/40" />
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: reduceMotion ? KEY * step : 200 }}
          animate={{ rotate: KEY * step }}
          transition={{ delay: DECODE_START, duration: DECODE_LENGTH + 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Ring letters={alphabet} radius={28} size={4.6} className="text-foreground/75" />
        </motion.div>

        {Array.from({ length: alphabet.length }, (_, index) => (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-[3cqw] w-px bg-brass/40"
            style={{ transform: `translate(-50%, -50%) rotate(${index * step + step / 2}deg) translateY(-34.5cqw)` }}
          />
        ))}
      </motion.div>

      <div className="absolute inset-[34%] flex flex-col items-center justify-center rounded-full border border-brass/60 bg-background text-center">
        <span className="font-sans uppercase tracking-[0.3em] text-muted-foreground" style={{ fontSize: "2.6cqw" }}>
          {keyLabel}
        </span>
        <motion.span
          className="font-serif leading-none text-brass"
          style={{ fontSize: "13cqw" }}
          animate={locked ? { scale: [1, 1.2, 1] } : undefined}
          transition={{ duration: 0.5 }}
        >
          {locked ? KEY : "?"}
        </motion.span>
      </div>

      <div className="absolute left-1/2 top-[1%] h-[28%] w-[9%] -translate-x-1/2 rounded-full border-2 border-brass shadow-[0_0_24px_oklch(0.78_0.13_78/0.5)]" />
    </motion.div>
  )
}

/** The title arrives encrypted and a cipher wheel turns to decode it. */
export function HeroCipher({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, { x: 0.3, y: 0.5, reachX: 0.3, reachY: 0.32, mobileX: 0.5, mobileReachX: 0.36, speed: 0.7 })
  const mask = beamMask("8rem", "18rem")

  const greek = isGreek(copy.title.join(""))
  const alphabet = greek ? GREEK : LATIN
  const pool = `${alphabet}0123456789`
  const lines = copy.title.map(toCaps)
  const first = useScramble(lines[0], DECODE_START, DECODE_LENGTH * 0.45, pool)
  const second = useScramble(lines[1], DECODE_START + DECODE_LENGTH * 0.35, DECODE_LENGTH * 0.65, pool)

  const [locked, setLocked] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setLocked(true), (DECODE_START + DECODE_LENGTH) * 1000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <section
      ref={stageRef}
      className="relative isolate flex min-h-svh items-center overflow-hidden bg-background"
      style={{
        backgroundImage:
          "linear-gradient(oklch(0.78 0.13 78 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(0.78 0.13 78 / 0.05) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      <div className="absolute inset-0 -z-10" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
        <Image unoptimized src="/landing/hero-desk.webp" alt="" fill priority sizes="100vw" className="object-cover brightness-[0.5] saturate-[0.6]" />
        <HiddenMarks marks={MARKS} />
      </div>
      <BeamClue mask={mask} className="left-[8%] top-[74%] md:left-[44%] md:top-[86%]" />
      <Grain opacity={0.07} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-6 pb-8 pt-20 md:flex-row-reverse md:pb-12 md:pt-24 md:justify-between md:gap-12 md:px-10">
        <CipherWheel alphabet={alphabet} keyLabel={copy.cipher.key} locked={locked} />

        <div className="flex max-w-xl flex-col items-center gap-5 text-center md:gap-6 md:items-start md:text-left">
          <motion.p
            className="flex items-center gap-3 font-sans text-xs uppercase tracking-[0.35em] text-brass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className={`size-1.5 rounded-full ${locked ? "bg-brass" : "animate-pulse bg-foreground/60"}`} aria-hidden="true" />
            <span aria-live="polite">{locked ? `${copy.cipher.decoded} · ${copy.cipher.key} ${KEY}` : `${copy.cipher.decoding}…`}</span>
          </motion.p>

          <h1 className="font-serif text-5xl leading-[1.02] text-foreground md:text-7xl">
            <span className="sr-only">{copy.title.join(" ")}</span>
            <span className="block whitespace-nowrap tabular-nums" aria-hidden="true">
              {first}
            </span>
            <span className={`block tabular-nums transition-colors duration-700 ${locked ? "text-brass" : "text-foreground/70"}`} aria-hidden="true">
              {second}
            </span>
          </h1>

          <motion.p
            className="max-w-md font-sans text-base leading-relaxed text-foreground/80 text-pretty md:text-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: DECODE_START + DECODE_LENGTH, duration: 0.9, ease: EASE }}
          >
            {copy.body}
          </motion.p>
          <HeroActions copy={copy} centered="mobile" delay={DECODE_START + DECODE_LENGTH + 0.3} />
        </div>
      </div>
    </section>
  )
}
