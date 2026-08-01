"use client"

import React from "react"
import { motion } from "framer-motion"
import { RotateCcw } from "lucide-react"

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

/**
 * A strip of aged masking tape, frayed at both ends.
 *
 * The fibres are kept very low contrast on purpose: a crisper repeating
 * gradient here reads as a grey comb rather than as tape.
 */
function Tape({ className, rotate }: { className: string; rotate: number }) {
  return (
    <div
      aria-hidden
      className={`absolute h-[26px] w-[76px] md:h-7 md:w-24 ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        backgroundImage:
          // Mostly opaque milky tan. The overhang sits on the dark page, so a
          // low alpha here let the background through and read as a grey smudge
          // rather than as a strip of tape.
          "linear-gradient(180deg, oklch(0.89 0.045 86 / 0.9), oklch(0.83 0.045 84 / 0.84) 45%, oklch(0.76 0.045 82 / 0.88)), repeating-linear-gradient(90deg, oklch(1 0.02 86 / 0.1) 0 1px, transparent 1px 9px)",
        boxShadow:
          "0 2px 5px oklch(0.15 0.03 40 / 0.35), inset 0 0 0 1px oklch(1 0.02 86 / 0.18)",
        // Fades the short ends so they look torn, not cut.
        maskImage:
          "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
      }}
    />
  )
}

/**
 * A blob of red sealing wax pressed at the foot of the note.
 *
 * Deliberately NOT the shared `.wax-seal` utility: that one is tuned as a
 * glossy raised disc for the 80-96px seal on the journal cover, and at this
 * size its tight specular highlight shrinks into a shiny marble. This is a
 * flatter, matte, hand-pressed blob with an irregular rim and an intaglio
 * (stamped-in) star, which is what wax on a letter actually looks like.
 */
function WaxSeal() {
  return (
    <div
      aria-hidden
      className="absolute -bottom-3 right-5 grid size-[52px] place-items-center md:-bottom-4 md:right-10 md:size-16"
      style={{
        // An uneven rim, because wax squeezes out unevenly under a stamp.
        borderRadius: "47% 53% 44% 56% / 54% 45% 55% 46%",
        // Barely any lightness travel across the blob. A wide bright hotspot is
        // what made this read as a polished sphere; cooled wax is nearly matte.
        backgroundImage:
          "radial-gradient(135% 135% at 44% 38%, oklch(0.43 0.15 33), oklch(0.385 0.145 32) 62%, oklch(0.335 0.13 30))",
        boxShadow:
          // No lit top rim. Just wax settling into its own edge, plus contact.
          "inset 0 0 0 1px oklch(0.3 0.11 29 / 0.5), inset 0 -2px 5px oklch(0.18 0.06 28 / 0.42), 0 4px 10px -3px oklch(0.12 0.05 28 / 0.7)",
      }}
    >
      {/* A fine matte grain, so the surface scatters light instead of shining. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: "inherit",
          backgroundImage:
            "repeating-linear-gradient(58deg, oklch(0.2 0.06 28 / 0.1) 0 1px, transparent 1px 3px), repeating-linear-gradient(-52deg, oklch(0.62 0.12 40 / 0.06) 0 1px, transparent 1px 4px)",
        }}
      />

      {/* The stamp is cut INTO the wax: a dark recess with a faint lit lower
          lip where the press lifted, never a bright raised glyph. */}
      <svg viewBox="0 0 24 24" className="relative size-[26px] md:size-8" fill="none">
        <path
          d="M12 2.4 L13.5 10.5 L21.6 12 L13.5 13.5 L12 21.6 L10.5 13.5 L2.4 12 L10.5 10.5 Z"
          fill="oklch(0.6 0.13 40 / 0.28)"
          transform="translate(0 0.7)"
        />
        <path
          d="M12 2.4 L13.5 10.5 L21.6 12 L13.5 13.5 L12 21.6 L10.5 13.5 L2.4 12 L10.5 10.5 Z"
          fill="oklch(0.28 0.1 28 / 0.92)"
        />
      </svg>
    </div>
  )
}

/**
 * A handwritten letter from Pytheas on a torn scrap of parchment: aged paper
 * with fibres, fold creases and sun-staining, ink italic serif (Greek-capable
 * Alegreya, so it renders both languages), two strips of masking tape and a
 * pressed wax seal at the foot.
 *
 * Used for the journal "find my compass" note and the compass-scan note on the
 * winner screen. Purely presentational; the copy is passed in and is
 * admin-authored, so nothing here rewrites or truncates it.
 */
export function HandwrittenNote({
  body,
  signature,
  notice,
  noticeContent,
  media,
  mediaAfter,
  className = "",
  animate = true,
}: {
  /** The note text. Blank lines (\n\n) become paragraph breaks. */
  body: string
  /** Optional sign-off shown in a looser hand under the note. */
  signature?: string
  /**
   * Optional highlighted aside, stamped under the note in a bright ink block.
   * Deliberately NOT styled as Pytheas's handwriting: it is a message from the
   * organisers (currently the request to put the compass back), so it has to
   * read as pinned to the page rather than written on it.
   */
  notice?: string
  /**
   * A richer aside rendered in the same position as `notice`, for cases that
   * need more than a line of text (e.g. the compass-pickup countdown). When
   * given it fully replaces `notice` and brings its own styling, so it is NOT
   * wrapped in the brass card below.
   */
  noticeContent?: React.ReactNode
  /**
   * Something pasted into the note between paragraphs (NOTE 2 uses it for the
   * treasure equation plate).
   */
  media?: React.ReactNode
  /**
   * 0-based index of the paragraph the `media` is placed AFTER. Defaults to the
   * last paragraph, so an out-of-range value can never drop the media.
   */
  mediaAfter?: number
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

  // Clamped so a stale/out-of-range index still renders the plate (at the end)
  // instead of silently dropping it.
  const lastIndex = paragraphs.length - 1
  const mediaIndex =
    mediaAfter === undefined ? lastIndex : Math.min(Math.max(mediaAfter, 0), lastIndex)

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
          className="bg-paper relative px-7 py-10 md:px-12 md:py-14"
          style={{ clipPath: TORN_EDGE }}
        >
          {/* Paper fibres: two near-invisible diagonal weaves. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(48deg, oklch(0.2 0.02 62 / 0.032) 0 1px, transparent 1px 4px), repeating-linear-gradient(-42deg, oklch(0.2 0.02 62 / 0.026) 0 1px, transparent 1px 5px)",
            }}
          />

          {/* Two creases from being folded in three and carried.
              These must be WIDE, feathered tonal bands. Any band only a couple
              of percent tall resolves to a crisp line, and the moment one lands
              near a text baseline it reads as a ruled underline struck through
              the letter. A real fold is a broad soft trough of shading.
              No ruled lines either, since parchment is unruled and a fixed rule
              pitch drifts against text that resizes at the md breakpoint. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent 27%, oklch(0.2 0.02 62 / 0.03) 34%, oklch(1 0 0 / 0.055) 37%, transparent 43%), linear-gradient(180deg, transparent 62%, oklch(0.2 0.02 62 / 0.026) 69%, oklch(1 0 0 / 0.05) 72%, transparent 78%)",
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
              <React.Fragment key={i}>
                <p
                  className={`whitespace-pre-line text-pretty font-serif italic leading-[1.8] ${
                    hasLead && i === 0
                      ? "text-[17.5px] text-ink/90 md:text-[21px]"
                      : "text-[16.5px] text-ink/85 md:text-[19px]"
                  } ${i > 0 ? "mt-[1.15em]" : ""}`}
                  style={{ textShadow: "0 0.5px 0 oklch(0.16 0.018 62 / 0.14)" }}
                >
                  {p}
                </p>
                {media && i === mediaIndex && media}
              </React.Fragment>
            ))}

            {/* A rich aside (e.g. the pickup countdown) takes precedence and
                brings its own styling; otherwise the plain string notice. */}
            {noticeContent
              ? noticeContent
              : notice && notice.trim().length > 0 && (
                  // Bright pinned aside. Sits on its own tinted card with a heavy
                  // left rail so it separates cleanly from the italic hand above it.
                  <div className="mt-7 rounded-sm border-2 border-brass/70 border-l-[6px] border-l-brass bg-brass/15 px-4 py-3 md:mt-8 md:px-5 md:py-3.5">
                    <div className="flex items-start gap-2.5">
                      <RotateCcw
                        className="mt-0.5 size-4 shrink-0 text-brass md:size-[18px]"
                        aria-hidden
                      />
                      <p className="text-pretty font-sans text-[14px] font-semibold leading-[1.65] text-ink md:text-[15px]">
                        {notice}
                      </p>
                    </div>
                  </div>
                )}

            {signature && (
              // Held clear of the seal, which sits bottom-right.
              <div className="mt-8 flex flex-col items-start pr-16 md:mt-10 md:pr-24">
                <p
                  className="font-serif text-[22px] italic text-ink/75 md:text-[26px]"
                  style={{ transform: "rotate(-1.2deg)" }}
                >
                  {signature}
                </p>
                {/* A quick flourish struck under the name by the same hand. */}
                <svg
                  aria-hidden
                  viewBox="0 0 120 12"
                  className="mt-0.5 h-2.5 w-28 text-ink/30 md:h-3 md:w-32"
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
      <Tape className="-top-2.5 left-5 md:left-10" rotate={-3} />
      <Tape className="-top-3 right-6 md:right-12" rotate={2.5} />
      <WaxSeal />
    </motion.div>
  )
}
