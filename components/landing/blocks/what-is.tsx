"use client"

import { ArrowRight, Check, DoorOpen, MapPin, QrCode, Smartphone, Users } from "lucide-react"
import Image from "next/image"
import type { ComponentType } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

type WhatCopy = LandingCopy["what"]

const FACT_ICONS = [QrCode, MapPin, Users, Smartphone]

function Cta({ copy }: { copy: WhatCopy }) {
  return (
    <a
      href="#how"
      className="inline-flex items-center gap-2 self-start border-b border-brass pb-1 font-sans text-sm uppercase tracking-[0.2em] text-brass hover:text-foreground"
    >
      {copy.cta}
      <ArrowRight className="size-4" aria-hidden="true" />
    </a>
  )
}

function Heading({ copy, className = "" }: { copy: WhatCopy; className?: string }) {
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <Label>{copy.label}</Label>
      <h2 className="text-balance font-serif text-4xl leading-[1.08] md:text-6xl">{copy.title}</h2>
    </div>
  )
}

function Body({ copy }: { copy: WhatCopy }) {
  return (
    <p className="max-w-[60ch] text-pretty font-sans text-base leading-relaxed text-foreground/80 md:text-lg">
      {copy.body} <Clue id="story" className="-my-2" />
    </p>
  )
}

/** A. Plain: one sentence, one paragraph, four answers. */
function WhatPlain({ copy }: { copy: WhatCopy }) {
  return (
    <section id="what" className="scroll-mt-16 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6">
        <Rise className="flex flex-col gap-8">
          <Heading copy={copy} className="max-w-4xl" />
          <Body copy={copy} />
        </Rise>
        <Rise delay={0.1}>
          <dl className="grid grid-cols-1 border-t border-border/60 sm:grid-cols-2 lg:grid-cols-4">
            {copy.facts.map((fact, index) => {
              const Icon = FACT_ICONS[index]
              return (
                <div key={fact.q} className="flex flex-col gap-3 border-b border-border/60 py-6 sm:pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
                  <dt className="flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] text-brass">
                    <Icon className="size-4" aria-hidden="true" />
                    {fact.q}
                  </dt>
                  <dd className="text-pretty font-serif text-xl leading-snug">{fact.a}</dd>
                </div>
              )
            })}
          </dl>
        </Rise>
        <Cta copy={copy} />
      </div>
    </section>
  )
}

/** B. Phone: the text next to what the game actually looks like on your screen. */
function WhatPhone({ copy }: { copy: WhatCopy }) {
  return (
    <section id="what" className="scroll-mt-16 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Rise className="flex flex-col gap-8">
          <Heading copy={copy} />
          <Body copy={copy} />
          <ul className="flex flex-col gap-3">
            {copy.facts.map((fact, index) => {
              const Icon = FACT_ICONS[index]
              return (
                <li key={fact.q} className="flex items-start gap-3 font-sans text-base leading-relaxed">
                  <Icon className="mt-1 size-4 shrink-0 text-brass" aria-hidden="true" />
                  <span>
                    <span className="text-foreground/60">{fact.q}</span> {fact.a}
                  </span>
                </li>
              )
            })}
          </ul>
          <Cta copy={copy} />
        </Rise>
        <Rise delay={0.15} className="flex justify-center">
          <PhoneMock copy={copy} />
        </Rise>
      </div>
    </section>
  )
}

function PhoneMock({ copy }: { copy: WhatCopy }) {
  return (
    <div className="w-64 rounded-[2.5rem] border border-foreground/20 bg-ink p-3 shadow-2xl md:w-72" aria-hidden="true">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-border/60 bg-background px-5 pb-6 pt-8">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-foreground/15" />
        <div className="flex items-center justify-between font-sans text-[11px] uppercase tracking-[0.25em] text-brass">
          <span>The Hunt</span>
          <span className="text-foreground/50">{copy.phone.step}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className={`h-1 flex-1 rounded-full ${index < 3 ? "bg-brass" : "bg-foreground/15"}`} />
          ))}
        </div>
        <p className="font-serif text-lg leading-snug">{copy.phone.clue}</p>
        <div className="flex items-center gap-2 rounded-xl border border-brass/40 px-3 py-2 font-sans text-xs text-foreground/80">
          <MapPin className="size-4 text-brass" />
          {copy.phone.found}
          <Check className="ml-auto size-4 text-brass" />
        </div>
        <div className="flex items-center justify-center gap-2 rounded-full bg-brass py-3 font-sans text-sm font-medium text-ink">
          <QrCode className="size-4" />
          {copy.phone.scan}
        </div>
      </div>
    </div>
  )
}

