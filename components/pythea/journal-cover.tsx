"use client"

import Image from "next/image"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * The closed leather journal cover, rendered as a premium bound volume. Shared
 * between the journal page (as the first "page" you flip open) and the landing
 * page (as a clickable teaser), so both render the exact same object.
 *
 * - `heightClass` controls the height (a fixed PAGE_HEIGHT on the journal page,
 *   or h-full when stretched by the mobile grid sizer).
 * - `className` lets callers add hover/shadow treatments without touching the
 *   internal composition.
 * - `titleAs` picks the tag for the embossed title. It is the `h1` on the
 *   journal page (where it is the only heading), but the landing page already
 *   has its own `h1` in the hero, so that caller passes "p" to avoid shipping a
 *   second competing `h1`.
 */
export function JournalCover({
  heightClass = "min-h-[36rem] md:min-h-[44rem]",
  className = "",
  titleAs: TitleTag = "h1",
}: {
  heightClass?: string
  className?: string
  titleAs?: "h1" | "h2" | "p"
}) {
  const { t } = useI18n()
  return (
    <article
      className={`leather-cover relative flex flex-col items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-[oklch(0.16_0.02_50)] px-7 py-12 text-center shadow-[0_30px_60px_-25px_rgba(0,0,0,0.85)] md:px-9 md:py-14 ${heightClass} ${className}`}
    >
      {/* leather grain */}
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay" />

      {/* spine: a darker bound edge with raised hubs down the left side */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[oklch(0.15_0.02_48)] via-[oklch(0.2_0.025_52)] to-transparent md:w-10">
        <div className="absolute inset-y-0 left-[5px] w-px bg-brass/25" />
        {[16, 38, 62, 84].map((top) => (
          <span
            key={top}
            className="absolute left-0 h-7 w-[6px] rounded-r-sm bg-[oklch(0.13_0.02_46)] shadow-[1px_0_0_oklch(0.3_0.03_56_/_0.5)]"
            style={{ top: `${top}%` }}
          />
        ))}
      </div>

      {/* hanging silk ribbon bookmark */}
      <div className="pointer-events-none absolute right-12 top-0 z-10 origin-top animate-ribbon-sway md:right-16">
        <div className="h-28 w-3 bg-gradient-to-b from-[oklch(0.5_0.16_34)] to-[oklch(0.4_0.14_32)] shadow-[1px_0_2px_rgba(0,0,0,0.4)] md:h-36 md:w-3.5" />
        <div className="h-0 w-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-[oklch(0.4_0.14_32)] md:border-x-[7px] md:border-t-[10px]" />
      </div>

      {/* stitched border + embossed inner frame */}
      <div className="pointer-events-none absolute inset-5 rounded-sm border border-dashed border-brass/30" />
      <div className="pointer-events-none absolute inset-7 rounded-sm border border-brass/20" />

      {/* brass corner flourishes */}
      {[
        "left-4 top-4 border-l-2 border-t-2",
        "right-4 top-4 border-r-2 border-t-2",
        "left-4 bottom-4 border-l-2 border-b-2",
        "right-4 bottom-4 border-r-2 border-b-2",
      ].map((c) => (
        <span
          key={c}
          className={`pointer-events-none absolute size-9 rounded-[2px] border-brass/70 ${c}`}
        />
      ))}

      {/* wax seal medallion housing the compass */}
      <div className="relative flex size-20 items-center justify-center rounded-full wax-seal md:size-24">
        <div className="absolute inset-[6px] rounded-full border border-[oklch(0.7_0.12_40)]/40" />
        <Image
          src="/compass-icon.png"
          alt=""
          width={44}
          height={44}
          className="size-9 animate-compass-sway md:size-11"
        />
      </div>

      <p className="mt-7 font-sans text-[11px] font-bold tracking-chip text-brass/80">
        {t.journal.coverOwner}
      </p>
      <TitleTag className="gold-foil mt-2 text-balance font-serif text-4xl font-black leading-tight md:text-5xl">
        {t.journal.coverTitle}
      </TitleTag>

      {/* gilt divider with center diamond */}
      <div className="my-6 flex items-center gap-2">
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-brass/60" />
        <span className="size-1.5 rotate-45 bg-brass/70" />
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-brass/60" />
      </div>

      <p className="max-w-sm text-pretty font-serif text-lg italic leading-relaxed text-parchment/75">
        {t.journal.coverSubtitle}
      </p>
      <p className="mt-10 font-sans text-[11px] font-bold tracking-chip text-parchment/45">
        {t.journal.coverFlip}
      </p>
    </article>
  )
}
