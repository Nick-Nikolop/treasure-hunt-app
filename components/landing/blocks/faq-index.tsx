"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"

/** A table of contents on the left; the chosen answer is set large on the right. */
export function FaqIndex({ copy }: { copy: LandingCopy["faq"] }) {
  const [active, setActive] = useState(0)

  const answer = (index: number) => (
    <p className="font-serif text-2xl leading-snug text-foreground text-pretty md:text-4xl">
      {copy.items[index].a}
      {index === copy.items.length - 1 && <Clue id="faq" className="-my-2 ml-2" />}
    </p>
  )

  return (
    <section id="faq" className="scroll-mt-16 border-t border-border/60 bg-background py-28 md:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 md:px-10">
        <div className="flex flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <ol className="flex flex-col border-t border-border/60">
            {copy.items.map((item, index) => {
              const open = active === index
              return (
                <li key={item.q} className="border-b border-border/60">
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-expanded={open}
                    className={`group flex w-full items-baseline gap-4 py-5 text-left transition-colors ${open ? "text-brass" : "text-foreground/70 hover:text-foreground"}`}
                  >
                    <span className="w-6 font-sans text-xs tabular-nums text-foreground/40">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex-1 font-serif text-xl md:text-2xl">{item.q}</span>
                    <span
                      className={`h-px bg-brass transition-all duration-500 ${open ? "w-10" : "w-0 group-hover:w-4"}`}
                      aria-hidden="true"
                    />
                  </button>
                  {open && <div className="pb-6 pl-10 lg:hidden">{answer(index)}</div>}
                </li>
              )
            })}
          </ol>

          <div className="relative hidden min-h-80 lg:block">
            <div className="sticky top-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="flex flex-col gap-6 border-l-2 border-brass pl-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{copy.items[active].q}</p>
                  {answer(active)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
