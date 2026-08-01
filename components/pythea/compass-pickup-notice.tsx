"use client"

import { useEffect, useState } from "react"
import { MapPin, Clock, ExternalLink } from "lucide-react"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * When the crew learns where to collect the physical compass.
 *
 * 13:30 on 1 August 2026, Athens time. August is EEST (UTC+3), so the instant
 * is pinned as an explicit UTC millisecond value rather than a local
 * `new Date(...)`: that way every crew counts down to the SAME moment no matter
 * what timezone their phone is set to, and the reveal cannot flip early or late
 * for someone travelling or with a misconfigured clock.
 */
const PICKUP_TARGET_MS = Date.UTC(2026, 7, 1, 10, 30, 0, 0)

/** The exact map pin for the pickup point, handed out once the countdown ends. */
const PICKUP_MAP_URL = "https://maps.app.goo.gl/2TU24PKYxMA4qKNX6"

/**
 * Replaces the old static "please put the compass back" aside under NOTE 2.
 *
 * Before the deadline it shows only a countdown, deliberately withholding the
 * location so no crew can turn up early. The moment it hits zero it swaps in the
 * real pickup point and map link. Styled to match the brass pinned-aside on the
 * handwritten note, since it plays the same role: an organiser message pinned to
 * the page rather than part of Pytheas's handwriting.
 */
export function CompassPickupNotice({
  targetMs = PICKUP_TARGET_MS,
}: {
  /** Overridable only for previews/tests; production uses the fixed pickup time. */
  targetMs?: number
}) {
  const { t } = useI18n()
  const f = t.finale

  // Decide "revealed" on the client only, to avoid a hydration mismatch and any
  // flash of a stale state. Until mounted we render the countdown shell.
  const [mounted, setMounted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (Date.now() >= targetMs) setRevealed(true)
  }, [targetMs])

  const showLocation = mounted && revealed

  return (
    <div className="mt-7 rounded-sm border-2 border-brass/70 border-l-[6px] border-l-brass bg-brass/15 px-4 py-3.5 md:mt-8 md:px-5 md:py-4">
      {showLocation ? (
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
              href={PICKUP_MAP_URL}
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
          {/* Only tick once mounted, and keep the shell height stable before then. */}
          {mounted ? (
            <div className="pl-[26px]">
              <Countdown
                targetMs={targetMs}
                tone="ink"
                size="sm"
                onDone={() => setRevealed(true)}
              />
            </div>
          ) : (
            <div className="h-[52px] pl-[26px]" aria-hidden />
          )}
        </div>
      )}
    </div>
  )
}
