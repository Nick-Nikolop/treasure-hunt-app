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
    <p className="font-serif text-lg leading-snug text-foreground text-pretty md:text-3xl">
      {copy.items[index].a}
      {index === copy.items.length - 1 && <Clue id="faq" className="-my-2 ml-2" />}
    </p>
  )

  return (
    <section
      id="faq"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center border-t border-border/60 bg-background py-6 md:py-10"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 md:gap-10 md:px-10">
        <div className="flex flex-col gap-2 md:gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl text-foreground text-balance md:text-5xl">{copy.title}</h2>
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
                    className={`group flex w-full items-baseline gap-4 py-3 text-left transition-colors md:py-4 ${open ? "text-brass" : "text-foreground/70 hover:text-foreground"}`}
                  >
                    <span className="w-6 font-sans text-xs tabular-nums text-foreground/40">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex-1 font-serif text-lg leading-snug md:text-2xl">{item.q}</span>
                    <span
                      className={`h-px bg-brass transition-all duration-500 ${open ? "w-10" : "w-0 group-hover:w-4"}`}
                      aria-hidden="true"
                    />
                  </button>
                  {open && <div className="pb-4 pl-10 lg:hidden">{answer(index)}</div>}
                </li>
              )
            })}
          </ol>

          <div className="relative hidden lg:block">
            <div>
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
