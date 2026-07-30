"use client"

import { useEffect, useState } from "react"
import { Hourglass, BellRing, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { getFinaleNotes } from "@/app/journal/actions"
import { HoldPaper } from "@/components/pythea/hold-paper"
import { HoldReleaseToast } from "@/components/pythea/hold-release-toast"

/**
 * Admin-only test buttons for the trail-end hold, at the foot of the journal.
 *
 * Why this exists: both of these are, by design, almost impossible to see on
 * purpose. The hold slip only appears to a crew that has closed all ten leads
 * while the hold is on, and the release alert fires once, for held crews only,
 * at the moment the hold is lifted. Waiting for the real conditions in order to
 * proofread the wording is not practical mid-hunt, so these render the very same
 * components on demand.
 *
 * Deliberate properties, matching `WinnerPreviewButton`:
 *  - Renders NOTHING for non-admins (the caller also gates on `isAdmin`), so an
 *    ordinary explorer never receives this markup.
 *  - Changes NOTHING: no config write, no unlock row, no dismissal flag. The
 *    alert preview is local state, so it cannot consume the real one-time alert.
 *  - Dashed + muted, the journal's existing visual language for scaffolding.
 */
export function HoldPreviewButtons() {
  const { t, locale } = useI18n()
  // Fetches its own copy rather than taking it as props, so mounting this at the
  // foot of the journal needs no plumbing through the page. The server always
  // sends the hold wording (it reveals nothing), so this works even for an admin
  // who is not held and therefore has note 1 open.
  const [hold, setHold] = useState<{ title: string; body: string } | null>(null)
  useEffect(() => {
    let alive = true
    getFinaleNotes().then((n) => {
      if (!alive || !n) return
      setHold(
        locale === "en"
          ? { title: n.hold.titleEn, body: n.hold.bodyEn }
          : { title: n.hold.title, body: n.hold.body },
      )
    })
    return () => {
      alive = false
    }
  }, [locale])
  const j = t.journal
  const f = t.finale
  const [open, setOpen] = useState<null | "paper" | "alert">(null)

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Only the paper overlay locks the page; the alert preview is a small toast in
  // the corner, exactly as a player sees it, so the page behind stays scrollable.
  useEffect(() => {
    if (open !== "paper") return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <div className="mt-6 flex flex-col items-center gap-2.5 border-t border-dashed border-brass/25 pt-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <TestButton
            icon={Hourglass}
            label={f.adminTestHold}
            badge={f.adminTestLabel}
            onClick={() => setOpen("paper")}
          />
          <TestButton
            icon={BellRing}
            label={f.adminTestRelease}
            badge={f.adminTestLabel}
            onClick={() => setOpen("alert")}
          />
        </div>
        <span className="max-w-xs text-pretty font-sans text-[11px] leading-relaxed tracking-chip text-muted-foreground/70">
          {f.adminTestHint}
        </span>
      </div>

      {open === "paper" && hold && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={f.adminTestHold}
          onClick={() => setOpen(null)}
        >
          <div
            className="mx-auto my-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-4 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview chrome, kept clearly outside the paper itself so an admin
                is never in doubt about which pixels a player would see. */}
            <div className="flex items-start justify-between gap-3 rounded-sm border border-dashed border-brass/40 bg-[oklch(0.19_0.015_60)] px-4 py-3">
              <div className="min-w-0">
                <p className="font-sans text-[10px] font-bold tracking-chip text-brass">
                  {f.adminTestLabel}
                </p>
                <p className="mt-1 font-serif text-base font-black leading-tight text-parchment">
                  {f.adminTestHold}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(null)}
                aria-label={j.winnerPreviewClose}
                className="grid size-8 shrink-0 place-items-center rounded-sm border border-brass/40 bg-brass/10 text-brass transition-colors hover:bg-brass/25"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <HoldPaper title={hold.title} body={hold.body} />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full border border-brass/50 bg-brass/15 px-5 py-2 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/25"
              >
                {j.winnerPreviewClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The real toast component, so what an admin proofreads here is exactly
          what a released crew is shown. Dismissing it writes no flag. */}
      {open === "alert" && <HoldReleaseToast onDismiss={() => setOpen(null)} preview />}
    </>
  )
}

function TestButton({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: typeof Hourglass
  label: string
  badge: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 rounded-sm border border-dashed border-brass/45 bg-brass/[0.07] px-4 py-2.5 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:border-brass hover:bg-brass/15"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
      <span className="rounded-sm border border-brass/40 px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-brass/80">
        {badge}
      </span>
    </button>
  )
}
