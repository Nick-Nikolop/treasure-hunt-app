"use client"

import Link from "next/link"
import { Globe, Plus } from "lucide-react"
import { useState } from "react"
import { LANDING_CONTACT, type LandingCopy } from "@/components/landing/copy"
import { LEGAL_ORG } from "@/lib/legal"
import { cn } from "@/lib/utils"
import type { ReelCopy } from "./copy"

export function Faq({ faq, reel }: { faq: LandingCopy["faq"]; reel: ReelCopy }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" aria-labelledby="faq-title" className="flex scroll-mt-20 flex-col gap-12 border-t-8 border-reel-raised px-5 py-16 md:px-14 md:py-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h2 id="faq-title" className="text-center font-sans text-3xl font-extrabold text-reel-white md:text-5xl">
          {reel.faq.title}
        </h2>
        <p className="-mt-2 text-center font-serif text-xl italic text-reel-mute md:text-2xl">{faq.title}</p>
        <ul className="flex flex-col gap-2">
          {faq.items.map((item, index) => {
            const isOpen = open === index
            return (
              <li key={item.q} className="flex flex-col gap-px">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 bg-reel-raised px-6 py-5 text-left font-sans text-lg text-reel-white transition hover:bg-reel-mute/25 md:px-8 md:py-6 md:text-2xl"
                >
                  {item.q}
                  <Plus className={cn("size-7 shrink-0 transition-transform duration-300 md:size-9", isOpen && "rotate-45")} aria-hidden="true" />
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                >
                  <div className="overflow-hidden">
                    <p className="bg-reel-raised px-6 py-5 font-sans text-lg leading-relaxed text-reel-white md:px-8 md:py-6 md:text-2xl md:leading-relaxed">
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
  const links = [
    { label: reel.nav.hunts, href: "#hunts" },
    { label: reel.nav.how, href: "#how" },
    { label: reel.nav.faq, href: "#faq" },
    { label: reel.footer.standings, href: "/standings" },
    { label: copy.footer.terms, href: "/terms" },
    { label: LANDING_CONTACT.instagram, href: LANDING_CONTACT.instagramUrl, external: true },
  ]

  return (
    <footer className="border-t-8 border-reel-raised px-5 py-14 font-sans text-reel-mute md:px-14 md:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <p className="text-base">
          {reel.footer.questions}{" "}
          <a href={`mailto:${LANDING_CONTACT.email}`} className="underline underline-offset-4 hover:text-reel-white">
            {LANDING_CONTACT.email}
          </a>
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          {links.map((link) => (
            <li key={link.label}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {link.label}
                </a>
              ) : link.href.startsWith("#") ? (
                <a href={link.href} className="underline-offset-4 hover:underline">
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToggleLocale}
          aria-label={copy.langLabel}
          className="flex w-fit items-center gap-2 rounded-sm border border-reel-mute/50 px-4 py-2 text-base text-reel-white hover:border-reel-white"
        >
          <Globe className="size-4" aria-hidden="true" />
          {reel.footer.current}
          <span className="text-reel-mute">· {copy.lang}</span>
        </button>
        <p className="text-sm">
          {copy.footer.tagline} © {new Date().getFullYear()} {LEGAL_ORG.name}. {copy.footer.rights}
        </p>
      </div>
    </footer>
  )
}
