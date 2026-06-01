"use client"

import { motion, useScroll, useSpring } from "framer-motion"

export function Atmosphere() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <>
      {/* Scroll progress line */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-brass"
        style={{ scaleX: progress }}
        aria-hidden
      />
      {/* Film grain */}
      <div
        className="grain-layer pointer-events-none fixed inset-0 z-40 opacity-[0.07] mix-blend-overlay"
        aria-hidden
      />
      {/* Vignette */}
      <div className="vignette pointer-events-none fixed inset-0 z-30" aria-hidden />
      {/* Scanline shimmer */}
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.6) 3px, transparent 4px)",
        }}
      />
    </>
  )
}
