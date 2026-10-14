"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

type Copy = LandingCopy["missions"]
type Mission = Copy["next"]

const FIELDS = ["city", "period", "entry"] as const
const NEXT_IMAGE = "/landing/scene-mission.webp"
const JOURNAL = "/landing/pythea-journal.webp"
const SECTION =
  "light relative isolate flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center overflow-hidden bg-background py-8 text-foreground md:py-12"

function Header({ copy, withBody = true, className = "" }: { copy: Copy; withBody?: boolean; className?: string }) {
  return (
    <div className={`flex max-w-2xl flex-col gap-2 md:gap-3 ${className}`}>
      <Label className="font-semibold">{copy.label}</Label>
      <h2 className="font-serif text-3xl leading-[1.05] text-balance md:text-5xl">{copy.title}</h2>
      {withBody && <p className="hidden max-w-xl font-sans text-base leading-relaxed text-foreground/75 md:block">{copy.body}</p>}
    </div>
  )
}

function Status({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium uppercase tracking-[0.18em] md:px-3 md:py-1 md:text-xs ${
        live ? "border-brass bg-brass/10 text-brass" : "border-foreground/25 text-foreground/60"
      }`}
    >
      {live && <span className="size-1.5 animate-pulse rounded-full bg-brass" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Full city / period / entry grid on desktop; a single compact line on phones. */
function Facts({ copy, card, className = "" }: { copy: Copy; card: Mission; className?: string }) {
  return (
    <>
      <p className="font-sans text-[13px] text-foreground/65 md:hidden">
        {card.city} · {card.period}
      </p>
      <dl className={`hidden grid-cols-3 gap-x-4 border-t border-dashed border-foreground/25 pt-3 md:grid ${className}`}>
        {FIELDS.map((field) => (
          <div key={field} className="flex min-w-0 flex-col gap-1">
            <dt className="truncate font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/55">{copy.fields[field]}</dt>
            <dd className="font-serif text-base leading-snug">{card[field]}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function Defines({ copy, className = "" }: { copy: Copy; className?: string }) {
  return (
    <div className={`hidden flex-col gap-3 md:flex ${className}`}>
      <p className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{copy.definesLabel}</p>
      <ul className="flex flex-wrap gap-2">
        {copy.defines.map((item) => (
          <li key={item} className="rounded-full border border-foreground/20 bg-card/60 px-3.5 py-1.5 font-sans text-sm text-foreground/80">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The leather journal of the first hunt, cut out so it sits on the paper with a real shadow. */
function Journal({ alt, sizes, className = "relative" }: { alt: string; sizes: string; className?: string }) {
  return (
    <div className={`aspect-[3/4] ${className}`}>
      <Image
        unoptimized
        loading="eager"
        src={JOURNAL}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain drop-shadow-[0_24px_28px_oklch(0.25_0.04_60/0.45)]"
      />
    </div>
  )
}

function Stamp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`pointer-events-none border-[3px] border-double border-[oklch(0.5_0.17_28)] bg-background/70 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.5_0.17_28)] md:px-3 md:py-1 md:text-xs ${className}`}
    >
      {children}
    </span>
  )
}

/* ─────────────────────────── A · Archive: journal + sealed folder ─────────────────────────── */

export function ArchiveMissions({ copy }: { copy: Copy }) {
  return (
    <section id="missions" className={SECTION}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-6 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:gap-12 md:px-10">
        <div className="flex flex-col gap-8">
          <Header copy={copy} />
          <Defines copy={copy} />
        </div>

        <div className="grid grid-cols-2 items-end gap-4 md:gap-8">
          <Rise>
            <article className="flex flex-col gap-3 md:gap-4">
              <div className="relative mx-auto w-[82%] -rotate-3">
                <Journal alt={copy.journalAlt} sizes="(min-width: 768px) 22vw, 40vw" />
                <Stamp className="absolute -bottom-1 -right-3 rotate-[-12deg] md:-right-6">{copy.past.status}</Stamp>
                <Clue id="file" className="absolute left-[14%] top-[10%] opacity-70" />
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-foreground/55 md:text-xs">
                  {copy.file} TH-01
                </span>
                <h3 className="font-serif text-lg leading-tight md:text-2xl">{copy.past.title}</h3>
                <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{copy.past.body}</p>
                <Facts copy={copy} card={copy.past} />
              </div>
            </article>
          </Rise>

          <Rise delay={0.12}>
            <article className="relative pt-7 md:pt-9">
              <div className="absolute left-0 top-0 flex h-8 items-center rounded-t-md border border-b-0 border-foreground/15 bg-card px-3 font-sans text-[11px] uppercase tracking-[0.22em] text-foreground/70 md:h-10 md:px-5 md:text-xs">
                {copy.file} TH-02
              </div>
              <div className="flex flex-col gap-3 rounded-sm rounded-tl-none border border-foreground/15 bg-card p-3 shadow-[0_40px_60px_-40px_oklch(0.2_0.03_60/0.6)] md:gap-4 md:p-5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                  <Image unoptimized loading="eager" src={NEXT_IMAGE} alt="" fill sizes="(min-width: 768px) 30vw, 45vw" className="object-cover sepia-[0.35]" />
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,oklch(0.3_0.04_60/0.08)_14px_15px)]" aria-hidden="true" />
                </div>
                <Status live>{copy.next.status}</Status>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-lg leading-tight md:text-2xl">{copy.next.title}</h3>
                  <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{copy.next.body}</p>
                </div>
                <Facts copy={copy} card={copy.next} />
              </div>
            </article>
          </Rise>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── B · Feature: next hunt framed large, archive shelf below ─────────────────────────── */

export function FeatureMissions({ copy }: { copy: Copy }) {
  return (
    <section id="missions" className={SECTION}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-5 px-6 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-12 md:px-10">
        <Rise className="order-2 md:order-1">
          <figure className="relative rotate-[-1.2deg] bg-card p-2 shadow-[0_30px_60px_-30px_oklch(0.25_0.04_60/0.55)] md:p-3">
            <div className="relative aspect-[16/9] overflow-hidden md:aspect-[5/4]">
              <Image unoptimized loading="eager" src={NEXT_IMAGE} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover sepia-[0.3]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.03_60/0.65)] via-transparent to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
                <span className="font-serif text-4xl leading-none text-[oklch(0.95_0.03_85)] md:text-7xl">TH-02</span>
                <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-[oklch(0.95_0.03_85/0.8)] md:text-xs">{copy.next.city}</span>
              </div>
            </div>
            <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-2 bg-brass/30" aria-hidden="true" />
          </figure>
        </Rise>

        <div className="order-1 flex flex-col gap-5 md:order-2 md:gap-7">
          <Header copy={copy} withBody={false} />

          <div className="flex flex-col gap-2 md:gap-3">
            <Status live>{copy.next.status}</Status>
            <h3 className="font-serif text-2xl leading-tight md:text-4xl">{copy.next.title}</h3>
            <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/75 md:block md:text-base">{copy.next.body}</p>
            <Facts copy={copy} card={copy.next} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="hidden font-sans text-xs uppercase tracking-[0.3em] text-foreground/55 md:block">{copy.archive}</p>
            <article className="relative flex items-center gap-4 rounded-sm border border-foreground/15 bg-card/70 p-3 md:gap-5">
              <div className="relative w-12 shrink-0 md:w-16">
                <Journal alt={copy.journalAlt} sizes="4rem" />
                <Clue id="file" className="absolute -right-2 -top-2 scale-75 opacity-70" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/55 md:text-xs">
                  {copy.past.status} · {copy.file} TH-01
                </span>
                <h4 className="font-serif text-lg leading-tight md:text-xl">{copy.past.title}</h4>
                <p className="font-sans text-[13px] text-foreground/65 md:text-sm">
                  {copy.past.city} · {copy.past.period}
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── D · Tickets: two portrait tickets on the old map ─────────────────────────── */

function Ticket({ copy, card, live, ticketRef }: { copy: Copy; card: Mission; live: boolean; ticketRef: string }) {
  return (
    <article className="relative flex h-full overflow-hidden rounded-md border border-foreground/20 bg-card shadow-[0_30px_50px_-35px_oklch(0.25_0.04_60/0.6)] md:flex-col">
      <div className={`relative w-28 shrink-0 md:h-56 md:w-auto ${live ? "" : "bg-[oklch(0.84_0.04_78)]"}`}>
        {live ? (
          <Image unoptimized loading="eager" src={NEXT_IMAGE} alt="" fill sizes="(min-width: 768px) 40vw, 7rem" className="object-cover sepia-[0.3]" />
        ) : (
          <>
            <Journal alt={copy.journalAlt} sizes="(min-width: 768px) 12rem, 6rem" className="absolute inset-y-3 left-1/2 -translate-x-1/2 md:inset-y-4" />
            <Clue id="file" className="absolute right-2 top-2 opacity-70" />
          </>
        )}
      </div>

      <div className="relative flex shrink-0 items-center md:h-0" aria-hidden="true">
        <span className="h-full border-l-2 border-dashed border-foreground/25 md:h-auto md:w-full md:border-l-0 md:border-t-2" />
        <span className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full border border-foreground/20 bg-background md:-left-3 md:top-1/2 md:translate-x-0 md:-translate-y-1/2" />
        <span className="absolute -bottom-3 left-1/2 size-6 -translate-x-1/2 rounded-full border border-foreground/20 bg-background md:-right-3 md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 md:gap-3 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Status live={live}>{card.status}</Status>
          <span className="font-serif text-lg text-brass md:text-2xl">{ticketRef}</span>
        </div>
        <h3 className="font-serif text-lg leading-tight md:text-3xl">{card.title}</h3>
        <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{card.body}</p>
        <Facts copy={copy} card={card} className="mt-auto" />
      </div>

      {!live && <Stamp className="absolute right-3 top-3 hidden rotate-[8deg] md:block">{copy.past.entry}</Stamp>}
    </article>
  )
}

export function TicketMissions({ copy }: { copy: Copy }) {
  return (
    <section id="missions" className={SECTION}>
      <Image
        unoptimized
        loading="eager"
        src="/landing/old-map.webp"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none -z-10 object-cover opacity-[0.18] mix-blend-multiply"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 md:gap-8 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
          <Header copy={copy} withBody={false} />
          <p className="hidden max-w-sm font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{copy.body}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          <Rise className="h-full">
            <Ticket copy={copy} card={copy.next} live ticketRef="TH-02" />
          </Rise>
          <Rise delay={0.1} className="h-full">
            <Ticket copy={copy} card={copy.past} live={false} ticketRef="TH-01" />
          </Rise>
        </div>
        <Defines copy={copy} className="md:flex-row md:items-center md:gap-6" />
      </div>
    </section>
  )
}

/* ─────────────────────────── E · Two cards: photo card and journal card ─────────────────────────── */

function Card({ copy, card, live, cardRef }: { copy: Copy; card: Mission; live: boolean; cardRef: string }) {
  return (
    <article className="relative flex h-full overflow-hidden rounded-md border border-foreground/15 bg-card md:flex-col">
      <div className={`relative w-28 shrink-0 overflow-hidden md:h-[min(17rem,32svh)] md:w-auto ${live ? "" : "bg-[radial-gradient(ellipse_at_50%_40%,oklch(0.9_0.04_82),oklch(0.8_0.05_74))]"}`}>
        {live ? (
          <Image unoptimized loading="eager" src={NEXT_IMAGE} alt="" fill sizes="(min-width: 768px) 45vw, 7rem" className="object-cover sepia-[0.3] transition-transform duration-[2000ms] hover:scale-105" />
        ) : (
          <>
            <Journal alt={copy.journalAlt} sizes="(min-width: 768px) 14rem, 6rem" className="absolute inset-y-3 left-1/2 -translate-x-1/2 rotate-[-4deg] md:inset-y-5" />
            <Clue id="file" className="absolute bottom-3 left-3 opacity-70" />
          </>
        )}
        <span className="absolute left-2 top-2 hidden rounded-sm bg-background/85 px-2 py-0.5 font-sans text-[11px] uppercase tracking-[0.22em] text-foreground/70 md:left-4 md:top-4 md:block">
          {copy.file} {cardRef}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 md:gap-3 md:p-6">
        <Status live={live}>{card.status}</Status>
        <h3 className="font-serif text-lg leading-tight md:text-3xl">{card.title}</h3>
        <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{card.body}</p>
        <Facts copy={copy} card={card} className="mt-auto" />
      </div>
    </article>
  )
}

export function CardMissions({ copy }: { copy: Copy }) {
  return (
    <section id="missions" className={SECTION}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 md:gap-8 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
          <Header copy={copy} withBody={false} />
          <p className="hidden max-w-sm font-sans text-[15px] leading-relaxed text-foreground/70 md:block">{copy.body}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Rise className="h-full">
            <Card copy={copy} card={copy.next} live cardRef="TH-02" />
          </Rise>
          <Rise delay={0.12} className="h-full">
            <Card copy={copy} card={copy.past} live={false} cardRef="TH-01" />
          </Rise>
        </div>
        <Defines copy={copy} className="md:flex-row md:items-center md:gap-6" />
      </div>
    </section>
  )
}
