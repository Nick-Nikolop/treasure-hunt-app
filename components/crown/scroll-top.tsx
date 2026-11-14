"use client"

import { useLayoutEffect } from "react"

// The page should always open at the hero, never at a restored scroll position
// (reloads, back/forward, or arriving from another page mid-scroll).
export function CrownScrollTop() {
  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = "manual"
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    return () => {
      history.scrollRestoration = previous
    }
  }, [])
  return null
}
