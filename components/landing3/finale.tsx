"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"
import { useState } from "react"
import { LANDING_CONTACT } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { COORDS, caps, type TrailCopy } from "./copy"

export function Faq({ copy }: { copy: TrailCopy["faq"] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative z-10 mx-auto flex max-w-3xl scroll-mt-24 flex-col gap-10 px-5 py-24 md:py-32">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">{copy.label}</p>
        <h2 className="font-plate text-[clamp(2.2rem,5vw,3.75rem)] font-light leading-[1.05] tracking-[0.02em]">{caps(copy.title)}</h2>
      </div>

      <ul className="flex flex-col rounded-2xl border border-hill-ink/15 bg-hill-card/70 px-5 md:px-8">
        {copy.items.map((item, i) => {
          const isOpen = open === i
          return (
            <li key={item.q} className={cn(i > 0 && "border-t border-hill-ink/15")}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="font-plate text-lg md:text-[1.4rem]">{item.q}</span>
                <Plus aria-hidden className={cn("size-5 shrink-0 transition-transform duration-300", isOpen && "rotate-45")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-[60ch] pb-6 text-[15px] leading-[1.75] text-hill-ink/85 md:text-base">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Closing({ copy, nav, lat, lng }: { copy: TrailCopy["closing"]; nav: TrailCopy["nav"]; lat: string; lng: string }) {
  const notify = `mailto:${LANDING_CONTACT.email}?subject=${encodeURIComponent(copy.subject)}`

  return (
    <footer className="relative z-10 bg-hill-ink text-hill-paper">
      <svg aria-hidden viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-full h-8 w-full fill-hill-ink md:h-12">
        <path d="M0 60 V30 C140 14 260 40 420 26 C580 12 700 38 860 24 C1020 10 1140 36 1280 22 C1360 14 1410 22 1440 18 V60 Z" />
      </svg>

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 pb-10 pt-20 text-center md:px-12 md:pt-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-hill-paper/70">{copy.eyebrow}</p>
        <h2 className="max-w-3xl text-balance font-plate text-[clamp(2.2rem,5.5vw,4.25rem)] font-light leading-[1.05] tracking-[0.02em]">
          {caps(copy.title)}
        </h2>
        <a
          href={notify}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-md bg-hill-paper px-8 text-[15px] font-medium text-hill-ink transition-colors hover:bg-hill-deep"
        >
          {copy.cta}
        </a>

        <p aria-hidden className="mt-16 w-full select-none font-plate text-[clamp(4.5rem,19vw,17rem)] font-light leading-[0.85] tracking-[-0.01em] text-hill-paper/90">
          The Hunt
        </p>

        <div className="flex w-full flex-col items-center justify-between gap-5 border-t border-hill-paper/20 pt-6 text-sm text-hill-paper/75 md:flex-row">
          <span>
            {COORDS.lat} {lat} · {COORDS.lng} {lng}
          </span>
          <nav aria-label={nav.label} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/standings" className="underline-offset-4 hover:underline">
              {copy.standings}
            </Link>
            <Link href="/terms" className="underline-offset-4 hover:underline">
              {copy.terms}
            </Link>
            <a href={LANDING_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
              {LANDING_CONTACT.instagram}
            </a>
            <a href={`mailto:${LANDING_CONTACT.email}`} className="underline-offset-4 hover:underline">
              {LANDING_CONTACT.email}
            </a>
          </nav>
          <span>
            © {new Date().getFullYear()} The Hunt. {copy.rights}
          </span>
        </div>
      </div>
    </footer>
  )
}
