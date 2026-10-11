"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRef } from "react"
import { BeamClue, BeamShade, EASE, Grain, HeroActions, type HeroCopy, beamMask, useBeam } from "./shared"

/** Positions are percentages of the board area. Pins sit at the top centre of each card. */
const PHOTOS = [
  { src: "/landing/film-street.webp", x: 4, y: 8, w: 36, rotate: -7 },
  { src: "/landing/film-building.webp", x: 56, y: 2, w: 34, rotate: 5 },
  { src: "/landing/scene-clue.webp", x: 30, y: 44, w: 36, rotate: -2 },
  { src: "/landing/film-square.webp", x: 66, y: 52, w: 30, rotate: 8 },
]
const NOTE = { x: 3, y: 66, rotate: 4 }
const pinOf = (index: number) => ({ x: PHOTOS[index].x + PHOTOS[index].w / 2, y: PHOTOS[index].y + 1.5 })
const THREADS: [number, number][] = [
  [0, 2],
  [2, 1],
  [2, 3],
  [1, 3],
]

function Pin() {
  return (
    <span
      className="absolute left-1/2 top-0 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.5_0.19_28)] shadow-[0_2px_4px_oklch(0_0_0/0.6)]"
      aria-hidden="true"
    />
  )
}

/** An investigator's wall: photos get pinned up, red thread joins them, a flashlight searches the board. */
export function HeroEvidence({ copy }: { copy: HeroCopy }) {
  const stageRef = useRef<HTMLElement>(null)
  useBeam(stageRef, { x: 0.68, y: 0.45, reachX: 0.22, reachY: 0.3, mobileX: 0.5, mobileReachX: 0.34, speed: 0.75 })
  const mask = beamMask("9rem", "20rem")
  const threadsAt = 0.6 + PHOTOS.length * 0.22 + 0.3

  return (
    <section ref={stageRef} className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background md:flex-row md:items-center">
      <div className="absolute inset-0 -z-10 bg-foreground/[0.03]" aria-hidden="true" />

      <div className="relative order-1 mx-auto mt-20 h-[44svh] w-full max-w-xl md:order-2 md:mt-0 md:h-[76svh] md:max-w-none md:flex-1">
        <svg className="pointer-events-none absolute inset-0 z-[6] size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {THREADS.map(([from, to], index) => {
            const a = pinOf(from)
            const b = pinOf(to)
            return (
              <motion.line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="oklch(0.5 0.19 28)"
                strokeWidth="1.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ filter: "drop-shadow(0 1px 1px oklch(0 0 0 / 0.6))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: threadsAt + index * 0.3, duration: 0.5, ease: EASE }}
              />
            )
          })}
        </svg>

        {PHOTOS.map((photo, index) => (
          <motion.figure
            key={photo.src}
            className="absolute bg-foreground p-[3%] pb-[2%] shadow-[0_18px_40px_oklch(0_0_0/0.55)]"
            style={{ left: `${photo.x}%`, top: `${photo.y}%`, width: `${photo.w}%` }}
            initial={{ opacity: 0, y: -120, rotate: photo.rotate * 3, scale: 1.25 }}
            animate={{ opacity: 1, y: 0, rotate: photo.rotate, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.22, type: "spring", stiffness: 140, damping: 15 }}
          >
            <Pin />
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image unoptimized src={photo.src} alt="" fill sizes="(min-width: 768px) 20vw, 40vw" className="object-cover saturate-[0.6] sepia-[0.2]" />
            </div>
            <figcaption className="truncate pt-[4%] text-center font-serif text-xs italic text-background md:text-sm">{copy.evidence.photos[index]}</figcaption>
          </motion.figure>
        ))}

        <motion.p
          className="absolute z-[7] bg-[oklch(0.86_0.1_90)] px-3 py-2 font-serif text-sm italic text-[oklch(0.25_0.03_60)] shadow-lg md:px-4 md:py-3 md:text-lg"
          style={{ left: `${NOTE.x}%`, top: `${NOTE.y}%` }}
          initial={{ opacity: 0, scale: 0.6, rotate: NOTE.rotate - 12 }}
          animate={{ opacity: 1, scale: 1, rotate: NOTE.rotate }}
          transition={{ delay: threadsAt + THREADS.length * 0.35, type: "spring", stiffness: 180, damping: 12 }}
        >
          {copy.evidence.note}
        </motion.p>
      </div>

      <BeamShade inner="9rem" outer="22rem" className="z-[8] bg-background/70" />
      <BeamClue mask={mask} className="left-[86%] top-[42%] md:left-[94%] md:top-[18%]" />
      <Grain opacity={0.07} />

      <div className="relative z-10 order-2 mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-6 pb-10 pt-2 text-center md:order-1 md:mx-0 md:max-w-none md:basis-[42%] md:items-start md:gap-7 md:pb-0 md:pl-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))] md:pr-4 md:pt-0 md:text-left">
        <motion.p
          className="font-sans text-xs uppercase tracking-[0.35em] text-brass"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {copy.evidence.label}
        </motion.p>
        <h1 className="font-serif text-5xl leading-[0.98] text-foreground text-balance md:text-7xl">
          {copy.title.map((line, index) => (
            <motion.span
              key={line}
              className={`block ${index === 1 ? "italic text-brass" : ""}`}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.2, duration: 1, ease: EASE }}
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="hidden max-w-md font-sans text-lg leading-relaxed text-foreground/80 text-pretty md:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          {copy.body}
        </motion.p>
        <HeroActions copy={copy} centered="mobile" delay={1.5} />
      </div>
    </section>
  )
}
