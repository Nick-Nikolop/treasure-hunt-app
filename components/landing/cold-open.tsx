"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const SEEN_KEY = "thehunt:cold-open-seen"
const DURATION_MS = 3400
const EASE = [0.16, 1, 0.3, 1] as const

/**
 * A one-per-session title card: the compass emblem spins in and locks, the
 * wordmark resolves, then the card dissolves into the hero. `onFinish` lets the
 * page replay the hero entrance so it is not spent behind the card.
 */
export function ColdOpen({ skipLabel, onFinish }: { skipLabel: string; onFinish: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced || sessionStorage.getItem(SEEN_KEY)) {
      setVisible(false)
      return
    }
    sessionStorage.setItem(SEEN_KEY, "1")
    document.documentElement.style.overflow = "hidden"
    const timer = setTimeout(() => setVisible(false), DURATION_MS)
    return () => {
      clearTimeout(timer)
      document.documentElement.style.overflow = ""
    }
  }, [])

  const finish = () => setVisible(false)

  return (
    <AnimatePresence
      onExitComplete={() => {
        document.documentElement.style.overflow = ""
        onFinish()
      }}
    >
      {visible && (
        <motion.div
          key="cold-open"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
          transition={{ duration: 0.9, ease: EASE }}
          onClick={finish}
          role="presentation"
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.55, rotate: -140, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
            transition={{ duration: 2, ease: EASE }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-brass/30 blur-3xl"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0, 0.9, 0.35], scale: [0.6, 0.6, 1.4, 1.1] }}
              transition={{ duration: 2.6, times: [0, 0.6, 0.75, 1] }}
              aria-hidden="true"
            />
            <Image src="/landing/logo.png" alt="The Hunt" width={220} height={220} priority className="relative h-36 w-36 md:h-52 md:w-52" />
          </motion.div>
          <motion.p
            className="font-serif text-xl text-foreground md:text-2xl"
            initial={{ opacity: 0, letterSpacing: "0.9em" }}
            animate={{ opacity: 1, letterSpacing: "0.45em" }}
            transition={{ delay: 1.5, duration: 1.6, ease: EASE }}
          >
            THE HUNT
          </motion.p>
          <button
            type="button"
            onClick={finish}
            className="absolute bottom-8 right-8 font-sans text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {skipLabel}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
