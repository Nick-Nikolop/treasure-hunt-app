"use client"

import { useEffect, useState } from "react"
import QRCodeLib from "qrcode"
import { QrCode, Copy, Check, RefreshCw, Download, X, Loader2 } from "lucide-react"
import type { ClueTokenRow } from "@/lib/hunt"

/**
 * Per-lead QR block, shown inside a lead's editor (and as the standalone finish
 * card). Surfaces everything the old QR codes tab did — the scan link, a
 * downloadable QR preview, copy-to-clipboard, and regenerate — scoped to one
 * lead. The QR image is drawn in the browser from the live link, so it always
 * matches the current (possibly regenerated) token.
 */
export function LeadQrBlock({
  token,
  hideAt,
  unlocks,
  unlocksShort,
  pending,
  onRegenerate,
}: {
  token: ClueTokenRow | null
  /** Where this QR is physically hidden (this card's own stop). */
  hideAt: string
  /** What scanning it unlocks, e.g. "Lead 02 · Poland" or "the Compass". */
  unlocks: string
  /** Short form of the same, used on the regenerate button. */
  unlocksShort: string
  pending: boolean
  onRegenerate: () => void
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

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

        {confirmRegen ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmRegen(false)
                onRegenerate()
              }}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <RefreshCw className="size-3.5" />
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmRegen(false)}
              className="font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/50 px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
          >
            <RefreshCw className="size-3.5" />
            Regenerate {unlocksShort} QR
          </button>
        )}
      </div>

      {confirmRegen && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
          This replaces the <span className="font-bold text-foreground">{unlocksShort}</span> QR
          link. Any copy already printed from the old one stops working, so you would need to reprint
          and re-hide it.
        </p>
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
