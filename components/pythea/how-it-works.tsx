"use client"

import { motion } from "framer-motion"
import { Users, Map, KeyRound, Trophy } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

const STEP_ICONS = [Users, Map, KeyRound, Trophy]

export function HowItWorks() {
  const { t } = useI18n()
  const steps = t.how.steps.map((step, i) => ({ ...step, icon: STEP_ICONS[i] }))
  return (
    <section
      id="how"
      className="relative w-full scroll-mt-20 border-y border-border bg-card/30 py-28 md:scroll-mt-28 md:py-40"
    >
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-4 flex items-center gap-4"
        >
          <span className="font-sans text-xs font-bold tracking-chip text-brass">
            {t.how.section}
          </span>
          <span className="h-px flex-1 bg-border" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-2xl text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl"
        >
          {t.how.titlePre}{" "}
          <span className="italic text-brass">{t.how.titleEm}</span>
        </motion.h2>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col rounded-sm border border-border bg-background/60 p-6 transition-colors hover:border-brass/60"
              >
                <span className="font-serif text-5xl font-black text-border transition-colors group-hover:text-brass/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="mt-4 size-7 text-brass" />
                <h3 className="mt-4 font-serif text-xl font-extrabold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-pretty font-serif leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
