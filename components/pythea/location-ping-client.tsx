"use client"

import { useCallback, useEffect, useState } from "react"
import { MapPin, Loader2, Check, TriangleAlert } from "lucide-react"

type Status = "idle" | "locating" | "sending" | "done" | "denied" | "error"

export function LocationPingClient({ token, valid }: { token: string; valid: boolean }) {
  const [status, setStatus] = useState<Status>("idle")
  const [accuracy, setAccuracy] = useState<number | null>(null)

  const send = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setStatus("error")
      return
    }
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setAccuracy(pos.coords.accuracy ?? null)
        setStatus("sending")
        try {
          const res = await fetch("/api/location-ping", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              token,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            }),
          })
          setStatus(res.ok ? "done" : "error")
        } catch {
          setStatus("error")
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error")
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }, [token])

  // Ask straight away when the page opens with a valid token.
  useEffect(() => {
    if (valid) void send()
  }, [valid, send])

  if (!valid) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <TriangleAlert className="size-10 text-brass" aria-hidden />
          <h1 className="font-serif text-2xl font-black text-foreground">Invalid link</h1>
          <p className="max-w-sm font-sans text-sm text-muted-foreground">
            This code is not active. Ask for a fresh one and try again.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-brass/40 bg-brass/10">
          {status === "done" ? (
            <Check className="size-8 text-brass" aria-hidden />
          ) : status === "denied" || status === "error" ? (
            <TriangleAlert className="size-8 text-brass" aria-hidden />
          ) : status === "locating" || status === "sending" ? (
            <Loader2 className="size-8 animate-spin text-brass" aria-hidden />
          ) : (
            <MapPin className="size-8 text-brass" aria-hidden />
          )}
        </div>

        <h1 className="font-serif text-2xl font-black text-foreground">
          {status === "done"
            ? "Location shared"
            : status === "denied"
              ? "Location blocked"
              : status === "error"
                ? "Something went wrong"
                : "Sharing your location"}
        </h1>

        <p className="max-w-sm font-sans text-sm leading-relaxed text-muted-foreground">
          {status === "done"
            ? "Thanks. Your location has been sent back. You can close this page."
            : status === "denied"
              ? "You blocked the location request. Enable location for this site in your browser, then tap Try again."
              : status === "error"
                ? "Your device could not share a location. Tap Try again."
                : status === "sending"
                  ? "Sending your coordinates…"
                  : "Please allow location access when your browser asks."}
        </p>

        {status === "done" && accuracy != null && (
          <p className="font-mono text-[11px] text-muted-foreground">
            {`accuracy ~${Math.round(accuracy)} m`}
          </p>
        )}

        {(status === "denied" || status === "error") && (
          <button
            type="button"
            onClick={() => void send()}
            className="inline-flex items-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5"
          >
            <MapPin className="size-4" />
            Try again
          </button>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-background/70 p-8 backdrop-blur">
        {children}
      </div>
    </div>
  )
}
