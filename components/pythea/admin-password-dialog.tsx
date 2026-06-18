"use client"

import { useEffect, useState } from "react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { adminSetPassword } from "@/app/admin/actions"

/** Admin-only password reset for a target user. */
export function AdminPasswordDialog({
  open,
  onClose,
  target,
}: {
  open: boolean
  onClose: () => void
  target: { id: string; email: string } | null
}) {
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Reset internal state whenever the dialog opens for a new target.
  useEffect(() => {
    if (open) {
      setPassword("")
      setError(null)
      setDone(false)
      setPending(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setPending(true)
    setError(null)
    const res = await adminSetPassword(target.id, password)
    setPending(false)
    if (res.ok) {
      setDone(true)
    } else {
      setError(res.error === "too_short" ? "Password must be at least 8 characters." : "Could not update the password.")
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="admin-pw-title">
      <h2 id="admin-pw-title" className="font-serif text-2xl font-black text-foreground">
        Reset password
      </h2>
      {target && (
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          For <span className="font-bold text-foreground">{target.email}</span>
        </p>
      )}

      {done ? (
        <div className="mt-6">
          <p className="text-pretty font-serif leading-relaxed text-foreground">
            Password updated. Their existing sessions were signed out, so they will need to log in
            again with the new password.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-7 inline-flex w-full items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <label className="block font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
            New password
          </label>
          <input
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
          {error && <p className="mt-2 font-sans text-sm text-destructive">{error}</p>}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving..." : "Set password"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  )
}
