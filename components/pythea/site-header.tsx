"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Compass, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/pythea/theme-toggle"
import { LanguageToggle } from "@/components/pythea/language-toggle"
import { AuthNav } from "@/components/pythea/auth-nav"
import { useI18n } from "@/components/pythea/language-provider"

// Greek all-caps convention: drop the tonos (e.g. ΙΣΤΟΡΊΑ -> ΙΣΤΟΡΙΑ) while
// keeping the dialytika. JS toUpperCase() keeps the accent, so strip it here.
function greekCaps(s: string) {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0301\u0342\u0340\u0341]/g, "")
    .replace(/\u0344/g, "\u0308")
    .normalize("NFC")
}

export function SiteHeader() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const nav = [
    { label: t.nav.story, href: "/#story" },
    { label: t.nav.journal, href: "/journal" },
    { label: t.nav.treasure, href: "/#treasure" },
    { label: t.nav.how, href: "/#how" },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <a href="/" className="group flex items-center gap-3">
          <Compass className="size-6 text-brass transition-transform duration-700 group-hover:rotate-180" />
          <span className="font-serif text-base font-extrabold leading-none tracking-tight text-foreground md:text-lg">
            {t.nav.brand}
            <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
              {t.nav.brandSub}
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
            className="group relative font-sans text-xs font-semibold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
          >
                {greekCaps(item.label)}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brass transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          <AuthNav />
          <a
            href="/#register"
            className="inline-flex items-center gap-2 rounded-sm border border-brass/60 px-4 py-2 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:bg-brass hover:text-primary-foreground"
          >
            {greekCaps(t.nav.register)}
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            aria-label={t.nav.openMenu}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-sm border border-border text-foreground"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-3 font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
                >
            {greekCaps(item.label)}
          </a>
        ))}
              <a
                href="/#register"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-sm bg-brass px-2 py-3 text-center font-sans text-sm font-bold tracking-chip text-primary-foreground"
              >
                {greekCaps(t.nav.register)}
              </a>
              <AuthNav compact onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
