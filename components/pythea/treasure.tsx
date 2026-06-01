"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { CompassRose } from "./compass-rose"
import { useI18n } from "@/components/pythea/language-provider"

export function Treasure() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [80, -80])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 1.1])

  return (
    <section
      id="treasure"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden border-y border-border py-32 md:scroll-mt-28 md:py-48"
    >
      {/* Glow + compass backdrop */}
      <motion.div
        style={{ scale }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brass"
        aria-hidden
      >
        <CompassRose className="h-[min(120vw,820px)] w-[min(120vw,820px)] opacity-[0.14]" />
      </motion.div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
        aria-hidden
      />

      <motion.div
        style={{ y }}
        className="relative z-10 mx-auto max-w-3xl px-5 text-center"
      >
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-sans text-xs font-bold tracking-chip text-brass"
        >
          {t.treasure.section}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-balance font-serif text-3xl font-black leading-[1.05] text-foreground md:text-5xl lg:text-6xl"
        >
          {t.treasure.titlePre}{" "}
          <span className="italic text-brass">{t.treasure.titleEm}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mx-auto mt-7 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          {t.treasure.body}
        </motion.p>
      </motion.div>
    </section>
  )
}
