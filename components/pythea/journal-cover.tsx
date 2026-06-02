"use client"

import { Compass } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * The closed leather journal cover. Shared between the journal page (where it
 * is the first "page" you flip open) and the homepage journey section (where
 * it is shown as a clickable preview that links into the journal).
 */
export function JournalCover({
  heightClass = "min-h-[36rem] md:min-h-[44rem]",
  className,
}: {
  heightClass?: string
  className?: string
}) {
  const { t } = useI18n()
  return (
    <article
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-r-lg rounded-l-sm border border-[oklch(0.28_0.03_60)] bg-[oklch(0.24_0.03_56)] px-6 py-12 text-center shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)] md:px-8 md:py-14",
        heightClass,
        className,
      )}
    >
      {/* leather grain */}
      <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay" />
      {/* leather sheen */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_30%_20%,oklch(0.34_0.03_58_/_0.8),transparent_60%)]" />
      {/* brass corners */}
      {[
        "left-4 top-4 border-l-2 border-t-2",
        "right-4 top-4 border-r-2 border-t-2",
        "left-4 bottom-4 border-l-2 border-b-2",
        "right-4 bottom-4 border-r-2 border-b-2",
      ].map((c) => (
        <span
          key={c}
          className={cn(
            "pointer-events-none absolute size-10 border-brass/70",
            c,
          )}
        />
      ))}
      {/* embossed frame */}
      <div className="pointer-events-none absolute inset-7 rounded-sm border border-brass/30" />

      <Compass className="size-12 animate-compass-sway text-brass" />
      <p className="mt-7 font-sans text-[11px] font-bold tracking-chip text-brass/80">
        {t.journal.coverOwner}
      </p>
      <h1 className="mt-2 text-balance font-serif text-4xl font-black leading-tight text-parchment text-shadow-vintage md:text-5xl">
        {t.journal.coverTitle}
      </h1>
      <div className="my-6 h-px w-24 bg-brass/50" />
      <p className="max-w-sm text-pretty font-serif text-lg italic leading-relaxed text-parchment/75">
        {t.journal.coverSubtitle}
      </p>
      <p className="mt-10 font-sans text-[11px] font-bold tracking-chip text-parchment/45">
        {t.journal.coverFlip}
      </p>
    </article>
  )
}
