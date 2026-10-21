"use client"

import { AnimatePresence, motion, useAnimationControls } from "framer-motion"
import { KeyRound, Loader2, ShieldCheck, X } from "lucide-react"
import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react"
import { checkCarnivalKey } from "@/app/carnival-intro/actions"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { CIPHERTEXT } from "@/lib/carnival-intro/poster"
import { EASE } from "./palette"

export interface KeyState {
  attempts: number
  tried: string[]
  solved: boolean
}

export function Ciphertext({ className }: { className?: string }) {
  return (
    <p
      className={className}
      aria-label={`Κρυπτογραφημένο μήνυμα: ${CIPHERTEXT}`}
    >
      <span aria-hidden="true">“{CIPHERTEXT}”</span>
    </p>
  )
}

export function KeyCheck({ state, onChange }: { state: KeyState; onChange: (next: KeyState) => void }) {
  const [value, setValue] = useState("")
  const [notice, setNotice] = useState<"wrong" | "unset" | null>(null)
  const [pending, startTransition] = useTransition()
  const shake = useAnimationControls()

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const key = value.trim()
    if (!key || pending) return
    startTransition(async () => {
      const result = await checkCarnivalKey(key)
      const attempt = state.attempts + 1
      track(EV.carnivalKeyCheck, { result, attempt })
      if (result === "correct") {
        setNotice(null)
        onChange({ attempts: attempt, tried: state.tried, solved: true })
        return
      }
      setNotice(result)
      if (result === "wrong") {
        const label = key.toLocaleUpperCase("el-GR")
        onChange({ attempts: attempt, tried: [label, ...state.tried.filter((t) => t !== label)].slice(0, 6), solved: false })
        shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } })
      }
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  if (state.solved) {
    return (
      <motion.div
        role="status"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="flex flex-col items-center gap-4 rounded-3xl bg-[var(--ci-wine)] px-6 py-10 text-center text-[var(--ci-cream)] sm:px-10"
      >
        <span className="grid size-14 place-items-center rounded-full bg-[var(--ci-gold-soft)] text-[var(--ci-night)]">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <h3 className="text-balance font-serif text-3xl font-bold sm:text-4xl">Το κλειδί είναι σωστό</h3>
        <p className="max-w-[48ch] text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/80 sm:text-base">
          Χρησιμοποίησέ το για να αποκρυπτογραφήσεις το μήνυμα της αφίσας. Σύντομα θα μάθεις τι κάνεις μετά.
        </p>
        <Ciphertext className="font-serif text-xl tracking-[0.18em] text-[var(--ci-gold-soft)] sm:text-2xl" />
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="ci-key" className="font-sans text-sm font-bold text-[var(--ci-ink)]">
          Κλειδί αποκρυπτογράφησης
        </label>
        <motion.div animate={shake} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--ci-ink)]/40" aria-hidden="true" />
            <input
              id="ci-key"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (notice) setNotice(null)
              }}
              onKeyDown={onKeyDown}
              maxLength={64}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="π.χ. ΚΛΕΙΔΙ"
              aria-invalid={notice === "wrong"}
              aria-describedby="ci-key-status"
              className="h-14 w-full rounded-2xl border border-[var(--ci-ink)]/15 bg-[var(--ci-paper)] pl-12 pr-4 font-serif text-xl uppercase tracking-[0.18em] text-[var(--ci-ink)] outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--ci-ink)]/35 focus:border-[var(--ci-wine)] focus:ring-2 focus:ring-[var(--ci-wine)]/20 aria-[invalid=true]:border-[var(--ci-wine)]"
            />
          </div>
          <button
            type="submit"
            disabled={!value.trim() || pending}
            data-track="carnival-key-check"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--ci-wine)] px-7 font-sans text-sm font-bold uppercase tracking-[0.14em] text-[var(--ci-cream)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ci-cream)]"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Έλεγχος κλειδιού
          </button>
        </motion.div>
        <div id="ci-key-status" aria-live="polite" className="min-h-6 font-sans text-[15px] leading-relaxed">
          <AnimatePresence mode="wait">
            {notice === "wrong" && (
              <motion.p key="wrong" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-wine)]">
                Δεν είναι αυτό το κλειδί. Έλεγξε ξανά τα γράμματα από το μνημείο και δοκίμασε πάλι.
              </motion.p>
            )}
            {notice === "unset" && (
              <motion.p key="unset" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-ink)]/70">
                Ο έλεγχος κλειδιών δεν έχει ανοίξει ακόμα. Δοκίμασε λίγο αργότερα.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>

      {state.tried.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-[var(--ci-ink)]/50">
            Δοκιμασμένα κλειδιά · {state.attempts}
          </p>
          <ul className="flex flex-wrap gap-2">
            {state.tried.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-ink)]/12 bg-[var(--ci-paper)] px-3 py-1 font-serif text-sm tracking-[0.12em] text-[var(--ci-ink)]/55 line-through decoration-[var(--ci-wine)]/60"
              >
                <X className="size-3 text-[var(--ci-wine)]" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
