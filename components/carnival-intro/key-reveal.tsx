"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowDown, KeyRound } from "lucide-react"
import { EASE } from "./palette"

/** A keyhole that turns twice, the visual echo of the hint. */
function DoubleTurnKeyhole({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative grid size-24 place-items-center">
      <span aria-hidden="true" className="absolute inset-0 rounded-full border border-[var(--ci-gold)]/30" />
      <span aria-hidden="true" className="absolute inset-2 rounded-full border border-dashed border-[var(--ci-gold)]/25" />
      <motion.span
        className="grid size-16 place-items-center rounded-full bg-gradient-to-b from-[#f2cf7a] to-[var(--ci-gold)] text-[var(--ci-night)] shadow-[0_0_50px_-6px_var(--ci-gold)]"
        initial={{ rotate: 0 }}
        animate={reduce ? { rotate: 0 } : { rotate: [0, 360, 360, 720] }}
        transition={{ duration: 2.2, delay: 0.4, times: [0, 0.4, 0.6, 1], ease: EASE }}
      >
        <KeyRound className="size-7 -rotate-45" aria-hidden="true" />
      </motion.span>
    </div>
  )
}

export function KeyReveal({ value }: { value?: string }) {
  const reduce = useReducedMotion() ?? false
  const letters = [...(value ?? "").toLocaleUpperCase("el-GR")]

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="relative overflow-hidden rounded-[2rem] border border-[var(--ci-gold)]/30 bg-[var(--ci-night)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(122,20,42,0.85), transparent 75%), radial-gradient(ellipse 40% 30% at 50% 0%, rgba(224,176,74,0.22), transparent 80%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8 px-6 pb-10 pt-12 text-center sm:px-14 sm:pt-14">
        <DoubleTurnKeyhole reduce={reduce} />

        <div className="flex flex-col items-center gap-3">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.4em] text-[var(--ci-gold)]">Η κλειδαριά άνοιξε</p>
          <h3 className="text-balance font-serif text-[1.625rem] font-bold leading-[1.2] text-[var(--ci-cream)] sm:text-4xl">Αυτό είναι το κλειδί</h3>
        </div>

        {letters.length > 0 && (
          <ol className="flex flex-wrap justify-center gap-2 sm:gap-3" aria-label={`Κλειδί: ${letters.join("")}`} data-no-track>
            {letters.map((ch, i) => (
              <motion.li
                key={`${ch}-${i}`}
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0, rotateX: -90, y: -8 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.09, ease: EASE }}
                className="grid h-16 w-12 place-items-center rounded-lg border border-[#f2cf7a]/60 bg-gradient-to-b from-[#f2cf7a] via-[var(--ci-gold)] to-[#a87a24] font-serif text-3xl font-bold text-[var(--ci-night)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-3px_0_rgba(0,0,0,0.2),0_12px_24px_-10px_rgba(0,0,0,0.8)] sm:h-20 sm:w-14 sm:text-4xl"
              >
                {ch}
              </motion.li>
            ))}
          </ol>
        )}

        <motion.figure
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 + letters.length * 0.09 + 0.3, ease: EASE }}
          className="relative w-full max-w-2xl rounded-2xl border border-[var(--ci-cream)]/10 bg-[var(--ci-cream)]/[0.04] px-6 py-8 sm:px-10"
        >
          <span aria-hidden="true" className="absolute left-4 top-4 size-1.5 rounded-full bg-[var(--ci-gold)]/50" />
          <span aria-hidden="true" className="absolute right-4 top-4 size-1.5 rounded-full bg-[var(--ci-gold)]/50" />
          <span aria-hidden="true" className="absolute bottom-4 left-4 size-1.5 rounded-full bg-[var(--ci-gold)]/50" />
          <span aria-hidden="true" className="absolute bottom-4 right-4 size-1.5 rounded-full bg-[var(--ci-gold)]/50" />
          <blockquote className="text-balance font-serif text-xl italic leading-snug text-[var(--ci-cream)] sm:text-3xl">
            Ένας σωστός νοικοκύρης κλειδώνει πάντα την πόρτα του{" "}
            <span className="not-italic font-bold text-[var(--ci-gold)]">δύο φορές</span>. Ακόμα κι αν έχει ένα μόνο κλειδί.
          </blockquote>
        </motion.figure>

        <a
          href="#ci-decrypt"
          className="inline-flex items-center gap-2 font-sans text-[15px] leading-relaxed text-[var(--ci-cream)]/70 transition hover:text-[var(--ci-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ci-gold)]"
        >
          Η αποκρυπτογράφηση είναι δική σου υπόθεση. Όταν διαβάσεις το μήνυμα, γράψ&apos; το παρακάτω.
          <ArrowDown className="size-4 shrink-0 text-[var(--ci-gold)]" aria-hidden="true" />
        </a>
      </div>
    </motion.div>
  )
}
