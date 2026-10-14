"use client"

import { useEffect, useState } from "react"
import { SPLASH_ATTR, SPLASH_MS } from "@/lib/return-splash"

const FADE_MS = 600

export function ReturnSplash() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (!root.hasAttribute(SPLASH_ATTR)) return

    setOrientation(window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape")
    root.style.overflow = "hidden"

    const elapsed = performance.now()
    const fadeTimer = window.setTimeout(() => setLeaving(true), Math.max(0, SPLASH_MS - FADE_MS - elapsed))
    const endTimer = window.setTimeout(() => {
      root.removeAttribute(SPLASH_ATTR)
      root.style.overflow = ""
    }, Math.max(0, SPLASH_MS - elapsed))

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(endTimer)
    }
  }, [])

  return (
    <div
      className="th-splash fixed inset-0 z-[100] bg-background transition-opacity ease-out"
      style={{ opacity: leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-label="The Hunt"
    >
      {orientation && (
        <video
          src={`/landing/th-loading-${orientation}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
