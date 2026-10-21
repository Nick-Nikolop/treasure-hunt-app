"use client"

import { motion } from "framer-motion"
import { Maximize2 } from "lucide-react"
import Image from "next/image"
import { EASE } from "./palette"
import { POSTER_SRC } from "./poster-viewer"

/** The rollup as a physical object under a spotlight. Clicking it opens the full-screen viewer. */
export function PosterStand({ onOpen }: { onOpen: () => void }) {
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
          background: "radial-gradient(ellipse 34% 62% at 50% 8%, rgba(245,236,219,0.16) 0%, rgba(224,176,74,0.07) 45%, transparent 78%)",
          clipPath: "polygon(43% 0, 57% 0, 86% 100%, 14% 100%)",
          filter: "blur(10px)",
        }}
      />

      <button
        type="button"
        onClick={onOpen}
        aria-label="Άνοιξε την αφίσα σε πλήρη οθόνη"
        data-track="carnival-poster-open"
        className="group relative flex flex-col items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-8 focus-visible:ring-offset-[var(--ci-night)]"
      >
        <span aria-hidden="true" className="relative z-10 h-2.5 w-[calc(100%+14px)] rounded-full bg-gradient-to-b from-[var(--ci-cream)]/80 via-[var(--ci-cream)]/35 to-[var(--ci-cream)]/15" />

        <span className="relative block aspect-[2/5] h-[min(66svh,640px)] overflow-hidden shadow-[0_40px_90px_-25px_rgba(0,0,0,0.95)] transition-transform duration-700 ease-out group-hover:-translate-y-1">
          <Image src={POSTER_SRC} alt="" fill priority sizes="(min-width: 1024px) 260px, 60vw" className="object-cover" />
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--ci-cream)]/15 to-transparent transition-transform duration-[1400ms] ease-out group-hover:translate-x-full"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.25),transparent_12%,transparent_88%,rgba(0,0,0,0.25))]"
          />
          <span className="absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-center bg-gradient-to-t from-[var(--ci-night)]/90 via-[var(--ci-night)]/40 to-transparent px-4 pb-6 pt-24 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ci-gold)] px-5 py-2.5 font-sans text-sm font-bold text-[var(--ci-night)]">
              <Maximize2 className="size-4" aria-hidden="true" />
              Κοίτα από κοντά
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
