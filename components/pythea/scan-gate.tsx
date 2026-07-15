"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MapPin, LocateFixed, Loader2, Navigation, XCircle, RotateCw, ShieldQuestion, BookOpen } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { ScanResult } from "@/components/pythea/scan-result"
import { verifyScan } from "@/app/q/[token]/actions"
import type { UnlockResult } from "@/lib/hunt"

type GateState =
  | { phase: "intro" }
  | { phase: "checking" }
  | { phase: "result"; result: UnlockResult }
  | { phase: "too_far"; distanceM: number; radiusM: number }
  | { phase: "denied"; unsupported?: boolean }

/**
 * The location gate shown before a real in-order unlock. The explorer proves
 * they are at the mark by sharing their position, which is sent to the server
 * for a one-off distance check and never stored. Superadmins get a skip button
 * so a denied/unavailable location never blocks them during the event.
 */
export function ScanGate({
  token,
  isSuperAdmin,
}: {
  token: string
  isSuperAdmin: boolean
}) {
  const { t } = useI18n()
  const g = t.scan.gate
  const [state, setState] = useState<GateState>({ phase: "intro" })
  const [busy, setBusy] = useState(false)

  // Send whatever payload (coords or admin-skip) to the server and route the
  // response into the right card. The server does the real unlock.
  async function submit(payload: { lat: number; lng: number } | { skip: true }) {
    setBusy(true)
    try {
      const resp = await verifyScan(token, payload)
      if (resp.ok) {
        setState({ phase: "result", result: resp.result })
      } else if (resp.reason === "too_far") {
        setState({ phase: "too_far", distanceM: resp.distanceM, radiusM: resp.radiusM })
      } else if (resp.reason === "auth") {
        window.location.href = `/sign-in?redirect=/q/${encodeURIComponent(token)}`
      } else {
        // forbidden_skip: the caller isn't actually a superadmin.
        setState({ phase: "denied" })
      }
    } catch {
      setState({ phase: "denied" })
    } finally {
      setBusy(false)
    }
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ phase: "denied", unsupported: true })
      return
    }
    setState({ phase: "checking" })
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void submit({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setBusy(false)
        setState({ phase: "denied" })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  if (state.phase === "result") {
    return <ScanResult result={state.result} />
  }

  const adminSkip = isSuperAdmin ? (
    <button
      type="button"
      onClick={() => void submit({ skip: true })}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
    >
      <ShieldQuestion className="size-4" />
      {g.adminSkip}
    </button>
  ) : null

  // Resolve the card content for the current phase.
  const view = (() => {
    switch (state.phase) {
      case "checking":
        return {
          icon: <Loader2 className="size-9 animate-spin text-brass" aria-hidden />,
          label: g.label,
          title: g.checking,
          body: g.privacy,
          actions: null,
        }
      case "too_far":
        return {
          icon: <Navigation className="size-9 text-brass" aria-hidden />,
          label: g.tooFarLabel,
          title: g.tooFarTitle,
          body: g.tooFarBody,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <RotateCw className="size-4" />
                {g.retry}
              </button>
              {adminSkip}
            </>
          ),
        }
      case "denied":
        return {
          icon: <XCircle className="size-9 text-muted-foreground" aria-hidden />,
          label: g.deniedLabel,
          title: g.deniedTitle,
          body: `${state.unsupported ? g.unsupported : g.deniedBody}${
            isSuperAdmin ? "" : `\n\n${g.altNotImplemented}`
          }`,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <RotateCw className="size-4" />
                {g.retry}
              </button>
              {adminSkip}
              {!isSuperAdmin && (
                <Link
                  href="/journal"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  <BookOpen className="size-4" />
                  {t.scan.openJournal}
                </Link>
              )}
            </>
          ),
        }
      case "intro":
      default:
        return {
          icon: <MapPin className="size-9 text-brass" aria-hidden />,
          label: g.label,
          title: g.title,
          body: `${g.body}\n\n${g.privacy}`,
          actions: (
            <>
              <button
                type="button"
                onClick={requestLocation}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <LocateFixed className="size-4" />
                {g.cta}
              </button>
              {adminSkip}
            </>
          ),
        }
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-sm border border-brass bg-card/60 px-6 py-9 text-center md:px-8 md:py-11"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
        {view.icon}
      </div>

      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">{view.label}</p>
      <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
        {view.title}
      </h1>
      <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-pretty font-serif text-base leading-relaxed text-muted-foreground md:text-lg">
        {view.body}
      </p>

      {view.actions && (
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {view.actions}
        </div>
      )}

      {isSuperAdmin && state.phase === "intro" && (
        <p className="mt-4 font-sans text-[10px] tracking-chip text-muted-foreground/60">
          {g.adminHint}
        </p>
      )}
    </motion.div>
  )
}
