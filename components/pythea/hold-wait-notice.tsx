"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Hourglass, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { getHoldWait } from "@/app/actions/notifications"
import { HOLD_RESUME_AT_MS } from "@/lib/hold-resume"

/** Splits a remaining duration into whole days/hours/minutes/seconds. */
function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total === 0,
  }
}

/** One countdown cell: a big tabular numeral over its unit label. */
function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-sm border border-border bg-background px-1 py-2.5">
      <span className="font-serif text-xl font-black tabular-nums leading-none text-foreground sm:text-2xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-sans text-[9px] font-bold leading-tight tracking-chip text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

/**
 * Tells a crew waiting on the hold when the hunt picks up again.
 *
 * Deliberately NOT persisted: it reappears on every page load, and closing it
 * only clears it for that view. A crew standing at the meeting point should be
 * reminded of the time whenever they come back to the site, and a localStorage
 * flag would silence the one message they actually need.
 *
 * The countdown is decorative. It runs off a fixed UTC instant sent by the
 * server, and reaching zero does nothing on its own, because lifting the hold
 * stays a manual admin action.
 *
 * Shows for nobody else: `getHoldWait` returns false unless the trail end is
 * still held AND this crew has already closed the trail.
 */
export function HoldWaitNotice({
  onDismiss,
  preview = false,
}: {
  /** Overrides dismissal, used by the admin preview. */
  onDismiss?: () => void
  /** Renders immediately without asking the server, for the admin test button. */
  preview?: boolean
} = {}) {
  const { t } = useI18n()
  const f = t.finale
  const [resumeAtMs, setResumeAtMs] = useState<number | null>(preview ? HOLD_RESUME_AT_MS : null)
  const [now, setNow] = useState<number | null>(preview ? Date.now() : null)

  // One check per page load. No polling: a crew that closes the trail while
  // sitting here navigates to the hold slip anyway, which is a fresh load.
  useEffect(() => {
    if (preview) return
    let alive = true
    void (async () => {
      try {
        const res = await getHoldWait()
        if (!alive || !res.show) return
        setResumeAtMs(res.resumeAtMs)
        setNow(Date.now())
      } catch {
        // Transient/auth error: stay silent rather than guess at the state.
      }
    })()
    return () => {
      alive = false
    }
  }, [preview])

  // Tick only while the notice is actually open.
  useEffect(() => {
    if (resumeAtMs === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [resumeAtMs])

  const left = useMemo(
    () => (resumeAtMs === null || now === null ? null : splitRemaining(resumeAtMs - now)),
    [resumeAtMs, now],
  )

  const dismiss = useCallback(() => {
    setResumeAtMs(null)
    onDismiss?.()
  }, [onDismiss])

  return (
    <AnimatePresence>
      {left && (
        <motion.div
          key="hold-wait"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[84] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
        >
          <button
            type="button"
            aria-label={t.notify.dismiss}
            onClick={dismiss}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-sm border border-brass bg-card px-6 py-8 text-center shadow-2xl md:px-8"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label={t.notify.dismiss}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass">
              <Hourglass className="size-8" aria-hidden />
            </div>

            <p className="mt-5 font-sans text-[11px] font-bold tracking-chip text-brass">
              {f.holdLabel}
            </p>
            <h2 className="mt-2 text-balance font-serif text-2xl font-black text-foreground">
              {f.resumeTitle}
            </h2>
            <p className="mt-2 font-sans text-xs font-bold tracking-chip text-brass">
              {f.resumeWhen}
            </p>
            <p className="mx-auto mt-3 max-w-xs text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
              {f.resumeBody}
            </p>

            <div className="mt-6">
              <p className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                {left.done ? f.resumeSoon : f.resumeCountdownLabel}
              </p>
              {!left.done && (
                <div
                  className="mt-2 flex items-stretch gap-1.5"
                  role="timer"
                  aria-live="off"
                  aria-label={f.resumeCountdownLabel}
                >
                  <Cell value={left.days} label={f.resumeDays} />
                  <Cell value={left.hours} label={f.resumeHours} />
                  <Cell value={left.minutes} label={f.resumeMinutes} />
                  <Cell value={left.seconds} label={f.resumeSeconds} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="mt-6 inline-flex w-full items-center justify-center rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.notify.dismiss}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
