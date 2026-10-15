"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Globe, Plus } from "lucide-react"
import { useState } from "react"
import { LANDING_CONTACT, type LandingCopy } from "@/components/landing/copy"
import { LEGAL_ORG } from "@/lib/legal"
import { cn } from "@/lib/utils"
import type { ReelCopy } from "./copy"

export function Faq({ faq, reel }: { faq: LandingCopy["faq"]; reel: ReelCopy }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-reel-band px-5 py-16 md:px-14 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <p className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.3em] text-brass">
            <span aria-hidden="true" className="h-0.5 w-8 bg-brass" />
            {faq.title}
          </p>
          <h2 id="faq-title" className="text-balance font-serif text-4xl font-black leading-[1.05] text-reel-white md:text-5xl">
            {reel.faq.title}
          </h2>
          <p className="font-sans text-base leading-relaxed text-reel-mute">
            {reel.footer.questions}{" "}
            <a href={`mailto:${LANDING_CONTACT.email}`} className="text-reel-white underline underline-offset-4 hover:text-brass">
              {LANDING_CONTACT.email}
            </a>
          </p>
        </div>
        <ul className="flex flex-col border-t border-reel-white/15">
          {faq.items.map((item, index) => {
            const isOpen = open === index
            return (
              <li key={item.q} className="border-b border-reel-white/15">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="group/faq flex w-full items-center justify-between gap-6 py-5 text-left font-sans text-lg font-bold text-reel-white md:py-6 md:text-xl"
                >
                  <span className="transition group-hover/faq:text-reel-white/80">{item.q}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border transition",
                      isOpen ? "border-reel-white bg-reel-white text-reel" : "border-reel-white/25 text-reel-white group-hover/faq:border-reel-white/60",
                    )}
                  >
                    <Plus className={cn("size-4 transition-transform duration-300", isOpen && "rotate-45")} />
                  </span>
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[65ch] pb-6 pr-12 font-sans text-base leading-relaxed text-reel-white/75 md:text-lg md:leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export function Footer({
  copy,
  reel,
  onToggleLocale,
}: {
  copy: LandingCopy
  reel: ReelCopy
  onToggleLocale: () => void
}) {
  const explore = [
    { label: reel.nav.hunts, href: "#hunts" },
    { label: reel.nav.how, href: "#how" },
    { label: reel.nav.faq, href: "#faq" },
    { label: reel.footer.standings, href: "/standings" },
  ]

  const linkClass = "text-reel-white/75 transition hover:text-reel-white"

  return (
    <footer className="border-t border-reel-white/10 px-5 pb-10 pt-16 font-sans md:px-14 md:pt-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <a href="#top" className="flex w-fit items-center gap-3">
              <Image unoptimized src="/landing/logo-sm.webp" alt="" width={44} height={43} className="h-auto w-11" />
              <span className="font-serif text-2xl font-black tracking-[0.12em] text-reel-white">THE HUNT</span>
            </a>
            <p className="max-w-[36ch] text-pretty text-base leading-relaxed text-reel-mute">{copy.footer.tagline}</p>
            <a
              href={`mailto:${LANDING_CONTACT.email}`}
              className="group/mail flex w-fit items-center gap-2 font-serif text-xl font-bold text-reel-white transition hover:text-brass md:text-2xl"
            >
              {LANDING_CONTACT.email}
              <ArrowUpRight className="size-5 transition-transform group-hover/mail:-translate-y-0.5 group-hover/mail:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>

          <nav aria-label={reel.nav.label} className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-reel-mute">The Hunt</p>
            <ul className="flex flex-col gap-3 text-base">
              {explore.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("#") ? (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-reel-mute">Info</p>
            <ul className="flex flex-col gap-3 text-base">
              <li>
                <a href={LANDING_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Instagram · {LANDING_CONTACT.instagram}
                </a>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  {copy.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-reel-white/10 pt-6 md:flex-row md:items-center">
          <p className="text-sm text-reel-mute">
            © {new Date().getFullYear()} {LEGAL_ORG.name}. {copy.footer.rights}
          </p>
          <button
            type="button"
            onClick={onToggleLocale}
            aria-label={copy.langLabel}
            className="flex items-center gap-2 rounded-full border border-reel-white/20 px-4 py-1.5 text-sm text-reel-white/85 transition hover:border-reel-white/60 hover:text-reel-white"
          >
            <Globe className="size-4" aria-hidden="true" />
            {reel.footer.current}
            <span className="text-reel-mute">· {copy.lang}</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