/** C. Equation: escape room + your city + your phone = The Hunt. */
function WhatEquation({ copy }: { copy: WhatCopy }) {
  const icons = [DoorOpen, MapPin, Smartphone]
  return (
    <section id="what" className="light scroll-mt-16 bg-background py-24 text-foreground md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6">
        <Rise>
          <Heading copy={copy} className="max-w-4xl" />
        </Rise>
        <Rise delay={0.1}>
          <ol className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {copy.equation.map((term, index) => {
              const Icon = icons[index]
              return (
                <li key={term} className="flex flex-col items-stretch gap-3 md:flex-1 md:flex-row md:items-center">
                  <span className="flex flex-1 items-center gap-3 border border-foreground/20 px-5 py-6 font-serif text-2xl md:flex-col md:items-start md:text-3xl">
                    <Icon className="size-6 text-brass" aria-hidden="true" />
                    {term}
                  </span>
                  <span className="text-center font-serif text-3xl text-brass" aria-hidden="true">
                    {index < copy.equation.length - 1 ? "+" : "="}
                  </span>
                </li>
              )
            })}
            <li className="flex items-center justify-center bg-foreground px-6 py-6 font-serif text-2xl text-background md:py-10 md:text-3xl">
              The Hunt
            </li>
          </ol>
        </Rise>
        <Rise delay={0.2} className="flex flex-col gap-8">
          <Body copy={copy} />
          <Cta copy={copy} />
        </Rise>
      </div>
    </section>
  )
}

/** D. Photo: a real moment from a game next to the plain explanation. */
function WhatPhoto({ copy }: { copy: WhatCopy }) {
  return (
    <section id="what" className="light scroll-mt-16 bg-background py-24 text-foreground md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <Rise className="relative aspect-[4/5] w-full overflow-hidden">
          <Image src={copy.image} alt={copy.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          <p className="absolute inset-x-0 bottom-0 bg-foreground/90 px-5 py-4 font-serif text-lg italic text-background">{copy.compare}</p>
        </Rise>
        <Rise delay={0.1} className="flex flex-col gap-8">
          <Heading copy={copy} />
          <Body copy={copy} />
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {copy.facts.map((fact) => (
              <div key={fact.q} className="flex flex-col gap-1 border-t border-foreground/15 pt-3">
                <dt className="font-sans text-xs uppercase tracking-[0.25em] text-brass">{fact.q}</dt>
                <dd className="font-sans text-base leading-relaxed">{fact.a}</dd>
              </div>
            ))}
          </dl>
          <Cta copy={copy} />
        </Rise>
      </div>
    </section>
  )
}

/** E. Questions: the four things everyone asks first, answered in one line each. */
function WhatQuestions({ copy }: { copy: WhatCopy }) {
  return (
    <section id="what" className="scroll-mt-16 border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
        <Rise className="flex flex-col gap-6">
          <Heading copy={copy} className="max-w-4xl" />
          <p className="font-serif text-xl italic text-brass md:text-2xl">{copy.compare}</p>
        </Rise>
        <dl className="flex flex-col">
          {copy.facts.map((fact, index) => (
            <Rise key={fact.q} delay={index * 0.06}>
              <div className="grid gap-2 border-t border-border/60 py-6 md:grid-cols-[16rem_1fr] md:items-baseline md:gap-8">
                <dt className="font-sans text-sm uppercase tracking-[0.25em] text-foreground/60">{fact.q}</dt>
                <dd className="text-pretty font-serif text-2xl leading-snug md:text-4xl">{fact.a}</dd>
              </div>
            </Rise>
          ))}
        </dl>
        <Rise className="flex flex-col gap-8">
          <Body copy={copy} />
          <Cta copy={copy} />
        </Rise>
      </div>
    </section>
  )
}

const WHAT: Record<string, ComponentType<{ copy: WhatCopy }>> = {
  plain: WhatPlain,
  phone: WhatPhone,
  equation: WhatEquation,
  photo: WhatPhoto,
  questions: WhatQuestions,
}

export function WhatIs({ copy, variant }: { copy: WhatCopy; variant: string }) {
  const Variant = WHAT[variant] ?? WhatPlain
  return <Variant copy={copy} />
}
