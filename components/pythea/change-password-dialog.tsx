"use client"

import { useState, useTransition } from "react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { useI18n } from "@/components/pythea/language-provider"
import { authClient } from "@/lib/auth-client"

/**
 * Lets a signed-in user change their password. Wraps Better Auth's
 * changePassword, which requires the current password and re-signs the session.
 */
export function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function reset() {
    setCurrent("")
    setNext("")
    setConfirm("")
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next.length < 8) {
      setError(t.auth.errPasswordShort)
      return
    }
    if (next !== confirm) {
      setError(t.auth.errPasswordMismatch)
      return
    }

    startTransition(async () => {
      const res = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      })
      if (res.error) {
        // Better Auth returns a 400 when the current password is wrong.
        setError(
          res.error.status === 400
            ? t.auth.errCurrentPasswordWrong
            : t.auth.errGeneric,
        )
        return
      }
      setSuccess(true)
      setCurrent("")
      setNext("")
      setConfirm("")
    })
  }

  const inputClass =
    "w-full rounded-sm border border-border bg-background px-4 py-3 font-sans text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brass"

  return (
    <ModalShell open={open} onClose={handleClose} labelledBy="change-password-title">
      <h2
        id="change-password-title"
        className="font-serif text-2xl font-black text-foreground"
      >
        {t.auth.changePasswordTitle}
      </h2>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
        {t.auth.changePasswordSubtitle}
      </p>

      {success ? (
        <div className="mt-6">
          <p
            role="status"
            className="rounded-sm border border-brass/40 bg-brass/10 px-4 py-3 font-sans text-sm font-semibold text-foreground"
          >
            {t.auth.changePasswordSuccess}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-6 inline-flex w-full items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {t.teams.close}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
              {t.auth.currentPassword}
            </span>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
              {t.auth.newPassword}
            </span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
              {t.auth.confirmPassword}
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </label>

          {error && (
            <p role="alert" className="font-sans text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.auth.changePasswordCta}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              {t.auth.cancel}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  )
}
