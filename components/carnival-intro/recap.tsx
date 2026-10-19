"use client"

import { PencilLine } from "lucide-react"
import type { ReactNode } from "react"
import { MONUMENT_SIDES, SYMBOL_NAMES, type SymbolId } from "@/lib/carnival-intro/cipher"
import { CipherSymbol } from "./symbols"

function RecapRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cv-muted)]">{label}</p>
      <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 justify-self-end rounded-full px-2 py-1 font-sans text-xs font-bold text-[var(--cv-gold)] transition-colors hover:bg-[var(--cv-gold)]/10"
      >
        <PencilLine className="size-3.5" aria-hidden="true" />
        Αλλαγή
      </button>
    </div>
  )
}

/** What the player has entered in earlier steps, shown as-is (never checked) with a way back to change it. */
export function Recap({
  code,
  symbols,
  onEditCode,
  onEditSymbols,
}: {
  code: string[]
  symbols?: (SymbolId | null)[]
  onEditCode: () => void
  onEditSymbols?: () => void
}) {
  return (
    <section
      aria-label="Μέχρι τώρα"
      className="flex flex-col gap-4 rounded-2xl border border-[var(--cv-gold)]/20 bg-[var(--cv-deep)]/60 px-4 py-4 backdrop-blur-sm sm:px-6"
    >
      <p className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--cv-gold)]">Μέχρι τώρα</p>
      <RecapRow label="Κωδικός" onEdit={onEditCode}>
        {MONUMENT_SIDES.map((side, g) => (
          <span key={side.code} className="flex items-baseline gap-1.5">
            <span className="font-sans text-[10px] font-bold text-[var(--cv-muted)]/80">{side.short}</span>
            <span className="font-serif text-xl font-bold tracking-[0.2em] text-[var(--cv-ink)]">{code.slice(g * 4, g * 4 + 4).join("")}</span>
          </span>
        ))}
      </RecapRow>
      {symbols && onEditSymbols && (
        <RecapRow label="Σύμβολα" onEdit={onEditSymbols}>
          {MONUMENT_SIDES.map((side, g) => (
            <span key={side.code} className="flex items-center gap-1">
              {symbols.slice(g * 4, g * 4 + 4).map((s, k) =>
                s ? (
                  <CipherSymbol key={k} id={s} className="size-6 text-[var(--cv-gold)]" />
                ) : (
                  <span key={k} className="size-6 rounded-full border border-dashed border-[var(--cv-gold)]/40" />
                ),
              )}
              <span className="sr-only">{symbols.slice(g * 4, g * 4 + 4).map((s) => (s ? SYMBOL_NAMES[s] : "κενό")).join(", ")}</span>
            </span>
          ))}
        </RecapRow>
      )}
    </section>
  )
}
