"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BookOpen,
  Lightbulb,
  MapPinned,
  PartyPopper,
  QrCode,
  Repeat,
  ScrollText,
  Users,
  X,
} from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * The "how to play" walkthrough: the seven steps of the hunt, shown once
 * automatically the first time an explorer opens the journal and re-openable
 * from a button underneath it at any time.
 *
 * Why a modal rather than a page: the steps only matter at the moment someone
 * lands in the journal for the first time and wonders what they are looking at.
 * The public /guide page stays the long-form version.
 */

/** One icon per step, in the same order as the copy in lib/i18n.ts. */
const STEP_ICONS = [Users, BookOpen, MapPinned, Lightbulb, QrCode, Repeat, PartyPopper] as const

/**
 * Per-browser marker that the walkthrough has been shown. Versioned so the
 * steps can be re-announced later by bumping the suffix. localStorage (not a
 * cookie) because nothing on the server needs to read it.
 */
const SEEN_KEY = "pythea_howtoplay_seen_v1"

export function HowToPlayModal({
  open,
  onClose,
  endsAt,
}: {
  open: boolean
  onClose: () => void
  /** "HH:MM" closing time, substituted into the last step. */
  endsAt: string
}) {
  const { t } = useI18n()
  const h = t.howToPlay

  // Escape closes, matching the journal's other overlays.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // The overlay scrolls internally, so the page behind it should not.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label={h.closeAria}
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-background/85 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="howtoplay-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto my-auto w-full max-w-xl overflow-hidden rounded-md border border-brass/35 bg-card shadow-2xl"
          >
            {/* Close affordance, mirroring the journal's other overlays. */}
            <button
              type="button"
              onClick={onClose}
              aria-label={h.closeAria}
              className="absolute right-3 top-3 z-10 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-brass/10 hover:text-brass"
            >
              <X className="size-4" />
            </button>

            {/* Poster-style masthead */}
            <div className="border-b border-brass/20 bg-brass/[0.06] px-5 py-7 text-center sm:px-8">
              <p className="font-sans text-[10px] font-bold tracking-chip text-brass/80">
                {h.eyebrow}
              </p>
              <h2
                id="howtoplay-title"
                className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-brass sm:text-4xl"
              >
                {h.title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-pretty font-serif leading-relaxed text-muted-foreground">
                {h.lede}
              </p>
            </div>

            {/* The seven steps */}
            <ol className="flex flex-col gap-2.5 px-4 py-5 sm:px-6">
              {h.steps.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? ScrollText
                return (
                  <li
                    key={step.title}
                    className="flex items-start gap-3 rounded-sm border border-border bg-background/40 p-3 transition-colors hover:border-brass/45 sm:gap-4 sm:p-3.5"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-brass/45 bg-brass/10 font-serif text-lg font-black tabular-nums text-brass"
                    >
                      {i + 1}
                    </span>
                    <Icon className="mt-1 hidden size-5 shrink-0 text-brass/80 sm:block" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="sr-only">{`${h.stepLabel} ${i + 1}: `}</span>
                      <h3 className="font-serif text-lg font-extrabold leading-snug text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-pretty font-serif text-[15px] leading-relaxed text-muted-foreground">
                        {/* Only the last step carries the token, but replacing
                            on every step keeps the copy free to move it. */}
                        {step.body.replace("{time}", endsAt)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="border-t border-border bg-background/60 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90"
              >
                {h.close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Journal mount point: opens the walkthrough automatically on a browser's first
 * visit, and always renders the button that reopens it.
 *
 * The auto-open decision is made in an effect (never during render) so the
 * server and client agree on the first paint.
 */
export function HowToPlayLauncher({ endsAt }: { endsAt: string }) {
  const { t } = useI18n()
  const h = t.howToPlay
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let seen = true
    try {
      seen = localStorage.getItem(SEEN_KEY) !== null
    } catch {
      // Private mode / storage blocked: skip the auto-open rather than nagging
      // on every single visit, since the button below still works.
    }
    if (!seen) setOpen(true)
  }, [])

  // Mark as seen on dismissal, so an interrupted read comes back next time.
  const close = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()))
    } catch {
      // Ignore: worst case the walkthrough greets them once more.
    }
  }, [])

  return (
    <>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 rounded-sm border border-border bg-card/60 px-3.5 py-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground"
        >
          <ScrollText className="size-3.5 text-brass/70" aria-hidden />
          {h.reopenCta}
        </button>
        <span className="max-w-xs text-pretty font-sans text-[11px] leading-relaxed tracking-chip text-muted-foreground/70">
          {h.reopenHint}
        </span>
      </div>
      <HowToPlayModal open={open} onClose={close} endsAt={endsAt} />
    </>
  )
}

/**
 * Admin-only preview at the foot of the home page, styled dashed + muted like
 * the journal's other admin scaffolding (see `WinnerPreviewButton`).
 *
 * Deliberately does NOT touch the "seen" marker: an admin can check the copy
 * here and still get the genuine first-visit experience in the journal.
 */
export function HowToPlayPreviewButton({ endsAt }: { endsAt: string }) {
  const { t } = useI18n()
  const h = t.howToPlay
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20">
      <div className="flex flex-col items-center gap-2 border-t border-dashed border-brass/25 pt-8 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 rounded-sm border border-dashed border-brass/45 bg-brass/[0.07] px-4 py-2.5 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:border-brass hover:bg-brass/15"
        >
          <ScrollText className="size-3.5" aria-hidden />
          {h.reopenCta}
          <span className="rounded-sm border border-brass/40 px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-brass/80">
            {h.previewBadge}
          </span>
        </button>
        <span className="max-w-sm text-pretty font-sans text-[11px] leading-relaxed tracking-chip text-muted-foreground/70">
          {h.previewHint}
        </span>
      </div>
      <HowToPlayModal open={open} onClose={() => setOpen(false)} endsAt={endsAt} />
    </div>
  )
}
