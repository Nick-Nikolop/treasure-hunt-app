"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getAnonId, getSessionId, hasAnalyticsConsent, isFirstVisitThisLoad } from "@/lib/analytics-client"

const SOURCE_KEYS = ["source", "s", "utm_source", "ref", "src"] as const
// Query keys that can carry secrets (reset links, invites, auth callbacks) are never stored.
const SECRET_KEY = /token|code|secret|password|key|auth|session|otp|signature|sig/i
const FIRST_SOURCE = "th_source_first"
const LAST_SOURCE = "th_source_last"

type NavigatorExtras = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean }
  standalone?: boolean
}

function localTimestamp(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? "+" : "-"
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0")
  const local = new Date(d.getTime() + off * 60_000).toISOString().slice(0, 19)
  return `${local}${sign}${pad(off / 60)}:${pad(off % 60)}`
}

/**
 * Mounted once in the root layout. Whenever any page opens with `?source=<name>`
 * or `?s=<id>` (or utm_source / ref / src), sends one hit with the browser's details to
 * /api/source-hit — once per tab session per source + page, so reloads don't
 * inflate the count. Also remembers the device's first and latest source.
 */
export function SourceTracker() {
  const pathname = usePathname()

  useEffect(() => {
    let params: URLSearchParams
    try {
      params = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    const sourceKey = SOURCE_KEYS.find((k) => params.get(k)?.trim())
    if (!sourceKey) return
    const source = params.get(sourceKey)!.trim().slice(0, 80)

    const dedupeKey = `th_srchit:${source.toLowerCase()}:${window.location.pathname}`
    const consent = hasAnalyticsConsent()
    if (sentThisLoad.has(dedupeKey)) return
    sentThisLoad.add(dedupeKey)

    const query: Record<string, string> = {}
    params.forEach((value, key) => {
      if (key !== sourceKey && !SECRET_KEY.test(key)) query[key] = value
    })

    // Without analytics consent: count the arrival only, store nothing on the
    // device and send nothing that could single the visitor out.
    if (!consent) {
      sendHit({ source, sourceKey, path: window.location.pathname, query, referrer: document.referrer || null })
      return
    }

    try {
      if (window.sessionStorage.getItem(dedupeKey)) return
      window.sessionStorage.setItem(dedupeKey, "1")
    } catch {
      // Storage blocked: record anyway.
    }

    const isNewVisitor = isFirstVisitThisLoad()
    try {
      if (!window.localStorage.getItem(FIRST_SOURCE)) window.localStorage.setItem(FIRST_SOURCE, source)
      window.localStorage.setItem(LAST_SOURCE, source)
    } catch {
      // Storage blocked.
    }

    const nav = navigator as NavigatorExtras
    const media = (q: string) => window.matchMedia?.(q).matches ?? false
    const payload = {
      source,
      sourceKey,
      path: window.location.pathname,
      query,
      referrer: document.referrer || null,
      anonId: getAnonId(),
      sessionId: getSessionId(),
      isNewVisitor,
      language: navigator.language,
      languages: navigator.languages?.join(","),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      touch: navigator.maxTouchPoints > 0,
      colorScheme: media("(prefers-color-scheme: dark)") ? "dark" : "light",
      reducedMotion: media("(prefers-reduced-motion: reduce)"),
      connection: nav.connection?.effectiveType ?? null,
      saveData: nav.connection?.saveData ?? null,
      standalone: media("(display-mode: standalone)") || nav.standalone === true,
      localTime: localTimestamp(new Date()),
    }

    sendHit(payload)
  }, [pathname])

  return null
}

const sentThisLoad = new Set<string>()

function sendHit(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload)
  try {
    if (navigator.sendBeacon?.("/api/source-hit", new Blob([body], { type: "application/json" }))) return
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/source-hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {})
}
