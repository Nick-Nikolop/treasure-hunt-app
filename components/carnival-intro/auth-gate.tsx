"use client"

import { motion } from "framer-motion"
import { KeyRound, LogIn, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CARNIVAL_PATH } from "@/lib/carnival-intro/limits"
import { EASE } from "./palette"

const RETURN_TO = encodeURIComponent(`${CARNIVAL_PATH}#ci-lock`)

/** Shown when a signed-out player tries a key: checking needs an account. */
export function AuthGate({ step, onClose }: { step: "key" | "phrase"; onClose: () => void }) {
  const primary = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    track(EV.carnivalKeyGate, { action: "shown", step })
    primary.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = prev
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    track(EV.carnivalKeyGate, { action: "dismiss", step })
    onClose()
  }

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
        aria-label="Κλείσιμο"
        tabIndex={-1}
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-[var(--ci-night)]/75 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ci-gate-title"
        aria-describedby="ci-gate-body"
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
          onClick={dismiss}
          aria-label="Κλείσιμο"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[var(--ci-cream)]/55 transition hover:bg-[var(--ci-cream)]/5 hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <span className="relative grid size-16 place-items-center rounded-full border border-[var(--ci-gold)]/40 bg-[var(--ci-gold)]/10 text-[var(--ci-gold)]">
          <KeyRound className="size-7" aria-hidden="true" />
        </span>

        <div className="relative flex flex-col gap-3">
          <h2 id="ci-gate-title" className="text-balance font-serif text-2xl font-bold leading-tight text-[var(--ci-cream)] sm:text-3xl">
            Πιστεύεις ότι βρήκες το κλειδί;
          </h2>
          <p id="ci-gate-body" className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/75">
            Κάνε εγγραφή ή σύνδεση για να το ελέγξεις και να λύσεις τον υπόλοιπο γρίφο. Ό,τι έχεις κάνει ως τώρα σε περιμένει εδώ.
          </p>
        </div>

        <div className="relative flex w-full flex-col gap-3">
          <Link
            ref={primary}
            href={`/sign-up?redirect=${RETURN_TO}`}
            onClick={() => track(EV.carnivalKeyGate, { action: "sign_up", step })}
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[var(--ci-gold)] px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-night)]"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Εγγραφή
          </Link>
          <Link
            href={`/sign-in?redirect=${RETURN_TO}`}
            onClick={() => track(EV.carnivalKeyGate, { action: "sign_in", step })}
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-[var(--ci-cream)]/20 px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-cream)] transition hover:border-[var(--ci-gold)]/60 hover:text-[var(--ci-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Έχω ήδη λογαριασμό
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
