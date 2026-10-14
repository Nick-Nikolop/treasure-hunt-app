"use client"

import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

/**
 * Every answer printed at once on paper, set in two columns.
 * On phones the answers become a swipeable row so the section still fits one screen.
 */
export function FaqOpen({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section
      id="faq"
      className="light flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center bg-background py-6 text-foreground md:py-10"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 md:gap-8 md:px-10">
        <div className="flex flex-col items-center gap-2 text-center md:gap-3">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl text-balance md:text-5xl">{copy.title}</h2>
          <span className="h-px w-16 bg-brass" aria-hidden="true" />
        </div>
        <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 md:mx-0 md:block md:columns-2 md:gap-12 md:overflow-visible md:px-0 md:pb-0">
          {copy.items.map((item, index) => (
            <Rise
              key={item.q}
              delay={index * 0.04}
              y={16}
              className="w-[82%] shrink-0 snap-center border border-foreground/15 p-5 md:mb-6 md:w-auto md:break-inside-avoid md:border-0 md:p-0"
            >
              <h3 className="font-serif text-xl leading-tight md:text-2xl">{item.q}</h3>
              <p className="pt-2 font-sans text-[15px] leading-relaxed text-foreground/75">
                {item.a}
                {index === copy.items.length - 1 && <Clue id="faq" className="-my-2 ml-1" />}
              </p>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  )
}
