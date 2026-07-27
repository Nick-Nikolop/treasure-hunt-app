"use client"

import { useEffect, useState } from "react"
import QRCodeLib from "qrcode"
import { QrCode, Copy, Check, Download, X, Loader2, Lock, Pencil, AlertTriangle } from "lucide-react"
import type { ClueTokenRow } from "@/lib/hunt"

/**
 * Per-lead QR block, shown inside a lead's editor (and on the compass card).
 * Shows the scan link, a downloadable QR preview and copy-to-clipboard.
 *
 * There is NO random regeneration. The link changes only when an admin types a
 * new slug into "Edit link", which is validated for shape and rejected if any
 * other QR already resolves to the same URL. The QR image is drawn in the
 * browser from the live link, so editing the slug redraws it automatically.
 */
export function LeadQrBlock({
  token,
  hideAt,
  unlocks,
  pending,
  onSaveToken,
}: {
  token: ClueTokenRow | null
  /** Where this QR is physically hidden (this card's own stop). */
  hideAt: string
  /** What scanning it unlocks, e.g. "Lead 02 · Poland" or "the Compass". */
  unlocks: string
  pending: boolean
  /** Persist an admin-typed slug. `done(null)` on success, `done(message)` on failure. */
  onSaveToken: (slug: string, done: (error: string | null) => void) => void
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <Shell>
        <Header hideAt={hideAt} unlocks={unlocks} />
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
          No QR link has been generated for {unlocks} yet.
        </p>
      </Shell>
    )
  }

  const orderLabel = token.isFinish
    ? "FIN"
    : token.isCompass
      ? "CMP"
      : String(token.leadOrder).padStart(2, "0")
  const title = token.isFinish ? "Treasure" : token.isCompass ? "Compass" : `Lead ${orderLabel}`

  // The fixed part of the scan link, e.g. "https://…/q/". Only the last
  // segment is editable, so the domain and route can never be broken here.
  const prefix = token.link.slice(0, token.link.lastIndexOf("/") + 1)
  const current = token.token

  // Mirrors the server-side rule so a typo is caught before a round trip.
  const SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,62}[a-z0-9]$/

  function cancel() {
    setEditing(false)
    setError(null)
  }

  function save() {
    const next = slug.trim().toLowerCase()
    if (next === current) return cancel()
    if (!SLUG_RE.test(next)) {
      setError(
        "Use 4-64 characters: letters, numbers, hyphens or underscores, starting and ending with a letter or number.",
      )
      return
    }
    onSaveToken(next, (err) => {
      if (err) setError(err)
      else {
        setEditing(false)
        setError(null)
      }
    })
  }

  async function copy() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can fail in embedded contexts; ignore silently.
    }
  }

  return (
    <Shell>
      <Header hideAt={hideAt} unlocks={unlocks} />
      {editing ? (
        <div className="mt-2">
          <label
            htmlFor={`${token.leadId}-slug`}
            className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground"
          >
            Scan link
          </label>
          <div className="mt-1 flex items-stretch rounded-sm border border-border bg-background focus-within:border-brass">
            <span className="hidden shrink-0 items-center pl-2.5 font-mono text-xs text-muted-foreground sm:flex">
              {prefix}
            </span>
            <input
              id={`${token.leadId}-slug`}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) save()
                if (e.key === "Escape") cancel()
              }}
              disabled={pending}
              autoComplete="off"
              spellCheck={false}
              placeholder="athens-01"
              aria-invalid={error ? true : undefined}
              className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {error ? (
            <p className="mt-1.5 flex items-start gap-1.5 font-sans text-[11px] leading-relaxed text-destructive">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{error}</span>
            </p>
          ) : (
            <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
              Letters, numbers, hyphens and underscores. 4-64 characters, lowercased. Must be unique
              across every QR.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !slug.trim() || slug.trim().toLowerCase() === current}
              className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save link
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 truncate rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
            {token.link}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
            >
              <QrCode className="size-3.5" />
              Show QR code
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
            >
              {copied ? <Check className="size-3.5 text-brass" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSlug(current)
                setError(null)
                setEditing(true)
              }}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
            >
              <Pencil className="size-3.5" />
              Edit link
            </button>
          </div>

          <p className="mt-2 flex items-start gap-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            <span>
              This link only changes when you edit it here. Nothing regenerates it on its own, so a
              printed copy keeps working. Changing it does replace the QR image, so reprint and
              re-hide it.
            </span>
          </p>
        </>
      )}

      <LeadQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        link={token.link}
        orderLabel={orderLabel}
        title={title}
        isFinish={token.isFinish}
        hideAt={hideAt}
        unlocks={unlocks}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-sm border border-border bg-background/40 p-3.5">{children}</div>
}

function Header({ hideAt, unlocks }: { hideAt: string; unlocks: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <QrCode className="size-4 text-brass" />
        <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-foreground">
          QR to hide here
        </span>
      </div>
      <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
        Print this and hide it at <span className="font-bold text-foreground">{hideAt}</span>.
        Scanning it unlocks <span className="font-bold text-foreground">{unlocks}</span>.
      </p>
    </div>
  )
}

/** Renders the scan link as a downloadable QR image in a lightweight modal. */
function LeadQrModal({
  open,
  onClose,
  link,
  orderLabel,
  title,
  isFinish,
  hideAt,
  unlocks,
}: {
  open: boolean
  onClose: () => void
  link: string
  orderLabel: string
  title: string
  isFinish: boolean
  hideAt: string
  unlocks: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setDataUrl(null)
    QRCodeLib.toDataURL(link, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [open, link])

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  function download() {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = isFinish ? "pythea-finish.png" : `pythea-lead-${orderLabel}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <h2 id="lead-qr-title" className="font-serif text-2xl font-black text-foreground">
          {title} QR code
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Print this and hide it at <span className="font-bold text-foreground">{hideAt}</span>.
          Scanning it unlocks <span className="font-bold text-foreground">{unlocks}</span>.
          {isFinish
            ? " That is the finish: it records each crew's placement, and crews keep finishing after."
            : ""}
        </p>

        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[15rem] rounded-md border border-border bg-white p-3">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl || "/placeholder.svg"}
                alt={`QR code for ${title}`}
                width={256}
                height={256}
                className="aspect-square w-full"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center" aria-hidden>
                <Loader2 className="size-8 animate-spin text-muted-foreground/40" />
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 break-all text-center font-mono text-[11px] text-muted-foreground">
          {link}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={download}
            disabled={!dataUrl}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Download className="size-4" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
