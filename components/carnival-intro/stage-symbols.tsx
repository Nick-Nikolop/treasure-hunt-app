"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, Eraser, RotateCcw, Wand2 } from "lucide-react"
import { useState } from "react"
import {
  CODE_LENGTH,
  encodeWithManualA,
  MANUAL_A,
  MONUMENT_SIDES,
  SYMBOL_IDS,
  SYMBOL_NAMES,
  type SymbolId,
} from "@/lib/carnival-intro/cipher"
import { cn } from "@/lib/utils"
import { Recap } from "./recap"
import { CipherSymbol } from "./symbols"
import { EASE, Manuscript, NextStepNotice, Panel, StageHeading } from "./ui"

const ORDINAL = ["1ος", "2ος", "3ος", "4ος"]

function ManualA({ page, onPage, active }: { page: number; onPage: (p: number) => void; active: number }) {
  const reduce = useReducedMotion()
  const sheet = MANUAL_A[page]
  const side = MONUMENT_SIDES[Math.floor(page / 4)]
  return (
    <Manuscript seal="Α" eyebrow="Εγχειρίδιο Α" title="Από τους χαρακτήρες στα σύμβολα">
      <p className="mx-auto mb-5 max-w-[54ch] text-pretty text-center text-[15px] italic leading-relaxed text-[var(--cv-deep)]/80">
        Κάθε θέση έχει τη δική της σελίδα με όλους τους χαρακτήρες. Το ίδιο γράμμα σε άλλη σελίδα κρύβει άλλο σύμβολο.
      </p>

      <nav aria-label="Σελίδες του Εγχειριδίου Α" className="mb-5 flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {MONUMENT_SIDES.map((s, g) => (
            <div key={s.code} className="flex flex-col items-center gap-1">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cv-deep)]/55">{s.short}</span>
              <div className="grid w-full grid-cols-4 gap-0.5">
                {[0, 1, 2, 3].map((k) => {
                  const i = g * 4 + k
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onPage(i)}
                      aria-current={i === page ? "page" : undefined}
                      aria-label={`Σελίδα θέσης ${i + 1}`}
                      className={cn(
                        "relative h-8 rounded-[3px] font-serif text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-deep)]",
                        i === page
                          ? "bg-[var(--cv-deep)] text-[var(--cv-gold)]"
                          : "bg-[var(--cv-deep)]/[0.07] text-[var(--cv-deep)]/75 hover:bg-[var(--cv-deep)]/15",
                      )}
                    >
                      {i + 1}
                      {i === active && i !== page && (
                        <span aria-hidden="true" className="absolute -top-0.5 right-0.5 size-1.5 rounded-full bg-[var(--cv-gold)] ring-1 ring-[var(--cv-deep)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="flex items-center justify-between gap-3 border-y-2 border-double border-[var(--cv-deep)]/35 py-3">
        <button
          type="button"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Προηγούμενη σελίδα"
          className="grid size-9 place-items-center rounded-full text-[var(--cv-deep)] transition-colors hover:bg-[var(--cv-deep)]/10 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="font-serif text-2xl font-bold sm:text-3xl" aria-live="polite">
            Θέση {sheet.position}
          </p>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-deep)]/60">
            {side.name} πλευρά · {ORDINAL[page % 4]} χαρακτήρας
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPage(Math.min(CODE_LENGTH - 1, page + 1))}
          disabled={page === CODE_LENGTH - 1}
          aria-label="Επόμενη σελίδα"
          className="grid size-9 place-items-center rounded-full text-[var(--cv-deep)] transition-colors hover:bg-[var(--cv-deep)]/10 disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="[perspective:1400px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.dl
            key={sheet.position}
            className="grid origin-left grid-cols-3 gap-x-4 pt-2 sm:grid-cols-5 sm:gap-x-5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -14, x: 12 }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 10, x: -12 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {sheet.rows.map((row) => (
              <div key={row.char} className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--cv-deep)]/25 py-2.5">
                <dt className="w-6 text-center font-serif text-2xl font-bold">{row.char}</dt>
                <span aria-hidden="true" className="h-px min-w-2 flex-1 border-b border-dotted border-[var(--cv-deep)]/40" />
                <dd>
                  <CipherSymbol id={row.symbol} className="size-8" labelled />
                </dd>
              </div>
            ))}
          </motion.dl>
        </AnimatePresence>
      </div>
    </Manuscript>
  )
}

