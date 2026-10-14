"use client"

import { useEffect, useState } from "react"
import { SPLASH_ATTR, SPLASH_MS } from "@/lib/return-splash"

const FADE_MS = 600

export function ReturnSplash() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (!root.hasAttribute(SPLASH_ATTR)) return

    setOrientation(window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape")
    root.style.overflow = "hidden"

    // Fallback if the video never starts (data saver, blocked autoplay).
    const cap = window.setTimeout(() => setLeaving(true), SPLASH_MS + 4000)
    return () => clearTimeout(cap)
  }, [])

  // The 5s are counted from the first rendered frame, so a slow phone
  // connection doesn't eat into the time the video is actually on screen.
  useEffect(() => {
    if (!playing) return
    const fadeTimer = window.setTimeout(() => setLeaving(true), SPLASH_MS - FADE_MS)
    return () => clearTimeout(fadeTimer)
  }, [playing])

  useEffect(() => {
    if (!leaving) return
    const root = document.documentElement
    const endTimer = window.setTimeout(() => {
      root.removeAttribute(SPLASH_ATTR)
      root.style.overflow = ""
    }, FADE_MS)
    return () => clearTimeout(endTimer)
  }, [leaving])

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
          onPlaying={() => setPlaying(true)}
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
