"use client"

import { motion } from "framer-motion"
import { Eraser } from "lucide-react"
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CIPHER_LETTERS, CIPHERTEXT } from "@/lib/carnival-intro/poster"
import { EASE } from "./palette"

const WORDS = CIPHERTEXT.split(/\s+/)

/** Greek capital without accents, or "" for anything else. */
function toLetter(raw: string): string {
  const ch = raw.normalize("NFD").replace(/\p{M}/gu, "").toLocaleUpperCase("el-GR").replace("Σ", "Σ")
  return /^[Α-Ω]$/.test(ch) ? ch : ""
}

/** A cryptogram worksheet: each cipher letter gets a box for the player's own guess. Stays on this device. */
export function CipherBoard({
  guesses,
  onGuesses,
  locked = false,
  done = false,
}: {
  guesses: string[]
  onGuesses: (next: string[]) => void
  /** Before the key is found the message is shown, but nothing can be written under it. */
  locked?: boolean
  done?: boolean
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const reported = useRef(false)

  const set = (i: number, letter: string) => {
    const next = Array.from({ length: CIPHER_LETTERS }, (_, k) => guesses[k] ?? "")
    next[i] = letter
    onGuesses(next)
    if (!reported.current && letter) {
      reported.current = true
      track(EV.carnivalWorksheet, { filled: next.filter(Boolean).length, total: CIPHER_LETTERS })
    }
  }

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(CIPHER_LETTERS - 1, i))]?.focus()

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !guesses[i]) {
      e.preventDefault()
      set(i - 1 >= 0 ? i - 1 : i, "")
      focus(i - 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focus(i - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      focus(i + 1)
    }
  }

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const letters = [...e.clipboardData.getData("text")].map(toLetter).filter(Boolean)
    if (!letters.length) return
    e.preventDefault()
    const next = Array.from({ length: CIPHER_LETTERS }, (_, k) => guesses[k] ?? "")
    letters.forEach((l, k) => {
      if (i + k < CIPHER_LETTERS) next[i + k] = l
    })
    onGuesses(next)
    focus(i + letters.length)
  }

  const filled = guesses.filter(Boolean).length
  let flat = -1

  return (
    <div className="flex flex-col gap-8" data-no-track>
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-8 sm:gap-x-12">
        {WORDS.map((word, w) => (
          <div key={`${word}-${w}`} className="flex gap-1.5 sm:gap-2">
            {[...word].map((ch) => {
              flat += 1
              const i = flat
              return (
                <motion.div
                  key={i}
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.035, ease: EASE }}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-14 w-10 place-items-center rounded-lg border border-[var(--ci-gold)]/35 bg-[linear-gradient(180deg,rgba(224,176,74,0.16),rgba(107,16,36,0.35))] font-serif text-2xl font-bold text-[var(--ci-gold)] shadow-[inset_0_1px_0_rgba(245,236,219,0.12)] sm:h-16 sm:w-12 sm:text-3xl"
                  >
                    {ch}
                  </span>
                  {locked ? null : (
                  <input
                    readOnly={done}
                    ref={(el) => {
                      inputs.current[i] = el
                    }}
                    value={guesses[i] ?? ""}
                    onChange={(e) => {
                      const letter = toLetter(e.target.value.slice(-1))
                      if (!letter && e.target.value) return
                      set(i, letter)
                      if (letter) focus(i + 1)
                    }}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={(e) => onPaste(i, e)}
                    onFocus={(e) => e.currentTarget.select()}
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={2}
                    aria-label={`Γράμμα ${i + 1} από ${CIPHER_LETTERS}, κρυπτογραφημένο ${ch}`}
                    className="h-12 w-10 rounded-lg border-b-2 border-[var(--ci-cream)]/25 bg-[var(--ci-cream)]/5 text-center font-serif text-2xl font-bold uppercase text-[var(--ci-cream)] caret-[var(--ci-gold)] outline-none transition focus:border-[var(--ci-gold)] focus:bg-[var(--ci-cream)]/10 sm:h-14 sm:w-12 read-only:border-[var(--ci-gold)] read-only:text-[var(--ci-gold)]"
                  />
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      {!locked && !done && (
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-sans text-sm text-[var(--ci-cream)]/55">
        <span className="tabular-nums">
          {filled}/{CIPHER_LETTERS} συμπληρωμένα
        </span>
        {filled > 0 && (
          <button
            type="button"
            onClick={() => onGuesses(Array.from({ length: CIPHER_LETTERS }, () => ""))}
            className="inline-flex items-center gap-1.5 font-bold text-[var(--ci-cream)]/70 transition hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
          >
            <Eraser className="size-4" aria-hidden="true" />
            Καθάρισμα
          </button>
        )}
      </div>
      )}
    </div>
  )
}
