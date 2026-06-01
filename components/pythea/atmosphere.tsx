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
      {/* Film grain (opacity + blend mode are theme-aware, set in globals) */}
      <div className="grain-layer pointer-events-none fixed inset-0 z-40" aria-hidden />
      {/* Vignette */}
      <div className="vignette pointer-events-none fixed inset-0 z-30" aria-hidden />
      {/* Scanline shimmer (theme-aware, set in globals) */}
      <div className="scanlines pointer-events-none fixed inset-0 z-30" aria-hidden />
    </>
  )
}
