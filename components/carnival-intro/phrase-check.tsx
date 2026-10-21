"use client"

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { Loader2, ScrollText, Sparkles } from "lucide-react"
import { useState, useTransition } from "react"
import { checkCarnivalPhrase } from "@/app/carnival-intro/actions"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CIPHER_LETTERS, CIPHERTEXT } from "@/lib/carnival-intro/poster"
import { EASE } from "./palette"

export interface PhraseState {
  attempts: number
  solved: boolean
  /** The decrypted phrase as confirmed by the server. */
  text?: string
}

const WORD_LENGTHS = CIPHERTEXT.split(/\s+/).map((w) => w.length)

/** Rebuilds the worksheet letters into words, following the cipher's own spacing. */
function toPhrase(guesses: string[]): string {
  let i = 0
  return WORD_LENGTHS.map((len) => {
    const word = guesses.slice(i, i + len).join("")
    i += len
    return word
  }).join(" ")
}

export function PhraseCheck({
  guesses,
  keyValue,
  state,
  onChange,
  onLocked,
}: {
  guesses: string[]
  keyValue: string
  state: PhraseState
  onChange: (next: PhraseState) => void
  /** The server no longer accepts the saved key: send the player back to the lock. */
  onLocked: () => void
}) {
  const reduce = useReducedMotion()
  const [notice, setNotice] = useState<"wrong" | "unset" | null>(null)
  const [pending, startTransition] = useTransition()
  const shake = useAnimationControls()

  const filled = guesses.filter(Boolean).length
  const complete = filled === CIPHER_LETTERS

  const submit = () => {
    if (!complete || pending) return
    startTransition(async () => {
      const { verdict, phrase } = await checkCarnivalPhrase(keyValue, toPhrase(guesses))
      const attempt = state.attempts + 1
      track(EV.carnivalPhraseCheck, { result: verdict, attempt, filled })
      if (verdict === "correct") {
      setNotice(null)
      ;(document.activeElement as HTMLElement | null)?.blur()
      onChange({ attempts: attempt, solved: true, text: phrase })
        return
      }
      if (verdict === "locked") {
        onLocked()
        return
      }
      onChange({ ...state, attempts: attempt })
      setNotice(verdict)
      if (verdict === "wrong" && !reduce) shake.start({ x: [0, -12, 10, -7, 4, 0], transition: { duration: 0.45 } })
    })
  }

  if (state.solved) {
    const words = (state.text ?? toPhrase(guesses)).split(/\s+/)
    return (
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE }}
        className="relative flex w-full max-w-4xl flex-col items-center gap-8 overflow-hidden rounded-[2rem] border border-[var(--ci-gold)]/45 bg-[var(--ci-wine)] px-6 py-16 text-center sm:px-12 sm:py-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(224,176,74,0.4), transparent 70%), repeating-conic-gradient(from 0deg at 50% 0%, rgba(224,176,74,0.07) 0deg 4deg, transparent 4deg 12deg)",
          }}
        />
        <p className="relative flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--ci-gold)]">
          <Sparkles className="size-4" aria-hidden="true" />
          Το μήνυμα άνοιξε
        </p>
        <h3 className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 font-serif text-4xl font-bold leading-tight text-[var(--ci-cream)] sm:text-6xl">
          {words.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.25, ease: EASE }}
            >
              {w}
            </motion.span>
          ))}
        </h3>
        <p className="relative max-w-[46ch] text-pretty font-sans text-base leading-relaxed text-[var(--ci-cream)]/80">
          Κράτησέ το για τον εαυτό σου. Το Καρναβάλι μόλις ξεκίνησε.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        type="button"
        animate={shake}
        onClick={submit}
        disabled={!complete || pending}
        data-track="carnival-phrase-check"
        className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[var(--ci-gold)] px-9 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] shadow-[0_20px_50px_-15px_rgba(224,176,74,0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ScrollText className="size-4" aria-hidden="true" />}
        Διάβασε το μήνυμα
      </motion.button>
      <div aria-live="polite" className="min-h-6 text-center font-sans text-[15px] leading-relaxed">
        <AnimatePresence mode="wait">
          {notice === "wrong" ? (
            <motion.p key="wrong" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-cream)]/85">
              Δεν είναι αυτό το μήνυμα.
            </motion.p>
          ) : notice === "unset" ? (
            <motion.p key="unset" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-cream)]/65">
              Το μήνυμα δεν μπορεί να ελεγχθεί ακόμα. Δοκίμασε λίγο αργότερα.
            </motion.p>
          ) : !complete ? (
            <motion.p key="fill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[var(--ci-cream)]/50">
              Συμπλήρωσε και τα {CIPHER_LETTERS} γράμματα.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
