"use client"

import { useSyncExternalStore } from "react"

/**
 * "Simple view": a desktop visitor who doesn't want the interactive room gets the phone layout (stacked scenes,
 * close-up views) instead. Remembered per browser; it is a display preference, not data.
 */
const KEY = "office:simple-view"
const DESKTOP_QUERY = "(min-width: 1280px)"
const listeners = new Set<() => void>()

function readSimple() {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

let simple: boolean | null = null
const getSimple = () => (simple ??= readSimple())

export function setSimpleView(on: boolean) {
  simple = on
  try {
    if (on) localStorage.setItem(KEY, "1")
    else localStorage.removeItem(KEY)
  } catch {}
  listeners.forEach((fn) => fn())
}

export function useSimpleView() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getSimple,
    () => false,
  )
}

/** True when the interactive desktop room is shown: a wide screen and simple view off. */
export function isDesktopRoom() {
  return window.matchMedia(DESKTOP_QUERY).matches && !getSimple()
}

export function useDesktopRoom() {
  const wide = useSyncExternalStore(
    (fn) => {
      const mq = window.matchMedia(DESKTOP_QUERY)
      mq.addEventListener("change", fn)
      return () => mq.removeEventListener("change", fn)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
  const simple = useSimpleView()
  return { wide, simple, desktop: wide && !simple }
}
