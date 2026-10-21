"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { EASE } from "./palette"

const TITLE = ["Κάποια", "μυστικά", "πρέπει", "να", "τα", "κυνηγήσεις"]

/** Full-screen burgundy title sequence: the two logos meet, the title rises, then the curtain lifts. */
export function CinematicOpening({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const started = useRef(0)
  const finished = useRef(false)

  const finish = (action: "finished" | "skipped") => {
    if (finished.current) return
    finished.current = true
    track(EV.carnivalOpening, { action }, { durationMs: Math.round(performance.now() - started.current) })
    onDone()
  }

  useEffect(() => {
    started.current = performance.now()
    const t = window.setTimeout(() => finish("finished"), reduce ? 3200 : 8600)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish("skipped")
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const d = (s: number) => (reduce ? 0 : s)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="The Hunt × Καλαματιανό Καρναβάλι"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[var(--ci-night)] px-6 text-[var(--ci-cream)]"
      initial={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
      transition={{ duration: reduce ? 0.4 : 1.1, ease: EASE }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 42%, var(--ci-wine) 0%, transparent 100%)" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(224,176,74,0.22) 0%, transparent 62%)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 1, 0.7], scale: [0.6, 1.05, 1] }}
        transition={{ duration: d(3.2), delay: d(0.9), ease: EASE }}
      />

      <div className="relative flex w-full max-w-3xl flex-col items-center gap-8 text-center sm:gap-10">
        <motion.p
          className="font-sans text-[11px] font-bold uppercase tracking-[0.5em] text-[var(--ci-gold)] sm:text-xs"
          initial={{ opacity: 0, letterSpacing: "1.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.5em" }}
          transition={{ duration: d(1.6), delay: d(0.3), ease: EASE }}
        >
          Σε συνεργασία με
        </motion.p>

        <div className="flex items-center gap-5 sm:gap-10">
          <motion.div
            initial={{ opacity: 0, x: -48, filter: "blur(14px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: d(1.5), delay: d(0.8), ease: EASE }}
          >
            <Image
              src="/carnival/logo.webp"
              alt="The Hunt"
              width={220}
              height={220}
              priority
              className="size-28 object-contain drop-shadow-[0_12px_40px_rgba(224,176,74,0.35)] sm:size-44"
            />
          </motion.div>

          <motion.span
            aria-hidden="true"
            className="font-serif text-2xl font-light text-[var(--ci-gold)] sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: d(1), delay: d(1.6), ease: EASE }}
          >
            ×
          </motion.span>

          <motion.div
            initial={{ opacity: 0, x: 48, filter: "blur(14px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: d(1.5), delay: d(1.1), ease: EASE }}
          >
            <Image
              src="/carnival/kalamata-carnival.webp"
              alt="Καλαματιανό Καρναβάλι"
              width={220}
              height={207}
              priority
              className="h-auto w-28 object-contain drop-shadow-[0_12px_40px_rgba(224,176,74,0.3)] sm:w-44"
            />
          </motion.div>
        </div>

        <motion.div
          aria-hidden="true"
          className="h-px w-48 bg-gradient-to-r from-transparent via-[var(--ci-gold)] to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: d(1.2), delay: d(2.3), ease: EASE }}
        />

        <h1 className="flex max-w-[16ch] flex-wrap justify-center gap-x-[0.28em] font-sans text-[1.875rem] font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {TITLE.map((word, i) => (
            <span key={word} className="overflow-hidden pb-1">
              <motion.span
                className="inline-block"
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: d(0.9), delay: d(2.6 + i * 0.12), ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="max-w-[44ch] text-pretty font-serif text-base italic leading-relaxed text-[var(--ci-cream)]/80 sm:text-lg lg:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(1.2), delay: d(4), ease: EASE }}
        >
          Το Καλαματιανό Καρναβάλι και το The Hunt έκρυψαν ένα μήνυμα. Το κλειδί δεν θα σου το δώσει κανείς.
        </motion.p>

        <motion.button
          type="button"
          onClick={() => finish("skipped")}
          data-track="carnival-intro-start"
          className="rounded-full bg-[var(--ci-gold)] px-8 py-3 font-sans text-sm font-bold uppercase tracking-[0.2em] text-[var(--ci-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.8), delay: d(5), ease: EASE }}
        >
          Ξεκίνα
        </motion.button>
      </div>

      <button
        type="button"
        onClick={() => finish("skipped")}
        data-track="carnival-intro-skip"
        className="absolute right-4 top-4 rounded-full px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--ci-cream)]/60 transition hover:text-[var(--ci-cream)] sm:right-6 sm:top-6"
      >
        Παράλειψη
      </button>

      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[var(--ci-gold)]/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 8.6, ease: "linear" }}
        />
      )}
    </motion.div>
  )
}
