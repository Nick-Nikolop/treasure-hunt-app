"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { motion } from "framer-motion"
import { Compass, ArrowRight, BookOpen } from "lucide-react"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"

type Props = {
  unlockedCount: number
  total: number
  /** Countdown target for lead 1, or null once it has opened. */
  countdownToMs: number | null
}

export function Journey({ unlockedCount, total, countdownToMs }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const refresh = useCallback(() => {
    setTimeout(() => router.refresh(), 1200)
  }, [router])

  return (
    <section id="journey" className="relative scroll-mt-20 overflow-hidden py-28 md:scroll-mt-28 md:py-40">
      <div className="mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-4 flex items-center gap-4"
        >
          <span className="font-sans text-xs font-bold tracking-chip text-brass">
            {t.journey.section}
          </span>
          <span className="h-px flex-1 bg-border" />
        </motion.div>

        <div className="grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-12">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="max-w-2xl text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-6xl"
            >
              {t.journey.titlePre}{" "}
              <span className="italic text-brass">{t.journey.titleEm}</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-5 max-w-xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground"
            >
              {t.journey.intro}
            </motion.p>

            {/* Prominent link down to the legend (Story section) for anyone
                who wants the backstory before reading the journal. */}
            <motion.a
              href="#story"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="group mt-7 inline-flex items-center gap-2.5 rounded-sm border-2 border-brass bg-brass/10 px-5 py-3 font-sans text-sm font-bold tracking-chip text-brass shadow-[0_0_0_0_oklch(0.72_0.13_75/0.5)] transition-all hover:bg-brass hover:text-primary-foreground hover:shadow-[0_8px_24px_-8px_oklch(0.72_0.13_75/0.7)]"
            >
              <BookOpen className="size-4" />
              {t.journey.readLegend}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
          </div>

          {/* Vintage cartographic view of Kalamata, framed as an aged plate */}
          <motion.figure
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative mx-auto w-full max-w-sm md:w-72 lg:w-80"
          >
            <div className="overflow-hidden rounded-sm border border-brass/40 bg-card p-2 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.7)]">
              <img
                src="/map-square.jpg"
                alt={t.journey.mapAlt}
                width={640}
                height={640}
                className="aspect-square w-full rounded-[2px] object-cover"
              />
            </div>
          </motion.figure>
        </div>

        {/* Editorial stat strip anchoring the "9 / 9 / 1" tagline */}
        <motion.dl
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-12 grid grid-cols-3 overflow-hidden rounded-sm border border-border bg-card/40"
        >
          {[
            { value: "9", label: t.journey.statCountries },
            { value: "9", label: t.journey.statMarks },
            { value: "1", label: t.journey.statCity },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center gap-1 px-3 py-6 text-center md:py-8 ${
                i > 0 ? "border-l border-border" : ""
              }`}
            >
              <dd className="font-serif text-4xl font-black leading-none text-brass md:text-5xl">
                {stat.value}
              </dd>
              <dt className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground md:text-xs">
                {stat.label}
              </dt>
            </div>
          ))}
        </motion.dl>

        {/* Status + countdown + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 flex flex-col items-start justify-between gap-8 rounded-sm border border-border bg-card/50 p-6 backdrop-blur-sm md:flex-row md:items-center md:p-8"
        >
          <div>
            <div className="flex items-center gap-2">
              <Compass className="size-4 animate-compass-sway text-brass" />
              <span className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
                {t.journey.status(unlockedCount, total)}
              </span>
            </div>
            {countdownToMs ? (
              <div className="mt-4">
                <p className="mb-3 font-serif text-sm italic text-muted-foreground">
                  {t.journey.firstOpensIn}
                </p>
                <Countdown targetMs={countdownToMs} onDone={refresh} />
              </div>
            ) : (
              <p className="mt-4 font-serif text-base italic text-foreground">
                {unlockedCount >= total ? t.journey.allOpen : t.journey.huntBegun}
              </p>
            )}
          </div>

          <a
            href="/journal"
            className="group inline-flex shrink-0 items-center gap-2 rounded-sm bg-brass px-6 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-colors hover:bg-brass/90"
          >
            {t.journey.cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
