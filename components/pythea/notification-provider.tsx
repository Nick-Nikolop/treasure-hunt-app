"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { BadgeCheck, XCircle, BookOpen, X, RotateCw } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import {
  getMyDecisionNotifications,
  acknowledgeMyDecision,
  type DecisionNotification,
} from "@/app/actions/notifications"

const POLL_MS = 15000

/**
 * Watches for photo-proof review decisions for the signed-in explorer and
 * surfaces them as a themed popup. It polls while the app is open (so a decision
 * made during play appears within ~15s) and also fetches on mount (so a decision
 * made while away appears on the next visit). Dismissing acknowledges the
 * decision server-side so it never shows twice. Renders nothing when there is
 * nothing to show (including for signed-out visitors, where the action returns
 * an empty list).
 */
export function NotificationProvider() {
  const { locale, t } = useI18n()
  const n = t.notify
  const [queue, setQueue] = useState<DecisionNotification[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = await getMyDecisionNotifications()
      setQueue(rows)
    } catch {
      // Transient/auth error: keep whatever is on screen.
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    // Re-check when the tab regains focus (rejoining after a while).
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  const current = queue[0] ?? null

  async function dismiss() {
    if (!current) return
    setBusy(true)
    try {
      await acknowledgeMyDecision(current.id)
      setQueue((q) => q.slice(1))
    } catch {
      // Even if the ack fails, advance locally so the user isn't stuck; it will
      // reappear on the next successful load, which is acceptable.
      setQueue((q) => q.slice(1))
    } finally {
      setBusy(false)
    }
  }

  const country = current ? (locale === "en" ? current.countryEn : current.country) : ""
  const approved = current?.status === "approved"

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key="proof-notification"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label={n.dismiss}
            onClick={() => void dismiss()}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="alertdialog"
            aria-modal="true"
            className={`relative w-full max-w-sm rounded-sm border bg-card px-6 py-8 text-center shadow-2xl md:px-8 ${
              approved ? "border-brass" : "border-amber-500/50"
            }`}
          >
            <button
              type="button"
              onClick={() => void dismiss()}
              aria-label={n.dismiss}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div
              className={`mx-auto flex size-16 items-center justify-center rounded-full border ${
                approved
                  ? "border-brass/40 bg-brass/10 text-brass"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-500"
              }`}
            >
              {approved ? (
                <BadgeCheck className="size-9" aria-hidden />
              ) : (
                <XCircle className="size-9" aria-hidden />
              )}
            </div>

            <p
              className={`mt-5 font-sans text-[11px] font-bold tracking-chip ${
                approved ? "text-brass" : "text-amber-500"
              }`}
            >
              {approved ? n.approvedLabel : n.rejectedLabel}
            </p>
            <h2 className="mt-2 text-balance font-serif text-2xl font-black text-foreground">
              {approved ? n.approvedTitle : n.rejectedTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
              {(approved ? n.approvedBody : n.rejectedBody).replace("{country}", country)}
            </p>

            {!approved && current.reason && (
              <p className="mx-auto mt-3 max-w-xs rounded-sm border border-border bg-background px-3 py-2 text-left font-sans text-xs leading-relaxed text-muted-foreground">
                <span className="font-bold tracking-chip text-foreground">{n.reasonLabel}</span>{" "}
                {current.reason}
              </p>
            )}

            <div className="mt-6 flex flex-col items-stretch gap-3">
              {approved ? (
                <Link
                  href="/journal"
                  onClick={() => void dismiss()}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <BookOpen className="size-4" />
                  {n.viewCta}
                </Link>
              ) : (
                <p className="inline-flex items-center justify-center gap-2 font-sans text-[11px] leading-relaxed text-muted-foreground/80">
                  <RotateCw className="size-3.5" />
                  {n.retryHint}
                </p>
              )}
              <button
                type="button"
                onClick={() => void dismiss()}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {n.dismiss}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
