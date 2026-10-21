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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ci-gold)]/10 blur-3xl"
      />

      <button
        type="button"
        onClick={onOpen}
        aria-label="Άνοιξε την αφίσα και φώτισέ τη με UV φως"
        data-track="carnival-poster-open"
        className="group relative flex flex-col items-center rounded-xl border border-[var(--ci-gold)]/30 bg-[var(--ci-night)] p-2 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)] outline-none transition duration-500 ease-out hover:-translate-y-1 hover:border-[var(--ci-gold)]/60 focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ci-night)]"
      >
        <span
          ref={posterRef}
          className="relative block aspect-[2/5] h-[min(66svh,640px)] overflow-hidden rounded-lg"
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

          <span className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-[var(--ci-night)]/70 to-transparent px-4 pb-6 pt-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-cream)]/20 bg-[var(--ci-night)]/80 px-3 py-1.5 font-sans text-xs font-bold text-[var(--ci-cream)] backdrop-blur transition group-hover:border-[var(--ci-cream)]/40">
              <Maximize2 className="size-3" aria-hidden="true" />
              <span>
                Φώτισέ τη με <span className="text-[#b9a4ff]">UV</span>
              </span>
            </span>
          </span>
        </span>
      </button>
    </motion.div>
  )
}
