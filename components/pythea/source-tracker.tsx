"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getAnonId, getSessionId, isFirstVisitThisLoad } from "@/lib/analytics-client"

const SOURCE_KEYS = ["source", "utm_source", "ref", "src"] as const
// Query keys that can carry secrets (reset links, invites, auth callbacks) are never stored.
const SECRET_KEY = /token|code|secret|password|key|auth|session|otp|signature|sig/i
const FIRST_SOURCE = "th_source_first"
const LAST_SOURCE = "th_source_last"

type NavigatorExtras = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean }
  deviceMemory?: number
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
 * (or utm_source / ref / src), sends one hit with the browser's details to
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

    const query: Record<string, string> = {}
    params.forEach((value, key) => {
      if (key !== sourceKey && !SECRET_KEY.test(key)) query[key] = value
    })

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
      deviceMemory: nav.deviceMemory ?? null,
      cpuCores: navigator.hardwareConcurrency ?? null,
      standalone: media("(display-mode: standalone)") || nav.standalone === true,
      localTime: localTimestamp(new Date()),
    }

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
  }, [pathname])

  return null
}
