"use client"

import { motion } from "framer-motion"
import { NotebookPen, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { EASE } from "./palette"

export const NOTES_MAX = 4000

/** Lined field notebook. Text stays on this device only and is never tracked. */
export function Notebook({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  return (
    <motion.aside
      role="dialog"
      aria-label="Σημειωματάριο"
      data-no-track
      className="fixed inset-x-0 bottom-0 z-[80] flex h-[58svh] flex-col rounded-t-3xl border-t border-[var(--ci-gold)]/25 bg-[var(--ci-cream)] text-[var(--ci-night)] shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.8)] md:inset-y-4 md:left-auto md:right-4 md:h-auto md:w-[24rem] md:rounded-3xl md:border"
      initial={{ y: "100%", opacity: 0.6 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.6 }}
      transition={{ duration: 0.5, ease: EASE }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--ci-night)]/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[var(--ci-wine)] text-[var(--ci-cream)]">
            <NotebookPen className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <p className="font-serif text-lg font-bold leading-tight">Σημειωματάριο</p>
            <p className="font-sans text-xs text-[var(--ci-night)]/55">Μένει μόνο σε αυτή τη συσκευή</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο σημειωματάριου"
          className="grid size-10 place-items-center rounded-full text-[var(--ci-night)]/60 transition hover:bg-[var(--ci-night)]/5 hover:text-[var(--ci-night)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-wine)]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <label htmlFor="ci-notes" className="sr-only">
        Οι σημειώσεις σου
      </label>
      <textarea
        id="ci-notes"
        ref={ref}
        value={value}
        maxLength={NOTES_MAX}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Ό,τι βρεις, γράψ' το εδώ."
        className="min-h-0 flex-1 resize-none bg-transparent px-6 pb-6 pt-[0.4rem] font-serif text-lg leading-8 text-[var(--ci-night)] outline-none placeholder:italic placeholder:text-[var(--ci-night)]/35"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent 2.6rem, rgba(107,16,36,0.25) 2.6rem, rgba(107,16,36,0.25) calc(2.6rem + 1px), transparent calc(2.6rem + 1px)), repeating-linear-gradient(to bottom, transparent 0, transparent calc(2rem - 1px), rgba(22,2,10,0.1) calc(2rem - 1px), rgba(22,2,10,0.1) 2rem)",
          backgroundAttachment: "local",
          paddingLeft: "3.4rem",
        }}
      />
    </motion.aside>
  )
}
