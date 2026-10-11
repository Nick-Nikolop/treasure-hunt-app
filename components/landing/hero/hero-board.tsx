"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { BeamClue, EASE, Grain, HeroActions, type HeroCopy, beamMask, isGreek, toCaps, useBeam } from "./shared"

const GREEK_POOL = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0123456789"
const LATIN_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/** One split-flap cell: rattles through random glyphs before landing on its character. */
function Flap({ char, delay, pool }: { char: string; delay: number; pool: string }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(" ")

  useEffect(() => {
    if (reduceMotion) {
      setShown(char)
      return
    }
    let interval = 0
    let flips = 0
    const total = 7 + Math.floor(Math.random() * 7)
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        flips += 1
        if (flips >= total) {
          setShown(char)
          window.clearInterval(interval)
        } else {
          setShown(pool[Math.floor(Math.random() * pool.length)])
        }
      }, 65)
    }, delay * 1000)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [char, delay, pool, reduceMotion])

  return (
    <span className="relative flex h-[1.32em] w-[0.86em] items-center justify-center overflow-hidden rounded-[0.1em] bg-foreground/[0.08] ring-1 ring-inset ring-foreground/10 [perspective:300px]">
      <motion.span key={shown} className="block leading-none" initial={{ rotateX: -80, opacity: 0.3 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ duration: 0.06 }}>
        {shown === " " ? "\u00a0" : shown}
      </motion.span>
      <span className="absolute inset-x-0 top-1/2 h-px bg-background/90" aria-hidden="true" />
    </span>
  )
}

function FlapWord({ text, delay, pool, className = "" }: { text: string; delay: number; pool: string; className?: string }) {
  return (
    <span className={`flex gap-[0.08em] ${className}`} aria-hidden="true">
      {[...text].map((char, index) =>
        char === " " ? (
          <span key={index} className="w-[0.45em]" />
        ) : (
          <Flap key={index} char={char} delay={delay + index * 0.05} pool={pool} />
        ),
      )}
    </span>
  )
}

function Clock() {
  const [time, setTime] = useState<string | null>(null)
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false }))
    tick()
    const id = window.setInterval(tick, 15000)
    return () => window.clearInterval(id)
  }, [])
  return <span className="tabular-nums">{time ?? "--:--"}</span>
}

/** A station departure board: the title clatters in on split-flap cells, the hunts are listed as departures. */
export function HeroBoard({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, { x: 0.5, y: 0.4, reachX: 0.4, reachY: 0.32, speed: 0.6 })
  const mask = beamMask("9rem", "20rem")

  const pool = isGreek(copy.title.join("")) ? GREEK_POOL : LATIN_POOL
  const lines = copy.title.map(toCaps)
  const words = lines.join(" ").split(" ")
  const rowsStart = 2.2

  return (
    <section ref={stageRef} className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image unoptimized src="/landing/hero-city.webp" alt="" fill priority sizes="100vw" className="object-cover brightness-[0.12] saturate-[0.4]" />
      </div>
      <div className="absolute inset-0 -z-10" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">
        <Image unoptimized loading="eager" src="/landing/hero-city.webp" alt="" fill sizes="100vw" className="object-cover brightness-[0.5] saturate-[0.7]" />
      </div>
      <BeamClue mask={mask} className="left-[86%] top-[20%] md:left-[90%] md:top-[30%]" />
      <Grain opacity={0.06} />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-7 px-4 pb-10 pt-24 md:gap-9 md:px-10">
        <motion.div
          className="flex w-full items-center justify-between border-b border-brass/30 pb-3 font-sans text-[11px] uppercase tracking-[0.35em] text-brass md:text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-brass" aria-hidden="true" />
            {toCaps(copy.board.label)}
          </span>
          <Clock />
        </motion.div>

        <h1 className="flex flex-col items-center gap-[0.12em] font-sans font-semibold text-foreground">
          <span className="sr-only">{copy.title.join(" ")}</span>
          <span className="flex flex-col items-center gap-[0.12em] text-[min(8.6vw,2.6rem)] md:hidden">
            {words.map((word, index) => (
              <FlapWord key={word} text={word} delay={0.4 + index * 0.25} pool={pool} className={index > 0 ? "text-brass" : ""} />
            ))}
          </span>
          <span className="hidden flex-col items-center gap-[0.12em] md:flex md:text-[min(5vw,4.6rem)]">
            {lines.map((line, index) => (
              <FlapWord key={line} text={line} delay={0.4 + index * 0.35} pool={pool} className={index > 0 ? "text-brass" : ""} />
            ))}
          </span>
        </h1>

        <motion.div
          className="w-full max-w-3xl border border-foreground/15 bg-background/70 backdrop-blur-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: rowsStart - 0.4, duration: 0.8, ease: EASE }}
        >
          <div className="grid grid-cols-[3.5rem_1fr_auto] gap-3 border-b border-foreground/15 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:grid-cols-[6rem_1fr_auto] md:px-6 md:text-[11px]">
            {copy.board.columns.map((column) => (
              <span key={column} className="last:text-right">
                {toCaps(column)}
              </span>
            ))}
          </div>
          {copy.board.rows.map(([time, hunt, status], index) => (
            <div
              key={hunt}
              className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-b border-foreground/10 px-4 py-2.5 font-sans text-sm last:border-b-0 md:grid-cols-[6rem_1fr_auto] md:px-6 md:py-3 md:text-base"
            >
              <span className="tabular-nums text-foreground/70">{time}</span>
              <span className="truncate font-medium uppercase tracking-wider text-foreground">{toCaps(hunt)}</span>
              <span className="sr-only">{status}</span>
              <FlapWord
                text={toCaps(status)}
                delay={rowsStart + index * 0.3}
                pool={pool}
                className={`justify-end text-[11px] md:text-sm ${index === 0 ? "text-brass" : "text-foreground/80"}`}
              />
            </div>
          ))}
        </motion.div>

        <HeroActions copy={copy} centered delay={rowsStart + 0.8} />
      </div>
    </section>
  )
}
