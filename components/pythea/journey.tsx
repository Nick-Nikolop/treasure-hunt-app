"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { motion } from "framer-motion"
import { Lock, Check, Compass, ArrowRight } from "lucide-react"
import { Countdown } from "@/components/pythea/countdown"
import { useI18n } from "@/components/pythea/language-provider"
import { JournalCover } from "@/components/pythea/journal-cover"

type Props = {
  unlockedCount: number
  total: number
  nextUnlockMs: number | null
}

export function Journey({ unlockedCount, total, nextUnlockMs }: Props) {
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

        {/* Sealed markers, no spoilers */}
        <div className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-9">
          {Array.from({ length: total }).map((_, i) => {
            const revealed = i < unlockedCount
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 16 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: "backOut",
                }}
                className="group relative aspect-square"
              >
                {revealed ? (
                  <a
                    href={`/journal?page=${i + 1}`}
                    aria-label={t.journey.openCardAria(i + 1)}
                    className="flex h-full flex-col items-center justify-center rounded-sm border border-brass/70 bg-brass/10 text-center transition-colors hover:border-brass hover:bg-brass/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Check className="size-4 text-brass md:size-5" />
                    <span className="mt-1 font-serif text-xl font-black text-brass md:text-2xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-sans text-[8px] font-bold tracking-chip text-muted-foreground md:text-[9px]">
                      {t.journey.open}
                    </span>
                  </a>
                ) : (
                  <>
                    {/* Recessed journal interior revealed where the page was torn out */}
                    <div className="absolute inset-0 rounded-sm bg-sealed shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_-3px_8px_rgba(0,0,0,0.28)]" />
                    {/* Faint ruled lines of the page beneath */}
                    <div
                      className="absolute inset-0 rounded-sm opacity-[0.12]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(var(--sealed-foreground) 0 1px, transparent 1px 9px)",
                      }}
                    />
                    {/* Ragged torn-paper stub still clinging to the binding (top) edge */}
                    <div className="torn-stub absolute inset-x-0 top-0 h-1/3 bg-card shadow-[0_4px_7px_rgba(0,0,0,0.35)]" />
                    {/* Locked content */}
                    <div className="relative flex h-full flex-col items-center justify-center text-center">
                      <Lock className="size-4 text-sealed-foreground/70 md:size-5" />
                      <span className="mt-1 font-serif text-xl font-black text-sealed-foreground/40 md:text-2xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-sans text-[8px] font-bold tracking-chip text-sealed-foreground/65 md:text-[9px]">
                        {t.journey.locked}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Legend explaining the two page states */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-brass/70 bg-brass/10">
              <Check className="size-3.5 text-brass" />
            </span>
            <span className="font-serif text-sm italic text-muted-foreground">
              {t.journey.legendOpen}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-sealed shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)]">
              <Lock className="size-3.5 text-sealed-foreground/70" />
            </span>
            <span className="font-serif text-sm italic text-muted-foreground">
              {t.journey.legendLocked}
            </span>
          </div>
        </motion.div>

        {/* Animated reveal progress meter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground md:text-xs">
              {t.journey.progressLabel}
            </span>
            <span className="font-serif text-sm font-black text-brass">
              {unlockedCount} / {total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[oklch(0.24_0.025_70)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(unlockedCount / total) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
              className="h-full rounded-full bg-brass"
            />
          </div>
        </motion.div>

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
            {nextUnlockMs ? (
              <div className="mt-4">
                <p className="mb-3 font-serif text-sm italic text-muted-foreground">
                  {unlockedCount === 0
                    ? t.journey.firstOpensIn
                    : t.journey.nextOpensIn}
                </p>
                <Countdown targetMs={nextUnlockMs} onDone={refresh} />
              </div>
            ) : (
              <p className="mt-4 font-serif text-base italic text-foreground">
                {t.journey.allOpen}
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

        {/* The same closed journal from the journal page, shown as a clickable
            preview right below the countdown. Clicking it opens the journal,
            so the homepage preview and the real book are one and the same. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 flex justify-center"
        >
          <Link
            href="/journal"
            aria-label={t.journey.openJournal}
            className="group block w-full max-w-xs rounded-r-lg rounded-l-sm transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <JournalCover
              heightClass="min-h-[26rem] md:min-h-[30rem]"
              className="transition-shadow duration-300 group-hover:shadow-[0_45px_75px_-20px_rgba(0,0,0,0.9)]"
            />
            <span className="mt-4 flex items-center justify-center gap-1.5 font-sans text-[11px] font-bold tracking-chip text-brass">
              {t.journey.openJournal}
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
