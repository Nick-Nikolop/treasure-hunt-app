"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { SPLASH_MS } from "@/lib/return-splash"

const MIN_MS = SPLASH_MS
const MAX_MS = SPLASH_MS + 4000

/**
 * Full-screen loop of the emblem while the page's images and fonts load.
 * Picks the portrait or landscape cut from the screen shape, and only hands
 * over to the cold open once the window has finished loading.
 */
export function PageLoader({ label, onDone }: { label: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null)
  const [playing, setPlaying] = useState(false)
  const pageLoaded = useRef(false)

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)")
    const pick = () => setOrientation(query.matches ? "portrait" : "landscape")
    pick()
    query.addEventListener("change", pick)

    const markLoaded = () => {
      pageLoaded.current = true
    }
    if (document.readyState === "complete") markLoaded()
    else window.addEventListener("load", markLoaded, { once: true })

    const cap = setTimeout(() => setVisible(false), MAX_MS)
    document.documentElement.style.overflow = "hidden"
    return () => {
      query.removeEventListener("change", pick)
      window.removeEventListener("load", markLoaded)
      clearTimeout(cap)
    }
  }, [])

  // The 5s are counted from the first rendered frame, so a slow phone
  // connection doesn't eat into the time the video is actually on screen.
  useEffect(() => {
    if (!playing) return
    let timer: ReturnType<typeof setTimeout>
    const tryHide = () => {
      if (pageLoaded.current) setVisible(false)
      else timer = setTimeout(tryHide, 200)
    }
    timer = setTimeout(tryHide, MIN_MS)
    return () => clearTimeout(timer)
  }, [playing])

  return (
    <AnimatePresence
      onExitComplete={() => {
        document.documentElement.style.overflow = ""
        onDone()
      }}
    >
      {visible && (
        <motion.div
          key="page-loader"
          className="fixed inset-0 z-[60] bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">{label}</span>
          {orientation && (
            <video
              key={orientation}
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
