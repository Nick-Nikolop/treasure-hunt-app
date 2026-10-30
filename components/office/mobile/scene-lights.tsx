"use client"

import { useLayoutEffect, useRef, useState } from "react"

const DARK = 0.9
// the lamp catching: two short flickers, then the room is lit (same rhythm as the opening)
const FLICKER: Keyframe[] = [
  { opacity: DARK },
  { opacity: 0.5, offset: 0.12 },
  { opacity: 0.86, offset: 0.18 },
  { opacity: 0.35, offset: 0.3 },
  { opacity: 0.68, offset: 0.36 },
  { opacity: 0 },
]

/**
 * Laid over a phone scene photo: the room waits in the dark until it scrolls into view, then its lights flicker on.
 * Scenes already on screen at load, reduced motion and no-JS stay lit (the overlay only exists after mount).
 */
export function SceneLights({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [done, setDone] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current?.parentElement
    if (!el || reduce || window.matchMedia("(min-width: 1280px)").matches) return setDone(true)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return setDone(true)
    setArmed(true)
  }, [reduce])

  useLayoutEffect(() => {
    const overlay = ref.current
    if (!armed || !overlay) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const anim = overlay.animate(FLICKER, { duration: 1300, delay: 150, easing: "ease-out", fill: "forwards" })
        anim.onfinish = () => setDone(true)
      },
      { threshold: 0.45 },
    )
    observer.observe(overlay)
    return () => observer.disconnect()
  }, [armed])

  if (done) return null
  return <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#0b0a09]" style={{ opacity: armed ? DARK : 0 }} />
}
