"use client"

import { useTransition } from "react"
import { FlaskConical, Plus, Minus, RotateCcw, Unlock } from "lucide-react"
import { setPreviewCount, clearPreview } from "@/app/journal/actions"

type Props = {
  unlockedCount: number
  total: number
  /** Whether an override cookie is currently active. */
  overrideActive: boolean
}

export function ClueControls({ unlockedCount, total, overrideActive }: Props) {
  const [pending, startTransition] = useTransition()

  const set = (n: number) =>
    startTransition(() => {
      void setPreviewCount(n)
    })
  const reset = () =>
    startTransition(() => {
      void clearPreview()
    })

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,30rem)] -translate-x-1/2 rounded-sm border border-brass/50 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="mb-2.5 flex items-center gap-2">
        <FlaskConical className="size-4 text-brass" />
        <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
          ΠΙΝΑΚΑΣ ΔΟΚΙΜΩΝ
        </span>
        <span className="ml-auto font-serif text-sm font-bold text-foreground">
          {unlockedCount} / {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || unlockedCount >= total}
          onClick={() => set(unlockedCount + 1)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-3 py-2.5 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
          ΑΝΟΙΞΕ ΕΠΟΜΕΝΟ
        </button>

        <button
          type="button"
          disabled={pending || unlockedCount <= 0}
          onClick={() => set(unlockedCount - 1)}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
          ΚΛΕΙΣΕ ΕΝΑ
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending || unlockedCount >= total}
          onClick={() => set(total)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-border bg-background px-3 py-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Unlock className="size-3.5" />
          ΑΝΟΙΞΕ ΟΛΑ
        </button>
        <button
          type="button"
          disabled={pending || !overrideActive}
          onClick={reset}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-border bg-background px-3 py-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" />
          ΠΡΑΓΜΑΤΙΚΟΣ ΧΡΟΝΟΣ
        </button>
      </div>

      <p className="mt-2.5 text-pretty font-sans text-[10px] leading-snug text-muted-foreground">
        Ορατό μόνο σε εσένα, για δοκιμές. Δεν εμφανίζεται στους παίκτες στη
        δημοσιευμένη σελίδα.
      </p>
    </div>
  )
}
