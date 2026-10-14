"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

const MIN_MS = 1200
const MAX_MS = 8000

/**
 * Full-screen loop of the emblem while the page's images and fonts load.
 * Picks the portrait or landscape cut from the screen shape, and only hands
 * over to the cold open once the window has finished loading.
 */
export function PageLoader({ label, onDone }: { label: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | null>(null)

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)")
    const pick = () => setOrientation(query.matches ? "portrait" : "landscape")
    pick()
    query.addEventListener("change", pick)

    const started = performance.now()
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      const wait = Math.max(0, MIN_MS - (performance.now() - started))
      setTimeout(() => setVisible(false), wait)
    }
    const cap = setTimeout(finish, MAX_MS)
    if (document.readyState === "complete") finish()
    else window.addEventListener("load", finish, { once: true })

    document.documentElement.style.overflow = "hidden"
    return () => {
      query.removeEventListener("change", pick)
      window.removeEventListener("load", finish)
      clearTimeout(cap)
    }
  }, [])

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
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
