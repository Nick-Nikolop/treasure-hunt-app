"use client"

import { useState, useTransition } from "react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { useI18n } from "@/components/pythea/language-provider"
import { renameCrew } from "@/app/teams/actions"

/** Owner-only dialog for renaming the crew. */
export function RenameDialog({
  open,
  onClose,
  currentName,
}: {
  open: boolean
  onClose: () => void
  currentName: string
}) {
  const { t } = useI18n()
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await renameCrew(name)
      if (res.ok) {
        onClose()
      } else {
        const errors = t.teams.errors as Record<string, string>
        setError(errors[res.error] ?? t.teams.errors.generic)
      }
    })
  }

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="rename-title">
      <h2 id="rename-title" className="font-serif text-2xl font-black text-foreground">
        {t.teams.renameTitle}
      </h2>
      <form onSubmit={handleSubmit} className="mt-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          className="w-full rounded-sm border border-border bg-background px-4 py-3 font-serif text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brass"
        />
        {error && (
          <p role="alert" className="mt-3 font-sans text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={pending || name.trim().length < 2}
            className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.teams.save}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
          >
            {t.teams.cancel}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
