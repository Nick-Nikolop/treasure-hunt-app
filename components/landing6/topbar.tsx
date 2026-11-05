"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { CHOOSER, EASE, HUB, NAV } from "./data"

export function Topbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    document.documentElement.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && toggle(false)
    window.addEventListener("keydown", onKey)
    return () => {
      document.documentElement.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const toggle = (next: boolean) => {
    setOpen(next)
    track(EV.landing6Menu, { action: next ? "open" : "close" })
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-[var(--l6-night)] transition-[border-color,box-shadow] duration-500",
          scrolled || open ? "border-[var(--l6-gold)]/25 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)]" : "border-[var(--l6-cream)]/10",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link
            href={HUB}
            aria-label="The Hunt, αρχική"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
          >
            <Image src="/landing/logo-sm.webp" alt="" width={40} height={40} priority className="size-9 object-contain" />
            <span className="flex flex-col leading-none">
              <span className="font-sans text-sm font-black uppercase tracking-[0.28em] text-[var(--l6-gold)]">The Hunt</span>
              <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--l6-cream)]/50">Καλαμάτα</span>
            </span>
          </Link>

          <nav aria-label="Κύρια πλοήγηση" className="hidden items-center gap-1 lg:flex">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 font-sans text-[13px] font-semibold text-[var(--l6-cream)]/75 transition hover:bg-[var(--l6-cream)]/[0.06] hover:text-[var(--l6-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={CHOOSER}
              onClick={() => track(EV.landing6Cta, { where: "topbar", target: "hunts" })}
              className="group hidden h-10 items-center gap-2 rounded-full bg-[var(--l6-gold)] pl-5 pr-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--l6-night)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-cream)] sm:inline-flex"
            >
              Παίξε
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <button
              type="button"
              aria-label={open ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
              aria-expanded={open}
              aria-controls="l6-menu"
              onClick={() => toggle(!open)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--l6-cream)]/15 text-[var(--l6-cream)] transition hover:border-[var(--l6-gold)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] lg:hidden"
            >
              {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="l6-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Μενού"
            className="fixed inset-x-0 bottom-0 top-16 z-30 flex flex-col bg-[var(--l6-night)] px-6 pb-10 pt-6 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav aria-label="Μενού κινητού" className="flex flex-col gap-2">
              {NAV.map((l, i) => (
                <motion.div key={l.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.6, ease: EASE }}>
                  <Link
                    href={l.href}
                    onClick={() => toggle(false)}
                    className="flex items-center justify-between border-b border-[var(--l6-cream)]/10 py-5 font-serif text-3xl font-bold text-[var(--l6-cream)] focus-visible:outline-none focus-visible:text-[var(--l6-gold)]"
                  >
                    {l.label}
                    <span aria-hidden="true" className="size-2 rotate-45 bg-[var(--l6-gold)]" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div className="mt-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: EASE }}>
              <Link
                href={CHOOSER}
                onClick={() => {
                  track(EV.landing6Cta, { where: "menu", target: "hunts" })
                  setOpen(false)
                }}
                className="flex h-14 items-center justify-center rounded-full bg-[var(--l6-gold)] font-sans text-sm font-bold uppercase tracking-[0.22em] text-[var(--l6-night)]"
              >
                Διάλεξε κυνήγι
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
