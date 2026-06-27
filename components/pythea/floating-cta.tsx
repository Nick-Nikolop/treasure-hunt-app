"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Compass } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/**
 * A hovering "participate" button that appears once the visitor scrolls past
 * the hero (the legend / story area and below) and links straight to the
 * register form. It hides itself again while the register section is on
 * screen so it never overlaps or duplicates the form's own submit button.
 */
export function FloatingCta() {
  const { t } = useI18n()
  // Past the hero -> the CTA may show. Register on screen -> force hide.
  const [pastHero, setPastHero] = useState(false)
  const [registerVisible, setRegisterVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("top")
    const register = document.getElementById("register")
    if (!hero) return

    const heroObserver = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { rootMargin: "-40% 0px 0px 0px" },
    )
    heroObserver.observe(hero)

    let registerObserver: IntersectionObserver | undefined
    if (register) {
      registerObserver = new IntersectionObserver(
        ([entry]) => setRegisterVisible(entry.isIntersecting),
        { threshold: 0.15 },
      )
      registerObserver.observe(register)
    }

    return () => {
      heroObserver.disconnect()
      registerObserver?.disconnect()
    }
  }, [])

  const show = pastHero && !registerVisible

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href="/#register"
          onClick={() => track(EV.ctaClick, { id: "register", location: "floating" }, { category: "cta" })}
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="group fixed inset-x-5 bottom-5 z-40 inline-flex items-center justify-center gap-2 rounded-full bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 md:inset-x-auto md:right-8 md:bottom-8"
        >
          <Compass className="size-4 transition-transform duration-700 group-hover:rotate-180" />
          {t.nav.register}
        </motion.a>
      )}
    </AnimatePresence>
  )
}
