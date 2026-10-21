"use client"

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { KeyRound, Loader2, LockKeyhole, LockKeyholeOpen, X } from "lucide-react"
import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react"
import { checkCarnivalKey } from "@/app/carnival-intro/actions"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE } from "./palette"

export interface KeyState {
  attempts: number
  tried: string[]
  solved: boolean
  /** The key the player found, kept so the phrase check can prove the lock was opened. */
  value?: string
}

export function KeyCheck({ state, onChange }: { state: KeyState; onChange: (next: KeyState) => void }) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState("")
  const [notice, setNotice] = useState<"wrong" | "close" | "unset" | null>(null)
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
        onChange({ attempts: attempt, tried: state.tried, solved: true, value: key })
        return
      }
      setNotice(result)
      if (result === "wrong" || result === "close") {
        const label = key.toLocaleUpperCase("el-GR")
        onChange({ attempts: attempt, tried: [label, ...state.tried.filter((t) => t !== label)].slice(0, 8), solved: false })
        if (!reduce) shake.start({ x: [0, -12, 10, -7, 4, 0], transition: { duration: 0.45 } })
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
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[2rem] border border-[var(--ci-gold)]/40 bg-[var(--ci-wine)] px-6 py-14 text-center sm:px-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(224,176,74,0.35), transparent 70%)" }}
        />
        <motion.span
          className="relative grid size-20 place-items-center rounded-full bg-[var(--ci-gold)] text-[var(--ci-night)] shadow-[0_0_60px_-5px_var(--ci-gold)]"
          initial={{ rotate: -25, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
        >
          <LockKeyholeOpen className="size-9" aria-hidden="true" />
        </motion.span>
        <h3 className="relative text-balance font-serif text-4xl font-bold text-[var(--ci-cream)] sm:text-5xl">Αυτό είναι το κλειδί</h3>
        {state.value && (
          <p className="relative font-serif text-2xl font-bold tracking-[0.3em] text-[var(--ci-gold)] sm:text-3xl" data-no-track>
            {state.value.toLocaleUpperCase("el-GR")}
          </p>
        )}
        <figure className="relative flex max-w-[44ch] flex-col items-center gap-3 border-t border-[var(--ci-gold)]/25 pt-6">
          <blockquote className="text-balance font-serif text-xl italic leading-relaxed text-[var(--ci-cream)] sm:text-2xl">
            «Ένας σωστός νοικοκύρης κλειδώνει πάντα την πόρτα του δύο φορές. Ακόμα κι αν έχει ένα μόνο κλειδί.»
          </blockquote>
        </figure>
        <p className="relative max-w-[46ch] text-pretty font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/70">
          Η αποκρυπτογράφηση είναι δική σου υπόθεση. Όταν διαβάσεις το μήνυμα, γράψ&apos; το παρακάτω.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <motion.div
          animate={shake}
          className={cn(
            "flex flex-col gap-3 rounded-[1.75rem] border bg-[var(--ci-cream)]/[0.04] p-3 transition-colors sm:flex-row sm:items-center sm:p-2.5",
            notice === "wrong" ? "border-[var(--ci-wine)]" : "border-[var(--ci-gold)]/25 focus-within:border-[var(--ci-gold)]/70",
          )}
        >
          <label htmlFor="ci-key" className="sr-only">
            Κλειδί
          </label>
          <div className="relative flex flex-1 items-center">
            <KeyRound className="pointer-events-none absolute left-4 size-5 text-[var(--ci-gold)]" aria-hidden="true" />
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
              placeholder="Το κλειδί σου"
              aria-invalid={notice === "wrong"}
              aria-describedby="ci-key-status"
              data-no-track
              className="h-14 w-full bg-transparent pl-12 pr-4 font-serif text-2xl uppercase tracking-[0.2em] text-[var(--ci-cream)] caret-[var(--ci-gold)] outline-none placeholder:font-sans placeholder:text-base placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--ci-cream)]/35"
            />
          </div>
          <button
            type="submit"
            disabled={!value.trim() || pending}
            data-track="carnival-key-check"
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[1.25rem] bg-[var(--ci-gold)] px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)]"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
            Ξεκλείδωσε
          </button>
        </motion.div>
        <div id="ci-key-status" aria-live="polite" className="min-h-6 text-center font-sans text-[15px] leading-relaxed">
          <AnimatePresence mode="wait">
            {notice === "wrong" && (
              <motion.p key="wrong" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-cream)]/85">
                Δεν ταιριάζει. Η κλειδαριά μένει κλειστή.
              </motion.p>
            )}
            {notice === "close" && (
              <motion.p key="close" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-bold text-[var(--ci-gold)]">
                Πολύ κοντά. Έχεις όλα τα σωστά γράμματα, αλλά με αυτή τη σειρά δεν σχηματίζουν ακόμα το κλειδί.
              </motion.p>
            )}
            {notice === "unset" && (
              <motion.p key="unset" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--ci-cream)]/65">
                Η κλειδαριά δεν δέχεται ακόμα κλειδιά. Δοκίμασε λίγο αργότερα.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>

      {state.tried.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--ci-cream)]/45">
            Κλειδιά που δεν ταίριαξαν · {state.attempts}
          </p>
          <ul className="flex flex-wrap justify-center gap-2" data-no-track>
            {state.tried.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-cream)]/12 bg-[var(--ci-cream)]/5 px-3 py-1 font-serif text-sm tracking-[0.14em] text-[var(--ci-cream)]/55 line-through decoration-[var(--ci-gold)]/50"
              >
                <X className="size-3 text-[var(--ci-gold)]" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
