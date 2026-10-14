"use client"

import { ArrowRight, BookOpen, MapPin, Puzzle, Smartphone } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Fragment, type ComponentType, type ReactNode } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

type WhatCopy = LandingCopy["what"]

const TERM_ICONS = [BookOpen, Puzzle, MapPin, Smartphone]

/** Every variant is the same light "story + puzzles + Kalamata + phone = The Hunt" idea, laid out differently. */
function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      id="what"
      className={`light flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center bg-background py-8 text-foreground md:py-14 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-6 md:gap-10">{children}</div>
    </section>
  )
}

function Cta({ copy, desktopOnly = false }: { copy: WhatCopy; desktopOnly?: boolean }) {
  return (
    <a
      href="#how"
      className={`${desktopOnly ? "hidden md:inline-flex" : "inline-flex"} items-center gap-2 self-start border-b border-brass pb-1 font-sans text-sm uppercase tracking-[0.2em] text-brass hover:text-foreground`}
    >
      {copy.cta}
      <ArrowRight className="size-4" aria-hidden="true" />
    </a>
  )
}

function Heading({ copy, className = "" }: { copy: WhatCopy; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 md:gap-4 ${className}`}>
      <Label>{copy.label}</Label>
      <h2 className="text-balance font-serif text-3xl leading-[1.1] md:text-5xl">{copy.title}</h2>
    </div>
  )
}

