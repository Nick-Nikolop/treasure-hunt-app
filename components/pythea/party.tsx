"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { PartyPopper, Sparkles } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

export function Party() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section
      id="party"
      ref={ref}
      className="relative scroll-mt-20 overflow-hidden border-y border-border py-28 md:scroll-mt-28 md:py-40"
    >
      {/* Soft brass glow backdrop */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
        aria-hidden
      />

      <motion.div
        style={{ y }}
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 text-center"
      >
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-sans text-xs font-bold tracking-chip text-brass"
        >
          {t.party.section}
        </motion.span>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex size-16 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass"
          aria-hidden
        >
          <PartyPopper className="size-7" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-balance font-serif text-3xl font-black leading-[1.05] text-foreground md:text-5xl"
        >
          {t.party.titlePre}{" "}
          <span className="italic text-brass">{t.party.titleEm}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mt-7 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          {t.party.body}
        </motion.p>

        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mt-9 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-sans text-xs font-bold tracking-chip text-brass"
        >
          <Sparkles className="size-4" />
          {t.party.badge}
        </motion.span>
      </motion.div>
    </section>
  )
}
