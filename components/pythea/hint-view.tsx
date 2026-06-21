"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Lightbulb, BookOpen, Flag, Compass } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

export type HintViewData = {
  title: string
  body: string
  leadOrder: number | null
  country: string | null
  countryEn: string | null
}

/**
 * The public hint page card. The hint's title and body are admin-authored
 * (single language), while the surrounding chrome (eyebrow, lead tag, buttons)
 * is localized. Only rendered for signed-in explorers (the server guards that).
 */
export function HintView({ hint }: { hint: HintViewData }) {
  const { t, locale } = useI18n()
  const h = t.hint

  const country = locale === "en" ? hint.countryEn : hint.country
  const leadTag =
    hint.leadOrder !== null && country
      ? h.forLead(String(hint.leadOrder).padStart(2, "0"), country)
      : h.generalLabel

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl rounded-sm border border-brass bg-card/60 px-6 py-9 md:px-10 md:py-12"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-border bg-background">
          <Lightbulb className="size-8 text-brass" aria-hidden />
        </div>
        <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">{h.eyebrow}</p>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
          <Flag className="size-3 text-brass" aria-hidden />
          {leadTag}
        </span>

        <h1 className="mt-5 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
          {hint.title}
        </h1>
      </div>

      <div className="mx-auto mt-6 max-w-prose whitespace-pre-line text-pretty font-serif text-base leading-relaxed text-foreground/90 md:text-lg">
        {hint.body}
      </div>

      <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/journal"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
        >
          <BookOpen className="size-4" />
          {h.openJournal}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          <Compass className="size-4" />
          {h.backHome}
        </Link>
      </div>
    </motion.div>
  )
}

/** Shown when a token resolves to no hint. */
export function HintNotFound() {
  const { t } = useI18n()
  const h = t.hint
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-sm border border-border bg-card/60 px-6 py-9 text-center md:px-8 md:py-11"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
        <Lightbulb className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="mt-6 text-balance font-serif text-2xl font-black text-foreground md:text-3xl">
        {h.notFoundTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-pretty font-serif text-base italic leading-relaxed text-muted-foreground">
        {h.notFoundBody}
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          <Compass className="size-4" />
          {h.backHome}
        </Link>
      </div>
    </motion.div>
  )
}
