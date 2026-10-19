"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Eraser, Send } from "lucide-react"
import { useState, useTransition } from "react"
import { checkCarnivalAnswer } from "@/app/carnival-intro/actions"
import { CODE_LENGTH, MANUAL_B_ROWS, MONUMENT_SIDES, type SymbolId } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { Recap } from "./recap"
import { CipherSymbol } from "./symbols"
import { CHAR_INPUT, Manuscript, Panel, PrimaryButton, StageHeading, useCharSlots } from "./ui"

function ManualB() {
  return (
    <Manuscript seal="Β" eyebrow="Εγχειρίδιο Β" title="Από τα σύμβολα στα γράμματα">
      <p className="mx-auto mb-6 max-w-[48ch] text-pretty text-center text-[15px] italic leading-relaxed text-[var(--cv-deep)]/80">
        Εδώ κάθε σύμβολο σημαίνει πάντα το ίδιο γράμμα, όπου κι αν βρίσκεται.
      </p>
      <dl className="grid grid-cols-3 gap-x-4 border-t-2 border-double border-[var(--cv-deep)]/35 sm:grid-cols-5 sm:gap-x-5 lg:grid-cols-3">
        {MANUAL_B_ROWS.map(({ symbol, char }) => (
          <div key={symbol} className="flex items-center gap-2 border-b border-dashed border-[var(--cv-deep)]/25 py-2.5">
            <dt>
              <CipherSymbol id={symbol} className="size-8" labelled />
            </dt>
            <span aria-hidden="true" className="h-px min-w-2 flex-1 border-b border-dotted border-[var(--cv-deep)]/40" />
            <dd className="w-6 text-center font-serif text-2xl font-bold">{char}</dd>
          </div>
        ))}
      </dl>
    </Manuscript>
  )
}

export function StageLetters({
  code,
  symbols,
  letters,
  onLetters,
  onSolved,
  onGoTo,
}: {
  code: string[]
  symbols: (SymbolId | null)[]
  letters: string[]
  onLetters: (next: string[]) => void
  onSolved: (phrase: string) => void
  onGoTo: (stage: 1 | 2) => void
}) {
  const bind = useCharSlots(letters, onLetters, (i) => `Γράμμα ${i + 1} από ${CODE_LENGTH}`)
  const filled = letters.filter(Boolean).length
  const complete = filled === CODE_LENGTH
  const [pending, startTransition] = useTransition()
  const [wrong, setWrong] = useState(0)

  const submit = () =>
    startTransition(async () => {
      const result = await checkCarnivalAnswer(letters)
      if (result.ok) onSolved(result.phrase)
      else setWrong((n) => n + 1)
    })

  return (
    <div className="flex flex-col gap-6">
      <StageHeading kicker="Βήμα 3 από 3" title="Διάβασε το μήνυμα">
        Κάτω από κάθε σύμβολο γράψε το γράμμα του από το Εγχειρίδιο Β και υπέβαλε. Μόνο τότε θα μάθεις αν όλα ήταν σωστά.
      </StageHeading>

      <Recap code={code} symbols={symbols} onEditCode={() => onGoTo(1)} onEditSymbols={() => onGoTo(2)} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-6">
          <ManualB />
        </div>

        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-sans text-sm font-bold text-[var(--cv-ink)]">
              {filled} / {CODE_LENGTH} γράμματα
            </p>
            <button
              type="button"
              onClick={() => onLetters(Array(CODE_LENGTH).fill(""))}
              disabled={filled === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-bold text-[var(--cv-muted)] transition-colors hover:text-[var(--cv-ink)] disabled:opacity-40"
            >
              <Eraser className="size-3.5" aria-hidden="true" />
              Καθαρισμός
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {MONUMENT_SIDES.map((side, g) => (
              <div key={side.code} role="group" aria-labelledby={`ci-dec-${side.code}`} className="flex flex-col gap-2">
                <p id={`ci-dec-${side.code}`} className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">
                  {g + 1} · {side.short}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((k) => {
                    const i = g * 4 + k
                    const sym = symbols[i]
                    return (
                      <label key={i} className="flex min-w-0 flex-col items-center gap-1.5">
                        <span className="grid h-9 place-items-center">
                          {sym && <CipherSymbol id={sym} className="size-8 text-[var(--cv-gold)]" labelled />}
                        </span>
                        <input
                          {...bind(i)}
                          className={cn(CHAR_INPUT, "h-12 text-xl", letters[i] ? "border-[var(--cv-gold)]/70" : "border-[var(--cv-gold)]/30")}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-stretch gap-4 border-t border-[var(--cv-gold)]/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-pretty text-sm leading-relaxed text-[var(--cv-muted)]">
              {complete ? "Όταν είσαι σίγουρος, υπέβαλε το μήνυμα." : "Συμπλήρωσε και τα 16 γράμματα για να υποβάλεις."}
            </p>
            <PrimaryButton onClick={submit} disabled={!complete || pending}>
              <Send aria-hidden="true" />
              {pending ? "Έλεγχος..." : "Υποβολή μηνύματος"}
            </PrimaryButton>
          </div>

          <AnimatePresence mode="wait">
            {wrong > 0 && !pending && (
              <motion.div
                key={wrong}
                role="alert"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="flex flex-col gap-1 rounded-xl border border-[var(--cv-muted)]/50 bg-[var(--cv-bg)]/70 p-4"
              >
                <p className="font-sans text-base font-bold text-[var(--cv-ink)]">Το μήνυμα δεν είναι σωστό ακόμα</p>
                <p className="text-pretty text-sm leading-relaxed text-[var(--cv-muted)]">
                  Κάτι δεν ταιριάζει σε κάποιο βήμα. Μπορείς να αλλάξεις τον κωδικό ή τα σύμβολα από το «Μέχρι τώρα». Όσα έχεις γράψει
                  μένουν όπως είναι.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>
    </div>
  )
}
