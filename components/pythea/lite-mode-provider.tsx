"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

// "Lite mode" is a low-power rendering preference. When on, heavy visual work
// (3D page flips, entrance animations, film grain / scanline overlays, blurs)
// is skipped so the experience stays smooth on older phones. The preference is
// stored in localStorage and mirrored onto <html data-lite> so CSS can react.
const LITE_KEY = "pythea_lite"

type LiteModeValue = {
  /** True when low-power rendering is active. */
  lite: boolean
  setLite: (next: boolean) => void
  toggle: () => void
  /** True once the client has reconciled the stored/system preference, so UI
   *  can avoid acting on the SSR default before we know the real value. */
  ready: boolean
}

const LiteModeContext = createContext<LiteModeValue | null>(null)

function applyAttribute(lite: boolean) {
  const root = document.documentElement
  if (lite) root.dataset.lite = ""
  else delete root.dataset.lite
}

export function LiteModeProvider({ children }: { children: React.ReactNode }) {
  // Start false to match the server render, then reconcile on mount to avoid a
  // hydration mismatch.
  const [lite, setLiteState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let initial = false
    try {
      const saved = localStorage.getItem(LITE_KEY)
      if (saved === "1") initial = true
      else if (saved === "0") initial = false
      else {
        // No explicit choice yet: respect the OS "reduce motion" setting so
        // accessibility users get the calmer experience by default.
        initial = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      }
    } catch {
      // Ignore storage / matchMedia failures (private mode, old browsers).
    }
    setLiteState(initial)
    applyAttribute(initial)
    setReady(true)
  }, [])

  const setLite = useCallback((next: boolean) => {
    setLiteState(next)
    applyAttribute(next)
    try {
      localStorage.setItem(LITE_KEY, next ? "1" : "0")
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const toggle = useCallback(() => setLite(!lite), [lite, setLite])

  const value = useMemo<LiteModeValue>(
    () => ({ lite, setLite, toggle, ready }),
    [lite, setLite, toggle, ready],
  )

  return <LiteModeContext.Provider value={value}>{children}</LiteModeContext.Provider>
}

export function useLiteMode(): LiteModeValue {
  const ctx = useContext(LiteModeContext)
  if (!ctx) {
    throw new Error("useLiteMode must be used within a LiteModeProvider")
  }
  return ctx
}
