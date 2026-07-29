"use client"

import { useEffect, useState } from "react"
import { Trophy, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { WinnerScreenPreview } from "@/components/pythea/winner-reveal"

/**
 * Admin-only button at the foot of the journal that opens the treasure/winner
 * screen in an overlay.
 *
 * Why this exists: the winner screen is otherwise reachable only by physically
 * scanning the treasure QR, which makes proofreading the finale copy (or
 * checking it after an edit in the admin panel) awkward. This shows the real
 * screen, built from the live finale text, on demand.
 *
 * Two deliberate properties:
 *  - It renders NOTHING for non-admins. The caller also gates on `isAdmin`, so
 *    an ordinary explorer never receives this markup at all, and the button can
 *    never leak the ending to someone still playing.
 *  - Opening it records nothing: no finish, no placement, no analytics event.
 *    See `WinnerScreenPreview`, which omits the tracking that the real reveal
 *    fires.
 *
 * It is styled as dashed + muted, the same visual language the journal already
 * uses for admin-only affordances (see `NotePill` and `AdminLockedOverlay`), so
 * it reads as scaffolding rather than part of the story.
 */
export function WinnerPreviewButton() {
  const { t } = useI18n()
  const j = t.journal
  const [open, setOpen] = useState(false)

  // Escape closes, matching the journal's other overlays.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

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
    <>
      <div className="mt-10 flex flex-col items-center gap-2 border-t border-dashed border-brass/25 pt-8 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 rounded-sm border border-dashed border-brass/45 bg-brass/[0.07] px-4 py-2.5 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:border-brass hover:bg-brass/15"
        >
          <Trophy className="size-3.5" aria-hidden />
          {j.winnerPreviewCta}
          <span className="rounded-sm border border-brass/40 px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-brass/80">
            {j.adminLockedBadge}
          </span>
        </button>
        <span className="max-w-xs text-pretty font-sans text-[11px] leading-relaxed tracking-chip text-muted-foreground/70">
          {j.winnerPreviewHint}
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={j.winnerPreviewTitle}
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto my-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-4 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview chrome, kept clearly outside the screen itself so an
                admin is never in doubt about which pixels a player would see. */}
            <div className="flex items-start justify-between gap-3 rounded-sm border border-dashed border-brass/40 bg-[oklch(0.19_0.015_60)] px-4 py-3">
              <div className="min-w-0">
                <p className="font-sans text-[10px] font-bold tracking-chip text-brass">
                  {j.winnerPreviewBadge}
                </p>
                <p className="mt-1 font-serif text-base font-black leading-tight text-parchment">
                  {j.winnerPreviewTitle}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label={j.winnerPreviewClose}
                className="grid size-8 shrink-0 place-items-center rounded-sm border border-brass/40 bg-brass/10 text-brass transition-colors hover:bg-brass/25"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <WinnerScreenPreview />

            <p className="text-pretty px-2 font-sans text-[11px] leading-relaxed tracking-chip text-parchment/45">
              {j.winnerPreviewBody}
            </p>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-brass/50 bg-brass/15 px-5 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/25"
              >
                {j.winnerPreviewClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
