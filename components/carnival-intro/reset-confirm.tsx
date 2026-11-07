"use client"

import { motion } from "framer-motion"
import { RotateCcw, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { EASE } from "./palette"

/** Confirms wiping notes, letters, key and phrase before starting over. */
export function ResetConfirm({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  const cancel = () => {
    track(EV.carnivalResetPrompt, { action: "cancel" })
    onClose()
  }

  useEffect(() => {
    track(EV.carnivalResetPrompt, { action: "shown" })
    cancelRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = prev
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        aria-label="Άκυρο"
        tabIndex={-1}
        onClick={cancel}
        className="absolute inset-0 cursor-default bg-[var(--ci-night)]/75 backdrop-blur-sm"
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ci-reset-title"
        aria-describedby="ci-reset-body"
        className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-[2rem] border border-[var(--ci-gold)]/30 bg-[var(--ci-night)] px-6 pb-6 pt-10 text-center shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:px-10 sm:pb-8"
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(224,176,72,0.18), transparent 70%)" }}
        />
        <button
          type="button"
          onClick={cancel}
          aria-label="Κλείσιμο"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[var(--ci-cream)]/55 transition hover:bg-[var(--ci-cream)]/5 hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <span className="relative grid size-16 place-items-center rounded-full border border-[var(--ci-gold)]/40 bg-[var(--ci-gold)]/10 text-[var(--ci-gold)]">
          <RotateCcw className="size-7" aria-hidden="true" />
        </span>

        <div className="relative flex flex-col gap-3">
          <h2 id="ci-reset-title" className="text-balance font-serif text-2xl font-bold leading-tight text-[var(--ci-cream)] sm:text-3xl">
            Ξεκινάς από την αρχή;
          </h2>
          <p id="ci-reset-body" className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/75">
            Θα σβηστούν οι σημειώσεις, τα γράμματα, το κλειδί και το μήνυμα. Αυτό δεν αναιρείται.
          </p>
        </div>

        <div className="relative flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            data-track="carnival-reset-confirm"
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[var(--ci-gold)] px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Ναι, σβήσ’ τα όλα
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            data-track="carnival-reset-cancel"
            className="inline-flex h-14 items-center justify-center rounded-full border border-[var(--ci-cream)]/20 px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-cream)] transition hover:border-[var(--ci-gold)]/60 hover:text-[var(--ci-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
          >
            Άκυρο
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
