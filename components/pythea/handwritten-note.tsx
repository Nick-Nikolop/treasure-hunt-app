"use client"

import { motion } from "framer-motion"

/**
 * A handwritten letter from Pytheas on a torn scrap of parchment: aged paper,
 * ink italic serif (Greek-capable Alegreya, so it renders both languages), a
 * bit of masking tape at the top and a red wax seal at the foot. Used for the
 * journal "find my compass" note and the compass-scan note on the winner
 * screen. Purely presentational; the copy is passed in.
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
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 18, rotate: -2 } : false}
      animate={animate ? { opacity: 1, y: 0, rotate: -0.7 } : undefined}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`relative mx-auto w-full max-w-lg ${className}`}
      style={{ rotate: animate ? undefined : "-0.7deg" }}
    >
      {/* A strip of aged masking tape holding the note to the page. */}
      <div
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-[oklch(0.82_0.05_86_/_0.55)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      />

      <div className="bg-paper relative overflow-hidden rounded-[3px] border border-[oklch(0.7_0.05_70_/_0.5)] px-6 py-8 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)] md:px-10 md:py-10">
        {/* Grain + a faint warm sunspot for aged realism. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 8%, oklch(0.7 0.07 62 / 0.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, oklch(0.55 0.06 55 / 0.14), transparent 50%)",
          }}
        />

        <div className="relative">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={`whitespace-pre-line text-pretty font-serif text-[17px] italic leading-[1.85] text-ink/85 md:text-lg ${
                i > 0 ? "mt-4" : ""
              }`}
            >
              {p}
            </p>
          ))}

          {signature && (
            <p className="mt-6 text-right font-serif text-xl italic text-ink/70">
              {signature}
            </p>
          )}
        </div>

        {/* Wax seal with a scratched compass star. */}
        <div
          aria-hidden
          className="wax-seal absolute -bottom-3 right-5 flex size-12 items-center justify-center rounded-full md:right-8"
        >
          <svg viewBox="0 0 24 24" className="size-6 text-[oklch(0.86_0.09_60_/_0.85)]" fill="none">
            <path
              d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  )
}
