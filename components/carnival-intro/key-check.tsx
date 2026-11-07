"use client"

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { Hourglass, KeyRound, Loader2, LockKeyhole, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition, type FormEvent, type KeyboardEvent } from "react"
import { checkCarnivalKey } from "@/app/carnival-intro/actions"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { KEY_LIMIT, type KeyQuota } from "@/lib/carnival-intro/limits"
import { cn } from "@/lib/utils"
import { buzz } from "./haptics"
import { KeyReveal } from "./key-reveal"
import { EASE } from "./palette"

export interface KeyState {
  attempts: number
  tried: string[]
  solved: boolean
  /** The key the player found, kept so the phrase check can prove the lock was opened. */
  value?: string
}

const PENDING_KEY = "thehunt:carnival-intro:pending-key"

function countdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })
}

export function KeyCheck({
  state,
  onChange,
  quota: initialQuota,
  onAuthNeeded,
}: {
  state: KeyState
  onChange: (next: KeyState) => void
  /** null = signed out. */
  quota: KeyQuota | null
  onAuthNeeded: () => void
}) {
  const reduce = useReducedMotion()
  const router = useRouter()
  const [value, setValue] = useState("")
  const [notice, setNotice] = useState<"wrong" | "close" | "unset" | "cooldown" | null>(null)
  const [quota, setQuota] = useState(initialQuota)
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()
  const shake = useAnimationControls()
  const signedIn = quota !== null
  const lockedOut = signedIn && quota.remaining === 0
  const waitMs = quota?.nextAt ? new Date(quota.nextAt).getTime() - now : 0

  useEffect(() => setQuota(initialQuota), [initialQuota])

  // A key typed before signing in waits here so the player does not have to retype it.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(PENDING_KEY)
      if (stored && signedIn) {
        setValue(stored.slice(0, 64))
        window.sessionStorage.removeItem(PENDING_KEY)
      }
    } catch {}
  }, [signedIn])

  useEffect(() => {
    if (!lockedOut) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [lockedOut])

  // When the oldest try turns four hours old, ask the server for the fresh allowance.
  const due = lockedOut && !!quota?.nextAt && waitMs <= -1000
  useEffect(() => {
    if (due) router.refresh()
  }, [due, router])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const key = value.trim()
    if (!key || pending) return
    if (!signedIn) {
      try {
        window.sessionStorage.setItem(PENDING_KEY, key)
      } catch {}
      onAuthNeeded()
      return
    }
    if (lockedOut) return
    startTransition(async () => {
      const res = await checkCarnivalKey(key)
      if (res.verdict === "auth") {
        try {
          window.sessionStorage.setItem(PENDING_KEY, key)
        } catch {}
        setQuota(null)
        onAuthNeeded()
        return
      }
      setQuota(res.quota)
      setNow(Date.now())
      const result = res.verdict
      if (result === "cooldown") {
        track(EV.carnivalKeyCheck, { result, attempt: state.attempts })
        setNotice("cooldown")
        return
      }
      const attempt = state.attempts + 1
      track(EV.carnivalKeyCheck, { result, attempt, remaining: res.quota.remaining })
      if (result === "correct") {
        buzz("success")
        ;(document.activeElement as HTMLElement | null)?.blur()
        setNotice(null)
        onChange({ attempts: attempt, tried: state.tried, solved: true, value: key })
        return
      }
      setNotice(result)
      if (result === "wrong" || result === "close") {
        buzz("wrong")
        const label = key.toLocaleUpperCase("el-GR")
        onChange({ attempts: attempt, tried: [label, ...state.tried.filter((t) => t !== label)].slice(0, 8), solved: false })
        if (!reduce) shake.start({ x: [0, -12, 10, -7, 4, 0], transition: { duration: 0.45 } })
      }
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  if (state.solved) return <KeyReveal value={state.value} />

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
              disabled={lockedOut}
              placeholder={lockedOut ? "Η κλειδαριά ξεκουράζεται" : "Το κλειδί σου"}
              aria-invalid={notice === "wrong"}
              aria-describedby="ci-key-status"
              data-no-track
              className="h-14 w-full bg-transparent pl-12 pr-4 font-serif text-2xl uppercase tracking-[0.2em] text-[var(--ci-cream)] caret-[var(--ci-gold)] outline-none placeholder:font-sans placeholder:text-base placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--ci-cream)]/35"
            />
          </div>
          <button
            type="submit"
            disabled={!value.trim() || pending || lockedOut}
            data-track="carnival-key-check"
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[1.25rem] bg-[var(--ci-gold)] px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[var(--ci-night)] tabular-nums transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-cream)]"
          >
            {lockedOut ? (
              <>
                <Hourglass className="size-4" aria-hidden="true" />
                <span className="sr-only">Επόμενη δοκιμή σε </span>
                {countdown(waitMs)}
              </>
            ) : (
              <>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
                Ξεκλείδωσε
              </>
            )}
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
        {signedIn && <QuotaMeter quota={quota} lockedOut={lockedOut} />}
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

function QuotaMeter({ quota, lockedOut }: { quota: KeyQuota; lockedOut: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2.5" aria-live="polite">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: KEY_LIMIT }, (_, i) => (
          <KeyRound
            key={i}
            className={cn(
              "size-4 transition-colors",
              i < quota.remaining ? "text-[var(--ci-gold)]" : "text-[var(--ci-cream)]/20",
            )}
          />
        ))}
      </div>
      <p className="text-pretty font-sans text-sm leading-relaxed text-[var(--ci-cream)]/60">
        {lockedOut ? (
          <>
            Έκανες και τις {KEY_LIMIT} δοκιμές.
            {quota.nextAt && <> Η επόμενη ανοίγει στις <strong className="font-bold text-[var(--ci-gold)]">{clockTime(quota.nextAt)}</strong>.</>}
          </>
        ) : (
          <>
            Σου μένουν <strong className="font-bold text-[var(--ci-cream)]">{quota.remaining}</strong> από {KEY_LIMIT} δοκιμές.
            {quota.nextAt && quota.remaining < KEY_LIMIT && <> Η επόμενη επιστρέφει στις {clockTime(quota.nextAt)}.</>}
          </>
        )}
      </p>
    </div>
  )
}