function SlotGrid({
  code,
  symbols,
  active,
  onSelect,
}: {
  code: string[]
  symbols: (SymbolId | null)[]
  active: number
  onSelect: (i: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 xl:grid-cols-2">
      {MONUMENT_SIDES.map((side, g) => (
        <div key={side.code} className="flex flex-col gap-1.5">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">
            {g + 1} · {side.short}
          </p>
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
            {[0, 1, 2, 3].map((k) => {
              const i = g * 4 + k
              const sym = symbols[i]
              const isActive = i === active
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-pressed={isActive}
                  aria-label={`Θέση ${i + 1}, χαρακτήρας ${code[i] || "κενός"}, ${sym ? `σύμβολο ${SYMBOL_NAMES[sym]}` : "χωρίς σύμβολο"}`}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-gold)] sm:gap-1 sm:p-1.5",
                    isActive
                      ? "border-[var(--cv-gold)] bg-[var(--cv-gold)]/15"
                      : "border-[var(--cv-gold)]/25 bg-[var(--cv-bg)]/60 hover:border-[var(--cv-gold)]/60",
                  )}
                >
                  <span className="flex w-full items-baseline justify-between px-0.5">
                    <span className="font-sans text-[9px] font-bold text-[var(--cv-muted)] sm:text-[10px]">{i + 1}</span>
                    <span className="font-serif text-sm font-bold text-[var(--cv-ink)]">{code[i] || "·"}</span>
                  </span>
                  <span className="grid aspect-square w-full place-items-center">
                    {sym ? (
                      <CipherSymbol id={sym} className="size-5 text-[var(--cv-gold)] sm:size-7" />
                    ) : (
                      <span className="size-4 rounded-full border border-dashed border-[var(--cv-gold)]/40 sm:size-6" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SymbolPicker({
  code,
  symbols,
  active,
  onAssign,
  className,
}: {
  code: string[]
  symbols: (SymbolId | null)[]
  active: number
  onAssign: (id: SymbolId | null) => void
  className?: string
}) {
  return (
    <Panel className={cn("flex flex-col gap-3 border-[var(--cv-gold)]/45", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2 font-sans text-sm font-bold text-[var(--cv-ink)]">
          <span>Σύμβολο για τη θέση {active + 1}</span>
          {code[active] && (
            <span className="rounded-md bg-[var(--cv-gold)] px-2 py-0.5 font-serif text-base leading-none text-[var(--cv-deep)]">
              {code[active]}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => onAssign(null)}
          disabled={!symbols[active]}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-sans text-xs font-bold text-[var(--cv-muted)] transition-colors hover:text-[var(--cv-ink)] disabled:opacity-40"
        >
          <Eraser className="size-3.5" aria-hidden="true" />
          Αφαίρεση
        </button>
      </div>
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5 xl:grid-cols-7" role="group" aria-label="Διαθέσιμα σύμβολα">
        {SYMBOL_IDS.map((id) => {
          const chosen = symbols[active] === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onAssign(id)}
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
              <CipherSymbol id={id} className="size-5 sm:size-7" />
            </button>
          )
        })}
      </div>
    </Panel>
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
  const [active, setActiveSlot] = useState(() => Math.max(0, symbols.findIndex((s) => !s)))
  const [page, setPage] = useState(active)
  const [confirmClear, setConfirmClear] = useState(false)
  const filled = symbols.filter(Boolean).length
  const complete = filled === CODE_LENGTH

  const setActive = (i: number) => {
    setActiveSlot(i)
    setPage(i)
  }

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
        Διάλεξε μια θέση και το Εγχειρίδιο Α ανοίγει στη σελίδα της. Βρες εκεί τον χαρακτήρα σου και πάτα το σύμβολο που δείχνει.
      </StageHeading>

      <Recap code={code} onEditCode={onEditCode} />

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-6">
        <div className="order-2 xl:order-none">
          <ManualA page={page} onPage={setPage} active={active} />
        </div>

        <div className="order-1 flex flex-col gap-4 xl:sticky xl:top-6 xl:order-none">
          <Panel className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="font-sans text-sm font-bold text-[var(--cv-ink)]">
                  {filled} / {CODE_LENGTH} σύμβολα
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-sans text-xs text-[var(--cv-muted)]">Θέση {active + 1}</p>
                  {/* TEMP: testing shortcut, fills every slot from the typed code. Remove before launch. */}
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

            <SlotGrid code={code} symbols={symbols} active={active} onSelect={setActive} />
          </Panel>

          <SymbolPicker code={code} symbols={symbols} active={active} onAssign={assign} className="hidden xl:flex" />
        </div>

        {/* Phones and tablets: the picker sits right under the manual and stays pinned to the bottom of the screen. */}
        <SymbolPicker
          code={code}
          symbols={symbols}
          active={active}
          onAssign={assign}
          className="sticky bottom-0 z-20 order-3 gap-2 rounded-b-none border-b-0 bg-[var(--cv-deep)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.7)] xl:hidden"
        />
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
