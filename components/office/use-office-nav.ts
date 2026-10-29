"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

export const VIEWS = ["case-002", "case-001", "how", "map", "records", "trailer", "contact"] as const
export type OfficeView = (typeof VIEWS)[number]
export type RecordsTab = "faq" | "code"

export type OfficeState = { view: OfficeView | null; archive: boolean; tab: RecordsTab }

const NAV_EVENT = "office:nav"

export function parseState(search: string): OfficeState {
  const params = new URLSearchParams(search)
  const raw = params.get("view")
  const view = (VIEWS as readonly string[]).includes(raw ?? "") ? (raw as OfficeView) : null
  // The archived dossier always sits on top of the opened archive.
  const archive = params.get("archive") === "open" || view === "case-001"
  const tab = params.get("tab") === "code" ? "code" : "faq"
  return { view, archive, tab }
}

export function toSearch(state: Partial<OfficeState>): string {
  const params = new URLSearchParams()
  if (state.view) params.set("view", state.view)
  if (state.archive || state.view === "case-001") params.set("archive", "open")
  if (state.view === "records" && state.tab === "code") params.set("tab", "code")
  const query = params.toString()
  return query ? `?${query}` : ""
}

/** Where each view returns to. Nested: archived dossier → open archive → office. */
export function parentOf(state: OfficeState): OfficeState {
  if (state.view === "case-001") return { view: null, archive: true, tab: "faq" }
  if (state.view) return { view: null, archive: state.archive, tab: "faq" }
  return { view: null, archive: false, tab: "faq" }
}

// In-site history, so "back" can use the browser's own history when we created the entry,
// and fall back to replacing the URL on a direct deep link (no broken Back button).
let stack: string[] | null = null

function ensureStack() {
  if (!stack) stack = [window.location.search]
  return stack
}

function subscribe(onChange: () => void) {
  ensureStack()
  const onPop = () => {
    const s = ensureStack()
    const now = window.location.search
    const i = s.length > 1 ? s.lastIndexOf(now, s.length - 2) : -1
    if (i >= 0) s.length = i + 1
    else s.push(now)
    onChange()
  }
  window.addEventListener("popstate", onPop)
  window.addEventListener(NAV_EVENT, onChange)
  return () => {
    window.removeEventListener("popstate", onPop)
    window.removeEventListener(NAV_EVENT, onChange)
  }
}

function write(search: string, mode: "push" | "replace") {
  const s = ensureStack()
  const url = `${window.location.pathname}${search}${window.location.hash}`
  if (mode === "push") {
    window.history.pushState(null, "", url)
    s.push(search)
  } else {
    window.history.replaceState(null, "", url)
    s[s.length - 1] = search
  }
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function useOfficeNav() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  )
  const state = useMemo(() => parseState(search), [search])

  const go = useCallback((next: Partial<OfficeState>, mode: "push" | "replace" = "push") => {
    const target = toSearch(next)
    if (target === window.location.search) return
    write(target, mode)
  }, [])

  /** Return to the parent of the current state, reusing browser history when possible. */
  const back = useCallback(() => {
    const current = parseState(window.location.search)
    const target = toSearch(parentOf(current))
    const s = ensureStack()
    if (s.length > 1 && s[s.length - 2] === target) window.history.back()
    else write(target, "replace")
  }, [])

  /** Straight back to the room, whatever the depth. */
  const home = useCallback(() => {
    const s = ensureStack()
    const steps = s.length - 1 - s.lastIndexOf("")
    if (s.includes("") && steps > 0 && steps < s.length) window.history.go(-steps)
    else write("", "replace")
  }, [])

  return { state, go, back, home }
}
