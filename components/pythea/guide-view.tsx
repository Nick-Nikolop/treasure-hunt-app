"use client"

import { motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  HelpCircle,
  MapPin,
  Ticket,
  Trophy,
  Users,
} from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { GUIDE_ILLOS } from "@/components/pythea/guide-illustrations"
import { Faq } from "@/components/pythea/faq"

const REVEAL = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
}

// Icons for the quick-fact cards, matched by position: Entry, When, Where, Team, Prize.
const FACT_ICONS = [Ticket, CalendarDays, MapPin, Users, Trophy]

export function GuideView() {
  const { t } = useI18n()
  const g = t.guide

  return (
    <main className="relative mx-auto max-w-6xl px-5 pb-28 pt-28 md:px-8 md:pb-40 md:pt-36">
      {/* Hero */}
      <motion.div {...REVEAL} className="mb-4 flex items-center gap-4">
        <span className="font-sans text-xs font-bold tracking-chip text-brass">{g.eyebrow}</span>
        <span className="h-px flex-1 bg-border" />
      </motion.div>
      <motion.h1
        {...REVEAL}
        transition={{ ...REVEAL.transition, delay: 0.06 }}
        className="max-w-3xl text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-6xl"
      >
        {g.title}
      </motion.h1>
      <motion.p
        {...REVEAL}
        transition={{ ...REVEAL.transition, delay: 0.12 }}
        className="mt-5 max-w-2xl text-pretty font-serif text-lg leading-relaxed text-muted-foreground md:text-xl"
      >
        {g.intro}
      </motion.p>

      {/* Quick facts */}
      <motion.ul
        {...REVEAL}
        transition={{ ...REVEAL.transition, delay: 0.18 }}
        className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5"
      >
        {g.facts.map((f, i) => {
          const Icon = FACT_ICONS[i] ?? Ticket
          return (
            <li
              key={f.label}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-sm border border-border bg-card/50 p-4 transition-colors hover:border-brass/50"
            >
              <span
                className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-brass/[0.07] blur-xl transition-opacity group-hover:opacity-100 md:opacity-0"
                aria-hidden
              />
              <span className="flex size-9 items-center justify-center rounded-sm border border-brass/30 bg-brass/10 text-brass">
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground/70">
                  {f.label}
                </span>
                <span className="font-serif text-lg font-black leading-tight text-brass">
                  {f.value}
                </span>
              </div>
            </li>
          )
        })}
      </motion.ul>

      {/* Table of contents */}
      <motion.nav
        {...REVEAL}
        transition={{ ...REVEAL.transition, delay: 0.24 }}
        aria-label={g.tocLabel}
        className="mt-10 border-y border-border/60 py-5"
      >
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground/60">
          {g.tocLabel}
        </p>
        <ul className="flex flex-wrap gap-2">
          {g.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group inline-flex items-center gap-2 rounded-sm border border-border bg-card/40 px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground transition-colors hover:border-brass/60 hover:text-foreground"
              >
                <span className="font-serif text-xs font-black text-brass">{s.num}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </motion.nav>

      {/* Sections */}
      <div className="mt-8 flex flex-col gap-4 md:mt-14 md:gap-8">
        {g.sections.map((s, i) => {
          const Illo = GUIDE_ILLOS[s.id]
          const flip = i % 2 === 1
          return (
            <motion.section
              key={s.id}
              id={s.id}
              {...REVEAL}
              className="scroll-mt-24 rounded-sm border border-border bg-card/30 p-6 md:scroll-mt-28 md:p-9"
            >
              <div
                className={`grid items-center gap-8 md:grid-cols-2 md:gap-12 ${
                  flip ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Text */}
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-brass/40 bg-brass/10 font-serif text-xl font-black text-brass shadow-[0_0_20px_-6px_var(--brass)]">
                      {s.num}
                    </span>
                    <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
                      {s.eyebrow}
                    </span>
                  </div>
                  <h2 className="mt-3 text-balance font-serif text-2xl font-extrabold leading-tight text-foreground md:text-3xl">
                    {s.title}
                  </h2>
                  <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                  {s.points.length > 0 && (
                    <ul className="mt-5 flex flex-col gap-2.5">
                      {s.points.map((p) => (
                        <li key={p} className="flex items-start gap-3">
                          <span
                            className="mt-[0.55rem] size-1.5 shrink-0 rotate-45 bg-brass"
                            aria-hidden
                          />
                          <span className="text-pretty font-serif leading-relaxed text-foreground/85">
                            {p}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Illustration */}
                {Illo && (
                  <div className="w-full">
                    <Illo />
                  </div>
                )}
              </div>
            </motion.section>
          )
        })}
      </div>

      {/* Closing CTA */}
      <motion.div
        {...REVEAL}
        className="mt-12 rounded-sm border border-brass/40 bg-brass/[0.06] p-8 text-center md:mt-16 md:p-12"
      >
        <h2 className="text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
          {g.ctaTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty font-serif leading-relaxed text-muted-foreground">
          {g.ctaBody}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/#register"
            className="inline-flex items-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {g.ctaRegister}
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#faq"
            className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass/60 hover:text-brass"
          >
            <HelpCircle className="size-4" />
            {g.ctaFaq}
          </a>
        </div>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 font-sans text-[11px] font-semibold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {g.backHome}
        </a>
      </motion.div>

      {/* FAQ — the same accordion used on the home page, closing out the guide */}
      <div className="mt-16 md:mt-24">
        <Faq />
      </div>
    </main>
  )
}
