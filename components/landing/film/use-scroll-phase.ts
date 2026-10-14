"use client"

import { type RefObject, useState } from "react"
import { useMotionValueEvent, useScroll } from "framer-motion"

/** Splits a tall section's scroll range into `count` equal phases while its sticky stage is pinned. */
export function useScrollPhase(ref: RefObject<HTMLElement | null>, count: number) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const [phase, setPhase] = useState(0)
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(count - 1, Math.max(0, Math.floor(value * count)))
    setPhase((current) => (current === next ? current : next))
  })
  return phase
}
