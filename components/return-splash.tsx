"use client"

import { useEffect, useState } from "react"
import { LAST_SEEN_KEY, SPLASH_ATTR } from "@/lib/return-splash"

const SHOW_MS = 3000
const MAX_MS = 6000
const FADE_MS = 600

export function ReturnSplash() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const touch = () => {
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
      } catch {}
    }
    window.addEventListener("pagehide", touch)
    document.addEventListener("visibilitychange", touch)

    const root = document.documentElement
    const cleanupListeners = () => {
      window.removeEventListener("pagehide", touch)
      document.removeEventListener("visibilitychange", touch)
    }
    if (!root.hasAttribute(SPLASH_ATTR)) return cleanupListeners

    const query = window.matchMedia("(orientation: portrait)")
    setOrientation(query.matches ? "portrait" : "landscape")
    root.style.overflow = "hidden"

    const started = performance.now()
    let done = false
    const timers: number[] = []
    const finish = () => {
      if (done) return
      done = true
      const wait = Math.max(0, SHOW_MS - (performance.now() - started))
      timers.push(
        window.setTimeout(() => {
          setLeaving(true)
          timers.push(
            window.setTimeout(() => {
              root.removeAttribute(SPLASH_ATTR)
              root.style.overflow = ""
            }, FADE_MS),
          )
        }, wait),
      )
    }
    timers.push(window.setTimeout(finish, MAX_MS))
    if (document.readyState === "complete") finish()
    else window.addEventListener("load", finish, { once: true })

    return () => {
      cleanupListeners()
      window.removeEventListener("load", finish)
      timers.forEach(clearTimeout)
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
