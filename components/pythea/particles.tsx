"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"

type Particle = {
  left: number
  top: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
}

/**
 * Slow, dust-like motes drifting upward behind a section. Purely decorative:
 * pointer-events are disabled and it is hidden from assistive tech. Particles
 * are generated after mount so server and client markup stay in sync, and the
 * whole field is suppressed for users who prefer reduced motion.
 */
export function Particles({ count = 26 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!reduce) setMounted(true)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 3.5,
      duration: 14 + Math.random() * 16,
      delay: Math.random() * -30,
      drift: (Math.random() - 0.5) * 40,
      opacity: 0.12 + Math.random() * 0.35,
    }))
  }, [count])

  if (!mounted) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-brass"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            filter: "blur(0.5px)",
          }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{
            opacity: [0, p.opacity, p.opacity, 0],
            y: [0, -60, -110, -160],
            x: [0, p.drift * 0.4, p.drift * 0.8, p.drift],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
