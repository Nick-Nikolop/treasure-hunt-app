"use client"

import { ArrowLeft, Eraser } from "lucide-react"
import { Fragment } from "react"
import { CODE_LENGTH, MANUAL_B_ROWS, WORD_LENGTHS, wordRanges, type SymbolId } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { CipherSymbol } from "./symbols"
import { CHAR_INPUT, GhostButton, Manuscript, NextStepNotice, Panel, StageHeading, useCharSlots } from "./ui"

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

/** The answer as it will read: letters (or blanks) with a gold bar between the words. */
export function PhrasePreview({ letters, className }: { letters: string[]; className?: string }) {
  return (
    <p
      className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-serif text-xl font-bold tracking-[0.25em] text-[var(--cv-ink)]", className)}
      aria-label={`Το μήνυμά σου: ${letters.map((l) => l || "κενό").join(" ")}`}
    >
      {wordRanges().map(([start, end], w) => (
        <Fragment key={w}>
          {w > 0 && <span aria-hidden="true" className="h-6 w-px bg-[var(--cv-gold)]" />}
          <span aria-hidden="true" className="whitespace-nowrap">
            {letters.slice(start, end).map((l, i) => (
              <span key={i} className={cn(!l && "text-[var(--cv-muted)]/50")}>
                {l || "_"}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </p>
  )
}

export function StageLetters({
  symbols,
  letters,
  onLetters,
  onBackToSymbols,
  onContinue,
}: {
  symbols: (SymbolId | null)[]
  letters: string[]
  onLetters: (next: string[]) => void
  onBackToSymbols: () => void
  onContinue: () => void
}) {
  const bind = useCharSlots(letters, onLetters, (i) => `Γράμμα ${i + 1} από ${CODE_LENGTH}`)
  const filled = letters.filter(Boolean).length
  const complete = filled === CODE_LENGTH

  return (
    <div className="flex flex-col gap-8">
      <StageHeading kicker="Βήμα 4 από 5" title="Διάβασε τα σύμβολα">
        Κάτω από κάθε σύμβολο της ακολουθίας σου, γράψε το γράμμα που του αντιστοιχεί στο Εγχειρίδιο Β. Το μήνυμα έχει τρεις λέξεις:{" "}
        {WORD_LENGTHS.join(", ").replace(/, (\d+)$/, " και $1")} γράμματα.
      </StageHeading>

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

          <div className="rounded-xl border border-[var(--cv-gold)]/20 bg-[var(--cv-bg)]/50 px-3 py-4">
            <PhrasePreview letters={letters} />
          </div>

          <div className="flex flex-col gap-6">
            {wordRanges().map(([start, end], w) => (
              <div key={w} role="group" aria-labelledby={`ci-word-${w}`} className="flex flex-col gap-2">
                <p id={`ci-word-${w}`} className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">
                  Λέξη {w + 1} · {end - start} γράμματα
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: end - start }, (_, k) => {
                    const i = start + k
                    const sym = symbols[i]
                    return (
                      <label key={i} className="flex min-w-0 max-w-14 flex-1 flex-col items-center gap-1.5">
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

          <div>
            <GhostButton onClick={onBackToSymbols}>
              <ArrowLeft aria-hidden="true" />
              Πίσω στα σύμβολα
            </GhostButton>
          </div>
        </Panel>
      </div>

      <NextStepNotice
        show={complete}
        note="Έγραψες και τα 16 γράμματα. Αυτό δεν σημαίνει ότι το μήνυμα είναι σωστό: στο επόμενο βήμα θα το υποβάλεις και θα μάθεις."
        actionLabel="Πήγαινε στην υποβολή"
        onContinue={onContinue}
      />
    </div>
  )
}
