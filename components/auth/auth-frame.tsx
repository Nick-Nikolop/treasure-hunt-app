"use client"

import type { ComponentType, ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { EASE, PALETTE } from "@/components/landing6/data"
import { Frame, RoseDivider } from "@/components/landing6/ornaments"
import { cn } from "@/lib/utils"

/** Landing6 chrome for every account screen: night page, map backdrop, gold-cornered panel. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={PALETTE}
      className="relative isolate flex min-h-svh flex-col overflow-x-clip bg-[var(--l6-night)] font-sans text-[var(--l6-cream)] selection:bg-[var(--l6-gold)] selection:text-[var(--l6-night)]"
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/landing/hero-kalamata-map.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-[0.12] sepia" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 45% at 50% 30%, rgba(224,176,74,0.14), transparent 70%), linear-gradient(to bottom, rgba(12,9,7,0.4), #0c0907 85%)",
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--l6-cream)]/10 bg-[var(--l6-night)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            aria-label="The Hunt, αρχική"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
          >
            <Image src="/landing/logo-sm.webp" alt="" width={40} height={40} priority className="size-9 object-contain" />
            <span className="flex flex-col leading-none">
              <span className="font-sans text-sm font-black uppercase tracking-[0.28em] text-[var(--l6-gold)]">The Hunt</span>
              <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--l6-cream)]/50">Καλαμάτα</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--l6-cream)]/15 px-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--l6-cream)]/80 transition hover:border-[var(--l6-gold)]/60 hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Αρχική
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative w-full max-w-lg"
        >
          <div className="relative overflow-hidden border border-[var(--l6-gold)]/25 bg-[var(--l6-ash)]/90 px-6 pb-9 pt-10 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:px-12 sm:pb-12 sm:pt-12">
            <Frame />
            <div className="relative flex flex-col items-center gap-5">
              <Image src="/landing/logo-sm.webp" alt="" width={96} height={96} className="size-16 object-contain sm:size-20" />
              <RoseDivider />
            </div>
            <div className="relative mt-7 flex flex-col">{children}</div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export function AuthHeading({ eyebrow, title, lead, id }: { eyebrow?: string; title: string; lead?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {eyebrow && <span className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--l6-gold)]">{eyebrow}</span>}
      <h1 id={id} className="text-balance font-serif text-3xl font-bold leading-tight text-[var(--l6-cream)] sm:text-4xl">
        {title}
      </h1>
      {lead && <p className="text-pretty font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/70">{lead}</p>}
    </div>
  )
}

export function AuthIcon({ icon: Icon, tone = "gold" }: { icon: ComponentType<{ className?: string }>; tone?: "gold" | "wine" }) {
  return (
    <span
      className={cn(
        "mx-auto mb-5 grid size-14 place-items-center rounded-full border",
        tone === "gold" ? "border-[var(--l6-gold)]/40 bg-[var(--l6-gold)]/10 text-[var(--l6-gold)]" : "border-[#e0707f]/40 bg-[var(--l6-wine)]/40 text-[#f2a3ad]",
      )}
    >
      <Icon className="size-6" />
    </span>
  )
}

export function AuthAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-center font-sans text-sm leading-relaxed",
        tone === "error"
          ? "border-[#e0707f]/40 bg-[var(--l6-wine)]/35 text-[#f6c3c9]"
          : "border-[var(--l6-gold)]/40 bg-[var(--l6-gold)]/10 text-[var(--l6-gold)]",
      )}
    >
      {children}
    </p>
  )
}

export const authLabel = "font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--l6-cream)]/60"

export const authInput =
  "h-12 w-full rounded-xl border border-[var(--l6-cream)]/15 bg-[var(--l6-night)]/70 px-4 font-sans text-base text-[var(--l6-cream)] placeholder:text-[var(--l6-cream)]/30 transition-colors focus:border-[var(--l6-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--l6-gold)]/25"

export const authPrimary =
  "inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[var(--l6-gold)] px-8 font-sans text-sm font-bold uppercase tracking-[0.18em] text-[var(--l6-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--l6-ash)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"

export const authSecondary =
  "inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--l6-cream)]/20 px-8 font-sans text-sm font-bold uppercase tracking-[0.18em] text-[var(--l6-cream)] transition hover:border-[var(--l6-gold)]/60 hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] disabled:cursor-not-allowed disabled:opacity-60"

export const authTextLink =
  "font-bold text-[var(--l6-gold)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"

export const authQuiet =
  "inline-flex items-center justify-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--l6-cream)]/55 transition-colors hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:text-[var(--l6-gold)]"
