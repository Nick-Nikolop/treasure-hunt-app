"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check, Lock, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { CODE_LENGTH, SYMBOL_IDS, type SymbolId } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { StageCode } from "./stage-code"
import { StageLetters } from "./stage-letters"
import { SolvedReveal } from "./stage-submit"
import { StageSymbols } from "./stage-symbols"
import { EASE } from "./ui"

type Stage = 1 | 2 | 3

interface Progress {
  stage: Stage
  reached: Stage
  code: string[]
  symbols: (SymbolId | null)[]
  letters: string[]
  solved: string | null
}

const STORAGE_KEY = "thehunt:carnival-intro:v1"

const PALETTE = {
  "--cv-bg": "#3a0105",
  "--cv-deep": "#240003",
  "--cv-ink": "#f4e6c8",
  "--cv-muted": "#c79a90",
  "--cv-gold": "#e0b04a",
} as CSSProperties

const STEPS: { stage: Stage; label: string }[] = [
  { stage: 1, label: "Κωδικός" },
  { stage: 2, label: "Εγχειρίδιο Α" },
  { stage: 3, label: "Εγχειρίδιο Β" },
]

/** Older saves had 5 steps (review, Manual B and submit are now one step). */
const toStage = (v: unknown): Stage | null =>
  typeof v === "number" && v >= 1 && v <= 5 ? (Math.min(3, Math.floor(v)) as Stage) : null

const empty = (): Progress => ({
  stage: 1,
  reached: 1,
  code: Array(CODE_LENGTH).fill(""),
  symbols: Array(CODE_LENGTH).fill(null),
  letters: Array(CODE_LENGTH).fill(""),
  solved: null,
})

function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const p = JSON.parse(raw) as Partial<Progress>
    const base = empty()
    const strings = (v: unknown) =>
      Array.isArray(v) && v.length === CODE_LENGTH ? v.map((x) => (typeof x === "string" ? x.slice(0, 2) : "")) : null
    const syms = Array.isArray(p.symbols) && p.symbols.length === CODE_LENGTH
      ? p.symbols.map((s) => (SYMBOL_IDS.includes(s as SymbolId) ? (s as SymbolId) : null))
      : base.symbols
    const stage = toStage(p.stage) ?? 1
    const reached = toStage(p.reached) ?? stage
    return {
      stage,
      reached: Math.max(stage, reached) as Stage,
      code: strings(p.code) ?? base.code,
      symbols: syms,
      letters: strings(p.letters) ?? base.letters,
      solved: typeof p.solved === "string" ? p.solved : null,
    }
  } catch {
    return empty()
  }
}

/** A step can only be opened while everything before it is still fully filled in (not necessarily correct). */
function isUnlocked(p: Progress, stage: Stage): boolean {
  const full = (a: unknown[]) => a.every(Boolean)
  if (stage === 1) return true
  if (!full(p.code)) return false
  if (stage === 2) return true
  return full(p.symbols)
}

function Stepper({ progress, onGo }: { progress: Progress; onGo: (s: Stage) => void }) {
  const { stage, reached } = progress
  return (
    <nav aria-label="Βήματα του γρίφου">
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const open = step.stage <= reached && isUnlocked(progress, step.stage)
          const current = step.stage === stage
          const done = step.stage < reached && !current
          return (
            <li key={step.stage} className={cn("flex items-start", i < STEPS.length - 1 && "flex-1")}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onGo(step.stage)}
                aria-current={current ? "step" : undefined}
                className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-gold)] disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full border font-sans text-sm font-bold transition-colors",
                    current && "border-[var(--cv-gold)] bg-[var(--cv-gold)] text-[var(--cv-deep)] shadow-[0_0_20px_-4px_var(--cv-gold)]",
                    !current && open && "border-[var(--cv-gold)]/70 bg-[var(--cv-deep)] text-[var(--cv-gold)] group-hover:bg-[var(--cv-gold)]/15",
                    !open && "border-[var(--cv-muted)]/30 bg-[var(--cv-deep)]/60 text-[var(--cv-muted)]/60",
                  )}
                >
                  {!open ? <Lock className="size-3.5" aria-hidden="true" /> : done ? <Check className="size-4" aria-hidden="true" /> : step.stage}
                </span>
                <span
                  className={cn(
                    "font-sans text-[11px] font-bold leading-tight sm:text-xs",
                    current ? "text-[var(--cv-ink)]" : "text-[var(--cv-muted)]",
                    !current && "max-sm:sr-only",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[1.15rem] h-px min-w-3 flex-1",
                    step.stage < reached ? "bg-[var(--cv-gold)]/70" : "bg-[var(--cv-muted)]/25",
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Intro() {
  const reduce = useReducedMotion()
  return (
    <motion.header
      className="flex flex-col items-center gap-6 text-center"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: EASE }}
    >
      <Image src="/carnival/logo.webp" alt="The Hunt Carnival" width={112} height={112} priority className="size-24 object-contain sm:size-28" />
      <div className="flex flex-col items-center gap-4">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.35em] text-[var(--cv-gold)]">The Hunt · Καρναβάλι</p>
        <h1 className="text-balance font-serif text-4xl font-black leading-[1.05] text-[var(--cv-ink)] sm:text-6xl">
          Ο γρίφος του μνημείου
        </h1>
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-[var(--cv-gold)] to-transparent" aria-hidden="true" />
      </div>
      <div className="flex max-w-[62ch] flex-col gap-4 text-pretty text-base leading-relaxed text-[var(--cv-muted)] sm:text-lg">
        <p>
          Πίσω από τις μάσκες της πόλης κάτι έχει συμβεί, και κάποιος φρόντισε να μείνει γραμμένο. Το μήνυμα είναι χαραγμένο στις
          τέσσερις πλευρές ενός μνημείου, κρυμμένο μέσα σε επιγραφές που οι περαστικοί διαβάζουν χωρίς να καταλαβαίνουν.
        </p>
        <p>
          Δύο παλιά εγχειρίδια είναι ο μόνος τρόπος να το διαβάσεις. Μάζεψε τους 16 χαρακτήρες, μετάτρεψέ τους σε σύμβολα και τα
          σύμβολα σε λέξεις.{" "}
          <span className="text-[var(--cv-ink)]">Κανένα βήμα δεν σου λέει αν έκανες λάθος. Θα το μάθεις μόνο στο τέλος.</span>
        </p>
      </div>
    </motion.header>
  )
}

