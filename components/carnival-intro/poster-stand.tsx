"use client"

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { Maximize2 } from "lucide-react"
import Image from "next/image"
import type { PointerEvent as ReactPointerEvent } from "react"
import { EASE } from "./palette"
import { POSTER_SRC } from "./poster-viewer"

const SPRING = { stiffness: 140, damping: 18, mass: 0.6 }

/** The rollup as a framed print that tilts towards the pointer. Clicking it opens the full-screen viewer. */
export function PosterStand({ onOpen }: { onOpen: () => void }) {
  const reduce = useReducedMotion() ?? false
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const rotateY = useTransform(sx, [0, 1], [-9, 9])
  const rotateX = useTransform(sy, [0, 1], [7, -7])
  const glareX = useTransform(sx, [0, 1], ["15%", "85%"])
  const glareY = useTransform(sy, [0, 1], ["10%", "90%"])
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,236,190,0.22) 0%, rgba(255,236,190,0.06) 30%, transparent 60%)`

  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (reduce || e.pointerType === "touch") return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      className="relative flex flex-col items-center [perspective:1200px]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[170%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ci-gold)]/10 blur-3xl"
      />

      <motion.div
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.button
          type="button"
          onClick={onOpen}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          aria-label="Άνοιξε την αφίσα για να την εξετάσεις από κοντά"
          data-track="carnival-poster-open"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="group relative block rounded-xl border border-[var(--ci-gold)]/35 bg-[var(--ci-night)] p-2 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(0,0,0,0.4)] outline-none transition-[border-color] duration-500 hover:border-[var(--ci-gold)]/70 focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ci-night)]"
        >
          <span className="relative block aspect-[2/5] h-[min(66svh,640px)] overflow-hidden rounded-lg">
            <Image
              src={POSTER_SRC}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 260px, 60vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />

            <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: glare }} />

            {!reduce && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[var(--ci-cream)]/15 to-transparent motion-safe:animate-[poster-sheen_6s_ease-in-out_infinite]"
              />
            )}

            <span className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-[var(--ci-night)]/70 to-transparent px-4 pb-6 pt-16">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-gold)]/40 bg-[var(--ci-night)]/85 px-3 py-1.5 font-sans text-xs font-bold text-[var(--ci-cream)] backdrop-blur transition group-hover:border-[var(--ci-gold)] group-hover:text-[var(--ci-gold)]">
                <Maximize2 className="size-3" aria-hidden="true" />
                Εξέτασέ την από κοντά
              </span>
            </span>
          </span>
        </motion.button>
      </motion.div>

      <span aria-hidden="true" className="mt-6 h-5 w-[70%] rounded-[50%] bg-black/50 blur-xl" />
    </motion.div>
  )
}
