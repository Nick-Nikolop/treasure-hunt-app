"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ScrollText, DoorOpen, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { getHoldRelease } from "@/app/actions/notifications"

const POLL_MS = 15000

/**
 * Marks the release alert as seen. Client-side on purpose: see `getHoldRelease`
 * for why a localStorage flag is preferred over a new table for a one-shot nudge.
 * Keyed by the lift timestamp, so if the hold is ever re-sealed and lifted again
 * (a second wave), the new release is announced instead of being swallowed by an
 * older dismissal.
 */
const SEEN_KEY = "pythea:hold-release-seen"

/**
 * Tells a held crew that the way has opened, the moment an admin lifts the hold.
 *
 * Why a poll rather than a page refresh: a crew sitting on the hold slip has no
 * reason to reload, so without this they would sit on a stale "please wait" screen
 * indefinitely after being released. It reuses the same 15s cadence as the proof
 * notifications, so being freed is noticed within seconds of the admin's click.
 *
 * Shows for nobody else: `getHoldRelease` returns false unless this crew closed
 * the trail BEFORE the lift, so crews who arrive later (and everyone still mid
 * trail) never see it.
 */
export function HoldReleaseToast({
  onDismiss,
  preview = false,
}: {
  /** Overrides dismissal, used by the admin preview so it writes no flag. */
  onDismiss?: () => void
  /** Renders immediately without polling, for the admin test button. */
  preview?: boolean
}) {
  const { t } = useI18n()
  const f = t.finale
  const [show, setShow] = useState(preview)

  const check = useCallback(async () => {
    try {
      const res = await getHoldRelease()
      if (!res.show || res.liftedAtMs === null) return
      // Already acknowledged THIS release on this device.
      if (localStorage.getItem(SEEN_KEY) === String(res.liftedAtMs)) return
      setShow(true)
    } catch {
      // Transient/auth error: try again on the next tick.
    }
  }, [])

  useEffect(() => {
    if (preview) return
    void check()
    const id = setInterval(() => void check(), POLL_MS)
    // Also re-check when the tab regains focus, for a phone put away mid-wait.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [check, preview])

  const dismiss = useCallback(() => {
    setShow(false)
    if (onDismiss) {
      onDismiss()
      return
    }
    void getHoldRelease().then((res) => {
      if (res.liftedAtMs !== null) localStorage.setItem(SEEN_KEY, String(res.liftedAtMs))
    })
  }, [onDismiss])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="hold-release"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
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
              <DoorOpen className="size-9" aria-hidden />
            </div>

            <p className="mt-5 font-sans text-[11px] font-bold tracking-chip text-brass">
              {f.holdLabel}
            </p>
            <h2 className="mt-2 text-balance font-serif text-2xl font-black text-foreground">
              {f.releaseTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
              {f.releaseBody}
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-3">
              <Link
                href="/journal"
                onClick={dismiss}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ScrollText className="size-4" />
                {f.releaseCta}
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.notify.dismiss}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
