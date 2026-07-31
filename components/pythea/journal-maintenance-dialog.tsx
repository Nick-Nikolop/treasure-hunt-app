"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Wrench } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * Shown instead of the journal while the trail is being repaired.
 *
 * Presented as a modal for the same reason as the registration dialog: it reads
 * as an interruption rather than an empty page. There is deliberately no
 * dismiss control and no scan/journal affordance, because the point is that
 * nothing here should be interacted with until the window closes.
 *
 * This is only the message. The journal itself is withheld server-side in
 * `app/journal/page.tsx`, which returns this screen instead of ever building
 * the journal, so no lead data reaches the browser to be uncovered.
 */
export function JournalMaintenanceDialog() {
  const { t } = useI18n()
  const a = t.auth

  return (
    <main className="relative flex min-h-svh items-center justify-center px-5 py-16">
      {/* Scrim, so the card reads as a dialog over the page. */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="journal-maintenance-title"
        aria-describedby="journal-maintenance-body"
      >
        <div className="relative overflow-hidden rounded-md border border-border bg-card/90 p-7 backdrop-blur-sm md:p-9">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--brass), transparent 70%)" }}
            aria-hidden
          />

          {/* Brand mark, matching the auth screens. */}
          <div className="relative mb-7 flex items-center gap-3">
            <Image src="/compass-icon.png" alt="" width={32} height={32} className="size-8" />
            <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground">
              {a.brand}
              <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
                {a.brandSub}
              </span>
            </span>
          </div>

          <div className="relative">
            <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-brass/15">
              <Wrench className="size-6 text-brass" />
            </div>

            <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
              {a.maintEyebrow}
            </span>
            <h1
              id="journal-maintenance-title"
              className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl"
            >
              {a.maintTitle}
            </h1>
            <p
              id="journal-maintenance-body"
              className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground"
            >
              {a.maintBody}
            </p>

            <div className="mt-7">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border px-4 py-3 font-sans text-sm font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/40 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {a.maintHome}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
