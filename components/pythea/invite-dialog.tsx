"use client"

import { useEffect, useState, useTransition } from "react"
import QRCode from "qrcode"
import { Check, Copy, Link2, RefreshCw } from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { useI18n } from "@/components/pythea/language-provider"
import { regenerateInvite } from "@/app/teams/actions"

/**
 * Invite dialog: shows the shareable join link, a QR code for it, and a
 * one-tap copy. Owners can regenerate the link, which invalidates the old one.
 * The link is built from the live origin so it works in preview and production
 * without hardcoding a domain.
 */
export function InviteDialog({
  open,
  onClose,
  inviteCode,
  canRegenerate,
}: {
  open: boolean
  onClose: () => void
  inviteCode: string
  canRegenerate: boolean
}) {
  const { t } = useI18n()
  const [origin, setOrigin] = useState("")
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin)
  }, [])

  const link = origin ? `${origin}/teams/join/${inviteCode}` : ""

  // Regenerate the QR whenever the link changes.
  useEffect(() => {
    if (!open || !link) return
    let active = true
    QRCode.toDataURL(link, {
      width: 320,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQr(url)
      })
      .catch(() => {
        if (active) setQr(null)
      })
    return () => {
      active = false
    }
  }, [open, link])

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can fail in some embedded contexts; ignore silently.
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateInvite()
      // The server revalidates /teams; the parent re-renders with the new code,
      // which flows back in as a new `inviteCode` prop and refreshes the QR.
    })
  }

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="invite-title">
      <h2 id="invite-title" className="font-serif text-2xl font-black text-foreground">
        {t.teams.inviteTitle}
      </h2>
      <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
        {t.teams.inviteSubtitle}
      </p>

      {/* QR */}
      <div className="mt-6 flex justify-center">
        <div className="rounded-md border border-border bg-white p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr || "/placeholder.svg"} alt={t.teams.qrAlt} width={200} height={200} className="size-48" />
          ) : (
            <div className="flex size-48 items-center justify-center" aria-hidden>
              <span className="size-8 animate-pulse rounded-full border border-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>

      {/* Link + copy */}
      <label className="mt-6 block font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
        {t.teams.inviteLinkLabel}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-border bg-background px-3 py-2.5">
          <Link2 className="size-4 shrink-0 text-brass" />
          <span className="truncate font-mono text-sm text-foreground">{link}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t.teams.copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 py-2.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          {copied ? <Check className="size-4 text-brass" /> : <Copy className="size-4" />}
          {copied ? t.teams.copied : t.teams.copy}
        </button>
      </div>

      {/* Code (readable fallback) */}
      <p className="mt-3 font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
        {t.teams.inviteCodeLabel}:{" "}
        <span className="font-mono text-sm tracking-widest text-foreground">{inviteCode}</span>
      </p>

      <div className="mt-7 flex items-center justify-between gap-3">
        {canRegenerate ? (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={pending}
            className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass disabled:opacity-50"
            title={t.teams.regenerateHint}
          >
            <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
            {t.teams.regenerate}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-sm bg-brass px-6 py-2.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          {t.teams.close}
        </button>
      </div>
    </ModalShell>
  )
}
