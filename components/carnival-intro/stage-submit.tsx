"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, BookOpen, KeyRound, Send } from "lucide-react"
import { useState, useTransition } from "react"
import { checkCarnivalAnswer } from "@/app/carnival-intro/actions"
import { CODE_LENGTH } from "@/lib/carnival-intro/cipher"
import { PhrasePreview } from "./stage-letters"
import { EASE, GhostButton, Panel, PrimaryButton, StageHeading } from "./ui"

export function SolvedReveal({ phrase }: { phrase: string }) {
  const reduce = useReducedMotion()
  const words = phrase.split(" ")
  let n = 0
  return (
    <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-[var(--cv-gold)]/50 bg-[var(--cv-deep)]/90 px-5 py-14 text-center shadow-[0_0_80px_-20px_var(--cv-gold)] sm:px-10 sm:py-20">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(224,176,74,0.22), transparent 65%)" }}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      <motion.p
        className="relative font-sans text-xs font-bold uppercase tracking-[0.35em] text-[var(--cv-gold)]"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        Ο γρίφος λύθηκε
      </motion.p>
      <h2 className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 font-serif text-4xl font-black leading-tight text-[var(--cv-ink)] sm:gap-x-8 sm:text-6xl">
        <span className="sr-only">{phrase}</span>
        {words.map((word, w) => (
          <span key={w} aria-hidden="true" className="whitespace-nowrap">
            {[...word].map((ch) => {
              const delay = 0.4 + n++ * 0.09
              return (
                <motion.span
                  key={`${w}-${delay}`}
                  className="inline-block [text-shadow:0_0_24px_rgba(224,176,74,0.55)]"
                  initial={reduce ? false : { opacity: 0, y: 18, rotateX: -90, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, ease: EASE, delay }}
                >
                  {ch}
                </motion.span>
              )
            })}
          </span>
        ))}
      </h2>
      <motion.div
        className="relative h-px w-40 bg-gradient-to-r from-transparent via-[var(--cv-gold)] to-transparent"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 2 }}
      />
      <motion.p
        className="relative max-w-[52ch] text-pretty text-base leading-relaxed text-[var(--cv-muted)] sm:text-lg"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.3 }}
      >
        Αυτό είναι το μήνυμα που κρατούσε το μνημείο. Κράτησέ το καλά: η ιστορία του Καρναβαλιού μόλις ξεκίνησε.
      </motion.p>
    </div>
  )
}

export function StageSubmit({
  letters,
  onSolved,
  onGoTo,
}: {
  letters: string[]
  onSolved: (phrase: string) => void
  onGoTo: (stage: 1 | 2 | 4) => void
}) {
  const [pending, startTransition] = useTransition()
  const [wrong, setWrong] = useState(0)
  const complete = letters.filter(Boolean).length === CODE_LENGTH

  const submit = () =>
    startTransition(async () => {
      const result = await checkCarnivalAnswer(letters)
      if (result.ok) onSolved(result.phrase)
      else setWrong((n) => n + 1)
    })

  return (
    <div className="flex flex-col gap-8">
      <StageHeading kicker="Βήμα 5 από 5" title="Το κρυμμένο μήνυμα">
        Αυτό είναι το μήνυμα που διάβασες. Αν είσαι σίγουρος, υπέβαλέ το. Μόνο εδώ θα μάθεις αν όλα τα βήματα ήταν σωστά.
      </StageHeading>

      <Panel className="flex flex-col items-center gap-8 py-10 text-center sm:py-14">
        <PhrasePreview letters={letters} className="text-3xl sm:text-5xl" />
        <PrimaryButton onClick={submit} disabled={!complete || pending} className="px-8 py-3.5 text-base">
          <Send aria-hidden="true" />
          {pending ? "Έλεγχος..." : "Υποβολή μηνύματος"}
        </PrimaryButton>
      </Panel>

      <AnimatePresence mode="wait">
        {wrong > 0 && !pending && (
          <motion.div
            key={wrong}
            role="alert"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col gap-5 rounded-2xl border border-[var(--cv-muted)]/50 bg-[var(--cv-deep)]/90 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-1">
              <p className="font-sans text-base font-bold text-[var(--cv-ink)]">Το μήνυμα δεν είναι σωστό ακόμα</p>
              <p className="max-w-[64ch] text-pretty text-sm leading-relaxed text-[var(--cv-muted)] sm:text-base">
                Κάτι δεν ταιριάζει σε κάποιο από τα βήματα. Έλεγξε ξανά τα γράμματα στο Εγχειρίδιο Β, τα σύμβολα στο Εγχειρίδιο Α ή
                τον κωδικό του μνημείου. Όσα έχεις γράψει μένουν όπως είναι.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <GhostButton onClick={() => onGoTo(4)}>
                <BookOpen aria-hidden="true" />
                Εγχειρίδιο Β
              </GhostButton>
              <GhostButton onClick={() => onGoTo(2)}>
                <ArrowLeft aria-hidden="true" />
                Τα σύμβολά μου
              </GhostButton>
              <GhostButton onClick={() => onGoTo(1)}>
                <KeyRound aria-hidden="true" />
                Ο κωδικός μου
              </GhostButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
