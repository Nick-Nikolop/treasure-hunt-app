"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Megaphone, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * Event any component can fire to force the announcement open, regardless of the
 * appearance cap below. The journal label uses it. Shared constant so the
 * emitter and listener can never drift on the event name.
 */
export const ANNOUNCEMENT_OPEN_EVENT = "pythea:announcement:open"

/**
 * How many times the notice auto-appears before it goes quiet. After this many
 * loads/navigations it no longer opens on its own, but the journal label still
 * re-opens it on demand (that path ignores the cap).
 */
const MAX_APPEARANCES = 5

/**
 * Versioned by content: bump this string to re-show a NEW announcement to
 * everyone (it resets the per-browser counter to zero for the new key).
 */
const COUNT_KEY = "pythea:announcement:serbia-qr:count"

function readCount(): number {
  try {
    return Number(localStorage.getItem(COUNT_KEY)) || 0
  } catch {
    return 0
  }
}

/**
 * A site-wide announcement shown on every page, to everyone.
 *
 * It auto-opens on each fresh load AND on every client navigation (keyed off the
 * pathname), up to MAX_APPEARANCES times per browser, then stops appearing on
 * its own. The journal label re-opens it after that via ANNOUNCEMENT_OPEN_EVENT.
 *
 * The wrong/right QR digits are rendered here as fixed spans (red 2, green 1)
 * rather than living in i18n, since a bare numeral needs no translation and the
 * colour is the whole point of the correction.
 */
export function AnnouncementModal() {
  const { t } = useI18n()
  const a = t.announcement
  const pathname = usePathname()
  // Starts closed: localStorage is client-only, so the auto-open decision is
  // deferred to the effect below to avoid an SSR/hydration mismatch.
  const [open, setOpen] = useState(false)

  // Dedupe the auto-open per pathname. React Strict Mode double-invokes effects
  // in dev, so without this guard a single view would count as two appearances
  // and burn through the cap twice as fast.
  const countedFor = useRef<string | null>(null)

  useEffect(() => {
    if (countedFor.current === pathname) return
    countedFor.current = pathname

    const count = readCount()
    if (count >= MAX_APPEARANCES) return

    setOpen(true)
    try {
      localStorage.setItem(COUNT_KEY, String(count + 1))
    } catch {
      // Private mode / storage blocked: it will simply keep appearing, which is
      // the safer failure for a message everyone is meant to see.
    }
  }, [pathname])

  // On-demand re-open (journal label). Deliberately ignores the appearance cap.
  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(ANNOUNCEMENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(ANNOUNCEMENT_OPEN_EVENT, reopen)
  }, [])

  const dismiss = useCallback(() => setOpen(false), [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="announcement"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
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
              <Megaphone className="size-8" aria-hidden />
            </div>

            <p className="mt-5 font-sans text-[11px] font-bold tracking-chip text-brass">
              {a.label}
            </p>

            <p className="mx-auto mt-4 max-w-xs text-pretty font-serif text-base leading-relaxed text-foreground">
              {a.bodyBefore}
              <strong className="font-black text-destructive">2</strong>
              {a.bodyMiddle}
              <strong className="font-black text-emerald-600 dark:text-emerald-400">1</strong>
              {a.bodyAfter}
            </p>

            <p className="mx-auto mt-3 max-w-xs text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
              {a.apology} <span className="font-bold text-brass">{a.sign}</span>
            </p>

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
