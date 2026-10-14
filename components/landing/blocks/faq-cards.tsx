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
    <section id="faq" className="scroll-mt-16 border-t border-border/60 bg-background py-28 md:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
          </div>
          <p className="flex items-center gap-2 font-sans text-sm text-muted-foreground lg:hidden">
            <RotateCw className="size-4 text-brass" aria-hidden="true" />
            {copy.flip}
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {copy.items.map((item, index) => {
            const open = flipped.includes(index)
            return (
              <li key={item.q} className="[perspective:1400px]">
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
                  className="grid h-full min-h-60 w-full text-left [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                  animate={{ rotateY: open ? 180 : 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <span className="flex flex-col justify-between gap-6 rounded-sm border border-border bg-card p-6 [backface-visibility:hidden] [grid-area:1/1]">
                    <span className="font-serif text-sm italic text-brass">{String.fromCharCode(945 + index)}.</span>
                    <span className="font-serif text-2xl leading-tight text-foreground text-balance">{item.q}</span>
                  </span>
                  <span className="light flex flex-col justify-center gap-3 rounded-sm bg-background p-6 text-foreground [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]">
                    <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-brass">{item.q}</span>
                    <span className="font-sans text-[15px] leading-relaxed text-foreground/80">
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
          <li className="hidden flex-col justify-end gap-3 border border-dashed border-brass/50 p-6 lg:flex" aria-hidden="true">
            <RotateCw className="size-5 text-brass" />
            <span className="font-serif text-xl italic text-foreground/70">{copy.flip}</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
