"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Megaphone, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * A site-wide announcement shown on every page, to everyone.
 *
 * Deliberately NOT persisted: it opens on each fresh load AND on every client
 * navigation (keyed off the pathname), and closing it only clears it for the
 * current view. This matches the brief exactly -- the notice should resurface
 * on a refresh or when the visitor moves to another page -- and a localStorage
 * flag would silence the one message everyone is meant to see.
 *
 * The wrong/right QR digits are rendered here as fixed spans (red 2, green 1)
 * rather than living in i18n, since a bare numeral needs no translation and the
 * colour is the whole point of the correction.
 */
export function AnnouncementModal() {
  const { t } = useI18n()
  const a = t.announcement
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  // Re-open on every route change. The root layout does not remount across
  // client navigations, so a plain mount-only effect would fire once; keying on
  // the pathname makes "go to another page" resurface the notice as asked.
  useEffect(() => {
    setOpen(true)
  }, [pathname])

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
