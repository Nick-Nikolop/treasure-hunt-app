"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown, Search } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { EV } from "@/lib/analytics-events"
import { track } from "@/lib/analytics-client"
import { cn } from "@/lib/utils"
import { EASE } from "@/components/landing6/data"
import { Heading } from "@/components/landing6/sections"
import { FAQ } from "./content"

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

export function FaqSection() {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const baseId = useId()

  const items = useMemo(() => {
    const q = fold(query.trim())
    return q ? FAQ.filter((f) => fold(`${f.q} ${f.a}`).includes(q)) : FAQ
  }, [query])

  const toggle = (id: string) => {
    const next = open === id ? null : id
    setOpen(next)
    track(EV.crownFaq, { question: id, action: next ? "open" : "close" })
  }

  return (
    <section id="faq" aria-labelledby="crown-faq-title" className="flex scroll-mt-24 flex-col gap-10 sm:gap-14">
      <Heading id="crown-faq-title" kicker="Ερωτήσεις" title="Πώς μπορούμε να βοηθήσουμε;" />

      <div className="flex flex-col gap-8">
        <label className="relative block">
          <span className="sr-only">Αναζήτηση στις ερωτήσεις</span>
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[var(--l6-gold)]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση"
            data-no-track
            className="h-14 w-full rounded-full border border-[var(--l6-cream)]/15 bg-[var(--l6-ash)] pl-14 pr-5 font-sans text-base text-[var(--l6-cream)] placeholder:text-[var(--l6-cream)]/40 focus:border-[var(--l6-gold)]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]/40"
          />
        </label>

        <ul className="flex flex-col border-t border-[var(--l6-gold)]/30">
          {items.map((f) => {
            const isOpen = open === f.id
            const panelId = `${baseId}-${f.id}`
            return (
              <li key={f.id} className="border-b border-[var(--l6-gold)]/30">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(f.id)}
                    data-track={`crown-faq-${f.id}`}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--l6-gold)] sm:py-6"
                  >
                    <span className={cn("text-pretty font-serif text-lg font-bold leading-snug transition-colors sm:text-xl", isOpen ? "text-[var(--l6-gold)]" : "text-[var(--l6-cream)] group-hover:text-[var(--l6-gold)]")}>
                      {f.q}
                    </span>
                    <ChevronDown
                      className={cn("size-5 shrink-0 text-[var(--l6-gold)] transition-transform duration-500", isOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[70ch] pb-6 text-pretty font-sans text-[15px] leading-relaxed text-[var(--l6-cream)]/75 sm:text-base">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="border-b border-[var(--l6-gold)]/30 py-8 text-center font-serif text-lg italic text-[var(--l6-cream)]/60">
              Δεν βρήκαμε κάτι. Στείλε μας μήνυμα και θα σου απαντήσουμε.
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
