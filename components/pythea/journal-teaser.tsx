"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, QrCode, ArrowRight } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { usePhase } from "@/components/pythea/phase-provider"
import { JournalCover } from "@/components/pythea/journal-cover"
import { LockedLink } from "@/components/pythea/locked-link"
import { Countdown } from "@/components/pythea/countdown"

/**
 * Landing-page teaser that sits directly under the hero.
 *
 * It exists because players kept missing WHERE the leads arrive: they expected
 * an email or a text, when in fact every lead is a page inside the journal. So
 * this shows the real journal cover (the very same `JournalCover` the journal
 * page renders, not a mock-up), names the moment the first lead opens, counts
 * down to it, and links straight into /journal.
 *
 * The link is a `LockedLink`, so if an admin has sealed the journal it shows the
 * existing "sealed" popup instead of navigating. That is deliberate: this is the
 * most prominent journal entry point on the site, so it must respect the seal
 * exactly like the header and footer links do.
 */
export function JournalTeaser() {
  const { t, locale } = useI18n()
  const j = t.journal
  const phase = usePhase()

  // The phase 2 -> 3 instant. `journalUnlockMs` is the legacy field name for it.
  const targetMs = phase?.journalUnlockMs ?? null

  // Track "has the moment passed" in state rather than deriving it once at
  // render: a visitor can sit on this page while the clock runs out, and
  // `Countdown` tells us via onDone. Seeded from the server-provided instant so
  // the first paint is already correct for late arrivals.
  const [reached, setReached] = useState(() =>
    targetMs == null ? true : Date.now() >= targetMs,
  )
  useEffect(() => {
    if (targetMs == null) return
    setReached(Date.now() >= targetMs)
  }, [targetMs])

  // A forced phase 3 (admin override) has no meaningful countdown, so treat it
  // as already open rather than counting down to a date that no longer gates.
  const open = reached || phase?.phase === 3

  const formattedTarget =
    targetMs == null
      ? null
      : new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
          timeZone: "Europe/Athens",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(targetMs))

  return (
    <section
      id="journal-teaser"
      className="relative scroll-mt-20 overflow-hidden border-b border-border py-14 md:scroll-mt-28 md:py-24"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-14">
        {/* The journal itself: tap target on mobile, hover-lift on desktop. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 md:order-none"
        >
          <LockedLink
            target="journal"
            href="/journal"
            className="group block rounded-r-lg rounded-l-sm outline-none transition-transform duration-500 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <JournalCover
              titleAs="p"
              heightClass="min-h-[22rem] sm:min-h-[26rem] md:min-h-[32rem]"
              className="transition-shadow duration-500 group-hover:shadow-[0_40px_70px_-25px_rgba(0,0,0,0.9)]"
            />
            <span className="mt-4 flex items-center justify-center gap-2 font-sans text-[11px] font-bold tracking-chip text-brass/70 transition-colors group-hover:text-brass">
              {j.teaserTapHint}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </LockedLink>
        </motion.div>

        {/* The explanation + the countdown */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="order-2 md:order-none"
        >
          <p className="flex items-center gap-2 font-sans text-[11px] font-bold tracking-chip text-brass/80">
            <BookOpen className="size-3.5" aria-hidden />
            {j.teaserEyebrow}
          </p>

          <h2 className="mt-4 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl">
            {j.teaserTitle}
          </h2>

          <p className="mt-4 max-w-prose text-pretty font-serif text-base leading-relaxed text-foreground/70 md:text-lg">
            {j.teaserBody}
          </p>

          <div className="mt-7 border-t border-border pt-6">
            <p className="flex items-center gap-2 font-sans text-[11px] font-bold tracking-chip text-foreground/45">
              <QrCode className="size-3.5 text-brass/70" aria-hidden />
              {open ? j.teaserOpenLabel : j.teaserFirstLeadLabel}
            </p>

            {open ? (
              <p className="mt-3 font-serif text-xl italic text-brass md:text-2xl">
                {j.teaserOpenBody}
              </p>
            ) : (
              <>
                {formattedTarget && (
                  <p className="mt-2 font-serif text-xl font-bold text-foreground md:text-2xl">
                    {formattedTarget}
                  </p>
                )}
                {targetMs != null && (
                  <div className="mt-4">
                    <Countdown
                      targetMs={targetMs}
                      size="sm"
                      tone="dark"
                      onDone={() => setReached(true)}
                    />
                  </div>
                )}
              </>
            )}

            <LockedLink
              target="journal"
              href="/journal"
              className="mt-6 inline-flex items-center gap-2 rounded-sm border border-brass/50 bg-brass/10 px-5 py-3 font-sans text-[11px] font-bold tracking-chip text-brass transition-colors hover:bg-brass/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {j.teaserCta}
              <ArrowRight className="size-3.5" aria-hidden />
            </LockedLink>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
