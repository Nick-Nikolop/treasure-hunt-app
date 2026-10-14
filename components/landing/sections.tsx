"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Eye, Hourglass, Instagram, Landmark, Mail, Plus, ShieldCheck } from "lucide-react"
import { LANDING_CONTACT, type LandingCopy } from "./copy"
import { Clue, ClueReward } from "./clues"
import { useLogoSrc } from "./logo-context"

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
        <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">
          {copy.after} <Clue id="story" className="-my-2" />
        </p>
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
                {index === 2 && <Clue id="scene" className="absolute bottom-12 right-6" />}
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
    <section className="flex min-h-[calc(100svh-4rem)] items-center border-t border-border/60 py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 md:px-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="flex flex-col gap-3 md:gap-5 lg:self-start">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl leading-tight text-foreground text-balance md:text-5xl">{who.title}</h2>
          <p className="hidden max-w-md font-sans text-base leading-relaxed text-muted-foreground md:block">{who.body}</p>
          <div className="flex flex-col gap-2 md:gap-3 md:pt-2">
            <p className="hidden font-sans text-xs uppercase tracking-[0.3em] text-foreground/60 md:block">{who.needLabel}</p>
            <ul className="flex flex-wrap gap-1.5 md:gap-2" aria-label={who.needLabel}>
              {who.needs.map((need) => (
                <li key={need} className="rounded-full border border-brass/40 px-3 py-1 font-sans text-sm text-foreground md:px-4 md:py-1.5">
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
              className="flex flex-col gap-1 border-b border-border/60 py-3 first:pt-0 md:py-4"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.08, duration: 0.9, ease: EASE }}
            >
              <h3 className="font-serif text-xl text-foreground md:text-2xl">{item.title}</h3>
              <p className="hidden max-w-lg font-sans text-[15px] leading-relaxed text-muted-foreground sm:block">{item.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CodeSection({ copy }: { copy: LandingCopy["code"] }) {
  const logoSrc = useLogoSrc()
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center border-t border-border/60 py-6 md:py-12">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-10">
        <motion.div
          className="relative isolate overflow-hidden rounded-sm border border-brass/30 bg-card px-5 py-7 md:px-12 md:py-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <Image unoptimized loading="eager"
            key={logoSrc}
            src={logoSrc}
            alt=""
            width={520}
            height={505}
            className="pointer-events-none absolute -right-24 -top-16 -z-10 w-[26rem] opacity-[0.06] md:w-[34rem]"
          />
          <Clue id="code" className="absolute right-4 top-4 md:right-[8.5rem] md:top-[8.5rem]" />
          <div className="flex flex-col gap-5 md:gap-10">
            <div className="flex max-w-2xl flex-col gap-2 pr-10 md:gap-4">
              <Label>{copy.label}</Label>
              <h2 className="font-serif text-2xl leading-tight text-foreground text-balance md:text-5xl">{copy.title}</h2>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-8 lg:grid-cols-4">
              {copy.rules.map((rule, index) => {
                const Icon = RULE_ICONS[index] ?? Eye
                return (
                  <motion.li
                    key={rule.title}
                    className="flex flex-col gap-2 border-t border-brass/30 pt-3 md:gap-4 md:pt-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.9, ease: EASE }}
                  >
                    <Icon className="size-5 text-brass md:size-6" aria-hidden="true" />
                    <h3 className="font-serif text-lg italic text-foreground md:text-2xl">{rule.title}</h3>
                    <p className="font-sans text-sm leading-relaxed text-muted-foreground md:text-base">{rule.body}</p>
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
    { ...copy.next, image: "/landing/mission-carnival.webp", live: true, ref: "#2" },
    { ...copy.past, image: "/landing/mission-pythea.webp", live: false, ref: "#1" },
  ]
  const archive = copy.archive
  return (
    <section
      id="missions"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center border-t border-border/60 py-6 md:py-10"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10 md:px-10">
        <div className="flex max-w-2xl flex-col gap-2 md:gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl text-foreground text-balance md:text-5xl">{copy.title}</h2>
          <p className="hidden font-sans text-base leading-relaxed text-foreground/80 md:block">{copy.body}</p>
          <div className="hidden flex-col gap-3 pt-4 md:flex">
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/80">{copy.definesLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {copy.defines.map((item) => (
                <li key={item} className="rounded-full border border-brass/40 bg-brass/10 px-4 py-1.5 font-sans text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:gap-5">
          {cards.map((card, index) => (
            <motion.article
              key={card.title}
              tabIndex={card.live ? undefined : 0}
              aria-label={card.live ? undefined : `${card.title}. ${archive.closed}`}
              className="group relative isolate flex h-[clamp(15rem,calc((100svh-15rem)/2),20rem)] w-full flex-col justify-between gap-3 overflow-hidden rounded-sm border border-border/60 p-3 outline-none focus-visible:ring-2 focus-visible:ring-brass md:aspect-[3/4] md:h-[min(36rem,calc(100svh-12rem))] md:w-auto md:gap-4 md:p-4"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.15, duration: 1, ease: EASE }}
            >
              <Image
                unoptimized
                loading="eager"
                src={card.image}
                alt=""
                fill
                sizes="(min-width: 768px) 28rem, 80vw"
                className={`-z-10 object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-105 ${card.live ? "object-[60%_20%]" : "object-[50%_80%] md:object-[50%_30%] sepia-[0.15]"}`}
              />
              {!card.live && (
                <Image
                  unoptimized
                  loading="eager"
                  src={card.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 28rem, 80vw"
                  aria-hidden="true"
                  className="-z-10 object-cover object-[50%_80%] md:object-[50%_30%] opacity-0 brightness-[0.35] grayscale transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] group-hover:scale-105 group-hover:opacity-100 group-focus-within:opacity-100"
                />
              )}
              <div
                className={`absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-gradient-to-t from-background via-background/75 to-transparent transition-opacity duration-500 ease-out ${
                  card.live ? "" : "group-hover:opacity-0 group-focus-within:opacity-0"
                }`}
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 top-0 -z-10 h-1/4 bg-gradient-to-b from-background/50 to-transparent" aria-hidden="true" />
              {!card.live && <Clue id="file" className="absolute right-[14%] top-[34%] -z-[5] opacity-40" />}

              <div
                className={`flex flex-row-reverse items-center justify-between gap-2 transition-opacity duration-500 ease-out ${
                  card.live ? "" : "group-hover:opacity-0 group-focus-within:opacity-0"
                }`}
              >
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.15em] md:px-3 md:text-xs md:tracking-[0.2em] ${
                    card.live ? "bg-brass text-background" : "bg-background/85 text-foreground backdrop-blur-sm"
                  }`}
                >
                  {card.status}
                </span>
                <span className="whitespace-nowrap rounded-full bg-background/85 px-2.5 py-1 font-sans text-[11px] uppercase tracking-[0.15em] md:px-3 md:text-xs md:tracking-[0.25em] text-foreground/90 backdrop-blur-sm">
                  {copy.file} {card.ref}
                </span>
              </div>

              <div
                className={`flex flex-col gap-3 px-1 pb-1 transition-opacity duration-500 ease-out md:gap-4 md:px-2 md:pb-2 ${
                  card.live ? "" : "group-hover:opacity-0 group-focus-within:opacity-0"
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-2xl leading-tight text-foreground text-balance [text-shadow:0_2px_12px_rgb(0_0_0/0.6)] md:text-4xl">
                    {card.title}
                  </h3>
                  <p className="hidden max-w-sm font-sans text-sm leading-relaxed text-foreground/85 md:block">{card.body}</p>
                </div>
                <dl className="flex items-stretch gap-4">
                  {(["period", "entry"] as const).map((field) => (
                    <div key={field} className="flex min-w-0 flex-col gap-0.5 border-l-2 border-brass/70 pl-3">
                      <dt className="font-sans text-[11px] uppercase tracking-[0.2em] text-brass">{copy.fields[field]}</dt>
                      <dd className="font-serif text-base text-foreground md:text-lg">{card[field]}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {!card.live && (
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-3 bg-background/55 p-4 opacity-0 transition-opacity duration-500 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:gap-5 md:p-7">
                  <div className="flex flex-col gap-1 md:gap-2">
                    <p className="font-sans text-xs uppercase tracking-[0.25em] text-foreground/70">{archive.closed}</p>
                    <h3 className="hidden font-serif text-3xl text-foreground md:block">{card.title}</h3>
                    <p className="font-sans text-sm text-foreground/80">{card.period}</p>
                  </div>
                  <dl className="flex flex-col gap-2 border-y border-foreground/20 py-2 md:gap-4 md:py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="font-sans text-xs uppercase tracking-[0.2em] text-foreground/70">{archive.entryLabel}</dt>
                      <dd className="font-serif text-lg text-foreground">{archive.entryValue}</dd>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="font-sans text-xs uppercase tracking-[0.2em] text-foreground/70">{archive.prizeLabel}</dt>
                        <dd className="font-serif text-2xl text-foreground md:text-3xl">{archive.prizeValue}</dd>
                      </div>
                      <ul className="grid grid-cols-3 gap-2">
                        {archive.split.map((tier) => (
                          <li key={tier.place} className="flex flex-col items-center gap-0.5 rounded-sm border border-foreground/15 bg-background/70 py-1.5 md:py-2">
                            <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/70">{tier.place}</span>
                            <span className="font-serif text-base text-foreground">{tier.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </dl>
                  <Link
                    href="/standings"
                    className="inline-flex items-center justify-between gap-3 rounded-sm border border-foreground/30 px-4 py-2.5 font-sans text-sm md:py-3 text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                  >
                    {archive.standings}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FaqSection({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section
      id="faq"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center border-t border-border/60 py-8 md:py-12"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-6 md:px-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
        <div className="flex flex-col gap-2 md:gap-4 lg:self-start">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl text-foreground md:text-5xl">{copy.title}</h2>
        </div>
        <div className="flex flex-col">
          {copy.items.map((item, index) => (
            <details
              key={item.q}
              name="faq"
              className="group border-b border-border/60 py-3 md:py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-lg leading-snug text-foreground md:gap-6 md:text-2xl">
                {item.q}
                <Plus className="size-5 shrink-0 text-brass transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="max-w-2xl pt-2 font-sans text-[15px] leading-relaxed text-muted-foreground md:pt-3 md:text-base">
                {item.a}
                {index === copy.items.length - 1 && <Clue id="faq" className="-my-2 ml-1" />}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ClosingSection({ copy }: { copy: LandingCopy["closing"] }) {
  const logoSrc = useLogoSrc()
  return (
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden border-t border-border/60 py-8 md:py-12">
        <Image unoptimized loading="eager" src="/landing/scene-clue.webp" alt="" fill sizes="100vw" className="-z-10 object-cover brightness-[0.25]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-transparent to-background" aria-hidden="true" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 text-center md:gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 2.2, ease: EASE }}
            className="drop-shadow-[0_0_40px_rgba(226,176,72,0.35)]"
          >
            <Image unoptimized loading="eager" key={logoSrc} src={logoSrc} alt="The Hunt" width={176} height={171} className="h-auto w-20 md:w-32 animate-in fade-in duration-700" />
          </motion.div>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-6xl">{copy.title}</h2>
          <p className="max-w-lg font-sans text-[15px] leading-relaxed text-foreground/80 md:text-base">{copy.body}</p>
          <ClueReward />
          <a
            href="#missions"
            className="rounded-full bg-primary px-8 py-4 font-sans text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.cta}
          </a>
        </div>
      </section>
  )
}

export function SiteFooter({ footer, nav }: { footer: LandingCopy["footer"]; nav: LandingCopy["nav"] }) {
  const logoSrc = useLogoSrc()
  return (
      <footer className="border-t border-border/60">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr_1.4fr] md:px-10">
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-3 font-serif text-base tracking-[0.3em] text-foreground">
              <Image unoptimized loading="eager" key={logoSrc} src={logoSrc} alt="" width={36} height={35} className="h-auto w-9 animate-in fade-in duration-700" />
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
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
            <p className="font-sans text-xs text-muted-foreground">
              © {new Date().getFullYear()} thehunt.gr · {footer.rights}
            </p>
            <Clue id="footer" className="opacity-60" />
          </div>
        </div>
      </footer>
  )
}
