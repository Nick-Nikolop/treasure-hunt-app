"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Instagram, Mail } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LANDING_CONTACT, type LandingCopy } from "@/components/landing/copy"
import type { Landing2Copy } from "./copy"

export function Faq({ faq, extra }: { faq: LandingCopy["faq"]; extra: Landing2Copy }) {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-border/60 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-20">
        <div className="flex flex-col gap-4 md:sticky md:top-28 md:self-start">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{faq.label}</p>
          <h2 className="font-serif text-4xl leading-tight text-foreground md:text-6xl">{faq.title}</h2>
          <a
            href={`mailto:${LANDING_CONTACT.email}`}
            className="mt-2 flex items-center gap-2 font-sans text-[15px] text-muted-foreground hover:text-brass"
          >
            <Mail className="size-4 text-brass" aria-hidden="true" />
            {extra.faqMore}
          </a>
        </div>
        <Accordion type="single" collapsible className="border-t border-border/60">
          {faq.items.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border/60">
              <AccordionTrigger className="py-5 text-left font-serif text-xl text-foreground hover:text-brass hover:no-underline md:text-2xl">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

export function Closing({ closing }: { closing: LandingCopy["closing"] }) {
  return (
    <section className="relative overflow-hidden border-t border-border/60 px-6 py-28 md:px-10 md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 38%, oklch(0.78 0.13 78 / 0.14), transparent 55%)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image unoptimized src="/landing/logo.webp" alt="" width={128} height={124} className="h-auto w-24 drop-shadow-[0_0_30px_oklch(0.78_0.13_78/0.35)] md:w-32" />
        </motion.div>
        <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-6xl">{closing.title}</h2>
        <p className="max-w-lg font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{closing.body}</p>
        <a
          href="#missions"
          className="rounded-sm bg-brass px-8 py-3.5 font-sans text-sm font-semibold tracking-wide text-ink transition-transform hover:-translate-y-0.5"
        >
          {closing.cta}
        </a>
      </div>
    </section>
  )
}

export function Footer({ footer, nav }: { footer: LandingCopy["footer"]; nav: LandingCopy["nav"] }) {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 md:grid-cols-[1.3fr_1fr_1.3fr] md:px-10">
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-3 font-serif text-base tracking-[0.3em] text-foreground">
            <Image unoptimized src="/landing/logo.webp" alt="" width={36} height={35} className="h-auto w-9" />
            THE HUNT
          </p>
          <p className="max-w-xs font-sans text-sm leading-relaxed text-muted-foreground">{footer.tagline}</p>
        </div>
        <nav className="flex flex-col gap-3 font-sans text-sm" aria-label={footer.exploreLabel}>
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">{footer.exploreLabel}</p>
          <a href="#how" className="text-foreground/80 hover:text-brass">{nav.how}</a>
          <a href="#missions" className="text-foreground/80 hover:text-brass">{nav.missions}</a>
          <a href="#faq" className="text-foreground/80 hover:text-brass">{nav.faq}</a>
          <Link href="/terms" className="text-foreground/80 hover:text-brass">{footer.terms}</Link>
        </nav>
        <div className="flex flex-col gap-3 font-sans text-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">{footer.contactLabel}</p>
          <p className="max-w-sm leading-relaxed text-muted-foreground">{footer.contactBody}</p>
          <a href={`mailto:${LANDING_CONTACT.email}`} className="flex items-center gap-3 text-foreground hover:text-brass">
            <Mail className="size-4 text-brass" aria-hidden="true" />
            {LANDING_CONTACT.email}
          </a>
          <a href={LANDING_CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-foreground hover:text-brass">
            <Instagram className="size-4 text-brass" aria-hidden="true" />
            {LANDING_CONTACT.instagram}
          </a>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-6 py-4 font-sans text-xs text-muted-foreground md:px-10">
          © {new Date().getFullYear()} thehunt.gr · {footer.rights}
        </p>
      </div>
    </footer>
  )
}