function Body({ copy }: { copy: WhatCopy }) {
  return (
    <p className="max-w-[62ch] text-pretty font-sans text-[15px] leading-relaxed text-foreground/80 md:text-base">
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

/** The four boxed terms joined by "+", shared by the layouts that box their terms. */
function TermRow({ copy, notes = false }: { copy: WhatCopy; notes?: boolean }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
      {copy.equation.map((term, index) => {
        const Icon = TERM_ICONS[index]
        return (
          <Fragment key={term}>
            <li
              className={`flex flex-col border border-foreground/20 ${
                notes ? "gap-3 p-4 lg:gap-5 lg:p-6" : "gap-2 px-4 py-3 lg:gap-4 lg:px-5 lg:py-5"
              }`}
            >
              {notes ? (
                <span className="flex size-9 items-center justify-center rounded-full border border-brass/50 lg:size-11">
                  <Icon className="size-4 text-brass lg:size-5" aria-hidden="true" />
                </span>
              ) : (
                <Icon className="size-5 shrink-0 text-brass lg:size-6" aria-hidden="true" />
              )}
              <span className="font-serif text-xl leading-tight lg:text-3xl">{term}</span>
              {notes && (
                <span className="mt-auto font-sans text-sm leading-relaxed text-foreground/70 lg:text-[15px]">
                  {copy.notes[index]}
                </span>
              )}
            </li>
            {index < copy.equation.length - 1 && (
              <li aria-hidden="true" className="hidden items-center justify-center lg:flex">
                <Sign last={false} className="text-3xl" />
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}

/** The dark "= The Hunt" bar that closes the equation. */
function ResultBar({ copy, large = false }: { copy: WhatCopy; large?: boolean }) {
  return (
    <div className="flex flex-col gap-2 bg-foreground px-5 py-4 text-background md:flex-row md:items-center md:justify-between md:gap-8 md:px-10 md:py-6">
      <span className={`font-serif leading-none ${large ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"}`}>
        <span className="text-brass">= </span>The Hunt
      </span>
      <span className="max-w-[40ch] font-sans text-sm leading-relaxed text-background/75 md:text-right md:text-base">
        {copy.result}
      </span>
    </div>
  )
}

/** A. The four boxed terms in one row, closed by a dark "= The Hunt" bar. */
function WhatEquation({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <Rise>
        <Heading copy={copy} className="max-w-4xl" />
      </Rise>
      <Rise delay={0.1} className="flex flex-col gap-2 sm:gap-3">
        <TermRow copy={copy} />
        <ResultBar copy={copy} />
      </Rise>
      <Rise delay={0.2} className="flex flex-col gap-5 md:gap-6">
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
      <Rise className="flex flex-col gap-4 md:gap-5">
        <Heading copy={copy} className="max-w-4xl" />
        <Body copy={copy} />
      </Rise>
      <div className="flex flex-col gap-2 sm:gap-3">
        <Rise delay={0.1}>
          <TermRow copy={copy} notes />
        </Rise>
        <Rise delay={0.3}>
          <ResultBar copy={copy} large />
        </Rise>
      </div>
      <Cta copy={copy} desktopOnly />
    </Shell>
  )
}

/** C. The equation set in huge type, one term per line, next to the explanation. */
function WhatStack({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <div className="grid items-end gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <Rise>
          <ol className="flex flex-col" aria-label={`${copy.equation.join(" + ")} = The Hunt`}>
            {copy.equation.map((term, index) => {
              const Icon = TERM_ICONS[index]
              return (
                <li key={term} className="flex items-center gap-3 border-b border-foreground/15 py-2 md:gap-4 md:py-3">
                  <span className="w-6 font-serif text-3xl text-brass md:w-12 md:text-6xl" aria-hidden="true">
                    {index === 0 ? "" : "+"}
                  </span>
                  <span className="flex-1 font-serif text-3xl leading-none md:text-6xl">{term}</span>
                  <Icon className="size-5 shrink-0 text-brass md:size-8" aria-hidden="true" />
                </li>
              )
            })}
            <li className="mt-2 flex items-center gap-3 bg-foreground px-3 py-3 text-background md:gap-4 md:px-4 md:py-5">
              <span className="w-6 font-serif text-3xl text-brass md:w-12 md:text-6xl" aria-hidden="true">
                =
              </span>
              <span className="font-serif text-3xl leading-none md:text-6xl">The Hunt</span>
            </li>
          </ol>
        </Rise>
        <Rise delay={0.15} className="flex flex-col gap-4 md:gap-6">
          <Label>{copy.label}</Label>
          <h2 className="text-balance font-serif text-2xl leading-[1.1] md:text-4xl">{copy.title}</h2>
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
      <div className="flex flex-col gap-5 border-y border-foreground/15 py-6 md:gap-6 md:py-10">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-5 lg:flex lg:items-start lg:gap-5">
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <li key={term} className="flex flex-col gap-4 lg:flex-1 lg:flex-row lg:items-start lg:gap-5">
                <motion.div {...step(index)} className="flex flex-1 flex-col gap-2 lg:gap-3">
                  <Icon className="size-5 text-brass lg:size-6" aria-hidden="true" />
                  <span className="font-serif text-2xl leading-tight lg:text-3xl">{term}</span>
                  <span className="font-sans text-sm leading-relaxed text-foreground/65 md:text-[15px]">{copy.notes[index]}</span>
                </motion.div>
                {index < count - 1 && (
                  <motion.span
                    {...step(index + 0.5)}
                    className="hidden font-serif text-3xl text-brass lg:block lg:pt-8"
                    aria-hidden="true"
                  >
                    +
                  </motion.span>
                )}
              </li>
            )
          })}
        </ol>
        <motion.div {...step(count)}>
          <ResultBar copy={copy} large />
        </motion.div>
      </div>
      <Rise className="flex flex-col gap-5 md:gap-6">
        <Body copy={copy} />
        <Cta copy={copy} desktopOnly />
      </Rise>
    </Shell>
  )
}

/** E. The equation itself is the headline; the plain title and answers follow underneath. */
function WhatSentence({ copy }: { copy: WhatCopy }) {
  return (
    <Shell>
      <Rise className="flex flex-col gap-4 md:gap-6">
        <Label>{copy.label}</Label>
        <p
          className="text-balance font-serif text-[1.75rem] leading-[1.2] md:text-6xl"
          aria-label={`${copy.equation.join(" + ")} = The Hunt`}
        >
          {copy.equation.map((term, index) => {
            const Icon = TERM_ICONS[index]
            return (
              <span key={term} aria-hidden="true">
                <span className="whitespace-nowrap">
                  <Icon className="mr-2 inline size-6 -translate-y-1 text-brass md:size-10 md:-translate-y-2" />
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
      <Rise delay={0.1} className="grid gap-6 border-t border-foreground/15 pt-6 lg:grid-cols-2 lg:gap-16 lg:pt-8">
        <div className="flex flex-col gap-4 md:gap-5">
          <h2 className="text-balance font-serif text-xl leading-snug md:text-3xl">{copy.title}</h2>
          <Body copy={copy} />
          <Cta copy={copy} />
        </div>
        <dl className="hidden grid-cols-2 gap-x-8 gap-y-5 md:grid">
          {copy.facts.map((fact) => (
            <div key={fact.q} className="flex flex-col gap-1 border-t border-foreground/15 pt-3">
              <dt className="font-sans text-xs uppercase tracking-[0.25em] text-brass">{fact.q}</dt>
              <dd className="font-sans text-[15px] leading-relaxed">{fact.a}</dd>
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
