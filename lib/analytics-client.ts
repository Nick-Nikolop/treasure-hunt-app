"use client"

// ─────────────────────────────────────────────────────────────────────────
//  Client-side analytics.
//
//  A tiny singleton that any client component can call: `track("cta.click",
//  { id })`. Events are queued and flushed in batches to POST /api/track using
//  fetch keepalive (and navigator.sendBeacon when the page is being unloaded),
//  so tracking never blocks the UI and survives navigations.
//
//  Identity:
//   - anonId    persistent per-browser id in localStorage (anonymous).
//   - sessionId per-tab-session id in sessionStorage (resets on a new session).
//  The signed-in user is resolved server-side from the session cookie, so we
//  never send (or trust) a user id from here.
// ─────────────────────────────────────────────────────────────────────────

const ANON_KEY = "pythea_aid"
const SESSION_KEY = "pythea_sid"
const ENDPOINT = "/api/track"
const FLUSH_DELAY = 4000 // ms to coalesce events before sending
const MAX_QUEUE = 25 // flush immediately once the queue reaches this size

type QueuedEvent = {
  name: string
  category?: string
  path?: string
  referrer?: string
  device?: string
  browser?: string
  os?: string
  sessionId?: string
  anonId?: string
  durationMs?: number
  props?: Record<string, unknown>
}

let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

const isBrowser = () => typeof window !== "undefined"

function uid(): string {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Persistent anonymous id (localStorage). Stable across sessions. */
export function getAnonId(): string {
  if (!isBrowser()) return ""
  try {
    let id = window.localStorage.getItem(ANON_KEY)
    if (!id) {
      id = uid()
      window.localStorage.setItem(ANON_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

/** Per-session id (sessionStorage). Returns the id and whether it was just created. */
function getSession(): { id: string; isNew: boolean } {
  if (!isBrowser()) return { id: "", isNew: false }
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = uid()
      window.sessionStorage.setItem(SESSION_KEY, id)
      return { id, isNew: true }
    }
    return { id, isNew: false }
  } catch {
    return { id: uid(), isNew: false }
  }
}

export function getSessionId(): string {
  return getSession().id
}

/**
 * The campaign token that brought this device in, if any (set by /c/<token> as
 * the readable `cmp_src` cookie). Lets conversions be attributed to a source.
 */
function getCampaignSource(): string | undefined {
  if (!isBrowser()) return undefined
  try {
    const m = document.cookie.match(/(?:^|;\s*)cmp_src=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : undefined
  } catch {
    return undefined
  }
}

/** Coarse device class from the UA / touch heuristics. */
function detectDevice(): string {
  if (!isBrowser()) return "unknown"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("ipad") || (ua.includes("tablet") && !ua.includes("mobile"))) return "tablet"
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) return "mobile"
  return "desktop"
}

function detectBrowser(): string {
  if (!isBrowser()) return "Unknown"
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return "Edge"
  if (/OPR\/|Opera/.test(ua)) return "Opera"
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome"
  if (/Firefox\//.test(ua)) return "Firefox"
  if (/Safari\//.test(ua)) return "Safari"
  return "Other"
}

function detectOS(): string {
  if (!isBrowser()) return "Unknown"
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS"
  if (/Android/.test(ua)) return "Android"
  if (/Windows/.test(ua)) return "Windows"
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS"
  if (/Linux/.test(ua)) return "Linux"
  return "Other"
}

function send(events: QueuedEvent[], useBeacon: boolean) {
  if (events.length === 0) return
  const payload = JSON.stringify({ events })
  try {
    if (useBeacon && isBrowser() && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" })
      navigator.sendBeacon(ENDPOINT, blob)
      return
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Swallow: analytics must never throw into the UI.
  }
}

/** Flush the queue now. `useBeacon` is set when the page is unloading. */
export function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (queue.length === 0) return
  const batch = queue
  queue = []
  send(batch, useBeacon)
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => flush(false), FLUSH_DELAY)
}

function bindLifecycleListeners() {
  if (listenersBound || !isBrowser()) return
  listenersBound = true
  // Flush whatever is queued when the tab is hidden or unloaded.
  const onHide = () => {
    if (document.visibilityState === "hidden") flush(true)
  }
  document.addEventListener("visibilitychange", onHide)
  window.addEventListener("pagehide", () => flush(true))
}

/**
 * Track an event. Safe to call anywhere (no-op during SSR). Events are queued
 * and flushed in batches; `props` should be small, JSON-serialisable data.
 */
export function track(
  name: string,
  props?: Record<string, unknown>,
  opts?: { category?: string; durationMs?: number },
) {
  if (!isBrowser()) return
  bindLifecycleListeners()
  // Auto-attribute to the campaign that brought this device in, when present,
  // so any event (sign-up, first solve, ...) can be credited to its source.
  const source = getCampaignSource()
  const enrichedProps =
    source !== undefined ? { ...(props ?? {}), campaignSource: source } : props
  queue.push({
    name,
    category: opts?.category,
    durationMs: opts?.durationMs,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    device: detectDevice(),
    browser: detectBrowser(),
    os: detectOS(),
    sessionId: getSessionId(),
    anonId: getAnonId(),
    props: enrichedProps,
  })
  if (queue.length >= MAX_QUEUE) flush(false)
  else scheduleFlush()
}

/** Convenience for timing events: track with a durationMs payload. */
export function trackTiming(
  name: string,
  durationMs: number,
  props?: Record<string, unknown>,
  category?: string,
) {
  track(name, props, { durationMs, category })
}

/**
 * Ensure a session id exists and, the first time a session is created, emit a
 * one-off `session.start` event (with the device profile). Call once on mount.
 */
export function ensureSession(startEventName: string) {
  if (!isBrowser()) return
  const { isNew } = getSession()
  if (isNew) {
    track(startEventName, {
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOS(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
    })
  }
}
