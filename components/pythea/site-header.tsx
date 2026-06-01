"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Compass, Menu, X } from "lucide-react"

const NAV = [
  { label: "Η Ιστορία", href: "/#story" },
  { label: "Το Ημερολόγιο", href: "/journal" },
  { label: "Ο Θησαυρός", href: "/#treasure" },
  { label: "Πώς Παίζεται", href: "/#how" },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

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
            ΠΥΘΕΑΣ
            <span className="block font-sans text-[10px] font-medium tracking-chip text-muted-foreground">
              Ο ΜΕΣΣΗΝΙΟΣ
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative font-sans text-xs font-semibold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label.toUpperCase()}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brass transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <a
          href="/#register"
          className="hidden items-center gap-2 rounded-sm border border-brass/60 px-4 py-2 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:bg-brass hover:text-primary-foreground md:inline-flex"
        >
          ΔΗΛΩΣΕ ΣΥΜΜΕΤΟΧΗ
        </a>

        <button
          type="button"
          aria-label="Άνοιγμα μενού"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-sm border border-border text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
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
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-3 font-sans text-sm font-semibold tracking-chip text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  {item.label.toUpperCase()}
                </a>
              ))}
              <a
                href="/#register"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-sm bg-brass px-2 py-3 text-center font-sans text-sm font-bold tracking-chip text-primary-foreground"
              >
                ΔΗΛΩΣΕ ΣΥΜΜΕΤΟΧΗ
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
