"use client"

import { ArrowRight, DoorOpen, MapPin, Smartphone } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Fragment, type ComponentType, type ReactNode } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

type WhatCopy = LandingCopy["what"]

const TERM_ICONS = [DoorOpen, MapPin, Smartphone]

/** Every variant is the same light "escape room + city + phone = The Hunt" idea, laid out differently. */
function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section id="what" className={`light scroll-mt-16 bg-background py-24 text-foreground md:py-32 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6">{children}</div>
    </section>
  )
}

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

function Sign({ last, className = "" }: { last: boolean; className?: string }) {
  return (
    <span className={`text-center font-serif text-brass ${className}`} aria-hidden="true">
      {last ? "=" : "+"}
    </span>
  )
}

/** A. One row of boxed terms ending in a dark "The Hunt" block. */
function WhatEquation({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <Rise>
        <Heading copy={copy} className="max-w-4xl" />
      </Rise>
      <Rise delay={0.1}>
        <ol className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <li key={term} className="flex flex-col items-stretch gap-3 md:flex-1 md:flex-row md:items-center">
                <span className="flex flex-1 items-center gap-3 border border-foreground/20 px-5 py-6 font-serif text-2xl md:flex-col md:items-start md:text-3xl">
                  <Icon className="size-6 text-brass" aria-hidden="true" />
                  {term}
                </span>
                <Sign last={index === copy.equation.length - 1} className="text-3xl" />
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
    </Shell>
  )
}

/** B. Each term is a tall card that says what it brings; the result is a full-width dark bar. */
function WhatCards({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <Rise className="flex flex-col gap-8">
        <Heading copy={copy} className="max-w-4xl" />
        <Body copy={copy} />
      </Rise>
      <div className="flex flex-col gap-3">
        <Rise delay={0.1}>
        <ol className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <Fragment key={term}>
                <li className="flex flex-col gap-6 border border-foreground/20 p-6 md:p-8">
                  <span className="flex size-12 items-center justify-center rounded-full border border-brass/50">
                    <Icon className="size-5 text-brass" aria-hidden="true" />
                  </span>
                  <span className="font-serif text-3xl leading-tight">{term}</span>
                  <span className="mt-auto font-sans text-base leading-relaxed text-foreground/70">{copy.notes[index]}</span>
                </li>
                {index < copy.equation.length - 1 && (
                  <li aria-hidden="true" className="flex items-center justify-center">
                    <Sign last={false} className="text-4xl" />
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
        </Rise>
        <Rise delay={0.3}>
          <div className="flex flex-col gap-2 bg-foreground px-6 py-8 text-background md:flex-row md:items-center md:justify-between md:px-10">
            <span className="font-serif text-4xl md:text-5xl">
              <span className="text-brass">= </span>The Hunt
            </span>
            <span className="font-sans text-base leading-relaxed text-background/75">{copy.result}</span>
          </div>
        </Rise>
      </div>
      <Cta copy={copy} />
    </Shell>
  )
}

/** C. The equation set in huge type, one term per line, next to the explanation. */
function WhatStack({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <div className="grid items-end gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <Rise>
          <ol className="flex flex-col" aria-label={`${copy.equation.join(" + ")} = The Hunt`}>
            {copy.equation.map((term, index) => {
              const Icon = TERM_ICONS[index]
              return (
                <li key={term} className="flex items-center gap-4 border-b border-foreground/15 py-3 md:py-4">
                  <span className="w-8 font-serif text-4xl text-brass md:w-12 md:text-6xl" aria-hidden="true">
                    {index === 0 ? "" : "+"}
                  </span>
                  <span className="flex-1 font-serif text-4xl leading-none md:text-7xl">{term}</span>
                  <Icon className="size-6 shrink-0 text-brass md:size-8" aria-hidden="true" />
                </li>
              )
            })}
            <li className="mt-3 flex items-center gap-4 bg-foreground px-4 py-4 text-background md:py-6">
              <span className="w-8 font-serif text-4xl text-brass md:w-12 md:text-6xl" aria-hidden="true">
                =
              </span>
              <span className="font-serif text-4xl leading-none md:text-7xl">The Hunt</span>
            </li>
          </ol>
        </Rise>
        <Rise delay={0.15} className="flex flex-col gap-8">
          <Label>{copy.label}</Label>
          <h2 className="text-balance font-serif text-3xl leading-[1.1] md:text-4xl">{copy.title}</h2>
          <Body copy={copy} />
          <Cta copy={copy} />
        </Rise>
      </div>
    </Shell>
  )
}

/** D. The equation assembles itself term by term as it scrolls into view. */
function WhatBuild({ copy }: { copy: WhatCopy }) {
  const reduce = useReducedMotion()
  const step = (index: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.6 },
    transition: { duration: 0.6, delay: index * 0.45, ease: [0.22, 1, 0.36, 1] as const },
  })
  const count = copy.equation.length
  return (
    <Shell>
      <Rise>
        <Heading copy={copy} className="max-w-4xl" />
      </Rise>
      <div className="flex flex-col gap-6 border-y border-foreground/15 py-10 md:py-14">
        <ol className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <li key={term} className="flex flex-col gap-4 md:flex-1 md:flex-row md:items-start md:gap-6">
                <motion.div {...step(index)} className="flex flex-1 flex-col gap-3">
                  <Icon className="size-6 text-brass" aria-hidden="true" />
                  <span className="font-serif text-3xl leading-tight md:text-4xl">{term}</span>
                  <span className="font-sans text-sm leading-relaxed text-foreground/65 md:text-base">{copy.notes[index]}</span>
                </motion.div>
                {index < count - 1 && (
                  <motion.span {...step(index + 0.5)} className="font-serif text-4xl text-brass md:pt-8" aria-hidden="true">
                    +
                  </motion.span>
                )}
              </li>
            )
          })}
        </ol>
        <motion.div
          {...step(count)}
          className="flex flex-col gap-3 bg-foreground px-6 py-8 text-background md:flex-row md:items-baseline md:gap-6 md:px-10"
        >
          <span className="font-serif text-5xl md:text-7xl">
            <span className="text-brass">= </span>The Hunt
          </span>
          <span className="font-sans text-base leading-relaxed text-background/75">{copy.result}</span>
        </motion.div>
      </div>
      <Rise className="flex flex-col gap-8">
        <Body copy={copy} />
        <Cta copy={copy} />
      </Rise>
    </Shell>
  )
}

/** E. The equation itself is the headline; the plain title and answers follow underneath. */
function WhatSentence({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <Rise className="flex flex-col gap-8">
        <Label>{copy.label}</Label>
        <p
          className="text-balance font-serif text-4xl leading-[1.15] md:text-7xl"
          aria-label={`${copy.equation.join(" + ")} = The Hunt`}
        >
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <span key={term} aria-hidden="true">
                <span className="whitespace-nowrap">
                  <Icon className="mr-2 inline size-7 -translate-y-1 text-brass md:size-12 md:-translate-y-2" />
                  {term}
                </span>{" "}
                <span className="text-brass">{index < copy.equation.length - 1 ? "+" : "="}</span>{" "}
              </span>
            )
          })}
          <span aria-hidden="true" className="whitespace-nowrap bg-foreground px-3 text-background">
            The Hunt
          </span>
        </p>
      </Rise>
      <Rise delay={0.1} className="grid gap-10 border-t border-foreground/15 pt-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="text-balance font-serif text-2xl leading-snug md:text-3xl">{copy.title}</h2>
          <Body copy={copy} />
          <Cta copy={copy} />
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {copy.facts.map((fact) => (
            <div key={fact.q} className="flex flex-col gap-1 border-t border-foreground/15 pt-3">
              <dt className="font-sans text-xs uppercase tracking-[0.25em] text-brass">{fact.q}</dt>
              <dd className="font-sans text-base leading-relaxed">{fact.a}</dd>
            </div>
          ))}
        </dl>
      </Rise>
    </Shell>
  )
}

const WHAT: Record<string, ComponentType<{ copy: WhatCopy }>> = {
  equation: WhatEquation,
  cards: WhatCards,
  stack: WhatStack,
  build: WhatBuild,
  sentence: WhatSentence,
}

export function WhatIs({ copy, variant }: { copy: WhatCopy; variant: string }) {
  const Variant = WHAT[variant] ?? WhatEquation
  return <Variant copy={copy} />
}
