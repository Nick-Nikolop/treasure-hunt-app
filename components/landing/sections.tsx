"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, Hourglass, Instagram, Landmark, Mail, Plus, ShieldCheck } from "lucide-react"
import { LANDING_CONTACT, type LandingCopy } from "./copy"

const EASE = [0.16, 1, 0.3, 1] as const
const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-xs uppercase tracking-[0.35em] text-brass">{children}</p>
}

export function StorySection({ copy }: { copy: LandingCopy["story"] }) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-32 md:px-10 md:py-48">
      <Label>{copy.label}</Label>
      <div className="flex flex-col gap-6">
        {copy.lines.map((line) => (
          <motion.p
            key={line}
            className="font-serif text-3xl leading-tight text-foreground text-balance md:text-5xl"
            initial={{ opacity: 0.12 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: "-35% 0px -35% 0px" }}
            transition={{ duration: 0.8 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <p className="font-serif text-4xl italic text-brass md:text-6xl">{copy.close}</p>
        <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">{copy.after}</p>
      </motion.div>
    </section>
  )
}

export function HowSection({ copy }: { copy: LandingCopy["how"] }) {
  return (
    <section id="how" className="scroll-mt-20 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 md:px-10">
        <div className="flex flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
        </div>
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {copy.steps.map((step, index) => (
            <motion.li
              key={step.title}
              className="group flex flex-col gap-5"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.12, duration: 1, ease: EASE }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-card">
                <Image unoptimized loading="eager"
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover brightness-75 transition-transform duration-[2000ms] ease-out group-hover:scale-105 group-hover:brightness-90"
                />
                <div className="absolute inset-x-0 top-0 h-6 bg-background" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 h-6 bg-background" aria-hidden="true" />
                <p className="absolute left-4 top-9 font-sans text-[11px] uppercase tracking-[0.3em] text-foreground/80">
                  {copy.scene} {String(index + 1).padStart(2, "0")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-2xl text-foreground">{step.title}</h3>
                <p className="font-sans text-base leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
        <p className="max-w-2xl font-serif text-xl italic leading-relaxed text-foreground/80 text-pretty">{copy.note}</p>
      </div>
    </section>
  )
}

export function WhySection({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <section className="border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:px-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">{who.title}</h2>
          <p className="max-w-md font-sans text-base leading-relaxed text-muted-foreground">{who.body}</p>
          <div className="flex flex-col gap-3 pt-2">
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{who.needLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {who.needs.map((need) => (
                <li key={need} className="rounded-full border border-brass/40 px-4 py-1.5 font-sans text-sm text-foreground">
                  {need}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="flex flex-col">
          {copy.items.map((item, index) => (
            <motion.li
              key={item.title}
              className="flex flex-col gap-2 border-b border-border/60 py-8 first:pt-0"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.08, duration: 0.9, ease: EASE }}
            >
              <h3 className="font-serif text-2xl text-foreground md:text-3xl">{item.title}</h3>
              <p className="max-w-lg font-sans text-base leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CodeSection({ copy }: { copy: LandingCopy["code"] }) {
  return (
    <section className="border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          className="relative isolate overflow-hidden rounded-sm border border-brass/30 bg-card px-6 py-14 md:px-14 md:py-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <Image unoptimized loading="eager"
            src="/landing/logo.webp"
            alt=""
            width={520}
            height={505}
            className="pointer-events-none absolute -right-24 -top-16 -z-10 w-[26rem] opacity-[0.06] md:w-[34rem]"
          />
          <div className="flex flex-col gap-12">
            <div className="flex max-w-2xl flex-col gap-4">
              <Label>{copy.label}</Label>
              <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-5xl">{copy.title}</h2>
            </div>
            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {copy.rules.map((rule, index) => {
                const Icon = RULE_ICONS[index] ?? Eye
                return (
                  <motion.li
                    key={rule.title}
                    className="flex flex-col gap-4 border-t border-brass/30 pt-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.9, ease: EASE }}
                  >
                    <Icon className="size-6 text-brass" aria-hidden="true" />
                    <h3 className="font-serif text-2xl italic text-foreground">{rule.title}</h3>
                    <p className="font-sans text-base leading-relaxed text-muted-foreground">{rule.body}</p>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function MissionsSection({ copy }: { copy: LandingCopy["missions"] }) {
  const cards = [
    { ...copy.next, image: "/landing/scene-mission.webp", live: true, ref: "TH-02" },
    { ...copy.past, image: "/landing/scene-finale.webp", live: false, ref: "TH-01" },
  ]
  return (
    <section id="missions" className="scroll-mt-20 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 md:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
          <p className="font-sans text-base leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card, index) => (
            <motion.article
              key={card.title}
              className="group relative isolate flex min-h-[32rem] flex-col justify-between overflow-hidden rounded-sm border border-border/60 p-8"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.15, duration: 1, ease: EASE }}
            >
              <Image unoptimized loading="eager"
                src={card.image}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={`-z-10 object-cover transition-transform duration-[2000ms] group-hover:scale-105 ${card.live ? "brightness-50" : "brightness-[0.3] grayscale"}`}
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10" aria-hidden="true" />
              <div className="flex items-center justify-between gap-4">
                <span className={`rounded-full border px-3 py-1 font-sans text-xs uppercase tracking-[0.2em] ${card.live ? "border-brass text-brass" : "border-foreground/30 text-muted-foreground"}`}>
                  {card.status}
                </span>
                <span className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">
                  {copy.file} {card.ref}
                </span>
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-3xl text-foreground md:text-4xl">{card.title}</h3>
                  <p className="max-w-md font-sans text-base leading-relaxed text-foreground/75">{card.body}</p>
                </div>
                <dl className="grid grid-cols-3 gap-4 border-t border-foreground/15 pt-5">
                  {(["city", "period", "entry"] as const).map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                      <dt className="font-sans text-[11px] uppercase tracking-[0.25em] text-foreground/50">{copy.fields[field]}</dt>
                      <dd className="font-serif text-base text-foreground md:text-lg">{card[field]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{copy.definesLabel}</p>
          <ul className="flex flex-wrap gap-2">
            {copy.defines.map((item) => (
              <li key={item} className="rounded-full border border-border px-4 py-1.5 font-sans text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function FaqSection({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-foreground md:text-5xl">{copy.title}</h2>
        </div>
        <div className="flex flex-col">
          {copy.items.map((item) => (
            <details key={item.q} className="group border-b border-border/60 py-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-6 font-serif text-xl text-foreground md:text-2xl">
                {item.q}
                <Plus className="size-5 shrink-0 text-brass transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="max-w-2xl pt-4 font-sans text-base leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ClosingSection({
  copy,
  footer,
  nav,
  logoSrc,
}: {
  copy: LandingCopy["closing"]
  footer: LandingCopy["footer"]
  nav: LandingCopy["nav"]
  logoSrc: string
}) {
  return (
    <>
      <section className="relative isolate overflow-hidden border-t border-border/60 py-32 md:py-48">
        <Image unoptimized loading="eager" src="/landing/scene-clue.webp" alt="" fill sizes="100vw" className="-z-10 object-cover brightness-[0.25]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-transparent to-background" aria-hidden="true" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 2.2, ease: EASE }}
            className="drop-shadow-[0_0_40px_rgba(226,176,72,0.35)]"
          >
            <Image unoptimized loading="eager" key={logoSrc} src={logoSrc} alt="The Hunt" width={176} height={171} className="h-auto w-32 md:w-44 animate-in fade-in duration-700" />
          </motion.div>
          <h2 className="font-serif text-5xl leading-tight text-foreground text-balance md:text-7xl">{copy.title}</h2>
          <p className="max-w-lg font-sans text-lg leading-relaxed text-foreground/80">{copy.body}</p>
          <a
            href="#missions"
            className="rounded-full bg-primary px-8 py-4 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.cta}
          </a>
        </div>
      </section>
      <footer className="border-t border-border/60">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr_1.4fr] md:px-10">
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-3 font-serif text-base tracking-[0.3em] text-foreground">
              <Image unoptimized loading="eager" src="/landing/logo.webp" alt="" width={36} height={35} className="h-auto w-9" />
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
          <div className="flex flex-col gap-4 font-sans text-sm">
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
          <p className="mx-auto max-w-7xl px-6 py-6 font-sans text-xs text-muted-foreground md:px-10">
            © {new Date().getFullYear()} thehunt.gr · {footer.rights}
          </p>
        </div>
      </footer>
    </>
  )
}
