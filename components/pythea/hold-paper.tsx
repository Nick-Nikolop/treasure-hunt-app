"use client"

import { motion } from "framer-motion"
import { BellRing, Hourglass } from "lucide-react"

import { useI18n } from "@/components/pythea/language-provider"

/**
 * Torn-from-a-pad edges: straight left and right sides, ragged top and bottom.
 *
 * Deliberately NOT the note's all-round `TORN_EDGE`. This paper has to read as
 * an official slip ripped off a pad by the organisers, not as a scrap of
 * Pytheas's journal, and the silhouette is the fastest cue for that: a crew
 * glancing at it must never mistake it for the note they are waiting for.
 */
const PAD_EDGE =
  "polygon(0% 2.2%, 6% 0.8%, 13% 2.4%, 21% 0.6%, 29% 2.2%, 37% 0.7%, 46% 2.3%, 54% 0.5%, 63% 2.2%, 71% 0.8%, 79% 2.4%, 87% 0.6%, 94% 2.2%, 100% 0.9%, 100% 97.8%, 94% 99.3%, 86% 97.6%, 78% 99.4%, 70% 97.7%, 61% 99.3%, 53% 97.6%, 44% 99.4%, 36% 97.8%, 28% 99.2%, 19% 97.6%, 11% 99.4%, 5% 97.8%, 0% 99.1%)"

/**
 * A metal paperclip over the top edge. Stands in for the note's masking tape:
 * same "this is a real object on the page" trick, different object, so the two
 * papers never read as the same prop.
 */
function Clip() {
  return (
    <div aria-hidden className="absolute -top-3 left-6 md:left-10" style={{ rotate: "-8deg" }}>
      <svg viewBox="0 0 24 44" className="h-10 w-[22px] md:h-12 md:w-6" fill="none">
        <path
          d="M17 12v18a5 5 0 0 1-10 0V10a3.4 3.4 0 0 1 6.8 0v19"
          stroke="oklch(0.72 0.02 80)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M17 12v18a5 5 0 0 1-10 0V10a3.4 3.4 0 0 1 6.8 0v19"
          stroke="oklch(0.94 0.01 80 / 0.5)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

/**
 * A rubber stamp struck across the corner.
 *
 * Rotated, slightly translucent and double-ruled, the way a real ink stamp
 * lands: it says the paper was PROCESSED and set aside, which is exactly the
 * message of the hold.
 */
function Stamp({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="absolute -right-1 bottom-4 md:bottom-6 md:right-2"
      style={{ rotate: "-13deg" }}
    >
      <div className="rounded-sm border-[2.5px] border-double border-brass/55 px-2.5 py-1 md:px-3 md:py-1.5">
        <span className="font-sans text-[10px] font-black tracking-chip text-brass/65 md:text-[11px]">
          {label}
        </span>
      </div>
    </div>
  )
}

/**
 * The "please wait" slip shown INSTEAD of Pytheas's first note while the
 * trail-end hold is on.
 *
 * Everything about it is the organisers speaking, not Pytheas: an upright sans
 * face rather than his italic hand, a printed NOTICE header rather than tape and
 * wax, a pad edge rather than a torn scrap. That separation is the point. A crew
 * that closed the trail is being told the story pauses here, so this must not
 * look like the reward they are waiting for.
 *
 * Purely presentational. The copy is admin-authored and rendered verbatim, so
 * nothing here rewrites or truncates it.
 */
export function HoldPaper({
  title,
  body,
  className = "",
  animate = true,
}: {
  title: string
  /** Body text. Blank lines (\n\n) become paragraph breaks. */
  body: string
  className?: string
  animate?: boolean
}) {
  const { t } = useI18n()

  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 16, rotate: 1.6 } : false}
      animate={animate ? { opacity: 1, y: 0, rotate: 0.5 } : undefined}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative mx-auto w-full max-w-lg ${className}`}
      style={{ rotate: animate ? undefined : "0.5deg" }}
    >
      {/* Shadow lives outside the clip so a filter can trace the ragged edge,
          the same reason the note does it. */}
      <div
        className="relative"
        style={{
          filter:
            "drop-shadow(0 16px 30px rgba(0,0,0,0.5)) drop-shadow(0 2px 3px rgba(0,0,0,0.28))",
        }}
      >
        <div
          className="relative bg-[oklch(0.95_0.018_92)] px-6 py-9 md:px-10 md:py-11"
          style={{ clipPath: PAD_EDGE }}
        >
          {/* A cooler, cleaner stock than the note's warm parchment: this is
              office paper, not aged vellum. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, oklch(0.2 0.02 62 / 0.022) 0 1px, transparent 1px 5px)",
            }}
          />
          {/* One soft crease from being folded once, plus a light vignette. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent 44%, oklch(0.2 0.02 62 / 0.028) 49%, oklch(1 0 0 / 0.05) 52%, transparent 58%), radial-gradient(115% 105% at 50% 50%, transparent 62%, oklch(0.4 0.05 60 / 0.14))",
            }}
          />

          <div className="relative">
            {/* Printed header: icon, mono label, then a double rule. Reads as a
                form letter, which is what makes it unmistakably not the note. */}
            <div className="flex items-center gap-2">
              <Hourglass className="size-4 shrink-0 text-brass md:size-[18px]" aria-hidden />
              <span className="font-sans text-[10px] font-black tracking-chip text-ink/55 md:text-[11px]">
                {t.finale.holdLabel}
              </span>
            </div>
            <div className="mt-2 border-t-[3px] border-double border-ink/25" />

            <h2 className="mt-4 text-pretty font-heading text-[21px] font-extrabold leading-[1.15] text-ink md:mt-5 md:text-[26px]">
              {title}
            </h2>

            <div className="mt-3.5 md:mt-4">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`whitespace-pre-line text-pretty font-sans text-[15px] leading-[1.7] text-ink/80 md:text-[16px] ${
                    i > 0 ? "mt-3" : ""
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Footer: who sent it, and the promise that they will be told. No
                call to action, because while held there is nothing to act on. */}
            <div className="mt-6 border-t border-dashed border-ink/20 pt-3.5 md:mt-7">
              <p className="font-sans text-[10px] font-bold tracking-chip text-ink/45 md:text-[11px]">
                {t.finale.holdFrom}
              </p>
              <div className="mt-2 flex items-start gap-2 pr-20 md:pr-28">
                <BellRing className="mt-0.5 size-3.5 shrink-0 text-brass md:size-4" aria-hidden />
                <p className="text-pretty font-sans text-[13px] leading-[1.6] text-ink/70 md:text-[14px]">
                  {t.finale.holdWaitHint}
                </p>
              </div>
            </div>
          </div>

          <Stamp label={t.finale.holdStamp} />
        </div>
      </div>

      {/* Outside the clip so the ragged edge cannot cut it. */}
      <Clip />
    </motion.div>
  )
}
