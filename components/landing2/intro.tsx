"use client"

import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

const SEEN_KEY = "landing2:intro-seen"
const EASE = [0.22, 1, 0.36, 1] as const

export function Intro({ onDone, skipLabel }: { onDone: () => void; skipLabel: string }) {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(true)

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1"
    } catch {}
    if (seen || reduce) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(false), 2600)
    return () => clearTimeout(timer)
  }, [reduce])

  return (
    <AnimatePresence
      onExitComplete={() => {
        try {
          sessionStorage.setItem(SEEN_KEY, "1")
        } catch {}
        onDone()
      }}
    >
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-reel"
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.7, ease: EASE }}
          onClick={() => setShow(false)}
        >
          <motion.span
            aria-hidden="true"
            className="absolute h-px w-[70vw] bg-linear-to-r from-transparent via-brass to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1.2], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, delay: 0.7, ease: EASE }}
          />
          <motion.div
            initial={{ scale: 0.55, opacity: 0, filter: "blur(14px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: EASE }}
            className="relative"
          >
            <Image unoptimized priority src="/landing/logo.webp" alt="The Hunt" width={224} height={218} className="h-auto w-36 md:w-52" />
          </motion.div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="absolute bottom-6 right-6 rounded-sm border border-reel-white/30 px-3 py-1.5 font-sans text-sm text-reel-white/80 hover:border-reel-white hover:text-reel-white"
          >
            {skipLabel}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
