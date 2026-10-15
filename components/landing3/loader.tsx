"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import type { TrailCopy } from "./copy"

const DURATION = 2400

export function Loader({ copy, onDone }: { copy: TrailCopy["loader"]; onDone: () => void }) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const root = document.documentElement
    root.style.overflow = "hidden"
    let frame = 0
    let hold: ReturnType<typeof setTimeout> | undefined
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      setCount(Math.round((1 - Math.pow(1 - t, 2.4)) * 100))
      if (t < 1) frame = requestAnimationFrame(tick)
      else hold = setTimeout(() => setLeaving(true), 380)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (hold) clearTimeout(hold)
      root.style.overflow = ""
    }
  }, [reduced, onDone])

  if (reduced) return null

  const digits = String(count).padStart(3, "0").split("").map(Number)

  return (
    <motion.div
      role="status"
      aria-label={copy.label}
      className="fixed inset-0 z-[80] bg-hill-paper"
      initial={{ y: 0 }}
      animate={{ y: leaving ? "-100%" : 0 }}
      transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (leaving) {
          document.documentElement.style.overflow = ""
          onDone()
        }
      }}
    >
      <button
        type="button"
        onClick={() => setLeaving(true)}
        className="absolute right-5 top-5 rounded-md border border-hill-ink/30 px-4 py-2 text-sm font-medium text-hill-ink/80 transition-colors hover:bg-hill-ink hover:text-hill-paper md:right-12 md:top-10"
      >
        {copy.skip}
      </button>

      <div className="absolute inset-x-0 bottom-10 flex items-end justify-between gap-6 px-5 md:bottom-14 md:px-12">
        <p aria-hidden className="flex font-plate text-[clamp(5.5rem,17vw,13rem)] font-light leading-none text-hill-ink">
          {digits.map((d, i) => (
            <span key={i} className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden">
              <span
                className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-300 ease-out"
                style={{ transform: `translateY(-${d * 1.2}em)` }}
              >
                {Array.from({ length: 10 }, (_, n) => (
                  <span key={n} className="block h-[1.2em] text-center leading-[1.2em]">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </p>

        <motion.div
          aria-hidden
          className="relative h-32 w-28 shrink-0 md:h-48 md:w-44"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          style={{ translateX: `${(count - 100) * 1.2}%` }}
        >
          <Image
            src="/landing3/walker.webp"
            alt=""
            fill
            priority
            sizes="180px"
            className="object-contain"
          />
        </motion.div>
      </div>

      <svg
        aria-hidden
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-full h-10 w-full fill-hill-paper md:h-14"
      >
        <path d="M0 0 H1440 V18 C1300 44 1180 10 1040 30 C900 52 780 16 640 34 C500 52 380 14 240 32 C140 46 60 26 0 38 Z" />
      </svg>
    </motion.div>
  )
}
