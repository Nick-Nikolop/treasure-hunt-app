"use client"

import { motion, useReducedMotion } from "framer-motion"
import { EASE } from "./ui"

export function SolvedReveal({ phrase }: { phrase: string }) {
  const reduce = useReducedMotion()
  const words = phrase.split(" ")
  let n = 0
  return (
    <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-[var(--cv-gold)]/50 bg-[var(--cv-deep)]/90 px-5 py-14 text-center shadow-[0_0_80px_-20px_var(--cv-gold)] sm:px-10 sm:py-20">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(224,176,74,0.22), transparent 65%)" }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      <motion.p
        className="relative font-sans text-xs font-bold uppercase tracking-[0.35em] text-[var(--cv-gold)]"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        Ο γρίφος λύθηκε
      </motion.p>
      <h2 className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 font-serif text-4xl font-black leading-tight text-[var(--cv-ink)] sm:gap-x-8 sm:text-6xl">
        <span className="sr-only">{phrase}</span>
        {words.map((word, w) => (
          <span key={w} aria-hidden="true" className="whitespace-nowrap">
            {[...word].map((ch) => {
              const delay = 0.4 + n++ * 0.09
              return (
                <motion.span
                  key={`${w}-${delay}`}
                  className="inline-block [text-shadow:0_0_24px_rgba(224,176,74,0.55)]"
                  initial={reduce ? false : { opacity: 0, y: 18, rotateX: -90, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, ease: EASE, delay }}
                >
                  {ch}
                </motion.span>
              )
            })}
          </span>
        ))}
      </h2>
      <motion.div
        className="relative h-px w-40 bg-gradient-to-r from-transparent via-[var(--cv-gold)] to-transparent"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 2 }}
      />
      <motion.p
        className="relative max-w-[52ch] text-pretty text-base leading-relaxed text-[var(--cv-muted)] sm:text-lg"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.3 }}
      >
        Αυτό είναι το μήνυμα που κρατούσε το μνημείο. Κράτησέ το καλά: η ιστορία του Καρναβαλιού μόλις ξεκίνησε.
      </motion.p>
    </div>
  )
}
