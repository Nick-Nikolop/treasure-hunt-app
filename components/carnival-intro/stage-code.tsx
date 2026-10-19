"use client"

import { Eraser } from "lucide-react"
import { CODE_LENGTH, MONUMENT_SIDES } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { CHAR_INPUT, NextStepNotice, Panel, StageHeading, useCharSlots } from "./ui"

const SLOT_HINTS = ["αρχή", "τέλος", "αρχή", "τέλος"]

/** Top-down sketch of the monument: four faces, read clockwise from the south-west. */
function MonumentDiagram() {
  const badges = [
    { n: 1, x: 58, y: 142, label: "ΝΔ", lx: 80, ly: 124 },
    { n: 2, x: 58, y: 58, label: "ΒΔ", lx: 80, ly: 82 },
    { n: 3, x: 142, y: 58, label: "ΒΑ", lx: 120, ly: 82 },
    { n: 4, x: 142, y: 142, label: "ΝΑ", lx: 120, ly: 124 },
  ]
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto w-full max-w-60 text-[var(--cv-gold)]"
      role="img"
      aria-label="Κάτοψη του μνημείου: ξεκινάς από τη νοτιοδυτική πλευρά και προχωράς δεξιόστροφα"
    >
      <defs>
        <marker id="ci-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10Z" fill="currentColor" />
        </marker>
      </defs>
      <path
        d="M37.8 162.2A88 88 0 1 1 162.2 162.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        markerEnd="url(#ci-arrow)"
        opacity="0.8"
      />
      <polygon points="100,40 160,100 100,160 40,100" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
      {badges.map((b) => (
        <g key={b.n}>
          <circle cx={b.x} cy={b.y} r="11" fill="var(--cv-gold)" />
          <text x={b.x} y={b.y + 4} textAnchor="middle" className="fill-[var(--cv-deep)] font-sans text-[12px] font-bold">
            {b.n}
          </text>
          <text x={b.lx} y={b.ly + 4} textAnchor="middle" className="fill-[var(--cv-ink)] font-sans text-[11px] font-bold">
            {b.label}
          </text>
        </g>
      ))}
      <text x="100" y="105" textAnchor="middle" className="fill-[var(--cv-muted)] font-serif text-[11px] italic">
        μνημείο
      </text>
      <text x="16" y="22" className="fill-[var(--cv-muted)] font-sans text-[11px] font-bold">
        {"Β ↑"}
      </text>
    </svg>
  )
}

function HowToCollect() {
  const rules = [
    <>
      Ξεκίνα από τη <strong className="text-[var(--cv-ink)]">νοτιοδυτική πλευρά (ΝΔ)</strong> και προχώρα δεξιόστροφα: ΝΔ, ΒΔ, ΒΑ, ΝΑ.
    </>,
    <>Σε κάθε πλευρά υπάρχει μια επιγραφή με πολλές προτάσεις. Χρειάζεσαι μόνο την πρώτη και την τελευταία.</>,
    <>
      Γράψε <strong className="text-[var(--cv-ink)]">4 χαρακτήρες</strong>: τον πρώτο και τον τελευταίο της πρώτης πρότασης, μετά τον πρώτο και τον
      τελευταίο της τελευταίας πρότασης.
    </>,
    <>
      Οι παύλες <strong className="text-[var(--cv-ink)]">(-)</strong> μετράνε κανονικά ως χαρακτήρες. Τα κενά δεν μετράνε.
    </>,
  ]
  return (
    <Panel className="flex flex-col gap-6">
      <MonumentDiagram />
      <ol className="flex flex-col gap-4">
        {rules.map((rule, i) => (
          <li key={i} className="flex gap-3 text-pretty text-[15px] leading-relaxed text-[var(--cv-muted)]">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[var(--cv-gold)]/60 font-sans text-xs font-bold text-[var(--cv-gold)]">
              {i + 1}
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export function StageCode({
  code,
  onCode,
  onContinue,
}: {
  code: string[]
  onCode: (next: string[]) => void
  onContinue: () => void
}) {
  const bind = useCharSlots(code, onCode, (i) => `Χαρακτήρας ${i + 1} από ${CODE_LENGTH}`)
  const filled = code.filter(Boolean).length
  const complete = filled === CODE_LENGTH

  return (
    <div className="flex flex-col gap-8">
      <StageHeading kicker="Βήμα 1 από 3" title="Ο κωδικός του μνημείου">
        Στάσου μπροστά στο μνημείο. Οι επιγραφές στις τέσσερις πλευρές του κρύβουν 16 χαρακτήρες. Μάζεψέ τους με τη σειρά και
        γράψε τους εδώ.
      </StageHeading>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <HowToCollect />

        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-sans text-sm font-bold text-[var(--cv-ink)]">
              {filled} / {CODE_LENGTH} χαρακτήρες
            </p>
            <button
              type="button"
              onClick={() => onCode(Array(CODE_LENGTH).fill(""))}
              disabled={filled === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-bold text-[var(--cv-muted)] transition-colors hover:text-[var(--cv-ink)] disabled:opacity-40"
            >
              <Eraser className="size-3.5" aria-hidden="true" />
              Καθαρισμός
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {MONUMENT_SIDES.map((side, g) => (
              <div key={side.code} role="group" aria-labelledby={`ci-side-${side.code}`} className="flex flex-col gap-2">
                <p
                  id={`ci-side-${side.code}`}
                  className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-[var(--cv-gold)] text-[10px] text-[var(--cv-deep)]">
                    {g + 1}
                  </span>
                  {side.name} ({side.short})
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SLOT_HINTS.map((hint, k) => {
                    const i = g * 4 + k
                    return (
                      <label key={k} className="flex flex-col items-center gap-1">
                        <input
                          {...bind(i)}
                          className={cn(CHAR_INPUT, code[i] ? "border-[var(--cv-gold)]/70" : "border-[var(--cv-gold)]/30")}
                        />
                        <span className="font-sans text-[11px] text-[var(--cv-muted)]/80">{hint}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 font-serif text-xs italic text-[var(--cv-muted)]">
                  <span className="border-t border-[var(--cv-gold)]/30 pt-1 text-center">1η πρόταση</span>
                  <span className="border-t border-[var(--cv-gold)]/30 pt-1 text-center">τελευταία πρόταση</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-pretty text-sm leading-relaxed text-[var(--cv-muted)]">
            Μπορείς να γράψεις με ελληνικά ή λατινικά, με ή χωρίς τόνους, ή να επικολλήσεις όλο τον κωδικό στο πρώτο κουτί.
          </p>
        </Panel>
      </div>

      <NextStepNotice
        show={complete}
        note="Και οι 16 χαρακτήρες είναι συμπληρωμένοι. Δεν έχει ελεγχθεί τίποτα ακόμα."
        actionLabel="Άνοιξε το Εγχειρίδιο Α"
        onContinue={onContinue}
      />
    </div>
  )
}
