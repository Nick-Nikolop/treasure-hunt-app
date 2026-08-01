"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Compass, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { Countdown } from "@/components/pythea/countdown"
import { getCompassPickupAccess } from "@/app/actions/notifications"
import { COMPASS_PICKUP_AT_MS } from "@/lib/compass-pickup"

/**
 * How many times this auto-appears per browser before going quiet, matching the
 * site announcement. It is a reminder, not a blocker, so it stops nagging.
 */
const MAX_APPEARANCES = 5

/** Versioned by content: bump to re-show a changed popup to everyone. */
const COUNT_KEY = "pythea:pickup:compass-1300:count"

function readCount(): number {
  try {
    return Number(localStorage.getItem(COUNT_KEY)) || 0
  } catch {
    return 0
  }
}

/**
 * Site-wide countdown to the compass pickup, shown on every page.
 *
 * Only for crews who may open NOTE 2 (found the compass AND were granted it) --
 * that check is made on the SERVER, so an ineligible visitor never receives this
 * markup. It carries the same countdown and wording as the note itself.
 *
 * Disappears for good once the countdown ends: at that point the note reveals the
 * location, so a popup counting down to a moment that has passed would be noise.
 */
export function CompassPickupPopup({
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
  const pathname = usePathname()

  const [allowed, setAllowed] = useState(preview)
  const [open, setOpen] = useState(preview)
  // Latched so the popup closes itself the moment the countdown runs out, even
  // if it was already on screen when zero hit.
  const [expired, setExpired] = useState(false)

  // One permission check per mount. Skipped entirely in preview so the admin
  // button cannot depend on a real grant.
  useEffect(() => {
    if (preview) return
    // Already past the deadline: never ask, never show.
    if (Date.now() >= COMPASS_PICKUP_AT_MS) return
    let alive = true
    void (async () => {
      try {
        const res = await getCompassPickupAccess()
        if (alive && res.show) setAllowed(true)
      } catch {
        // Transient/auth error: stay silent rather than guess at permission.
      }
    })()
    return () => {
      alive = false
    }
  }, [preview])

  // Auto-open per pathname, capped. Deduped against React Strict Mode's double
  // effect invocation in dev, which would otherwise burn two slots per view.
  const countedFor = useRef<string | null>(null)
  useEffect(() => {
    if (preview || !allowed || expired) return
    if (countedFor.current === pathname) return
    countedFor.current = pathname

    const count = readCount()
    if (count >= MAX_APPEARANCES) return

    setOpen(true)
    try {
      localStorage.setItem(COUNT_KEY, String(count + 1))
    } catch {
      // Storage blocked: it keeps appearing, the safer failure for a reminder.
    }
  }, [pathname, allowed, expired, preview])

  const dismiss = useCallback(() => {
    setOpen(false)
    onDismiss?.()
  }, [onDismiss])

  const showing = open && !expired

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key="pickup-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[82] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
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
              <Compass className="size-8" aria-hidden />
            </div>

            <p className="mt-5 font-sans text-[11px] font-bold tracking-chip text-brass">
              {f.pickupPopupLabel}
            </p>

            <p className="mx-auto mt-4 max-w-xs text-pretty font-serif text-base leading-relaxed text-foreground">
              {f.pickupCountdownLabel}
            </p>

            <div className="mt-5">
              <Countdown
                targetMs={COMPASS_PICKUP_AT_MS}
                size="sm"
                onDone={() => setExpired(true)}
              />
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
