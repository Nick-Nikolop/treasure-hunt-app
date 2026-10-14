"use client"

import { ArrowRight, BookOpen, MapPin, Puzzle, Smartphone } from "lucide-react"
import { Fragment } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

type WhatCopy = LandingCopy["what"]

const TERM_ICONS = [BookOpen, Puzzle, MapPin, Smartphone]

/** The hero's darkness spilling over the top of the parchment, as on the `/` landing: no hard edge, just shadow lifting off the paper. */
function ShadowEdge() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-48 md:h-72"
      style={{
        background:
          "linear-gradient(to bottom, var(--ink) 0%, color-mix(in oklab, var(--ink) 85%, transparent) 16%, color-mix(in oklab, var(--ink) 48%, transparent) 42%, color-mix(in oklab, var(--ink) 15%, transparent) 70%, transparent 100%)",
      }}
    />
  )
}

function Sign() {
  return (
    <li aria-hidden="true" className="hidden items-center justify-center font-serif text-3xl text-brass lg:flex">
      +
    </li>
  )
}

/** The four boxed terms joined by "+", closed by a dark "= The Hunt" bar. */
export function WhatIs({ copy }: { copy: WhatCopy; variant?: string }) {
  return (
    <>
      <section
        id="what"
        className="light relative flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center overflow-hidden bg-background pb-8 pt-28 text-foreground md:pb-14 md:pt-40"
      >
        <ShadowEdge />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-7 px-6 md:gap-10">
          <Rise>
            <div className="flex max-w-4xl flex-col gap-3 md:gap-4">
              <Label>{copy.label}</Label>
              <h2 className="text-balance font-serif text-3xl leading-[1.1] md:text-5xl">{copy.title}</h2>
            </div>
          </Rise>

          <Rise delay={0.1} className="flex flex-col gap-2 sm:gap-3">
            <ol className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
              {copy.equation.map((term, index) => {
                const Icon = TERM_ICONS[index]
                return (
                  <Fragment key={term}>
                    <li className="flex flex-col gap-2 border border-foreground/20 px-4 py-3 lg:gap-4 lg:px-5 lg:py-5">
                      <Icon className="size-5 shrink-0 text-brass lg:size-6" aria-hidden="true" />
                      <span className="font-serif text-xl leading-tight lg:text-3xl">{term}</span>
                    </li>
                    {index < copy.equation.length - 1 && <Sign />}
                  </Fragment>
                )
              })}
            </ol>
            <div className="flex flex-col gap-2 bg-foreground px-5 py-4 text-background md:flex-row md:items-center md:justify-between md:gap-8 md:px-10 md:py-6">
              <span className="font-serif text-3xl leading-none md:text-5xl">
                <span className="text-brass">= </span>The Hunt
              </span>
              <span className="max-w-[40ch] font-sans text-sm leading-relaxed text-background/75 md:text-right md:text-base">
                {copy.result}
              </span>
            </div>
          </Rise>

          <Rise delay={0.2} className="flex flex-col gap-5 md:gap-6">
            <p className="max-w-[62ch] text-pretty font-sans text-[15px] leading-relaxed text-foreground/80 md:text-base">
              {copy.body} <Clue id="story" className="-my-2" />
            </p>
            <a
              href="#how"
              className="inline-flex items-center gap-2 self-start border-b border-brass pb-1 font-sans text-sm uppercase tracking-[0.2em] text-brass hover:text-foreground"
            >
              {copy.cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Rise>
        </div>
      </section>
    </>
  )
}
