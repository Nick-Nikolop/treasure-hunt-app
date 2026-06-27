"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { track, ensureSession, flush } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

// Mounted once in the root layout. Handles the "automatic" analytics that
// don't belong to any single component:
//   - session.start  once per browsing session (with the device profile)
//   - page.view      on every route change
//   - page.leave     with time-on-page when leaving a route
// Everything else is tracked explicitly via `track(...)` from components.
//
// We intentionally key off the pathname only (not search params): query strings
// can carry tokens, and a Suspense boundary would be required to read them here.
export function AnalyticsProvider() {
  const pathname = usePathname()
  const enteredAt = useRef<number>(Date.now())
  const lastPath = useRef<string | null>(null)

  // One-time: start (or resume) the session.
  useEffect(() => {
    ensureSession(EV.sessionStart)
  }, [])

  // Page view + time-on-page accounting on every pathname change.
  useEffect(() => {
    const now = Date.now()
    // Emit a leave event for the previous path with its dwell time.
    if (lastPath.current && lastPath.current !== pathname) {
      track(EV.pageLeave, { from: lastPath.current }, {
        category: "page",
        durationMs: now - enteredAt.current,
      })
    }
    enteredAt.current = now
    lastPath.current = pathname
    track(EV.pageView, { path: pathname }, { category: "page" })
  }, [pathname])

  // Final leave event (and flush) when the tab is hidden/unloaded.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        track(EV.pageLeave, { from: lastPath.current ?? pathname }, {
          category: "page",
          durationMs: Date.now() - enteredAt.current,
        })
        flush(true)
      }
    }
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
  }, [pathname])

  return null
}
