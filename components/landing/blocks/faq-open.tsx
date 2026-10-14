"use client"

import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

/** Every answer printed at once on paper, set in two newspaper-like columns. */
export function FaqOpen({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section id="faq" className="light scroll-mt-16 bg-background py-28 text-foreground md:py-36">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 md:px-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-balance md:text-6xl">{copy.title}</h2>
          <span className="h-px w-16 bg-brass" aria-hidden="true" />
        </div>
        <div className="columns-1 gap-14 md:columns-2">
          {copy.items.map((item, index) => (
            <Rise key={item.q} delay={index * 0.04} y={16} className="mb-10 break-inside-avoid">
              <h3 className="font-serif text-2xl leading-tight md:text-3xl">{item.q}</h3>
              <p className="pt-3 font-sans text-base leading-relaxed text-foreground/75">
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
