"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, KeyRound, Maximize2, NotebookPen, ScrollText } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { EASE } from "./palette"

export type DockStep = 1 | 2 | 3 | 4

const STEPS = ["Αφίσα", "Κλειδί", "Μήνυμα"] as const

/**
 * Phone-only action bar: shows where the player is in the hunt and offers the one next move.
 * Hides itself while the keyboard is up so it never covers an input.
 */
export function MobileDock({
  visible,
  step,
  onPoster,
  onKey,
  onDecrypt,
  onNotes,
}: {
  visible: boolean
  step: DockStep
  onPoster: () => void
  onKey: () => void
  onDecrypt: () => void
  onNotes: () => void
}) {
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true)
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false)
    document.addEventListener("focusin", onIn)
    document.addEventListener("focusout", onOut)
    return () => {
      document.removeEventListener("focusin", onIn)
      document.removeEventListener("focusout", onOut)
    }
  }, [])

  const primary =
    step === 1
      ? { label: "Άνοιξε την αφίσα", icon: Maximize2, onClick: onPoster }
      : step === 2
        ? { label: "Έχω κλειδί", icon: KeyRound, onClick: onKey }
        : step === 3
          ? { label: "Διάβασέ το", icon: ScrollText, onClick: onDecrypt }
          : { label: "Το μήνυμα", icon: Check, onClick: onDecrypt }
  const Icon = primary.icon
  const done = Math.min(step - 1, STEPS.length)

  return (
    <AnimatePresence>
      {visible && !typing && (
        <motion.nav
          aria-label="Πρόοδος κυνηγιού"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] lg:hidden"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="flex items-center gap-2 rounded-[1.6rem] border border-[var(--ci-gold)]/25 bg-[var(--ci-night)]/90 p-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pl-3">
              <p className="truncate font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ci-gold)]">
                {step > STEPS.length ? "Ολοκληρώθηκε" : `${step}/3 · ${STEPS[step - 1]}`}
              </p>
              <ol className="flex gap-1" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <li
                    key={s}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-700",
                      i < done ? "bg-[var(--ci-gold)]" : i === done ? "bg-[var(--ci-gold)]/45" : "bg-[var(--ci-cream)]/12",
                    )}
                  />
                ))}
              </ol>
            </div>

            {step > 1 && (
              <button
                type="button"
                onClick={onPoster}
                aria-label="Άνοιξε την αφίσα"
                data-track="carnival-dock-poster"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--ci-cream)]/12 text-[var(--ci-cream)]/80 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
              >
                <Maximize2 className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onNotes}
              aria-label="Σημειωματάριο"
              data-track="carnival-dock-notes"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--ci-cream)]/12 text-[var(--ci-cream)]/80 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
            >
              <NotebookPen className="size-4 text-[var(--ci-gold)]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={primary.onClick}
              data-track="carnival-dock-primary"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--ci-gold)] px-4 font-sans text-[13px] font-bold text-[var(--ci-night)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)]"
            >
              <Icon className="size-4" aria-hidden="true" />
              {primary.label}
            </button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
