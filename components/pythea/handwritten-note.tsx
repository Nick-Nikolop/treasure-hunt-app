"use client"

import { motion } from "framer-motion"

/**
 * An irregular torn edge, in percentages so one polygon scales to any note
 * size. Deliberately uneven (no repeating tile) so it reads as paper ripped by
 * hand rather than a machine-cut scallop.
 *
 * It clips the paper, which also clips a normal box-shadow, so the drop shadow
 * lives on a wrapper as a `filter: drop-shadow()`. A filter follows the clipped
 * alpha, so the shadow traces the torn silhouette instead of a rectangle.
 */
const TORN_EDGE =
  "polygon(0% 1.4%, 7% 0.3%, 16% 1.7%, 27% 0.5%, 38% 1.6%, 49% 0.4%, 59% 1.8%, 70% 0.6%, 81% 1.6%, 91% 0.4%, 100% 1.3%, 99.1% 14%, 100% 27%, 99.2% 40%, 100% 53%, 99.0% 66%, 100% 79%, 99.3% 92%, 100% 98.7%, 92% 99.6%, 82% 98.4%, 71% 99.5%, 60% 98.3%, 48% 99.6%, 37% 98.4%, 26% 99.5%, 15% 98.5%, 6% 99.6%, 0% 98.8%, 0.8% 92%, 0% 79%, 0.9% 66%, 0% 53%, 0.7% 40%, 0% 27%, 0.9% 14%)"

/** A strip of aged masking tape, frayed at both ends. */
function Tape({ className, rotate }: { className: string; rotate: number }) {
  return (
    <div
      aria-hidden
      className={`absolute h-6 w-20 md:h-7 md:w-24 ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        backgroundColor: "oklch(0.84 0.045 86 / 0.5)",
        // Faint lengthwise fibres so the tape is not a flat block of colour.
        backgroundImage:
          "repeating-linear-gradient(90deg, oklch(0.98 0.02 86 / 0.28) 0 2px, transparent 2px 7px)",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.28), inset 0 0 0 1px oklch(0.98 0.02 86 / 0.14)",
        // Fades the short ends so they look torn, not cut.
        maskImage:
          "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
      }}
    />
  )
}

/**
 * A handwritten letter from Pytheas on a torn scrap of parchment: aged paper
 * with fibres, ruled lines and fold creases, ink italic serif (Greek-capable
 * Alegreya, so it renders both languages), two strips of masking tape and a red
 * wax seal at the foot.
 *
 * Used for the journal "find my compass" note and the compass-scan note on the
 * winner screen. Purely presentational; the copy is passed in and is
 * admin-authored, so nothing here rewrites or truncates it.
 */
export function HandwrittenNote({
  body,
  signature,
  className = "",
  animate = true,
}: {
  /** The note text. Blank lines (\n\n) become paragraph breaks. */
  body: string
  /** Optional sign-off shown in a looser hand under the note. */
  signature?: string
  className?: string
  animate?: boolean
}) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  // A lead paragraph only earns bigger type when something follows it. On a
  // one-paragraph note it would just scale the whole card up.
  const hasLead = paragraphs.length > 1

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 18, rotate: -2 } : false}
      animate={animate ? { opacity: 1, y: 0, rotate: -0.55 } : undefined}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`relative mx-auto w-full max-w-lg ${className}`}
      style={{ rotate: animate ? undefined : "-0.55deg" }}
    >
      {/* Shadow sits here, outside the clip, so it can trace the torn edge. */}
      <div
        className="relative"
        style={{
          filter:
            "drop-shadow(0 18px 34px rgba(0,0,0,0.55)) drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
        }}
      >
        <div
          className="bg-paper relative px-6 py-9 md:px-11 md:py-12"
          style={{ clipPath: TORN_EDGE }}
        >
          {/* Paper fibres: two near-invisible diagonal weaves. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(48deg, oklch(0.2 0.02 62 / 0.035) 0 1px, transparent 1px 4px), repeating-linear-gradient(-42deg, oklch(0.2 0.02 62 / 0.028) 0 1px, transparent 1px 5px)",
            }}
          />

          {/* Ruled lines, kept faint enough to read as texture rather than as
              guides the text has to sit exactly on. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 30px, oklch(0.35 0.06 250 / 0.055) 30px 31px)",
            }}
          />

          {/* Two creases from being folded in three and carried. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent calc(34% - 1px), oklch(0.2 0.02 62 / 0.09) 34%, oklch(1 0 0 / 0.3) calc(34% + 1px), transparent calc(34% + 2px)), linear-gradient(180deg, transparent calc(69% - 1px), oklch(0.2 0.02 62 / 0.08) 69%, oklch(1 0 0 / 0.26) calc(69% + 1px), transparent calc(69% + 2px))",
            }}
          />

          {/* Warm sunspots plus an aged vignette that darkens the torn rim. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(120% 90% at 15% 8%, oklch(0.7 0.07 62 / 0.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, oklch(0.55 0.06 55 / 0.14), transparent 50%), radial-gradient(115% 105% at 50% 50%, transparent 58%, oklch(0.35 0.06 58 / 0.2))",
            }}
          />

          <div className="relative">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`whitespace-pre-line text-pretty font-serif italic leading-[1.85] ${
                  hasLead && i === 0
                    ? "text-[17.5px] text-ink/90 md:text-[21px]"
                    : "text-[16.5px] text-ink/85 md:text-[19px]"
                } ${i > 0 ? "mt-4 md:mt-5" : ""}`}
                style={{ textShadow: "0 0.5px 0 oklch(0.16 0.018 62 / 0.14)" }}
              >
                {p}
              </p>
            ))}

            {signature && (
              <div className="mt-7 flex flex-col items-end md:mt-8">
                <p className="font-serif text-xl italic text-ink/75 md:text-2xl">
                  {signature}
                </p>
                {/* A quick flourish struck under the name by the same hand. */}
                <svg
                  aria-hidden
                  viewBox="0 0 120 12"
                  className="mt-1 h-2.5 w-28 text-ink/35 md:h-3 md:w-32"
                  fill="none"
                >
                  <path
                    d="M2 7.5c14-5 26 2.5 40-1.5S94 1 118 4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tape and seal live outside the clipped paper so the torn edge cannot
          cut them, and they overlap the rim like real objects on top. */}
      <Tape className="-top-2.5 left-6 md:left-10" rotate={-3} />
      <Tape className="-top-3 right-7 md:right-12" rotate={2.5} />

      <div
        aria-hidden
        className="wax-seal absolute -bottom-4 right-6 flex size-12 items-center justify-center rounded-full md:right-10 md:size-14"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6 text-[oklch(0.86_0.09_60_/_0.85)] md:size-7"
          fill="none"
        >
          <path
            d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </motion.div>
  )
}
