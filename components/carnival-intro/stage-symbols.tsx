"use client"

import { ArrowDown, Eraser, RotateCcw, Wand2 } from "lucide-react"
import { useState } from "react"
import { CODE_LENGTH, encodeWithManualA, MANUAL_A, MONUMENT_SIDES, SYMBOL_IDS, SYMBOL_NAMES, type SymbolId } from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { Recap } from "./recap"
import { CipherSymbol } from "./symbols"
import { EASE, Manuscript, NextStepNotice, Panel, StageHeading } from "./ui"

const HALF = Math.ceil(MANUAL_A.length / 2)

const ALPHA_INDEX = MANUAL_A.map((row, i) => ({ char: row.char, row: i + 1 })).sort((a, b) =>
  a.char === "-" ? 1 : b.char === "-" ? -1 : a.char.localeCompare(b.char, "el"),
)

function ManualA({ active }: { active: number }) {
  const slot = active + 1
  return (
    <Manuscript seal="Α" eyebrow="Εγχειρίδιο Α" title="Από τους χαρακτήρες στα σύμβολα">
      <div className="mx-auto mb-5 flex max-w-[58ch] flex-col gap-3 text-center">
        <p className="text-pretty text-[15px] italic leading-relaxed text-[var(--cv-deep)]/80">
          Βρες τον χαρακτήρα σου και κατέβα τόσες γραμμές όσος είναι ο αριθμός της θέσης του. Το σύμβολο εκείνης της γραμμής
          είναι το δικό σου. Αν φτάσεις στο τέλος, συνέχισε από την αρχή.
        </p>
        <p
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--cv-deep)]/30 px-4 py-1.5 font-sans text-xs font-bold text-[var(--cv-deep)]"
          aria-live="polite"
        >
          Θέση {slot}
          <ArrowDown className="size-3.5" aria-hidden="true" />
          κατέβα {slot} {slot === 1 ? "γραμμή" : "γραμμές"}
        </p>
      </div>

      <section aria-label="Ευρετήριο: σε ποια γραμμή βρίσκεται κάθε χαρακτήρας" className="mb-4">
        <p className="mb-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cv-deep)]/55">
          Ευρετηριο
        </p>
        <dl className="grid grid-cols-5 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
          {ALPHA_INDEX.map((entry) => (
            <div
              key={entry.char}
              className="flex items-baseline justify-center gap-1 rounded-[3px] bg-[var(--cv-deep)]/[0.06] py-1"
            >
              <dt className="font-serif text-base font-bold">{entry.char}</dt>
              <dd className="font-sans text-[11px] font-bold tabular-nums text-[var(--cv-deep)]/60">{entry.row}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ol
        className="grid grid-flow-col grid-cols-2 gap-x-5 border-t-2 border-double border-[var(--cv-deep)]/35 pt-2 sm:gap-x-8"
        style={{ gridTemplateRows: `repeat(${HALF}, minmax(0, auto))` }}
        aria-label="Εγχειρίδιο Α, μία σελίδα"
      >
        {MANUAL_A.map((row, i) => (
          <li key={row.char} className="flex items-center gap-2 border-b border-dashed border-[var(--cv-deep)]/25 py-1.5 sm:gap-3">
            <span className="w-5 shrink-0 text-right font-sans text-[11px] font-bold tabular-nums text-[var(--cv-deep)]/50">{i + 1}</span>
            <span className="w-6 text-center font-serif text-xl font-bold sm:text-2xl">{row.char}</span>
            <span aria-hidden="true" className="h-px min-w-2 flex-1 border-b border-dotted border-[var(--cv-deep)]/40" />
            <CipherSymbol id={row.symbol} className="size-7 sm:size-8" labelled />
          </li>
        ))}
      </ol>
    </Manuscript>
  )
}

export function StageSymbols({
  code,
  symbols,
  onSymbols,
  onEditCode,
  onContinue,
}: {
  code: string[]
  symbols: (SymbolId | null)[]
  onSymbols: (next: (SymbolId | null)[]) => void
  onEditCode: () => void
  onContinue: () => void
}) {
  const [active, setActive] = useState(() => Math.max(0, symbols.findIndex((s) => !s)))
  const [confirmClear, setConfirmClear] = useState(false)
  const filled = symbols.filter(Boolean).length
  const complete = filled === CODE_LENGTH

  const assign = (id: SymbolId | null) => {
    const next = [...symbols]
    next[active] = id
    onSymbols(next)
    if (!id) return
    const after = next.findIndex((s, i) => i > active && !s)
    const anyEmpty = next.findIndex((s) => !s)
    setActive(after >= 0 ? after : anyEmpty >= 0 ? anyEmpty : active)
  }

  return (
    <div className="flex flex-col gap-6">
      <StageHeading kicker="Βήμα 2 από 3" title="Μετάτρεψε τους χαρακτήρες σε σύμβολα">
        Διάλεξε μια θέση, βρες τον χαρακτήρα της στο Εγχειρίδιο Α και κατέβα όσες γραμμές λέει ο αριθμός της θέσης. Πάτα το
        σύμβολο που βρήκες.
      </StageHeading>

      <Recap code={code} onEditCode={onEditCode} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ManualA active={active} />

        <div className="flex flex-col gap-4 xl:sticky xl:top-6">
          <Panel className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <p className="font-sans text-sm font-bold text-[var(--cv-ink)]">
                  {filled} / {CODE_LENGTH} σύμβολα
                </p>
                <div className="flex items-center gap-3">
                  <p className="font-sans text-xs text-[var(--cv-muted)]">Θέση {active + 1}</p>
                  {/* TEMP: testing shortcut, fills every slot from the typed code via the slot rule. Remove before launch. */}
                  <button
                    type="button"
                    onClick={() => {
                      onSymbols(encodeWithManualA(code))
                      setActive(CODE_LENGTH - 1)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--cv-gold)]/60 px-3 py-1 font-sans text-xs font-bold text-[var(--cv-gold)] transition-colors hover:bg-[var(--cv-gold)]/10"
                  >
                    <Wand2 className="size-3.5" aria-hidden="true" />
                    TEMP · Αυτόματο
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmClear) return setConfirmClear(true)
                      onSymbols(Array(CODE_LENGTH).fill(null))
                      setActive(0)
                      setConfirmClear(false)
                    }}
                    onBlur={() => setConfirmClear(false)}
                    disabled={filled === 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-xs font-bold transition-colors disabled:pointer-events-none disabled:opacity-40",
                      confirmClear
                        ? "border-[var(--cv-gold)] bg-[var(--cv-gold)] text-[var(--cv-deep)]"
                        : "border-[var(--cv-gold)]/25 text-[var(--cv-muted)] hover:border-[var(--cv-gold)]/60 hover:text-[var(--cv-ink)]",
                    )}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {confirmClear ? "Σίγουρα; Πάτα ξανά" : "Καθαρισμός όλων"}
                  </button>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cv-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--cv-gold)] transition-[width] duration-500"
                  style={{ width: `${(filled / CODE_LENGTH) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">
              {MONUMENT_SIDES.map((side, g) => (
                <div key={side.code} className="flex flex-col gap-2">
                  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">
                    {g + 1} · {side.short}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((k) => {
                      const i = g * 4 + k
                      const sym = symbols[i]
                      const isActive = i === active
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActive(i)}
                          aria-pressed={isActive}
                          aria-label={`Θέση ${i + 1}, χαρακτήρας ${code[i] || "κενός"}, ${sym ? `σύμβολο ${SYMBOL_NAMES[sym]}` : "χωρίς σύμβολο"}`}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-gold)]",
                            isActive
                              ? "border-[var(--cv-gold)] bg-[var(--cv-gold)]/15"
                              : "border-[var(--cv-gold)]/25 bg-[var(--cv-bg)]/60 hover:border-[var(--cv-gold)]/60",
                          )}
                        >
                          <span className="flex w-full items-baseline justify-between px-0.5">
                            <span className="font-sans text-[10px] font-bold text-[var(--cv-muted)]">{i + 1}</span>
                            <span className="font-serif text-sm font-bold text-[var(--cv-ink)]">{code[i] || "·"}</span>
                          </span>
                          <span className="grid aspect-square w-full place-items-center">
                            {sym ? (
                              <CipherSymbol id={sym} className="size-7 text-[var(--cv-gold)]" />
                            ) : (
                              <span className="size-6 rounded-full border border-dashed border-[var(--cv-gold)]/40" />
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="flex flex-col gap-3 border-[var(--cv-gold)]/45">
            <div className="flex items-center justify-between gap-3">
              <p className="font-sans text-sm font-bold text-[var(--cv-ink)]">
                Σύμβολο για τη θέση {active + 1}
                {code[active] ? ` (${code[active]})` : ""}
              </p>
              <button
                type="button"
                onClick={() => assign(null)}
                disabled={!symbols[active]}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-sans text-xs font-bold text-[var(--cv-muted)] transition-colors hover:text-[var(--cv-ink)] disabled:opacity-40"
              >
                <Eraser className="size-3.5" aria-hidden="true" />
                Αφαίρεση
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:grid-cols-9 sm:gap-1.5 xl:grid-cols-7" role="group" aria-label="Διαθέσιμα σύμβολα">
              {SYMBOL_IDS.map((id) => {
                const chosen = symbols[active] === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => assign(id)}
                    aria-pressed={chosen}
                    aria-label={SYMBOL_NAMES[id]}
                    title={SYMBOL_NAMES[id]}
                    className={cn(
                      "grid aspect-square place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-gold)]",
                      chosen
                        ? "border-[var(--cv-gold)] bg-[var(--cv-gold)] text-[var(--cv-deep)]"
                        : "border-[var(--cv-gold)]/25 text-[var(--cv-gold)] hover:bg-[var(--cv-gold)]/10",
                    )}
                  >
                    <CipherSymbol id={id} className="size-6 sm:size-7" />
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>

      <NextStepNotice
        show={complete}
        note="Και οι 16 θέσεις έχουν σύμβολο. Δεν έχει ελεγχθεί τίποτα ακόμα."
        actionLabel="Άνοιξε το Εγχειρίδιο Β"
        onContinue={onContinue}
      />
    </div>
  )
}
