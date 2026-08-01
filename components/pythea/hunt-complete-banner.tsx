"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { MapPin, PartyPopper } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { COMPASS_PICKUP_MAP_URL } from "@/lib/compass-pickup"

/**
 * The "hunt is over" celebration section, shown on the landing ONLY once the
 * hunt has closed. It scrolls itself into view on mount so a redirected explorer
 * lands on the announcement rather than the top of the marketing page.
 *
 * Reuses the finale pickup strings (venue title, address, map CTA) so the
 * lighthouse details stay in one place, and the parchment/brass tokens so it
 * sits naturally inside the landing.
 */
export function HuntCompleteBanner() {
  const { t } = useI18n()
  const e = t.finale.huntEnd
  const f = t.finale
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    // Defer one frame so layout has settled, then bring the banner into view.
    // `smooth` unless the visitor prefers reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <section
      ref={ref}
      aria-labelledby="hunt-end-title"
      className="scroll-mt-24 border-y border-brass/25 bg-ink/40 px-4 py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-12">
        {/* Celebration artwork */}
        <div className="order-2 overflow-hidden rounded-lg border-2 border-brass/40 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] md:order-1">
          <Image
            src="/pythea/hunt-complete-celebration.png"
            alt={e.imageAlt}
            width={1248}
            height={1248}
            className="h-full w-full object-cover"
            priority
          />
        </div>

        {/* Announcement */}
        <div className="order-1 text-center md:order-2 md:text-left">
          <p className="mb-4 inline-flex items-center gap-2 font-sans text-[11px] font-semibold tracking-chip text-brass">
            <PartyPopper className="size-4" aria-hidden />
            {e.eyebrow}
          </p>
          <h2
            id="hunt-end-title"
            className="text-balance font-serif text-3xl font-black leading-[0.98] text-foreground text-shadow-vintage md:text-4xl"
          >
            {e.title}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty font-serif text-lg italic leading-relaxed text-muted-foreground md:mx-0">
            {e.body}
          </p>

          {/* Lighthouse pickup / venue card, reusing the finale pickup strings. */}
          <a
            href={COMPASS_PICKUP_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-7 flex items-center gap-3 rounded-md border-2 border-brass/40 border-l-[6px] border-l-brass bg-parchment/10 px-4 py-3.5 text-left transition-colors hover:border-brass hover:bg-parchment/15 md:inline-flex"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-brass/15 text-brass">
              <MapPin className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-[10px] font-semibold tracking-chip text-muted-foreground">
                {e.venueLabel}
              </span>
              <span className="block truncate font-serif text-base font-bold text-foreground">
                {f.pickupTitle}
              </span>
              <span className="block truncate font-sans text-sm text-muted-foreground">
                {f.pickupAddress}
              </span>
            </span>
            {/* CTA label is hidden on the narrowest screens (the whole card is
                the link) so the mono uppercase text cannot force horizontal
                overflow; it returns from sm up where there is room. */}
            <span className="ml-auto hidden shrink-0 self-center font-sans text-[10px] font-semibold tracking-chip text-brass opacity-70 transition-opacity group-hover:opacity-100 sm:block">
              {f.pickupCta}
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
