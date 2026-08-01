"use client"

import { useState } from "react"
import { Clock, FastForward } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import {
  CompassPickupBlock,
  useCompassPickupRevealed,
} from "@/components/pythea/compass-pickup-notice"

/**
 * The pieces of NOTE 2 that depend on the pickup countdown, resolved in ONE place
 * so the journal, the winner screen and the admin preview can never disagree.
 *
 * Before the deadline the note shows ONLY the countdown: no letter, no equation.
 * After it, the pickup location sits at the top with Pytheas's letter and the
 * equation plate below.
 *
 * `force` powers the admin "after countdown" preview, which is why this returns
 * the resolved parts rather than rendering the note itself: the two call sites
 * wrap them in different overlays.
 */
export function useNote2Parts(force?: boolean): {
  body: string
  lead: React.ReactNode
  /** False until the countdown ends, so the equation stays hidden with the text. */
  showMedia: boolean
} {
  const { t } = useI18n()
  const revealed = useCompassPickupRevealed(force)

  // Re-render the moment the countdown hits zero so a crew watching the clock
  // gets the letter without reloading. The hook above already returns true for
  // anyone arriving later, so this only matters for the live flip.
  const [flipped, setFlipped] = useState(false)
  const open = revealed === true || flipped

  return {
    // Empty string while waiting: the note renders no paragraphs at all, which is
    // why `HandwrittenNote` treats a blank body as "lead only".
    body: open ? t.finale.note2Body : "",
    lead: <CompassPickupBlock force={force} onReveal={() => setFlipped(true)} />,
    showMedia: open,
  }
}

/**
 * Admin-only switch between the two states of note 2, so the post-countdown
 * version can be proofread before the deadline.
 *
 * Same out-of-world chrome as `NoteVersionPicker` (dark panel, brass label, ADMIN
 * badge) because it is founder tooling sitting above Pytheas's letter, not part of
 * it. Changes nothing server-side: it only forces this one render.
 */
export function Note2PreviewToggle({
  after,
  onChange,
}: {
  after: boolean
  onChange: (after: boolean) => void
}) {
  const { t } = useI18n()
  const f = t.finale

  const options: { key: boolean; label: string; icon: typeof Clock }[] = [
    { key: false, label: f.adminTestPickupLive, icon: Clock },
    { key: true, label: f.adminTestPickup, icon: FastForward },
  ]

  return (
    <div className="mb-3 rounded-sm border border-brass/35 bg-black/45 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="font-sans text-[10px] font-bold tracking-chip text-brass">
          {f.adminTestPickupLabel}
        </span>
        <span className="rounded-full border border-white/25 px-2 py-0.5 font-sans text-[9px] font-bold tracking-chip text-white/55">
          {f.adminOnly}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {options.map((o) => {
          const on = o.key === after
          const Icon = o.icon
          return (
            <button
              key={String(o.key)}
              type="button"
              onClick={() => onChange(o.key)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-sans text-[11px] font-black transition-colors ${
                on
                  ? "border-brass bg-brass text-primary-foreground"
                  : "border-white/25 bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
