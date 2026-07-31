"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Lock } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

/**
 * Shown instead of the sign-up form now that the hunt has started.
 *
 * Presented as a modal so it reads as an interruption ("you cannot do this any
 * more") rather than a page that merely lacks a form. There is deliberately no
 * dismiss control: behind it there is nothing to go back to, so the only ways
 * out are signing in or going home, which are the two useful actions.
 *
 * This is only the message. The account creation itself is refused server-side
 * in `lib/auth.ts`, so hiding the form is presentation, never the gate.
 */
export function RegistrationClosedDialog() {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-closed-title"
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
              <Lock className="size-6 text-brass" />
            </div>

            <span className="font-sans text-[11px] font-bold tracking-chip text-brass">
              {a.closedEyebrow}
            </span>
            <h1
              id="registration-closed-title"
              className="mt-2 text-balance font-serif text-3xl font-black leading-tight text-foreground md:text-4xl"
            >
              {a.closedTitle}
            </h1>
            <p className="mt-3 text-pretty font-serif leading-relaxed text-muted-foreground">
              {a.closedBody}
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-4 py-3 font-sans text-sm font-bold tracking-chip text-background transition-colors hover:bg-brass/85"
              >
                {a.closedSignIn}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-4 py-3 font-sans text-sm font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass/40 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                {a.closedHome}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
