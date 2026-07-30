"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import QRCodeLib from "qrcode"
import { MapPin, RefreshCw, QrCode, ExternalLink, Copy, Check, Crosshair, Radio } from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { AdminScanLookup } from "@/components/pythea/admin-scan-lookup"
import { generateLocationQr, getLocationState } from "@/app/admin/actions"

type State = Awaited<ReturnType<typeof getLocationState>>
type Ping = State["pings"][number]

const POLL_MS = 4000

function gmapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function osmEmbed(lat: number, lng: number) {
  const d = 0.004
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${lat},${lng}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function AdminLocationPanel() {
  const [state, setState] = useState<State>({ token: null, link: null, pings: [] })
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [popup, setPopup] = useState<Ping | null>(null)
  const [pending, startTransition] = useTransition()
  const lastPingId = useRef<string | null>(null)
  const initialised = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getLocationState()
      setState(next)
      // Auto-open the map popup when a brand new ping arrives (but not on the
      // very first load, so opening the tab doesn't pop a stale location).
      const newest = next.pings[0]
      if (newest && newest.id !== lastPingId.current) {
        if (initialised.current) setPopup(newest)
        lastPingId.current = newest.id
      }
      initialised.current = true
    } catch {
      // Non-founder or transient error: leave state as-is.
    }
  }, [])

  // Initial load + polling for incoming pings.
  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  // Render the QR whenever the active link changes.
  useEffect(() => {
    if (!state.link) {
      setQrDataUrl(null)
      return
    }
    let active = true
    QRCodeLib.toDataURL(state.link, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => active && setQrDataUrl(url))
      .catch(() => active && setQrDataUrl(null))
    return () => {
      active = false
    }
  }, [state.link])

  function generate() {
    startTransition(async () => {
      const res = await generateLocationQr()
      if (res.ok && res.token) {
        // Reset the "seen" marker so pings on the new QR pop normally.
        lastPingId.current = null
        initialised.current = false
        await load()
      }
    })
  }

  function copyLink() {
    if (!state.link) return
    void navigator.clipboard.writeText(state.link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = "pythea-location-check.png"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Founder-only: look up where a person or crew scanned from. */}
      <AdminScanLookup />

      <div className="rounded-md border border-border bg-background/40 p-5">
        <div className="flex items-center gap-2">
          <Crosshair className="size-5 text-brass" aria-hidden />
          <h2 className="font-serif text-xl font-black text-foreground">Location check</h2>
        </div>
        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Generate a QR code, then have someone scan it. Their device asks for
          location permission and, if allowed, reports its coordinates back here.
          Returned locations appear below as they come in.
        </p>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="w-44 rounded-md border border-border bg-white p-3">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl || "/placeholder.svg"}
                  alt="Location check QR code"
                  width={256}
                  height={256}
                  className="aspect-square w-full"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center" aria-hidden>
                  <QrCode className="size-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={downloadQr}
              disabled={!qrDataUrl}
              className="font-sans text-xs font-bold tracking-chip text-brass disabled:opacity-40"
            >
              Download PNG
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={pending}
              className="inline-flex w-fit items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
              {state.token ? "Generate new QR" : "Generate QR"}
            </button>

            {state.link && (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-sm border border-border bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {state.link}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            <p className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
              <Radio className="size-3.5 animate-pulse text-brass" aria-hidden />
              Listening for pings, refreshing every {POLL_MS / 1000}s.
            </p>
          </div>
        </div>
      </div>

      {/* Running list of returned locations, newest first. */}
      <div>
        <h3 className="font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
          Pings ({state.pings.length})
        </h3>
        {state.pings.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-muted-foreground">
            No locations yet. Scan the QR from a phone to see it appear here.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {state.pings.map((p, i) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-4 sm:flex-row sm:items-center"
              >
                <div className="h-28 w-full overflow-hidden rounded-sm border border-border sm:w-44">
                  <iframe
                    title={`Map for ping ${p.id}`}
                    src={osmEmbed(p.lat, p.lng)}
                    className="h-full w-full"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-brass" aria-hidden />
                    <span className="font-mono text-sm text-foreground">
                      {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                    </span>
                    {i === 0 && (
                      <span className="rounded-full bg-brass/15 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-muted-foreground">
                    {fmtTime(p.createdAt)}
                    {p.accuracy != null ? ` · accuracy ~${Math.round(p.accuracy)} m` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPopup(p)}
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-brass"
                    >
                      <Crosshair className="size-3.5" />
                      Show on map
                    </button>
                    <a
                      href={gmapsLink(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:text-brass"
                    >
                      <ExternalLink className="size-3.5" />
                      Google Maps
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LocationPopup ping={popup} onClose={() => setPopup(null)} />
    </div>
  )
}

function LocationPopup({ ping, onClose }: { ping: Ping | null; onClose: () => void }) {
  if (!ping) return null
  return (
    <ModalShell open={!!ping} onClose={onClose} labelledBy="location-popup-title">
      <h2 id="location-popup-title" className="font-serif text-2xl font-black text-foreground">
        Returned location
      </h2>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        {fmtTime(ping.createdAt)}
        {ping.accuracy != null ? ` · accuracy ~${Math.round(ping.accuracy)} m` : ""}
      </p>

      <div className="mt-5 h-64 w-full overflow-hidden rounded-md border border-border">
        <iframe
          title="Returned location map"
          src={osmEmbed(ping.lat, ping.lng)}
          className="h-full w-full"
          loading="lazy"
        />
      </div>

      <p className="mt-4 text-center font-mono text-sm text-foreground">
        {ping.lat.toFixed(6)}, {ping.lng.toFixed(6)}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <a
          href={gmapsLink(ping.lat, ping.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5"
        >
          <ExternalLink className="size-4" />
          Open in Google Maps
        </a>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
        >
          Close
        </button>
      </div>
    </ModalShell>
  )
}
