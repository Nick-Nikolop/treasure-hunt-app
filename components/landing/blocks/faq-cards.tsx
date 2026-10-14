"use client"

import { motion } from "framer-motion"
import { RotateCw } from "lucide-react"
import { useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"

/** Each question is a card; tap it to turn it over and read the answer. */
export function FaqCards({ copy }: { copy: LandingCopy["faq"] }) {
  const [flipped, setFlipped] = useState<number[]>([])
  const toggle = (index: number) =>
    setFlipped((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]))

  return (
    <section
      id="faq"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center border-t border-border/60 bg-background py-6 md:py-10"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 md:gap-8 md:px-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="flex flex-col gap-2 md:gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-3xl text-foreground text-balance md:text-5xl">{copy.title}</h2>
          </div>
          <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground lg:hidden">
            <RotateCw className="size-4 text-brass" aria-hidden="true" />
            {copy.flip}
          </p>
        </div>

        <ul className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-4">
          {copy.items.map((item, index) => {
            const open = flipped.includes(index)
            return (
              <li key={item.q} className="w-[78%] shrink-0 snap-center [perspective:1400px] sm:w-auto">
                <motion.div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(index)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return
                    event.preventDefault()
                    toggle(index)
                  }}
                  aria-pressed={open}
                  className="grid h-full min-h-72 w-full text-left [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:min-h-40 lg:min-h-48"
                  animate={{ rotateY: open ? 180 : 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <span className="flex flex-col justify-between gap-4 rounded-sm border border-border bg-card p-5 [backface-visibility:hidden] [grid-area:1/1]">
                    <span className="font-serif text-sm italic text-brass">{String.fromCharCode(945 + index)}.</span>
                    <span className="font-serif text-xl leading-tight text-foreground text-balance lg:text-2xl">{item.q}</span>
                  </span>
                  <span className="light flex flex-col justify-center gap-2 rounded-sm bg-background p-5 text-foreground [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]">
                    <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-brass">{item.q}</span>
                    <span className="font-sans text-sm leading-relaxed text-foreground/80 lg:text-[15px]">
                      {item.a}
                      {index === copy.items.length - 1 && (
                        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                          <Clue id="faq" className="-my-2 ml-1" />
                        </span>
                      )}
                    </span>
                  </span>
                </motion.div>
              </li>
            )
          })}
          <li className="hidden flex-col justify-end gap-3 border border-dashed border-brass/50 p-5 lg:flex" aria-hidden="true">
            <RotateCw className="size-5 text-brass" />
            <span className="font-serif text-xl italic text-foreground/70">{copy.flip}</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
