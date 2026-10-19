"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { MONUMENT_SIDES, SYMBOL_NAMES, type SymbolId } from "@/lib/carnival-intro/cipher"
import { CipherSymbol } from "./symbols"
import { EASE, GhostButton, NextStepNotice, Panel, StageHeading } from "./ui"

export function StageReview({
  code,
  symbols,
  onBack,
  onContinue,
}: {
  code: string[]
  symbols: (SymbolId | null)[]
  onBack: () => void
  onContinue: () => void
}) {
  const reduce = useReducedMotion()
  return (
    <div className="flex flex-col gap-8">
      <StageHeading kicker="Βήμα 3 από 5" title="Η ακολουθία των συμβόλων">
        Μετέτρεψες τους 16 χαρακτήρες σε σύμβολα. Τώρα χρησιμοποίησε το δεύτερο εγχειρίδιο για να ανακαλύψεις τι σημαίνουν.
      </StageHeading>

      <Panel className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MONUMENT_SIDES.map((side, g) => (
            <div key={side.code} className="flex flex-col gap-3">
              <p className="border-b border-[var(--cv-gold)]/25 pb-2 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">
                {g + 1} · {side.name}
              </p>
              <ol className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((k) => {
                  const i = g * 4 + k
                  const sym = symbols[i]
                  return (
                    <motion.li
                      key={i}
                      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--cv-gold)]/25 bg-[var(--cv-bg)]/60 px-1 py-2"
                    >
                      <span className="font-sans text-[10px] font-bold text-[var(--cv-muted)]">
                        {i + 1} · <span className="font-serif text-xs text-[var(--cv-ink)]">{code[i]}</span>
                      </span>
                      {sym && <CipherSymbol id={sym} className="size-9 text-[var(--cv-gold)]" labelled />}
                      <span className="sr-only">{sym ? SYMBOL_NAMES[sym] : ""}</span>
                    </motion.li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
        <div>
          <GhostButton onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Διόρθωσε σύμβολα
          </GhostButton>
        </div>
      </Panel>

      <NextStepNotice
        show
        note="Η ακολουθία σου είναι πλήρης. Αυτό δεν σημαίνει ότι όλα τα σύμβολα είναι σωστά, αλλά μπορείς να προχωρήσεις στο Εγχειρίδιο Β."
        actionLabel="Άνοιξε το Εγχειρίδιο Β"
        onContinue={onContinue}
      />
    </div>
  )
}
