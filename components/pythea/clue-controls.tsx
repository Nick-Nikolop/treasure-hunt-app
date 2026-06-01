"use client"

import { useState, useTransition } from "react"
import { FlaskConical, Plus, Minus, RotateCcw, Unlock, X } from "lucide-react"
import { setPreviewCount, clearPreview } from "@/app/journal/actions"
import { useI18n } from "@/components/pythea/language-provider"

type Props = {
  unlockedCount: number
  total: number
  /** Whether an override cookie is currently active. */
  overrideActive: boolean
}

export function ClueControls({ unlockedCount, total, overrideActive }: Props) {
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const set = (n: number) =>
    startTransition(() => {
      void setPreviewCount(n)
    })
  const reset = () =>
    startTransition(() => {
      void clearPreview()
    })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.controls.openAria}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-card/95 px-3 py-2 font-sans text-[11px] font-bold tracking-chip text-brass shadow-xl backdrop-blur-md transition-colors hover:border-brass hover:bg-card"
      >
        <FlaskConical className="size-4" />
        <span className="hidden sm:inline">{t.controls.chip}</span>
        <span className="font-serif text-foreground">
          {unlockedCount}/{total}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(94vw,22rem)] rounded-sm border border-brass/50 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="mb-2.5 flex items-center gap-2">
        <FlaskConical className="size-4 text-brass" />
        <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
          {t.controls.panelTitle}
        </span>
        <span className="ml-auto font-serif text-sm font-bold text-foreground">
          {unlockedCount} / {total}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.controls.closeAria}
          className="inline-flex size-6 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || unlockedCount >= total}
          onClick={() => set(unlockedCount + 1)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-3 py-2.5 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
          {t.controls.openNext}
        </button>

        <button
          type="button"
          disabled={pending || unlockedCount <= 0}
          onClick={() => set(unlockedCount - 1)}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-4" />
          {t.controls.closeOne}
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
          {t.controls.openAll}
        </button>
        <button
          type="button"
          disabled={pending || !overrideActive}
          onClick={reset}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-border bg-background px-3 py-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" />
          {t.controls.realTime}
        </button>
      </div>

      <p className="mt-2.5 text-pretty font-sans text-[10px] leading-snug text-muted-foreground">
        {t.controls.note}
      </p>
    </div>
  )
}
