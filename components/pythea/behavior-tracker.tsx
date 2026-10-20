"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

// Mounted once in the root layout next to AnalyticsProvider. Auto-captures what
// people do on every page so their journey can be replayed in /analytics:
//   - ui.click     every button / link / tab press: its visible label and, for
//                  links, where it goes (path only, never the query string)
//   - page.scroll  25 / 50 / 75 / 100 % depth milestones, once per page view
//   - app.error    front-end crashes (no personal data)
// Without analytics consent clicks and scroll are still counted, but fully
// anonymously: track() sends no device/session id and the server strips any
// identifier, so they only feed aggregate totals. With consent they also join
// the visitor's journey. Nothing typed into inputs is ever read. Add `data-no-track` to any element to
// exclude it and its children, or `data-track="name"` to give it a stable label.

const CLICKABLE = 'a,button,[role="button"],[role="tab"],[role="menuitem"],[role="option"],[data-track],summary'
const DEPTHS = [25, 50, 75, 100] as const
const MAX_ERRORS = 5

function labelOf(el: Element): string {
  const explicit = el.getAttribute("data-track") || el.getAttribute("aria-label") || el.getAttribute("title")
  const text = explicit || (el as HTMLElement).innerText || el.textContent || ""
  return text.replace(/\s+/g, " ").trim().slice(0, 80) || el.tagName.toLowerCase()
}

function hrefOf(el: Element): string | undefined {
  if (!(el instanceof HTMLAnchorElement) || !el.href) return undefined
  try {
    const url = new URL(el.href)
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.protocol.slice(0, -1)
    return url.origin === window.location.origin ? url.pathname : url.hostname
  } catch {
    return undefined
  }
}

export function BehaviorTracker() {
  const pathname = usePathname()
  const sentDepths = useRef(new Set<number>())

  useEffect(() => {
    let last = { label: "", at: 0 }
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (!target || target.closest("[data-no-track]")) return
      const el = target.closest(CLICKABLE)
      if (!el) return
      const label = labelOf(el)
      const now = Date.now()
      if (label === last.label && now - last.at < 400) return
      last = { label, at: now }
      const href = hrefOf(el)
      track(EV.uiClick, { label, el: el.tagName.toLowerCase(), ...(href ? { href } : {}) }, { category: "engagement" })
    }
    document.addEventListener("click", onClick, { capture: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [])

  useEffect(() => {
    sentDepths.current = new Set()
    let frame = 0
    const measure = () => {
      frame = 0
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable < 120) return
      const pct = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100
      for (const depth of DEPTHS) {
        if (pct >= depth - 2 && !sentDepths.current.has(depth)) {
          sentDepths.current.add(depth)
          track(EV.pageScroll, { depth, path: pathname }, { category: "engagement" })
        }
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pathname])

  useEffect(() => {
    let count = 0
    const report = (message: string, file?: string) => {
      if (count >= MAX_ERRORS || !message) return
      count++
      track(EV.appError, { message: message.slice(0, 200), ...(file ? { file: file.split("/").pop()?.slice(0, 80) } : {}) }, { category: "general" })
    }
    const onError = (e: ErrorEvent) => report(e.message, e.filename)
    const onRejection = (e: PromiseRejectionEvent) =>
      report(e.reason instanceof Error ? e.reason.message : String(e.reason ?? "Unhandled rejection"))
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
