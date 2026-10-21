"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Maximize2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, type CSSProperties } from "react"
import { EASE } from "./palette"
import { BEAM_MASK, POSTER_SRC, UvInk } from "./poster-viewer"

/**
 * A torch that drifts over the preview by itself (layered sines, so the path never visibly repeats).
 * It only teases that the poster reacts to UV; the player can't steer it here.
 */
function useWanderingBeam(ref: React.RefObject<HTMLSpanElement | null>, still: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const place = (x: number, y: number, r: number) => {
      el.style.setProperty("--x", `${x * 100}%`)
      el.style.setProperty("--y", `${y * 100}%`)
      el.style.setProperty("--r", `${r}px`)
    }
    if (still) {
      place(0.5, 0.42, el.clientWidth * 0.3)
      return
    }
    const seed = Math.random() * 1000
    let raf = 0
    const tick = (now: number) => {
      const t = now / 1000 + seed
      const x = 0.5 + 0.3 * Math.sin(t * 0.37) + 0.12 * Math.sin(t * 0.91 + 1.3)
      const y = 0.5 + 0.34 * Math.sin(t * 0.23 + 2.1) + 0.1 * Math.sin(t * 0.71 + 0.4)
      const flicker = 1 + 0.03 * Math.sin(t * 17) * Math.sin(t * 5.3)
      place(Math.min(0.92, Math.max(0.08, x)), Math.min(0.94, Math.max(0.06, y)), el.clientWidth * 0.27 * flicker)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, still])
}

/** The rollup as a physical object under a spotlight. Clicking it opens the full-screen viewer. */
export function PosterStand({ onOpen }: { onOpen: () => void }) {
  const reduce = useReducedMotion() ?? false
  const posterRef = useRef<HTMLSpanElement>(null)
  useWanderingBeam(posterRef, reduce)

  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[18%] left-1/2 h-[125%] w-[260%] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse 34% 62% at 50% 8%, rgba(139,92,255,0.16) 0%, rgba(139,92,255,0.06) 45%, transparent 78%)",
          clipPath: "polygon(43% 0, 57% 0, 86% 100%, 14% 100%)",
          filter: "blur(10px)",
        }}
      />

      <button
        type="button"
        onClick={onOpen}
        aria-label="Άνοιξε την αφίσα και φώτισέ τη με UV φως"
        data-track="carnival-poster-open"
        className="group relative flex flex-col items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-8 focus-visible:ring-offset-[var(--ci-night)]"
      >
        <span aria-hidden="true" className="relative z-10 h-2.5 w-[calc(100%+14px)] rounded-full bg-gradient-to-b from-[var(--ci-cream)]/80 via-[var(--ci-cream)]/35 to-[var(--ci-cream)]/15" />

        <span
          ref={posterRef}
          className="relative block aspect-[2/5] h-[min(66svh,640px)] overflow-hidden shadow-[0_40px_90px_-25px_rgba(0,0,0,0.95)] transition-transform duration-700 ease-out group-hover:-translate-y-1"
          style={{ containerType: "inline-size", "--x": "50%", "--y": "42%", "--r": "70px" } as CSSProperties}
        >
          <Image
            src={POSTER_SRC}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 260px, 60vw"
            className="object-cover"
          />

          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ WebkitMaskImage: BEAM_MASK, maskImage: BEAM_MASK }}>
            <span
              className="absolute inset-0 mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle var(--r) at var(--x) var(--y), rgba(150,110,255,0.55) 0%, rgba(120,70,245,0.3) 60%, rgba(160,120,255,0.45) 82%, transparent 94%)",
              }}
            />
            <UvInk />
          </span>

          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.3),transparent_12%,transparent_88%,rgba(0,0,0,0.3))]"
          />

          <span className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-[var(--ci-night)]/70 to-transparent px-4 pb-6 pt-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ci-uv)] px-5 py-2.5 font-sans text-sm font-bold text-[var(--ci-cream)] shadow-[0_0_34px_-4px_var(--ci-uv)] transition group-hover:brightness-125">
              <Maximize2 className="size-4" aria-hidden="true" />
              Φώτισέ τη με UV
            </span>
          </span>
        </span>

        <span aria-hidden="true" className="relative z-10 flex h-7 w-[calc(100%+30px)] items-center justify-center rounded-md border border-[var(--ci-cream)]/15 bg-gradient-to-b from-[var(--ci-cream)]/30 via-[var(--ci-wine)]/60 to-[var(--ci-night)]">
          <span className="h-px w-1/3 bg-[var(--ci-gold)]/50" />
        </span>
        <span aria-hidden="true" className="flex w-[calc(100%+60px)] justify-between">
          <span className="h-1.5 w-12 rounded-b-md bg-[var(--ci-cream)]/20" />
          <span className="h-1.5 w-12 rounded-b-md bg-[var(--ci-cream)]/20" />
        </span>
      </button>

      <span aria-hidden="true" className="mt-1 h-6 w-[180%] rounded-[50%] bg-black/60 blur-xl" />
    </motion.div>
  )
}