export function CarnivalIntro() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const skipScroll = useRef(true)

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  useEffect(() => {
    if (!progress) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Private mode or full storage: progress just won't survive a refresh.
    }
  }, [progress])

  useEffect(() => {
    if (!progress) return
    if (skipScroll.current) {
      skipScroll.current = false
      return
    }
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [progress?.stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<Progress>) => setProgress((p) => (p ? { ...p, ...patch } : p))
  const goTo = (stage: Stage) =>
    setProgress((p) => (p ? { ...p, stage, reached: Math.max(p.reached, stage) as Stage } : p))

  const reset = () => {
    if (!window.confirm("Θέλεις να σβήσεις όλη την πρόοδο και να ξεκινήσεις από την αρχή;")) return
    skipScroll.current = false
    setProgress(empty())
  }

  return (
    <div style={PALETTE} className="relative min-h-svh bg-[var(--cv-bg)] font-serif text-[var(--cv-ink)] selection:bg-[var(--cv-gold)] selection:text-[var(--cv-deep)]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <Image src="/brand/alt/backdrops/burgundy-velvet-v2.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--cv-deep)_85%)] opacity-80" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <Intro />

        {!progress ? (
          <div className="grid place-items-center py-24" role="status" aria-label="Φόρτωση">
            <span className="size-8 animate-spin rounded-full border-2 border-[var(--cv-gold)]/25 border-t-[var(--cv-gold)]" />
          </div>
        ) : progress.solved ? (
          <div id="ci-solved" className="flex scroll-mt-6 flex-col gap-6">
            <SolvedReveal phrase={progress.solved} />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 font-sans text-xs font-bold text-[var(--cv-muted)] hover:text-[var(--cv-ink)]"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Ξεκίνα από την αρχή
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto w-full max-w-3xl">
              <Stepper progress={progress} onGo={goTo} />
            </div>

            <div ref={stageRef} className="scroll-mt-6">
              <motion.div
                key={progress.stage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {progress.stage === 1 && (
                  <StageCode code={progress.code} onCode={(code) => update({ code })} onContinue={() => goTo(2)} />
                )}
                {progress.stage === 2 && (
                  <StageSymbols
                    code={progress.code}
                    symbols={progress.symbols}
                    onSymbols={(symbols) => update({ symbols })}
                    onEditCode={() => goTo(1)}
                    onContinue={() => goTo(3)}
                  />
                )}
                {progress.stage === 3 && (
                  <StageLetters
                    code={progress.code}
                    symbols={progress.symbols}
                    letters={progress.letters}
                    onLetters={(letters) => update({ letters })}
                    onSolved={(solved) => {
                      update({ solved })
                      requestAnimationFrame(() =>
                        document.getElementById("ci-solved")?.scrollIntoView({ behavior: "smooth", block: "center" }),
                      )
                    }}
                    onGoTo={goTo}
                  />
                )}
              </motion.div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 font-sans text-xs font-bold text-[var(--cv-muted)]/80 hover:text-[var(--cv-ink)]"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Μηδενισμός προόδου
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
