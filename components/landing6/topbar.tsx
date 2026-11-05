"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { CHOOSER, EASE, HUB, NAV } from "./data"

const linkClass =
  "relative font-sans text-[13px] font-bold uppercase tracking-[0.24em] text-[var(--l6-cream)]/80 transition hover:text-[var(--l6-cream)] focus-visible:outline-none focus-visible:text-[var(--l6-gold)] after:absolute after:-bottom-1.5 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-[var(--l6-gold)] after:transition-all after:duration-500 hover:after:w-full"

export function Topbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
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

  const left = NAV.slice(0, 2)
  const right = NAV.slice(2)

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,backdrop-filter,box-shadow] duration-500",
          scrolled || open ? "bg-[var(--l6-night)]/85 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 sm:h-20 sm:px-8">
          <nav aria-label="Κύρια πλοήγηση" className="hidden items-center gap-10 lg:flex">
            {left.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href={HUB}
            aria-label="The Hunt, αρχική"
            className="col-start-1 flex items-center gap-3 justify-self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] lg:col-start-2 lg:justify-self-center"
          >
            <Image src="/landing/logo-sm.webp" alt="" width={56} height={56} priority className={cn("object-contain transition-all duration-500", scrolled ? "size-10" : "size-11 sm:size-12")} />
            <span className="font-sans text-sm font-black uppercase tracking-[0.3em] text-[var(--l6-gold)] lg:hidden">The Hunt</span>
          </Link>
          <div className="col-start-3 flex items-center justify-end gap-10">
            <nav aria-label="Δευτερεύουσα πλοήγηση" className="hidden items-center gap-10 lg:flex">
              {right.map((l) => (
                <Link key={l.href} href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <Link
              href={CHOOSER}
              onClick={() => track(EV.landing6Cta, { where: "topbar", target: "hunts" })}
              className="hidden h-10 items-center rounded-full border border-[var(--l6-gold)]/70 px-5 font-sans text-xs font-bold uppercase tracking-[0.22em] text-[var(--l6-gold)] transition hover:bg-[var(--l6-gold)] hover:text-[var(--l6-night)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] sm:inline-flex"
            >
              Παίξε
            </Link>
            <button
              type="button"
              aria-label={open ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
              aria-expanded={open}
              aria-controls="l6-menu"
              onClick={() => toggle(!open)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--l6-cream)]/15 text-[var(--l6-cream)] transition hover:border-[var(--l6-gold)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] lg:hidden"
            >
              {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="relative mx-auto flex max-w-5xl items-center px-5">
          <span className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-[var(--l6-gold)]/50 transition-opacity duration-500", scrolled ? "opacity-0" : "opacity-100")} />
          <span className={cn("mx-3 size-1.5 rotate-45 bg-[var(--l6-gold)] transition-opacity duration-500", scrolled ? "opacity-0" : "opacity-100")} />
          <span className={cn("h-px flex-1 bg-gradient-to-l from-transparent to-[var(--l6-gold)]/50 transition-opacity duration-500", scrolled ? "opacity-0" : "opacity-100")} />
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="l6-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Μενού"
            className="fixed inset-0 z-30 flex flex-col bg-[var(--l6-night)]/97 px-6 pb-10 pt-28 backdrop-blur-md lg:hidden"
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
