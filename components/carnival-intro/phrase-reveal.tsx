"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CIPHERTEXT } from "@/lib/carnival-intro/poster"
import { EASE } from "./palette"

const CIPHER_WORDS = CIPHERTEXT.split(/\s+/).filter(Boolean)
const FLIP_START = 0.5
const FLIP_STEP = 0.09
const FLIP_DURATION = 0.7

function lettersOf(text: string): string[] {
  return [...text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleUpperCase("el-GR").replace(/[^\p{L}]/gu, "")]
}

/** Splits the decrypted letters back into the cipher's own word lengths, so each tile flips in place. */
function pairUp(plain: string[]) {
  let i = 0
  return CIPHER_WORDS.map((word) =>
    [...word].map((c) => {
      const pair = { cipher: c, plain: plain[i] ?? "" }
      i += 1
      return pair
    }),
  )
}

/** Breaks the phrase into two lines with letter counts as even as possible. */
function splitInTwo<T>(words: T[][], total: number): T[][][] {
  if (words.length < 2) return [words]
  let best = 1
  let bestGap = Infinity
  let count = 0
  for (let i = 0; i < words.length - 1; i++) {
    count += words[i].length
    const gap = Math.abs(count - total / 2)
    if (gap < bestGap) {
      bestGap = gap
      best = i + 1
    }
  }
  return [words.slice(0, best), words.slice(best)]
}

function FlipTile({ cipher, plain, index, reduce }: { cipher: string; plain: string; index: number; reduce: boolean }) {
  const face =
    "absolute inset-0 flex items-center justify-center rounded-md font-serif font-bold [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
  return (
    <span className="relative block h-12 w-8 [perspective:600px] sm:h-[4.5rem] sm:w-12 lg:h-20 lg:w-[3.25rem]">
      <motion.span
        className="relative block size-full [transform-style:preserve-3d]"
        initial={{ rotateX: reduce ? 180 : 0 }}
        animate={{ rotateX: 180 }}
        transition={reduce ? { duration: 0 } : { duration: FLIP_DURATION, delay: FLIP_START + index * FLIP_STEP, ease: EASE }}
      >
        <span
          aria-hidden="true"
          className={`${face} border border-[var(--ci-cream)]/10 bg-[var(--ci-cream)]/[0.04] text-2xl text-[var(--ci-cream)]/35 sm:text-3xl`}
        >
          {cipher}
        </span>
        <span
          className={`${face} border border-[var(--ci-gold)]/70 text-3xl text-[var(--ci-night)] shadow-[0_10px_30px_-10px_rgba(224,176,74,0.7)] [transform:rotateX(180deg)] sm:text-4xl lg:text-5xl`}
          style={{ background: "linear-gradient(180deg, #f3d48a 0%, var(--ci-gold) 48%, #b9852f 52%, #d9a845 100%)" }}
        >
          {plain}
        </span>
      </motion.span>
    </span>
  )
}

export function PhraseReveal({ text }: { text: string }) {
  const reduce = useReducedMotion() ?? false
  const words = pairUp(lettersOf(text))
  const total = words.reduce((n, w) => n + w.length, 0)
  const settled = reduce ? 0 : FLIP_START + total * FLIP_STEP + FLIP_DURATION
  const lines = splitInTwo(words, total)

  let index = 0
  return (
    <motion.div
      role="status"
      aria-label={`Το μήνυμα: ${text}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-[var(--ci-night)] p-2 shadow-[0_40px_120px_-40px_rgba(224,176,74,0.45)]"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: settled - 0.4, ease: EASE }}
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(224,176,74,0.22), transparent 70%)" }}
      />

      <div className="relative flex flex-col items-center gap-10 rounded-[1.6rem] border border-[var(--ci-gold)]/35 px-5 py-14 text-center sm:px-10 sm:py-16">
        <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-dashed border-[var(--ci-gold)]/15" />

        <div className="flex flex-col items-center gap-3">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.42em] text-[var(--ci-gold)]">Το μήνυμα άνοιξε</span>
          <span aria-hidden="true" className="flex items-center gap-2">
            <span className="h-px w-10 bg-[var(--ci-gold)]/40" />
            <span className="size-1.5 rotate-45 bg-[var(--ci-gold)]" />
            <span className="h-px w-10 bg-[var(--ci-gold)]/40" />
          </span>
        </div>

        <p aria-hidden="true" className="flex flex-col items-center gap-3">
          {lines.map((line, l) => (
            <span key={l} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-6">
              {line.map((word, w) => (
                <span key={w} className="flex gap-0.5 sm:gap-1.5">
                  {word.map((pair) => {
                    const i = index
                    index += 1
                    return <FlipTile key={i} index={i} cipher={pair.cipher} plain={pair.plain} reduce={reduce} />
                  })}
                </span>
              ))}
            </span>
          ))}
        </p>

        <motion.div
          className="flex flex-col items-center gap-6"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: settled, ease: EASE }}
        >
          <p className="max-w-[40ch] text-balance font-serif text-2xl italic leading-snug text-[var(--ci-cream)] sm:text-3xl">
            Κράτησέ το για τον εαυτό σου.
          </p>
          <p className="max-w-[46ch] text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/60 sm:text-base">
            Το Καρναβάλι μόλις ξεκίνησε.
          </p>
        </motion.div>
      </div>

      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-6 hidden size-24 items-center justify-center rounded-full border-2 border-[var(--ci-gold)]/70 font-sans text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-[var(--ci-gold)] sm:flex"
        initial={reduce ? false : { opacity: 0, scale: 1.8, rotate: -24 }}
        animate={{ opacity: 0.9, scale: 1, rotate: -12 }}
        transition={{ duration: 0.35, delay: settled + 0.3, ease: [0.2, 1.6, 0.4, 1] }}
      >
        <span className="absolute inset-1.5 rounded-full border border-[var(--ci-gold)]/50" />
        Λύθηκε
      </motion.span>
    </motion.div>
  )
}
