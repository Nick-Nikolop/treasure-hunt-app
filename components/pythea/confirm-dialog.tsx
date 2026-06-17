"use client"

import { ModalShell } from "@/components/pythea/modal-shell"

/** Generic confirm/cancel dialog used for leaving a crew and removing members. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="confirm-title">
      <h2 id="confirm-title" className="font-serif text-2xl font-black text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center rounded-sm bg-destructive px-5 py-3 font-sans text-sm font-bold tracking-chip text-destructive-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </ModalShell>
  )
}
