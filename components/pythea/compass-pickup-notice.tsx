"use client"

import { useEffect, useState } from "react"
import { MapPin, Clock, ExternalLink } from "lucide-react"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"
import { COMPASS_PICKUP_AT_MS, COMPASS_PICKUP_MAP_URL } from "@/lib/compass-pickup"

/**
 * Whether the pickup point may be shown yet.
 *
 * Resolved on the CLIENT only (never during SSR) so there is no hydration
 * mismatch and no flash of a stale state. `null` means "not decided yet", which
 * callers render as a stable placeholder rather than guessing.
 *
 * `force` is for the admin preview: it short-circuits the clock so the
 * post-countdown note can be proofread before the deadline, without touching the
 * real target time.
 */
export function useCompassPickupRevealed(force?: boolean): boolean | null {
  const [revealed, setRevealed] = useState<boolean | null>(force ? true : null)

  useEffect(() => {
    if (force) {
      setRevealed(true)
      return
    }
    // Decide immediately for anyone arriving after the deadline, then let the
    // countdown component drive the flip for anyone waiting on it.
    setRevealed(Date.now() >= COMPASS_PICKUP_AT_MS)
  }, [force])

  return revealed
}

/**
 * The compass-pickup block that rides inside NOTE 2.
 *
 * Before the deadline it shows ONLY a countdown, deliberately withholding the
 * location so no crew can turn up early. Once it hits zero it swaps in the real
 * pickup point and map link, and the rest of the note appears around it.
 *
 * Styled as a brass pinned aside because it is an organiser message attached to
 * the page, not part of Pytheas's handwriting.
 */
export function CompassPickupBlock({
  force,
  onReveal,
}: {
  /** Admin preview: show the pickup point regardless of the clock. */
  force?: boolean
  /** Fired when the countdown reaches zero, so the note can fill in around it. */
  onReveal?: () => void
}) {
  const { t } = useI18n()
  const f = t.finale
  const revealed = useCompassPickupRevealed(force)

  if (revealed === null) {
    // Pre-decision placeholder: keeps the note's height stable for one frame.
    return <div className="h-[104px]" aria-hidden />
  }

  return (
    <div className="rounded-sm border-2 border-brass/70 border-l-[6px] border-l-brass bg-brass/15 px-4 py-3.5 md:px-5 md:py-4">
      {revealed ? (
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brass md:size-[18px]" aria-hidden />
          <div className="min-w-0">
            <p className="font-serif text-[16px] font-black leading-tight text-ink md:text-[18px]">
              {f.pickupTitle}
            </p>
            <p className="mt-0.5 font-sans text-[13px] font-semibold text-ink/80 md:text-[14px]">
              {f.pickupAddress}
            </p>
            <p className="mt-2 text-pretty font-sans text-[14px] leading-[1.6] text-ink md:text-[15px]">
              {f.pickupBody}
            </p>
            <a
              href={COMPASS_PICKUP_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-sm border-2 border-brass bg-brass px-3.5 py-2 font-sans text-[12px] font-black uppercase tracking-chip text-[oklch(0.2_0.03_60)] transition-colors hover:bg-brass/85 md:text-[13px]"
            >
              <ExternalLink className="size-3.5 md:size-4" aria-hidden />
              {f.pickupCta}
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-brass md:size-[18px]" aria-hidden />
            <p className="text-pretty font-sans text-[14px] font-semibold leading-[1.55] text-ink md:text-[15px]">
              {f.pickupCountdownLabel}
            </p>
          </div>
          <div className="pl-[26px]">
            <Countdown
              targetMs={COMPASS_PICKUP_AT_MS}
              tone="ink"
              size="sm"
              onDone={onReveal}
            />
          </div>
        </div>
      )}
    </div>
  )
}
