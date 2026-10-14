"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"

/**
 * Four tall panels side by side; the one you hover or tap opens wide and shows its step.
 * The open text has a fixed width so it never re-wraps while the panel is still growing.
 */
export function HowAccordion({ copy }: { copy: LandingCopy["how"] }) {
  const [active, setActive] = useState(0)

  return (
    <section id="how" className="scroll-mt-16 bg-background py-28 md:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-4xl leading-[1.05] text-foreground text-balance md:text-6xl">{copy.title}</h2>
          </div>
          <p className="max-w-sm font-serif text-xl italic leading-relaxed text-foreground/70 text-pretty">{copy.note}</p>
        </div>

        <ol className="flex flex-col gap-3 lg:h-[72svh] lg:flex-row">
          {copy.steps.map((step, index) => {
            const open = active === index
            return (
              <li
                key={step.title}
                onMouseEnter={() => setActive(index)}
                className={`relative isolate min-h-[60svh] overflow-hidden rounded-sm transition-[flex-grow] duration-700 ease-out lg:min-h-0 ${
                  open ? "lg:flex-[3.2]" : "lg:flex-1"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  aria-expanded={open}
                  className="absolute inset-0 z-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
                >
                  <span className="sr-only">{step.title}</span>
                </button>
                <Image
                  unoptimized
                  loading="eager"
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className={`-z-10 object-cover transition-[filter,transform] duration-700 ${open ? "scale-100 brightness-[0.6]" : "scale-110 brightness-[0.3] grayscale"}`}
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/20 to-transparent" aria-hidden="true" />
                {index === 2 && <Clue id="scene" className="absolute right-6 top-6 z-20" />}

                <span className="absolute left-5 top-5 font-sans text-xs uppercase tracking-[0.3em] text-brass">
                  {copy.scene} {String(index + 1).padStart(2, "0")}
                </span>

                <span
                  className={`absolute bottom-8 left-4 hidden font-serif text-2xl text-foreground/80 transition-opacity duration-300 [writing-mode:vertical-rl] lg:block lg:rotate-180 ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                  aria-hidden="true"
                >
                  {step.title}
                </span>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 md:p-8 lg:hidden">
                  <h3 className="font-serif text-3xl text-foreground">{step.title}</h3>
                  <p className="max-w-md font-sans text-base leading-relaxed text-foreground/80">{step.body}</p>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      className="pointer-events-none absolute bottom-0 left-0 hidden w-[min(30rem,40vw)] flex-col gap-3 p-10 lg:flex"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5, ease: EASE } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    >
                      <h3 className="font-serif text-5xl leading-tight text-foreground">{step.title}</h3>
                      <p className="max-w-md font-sans text-lg leading-relaxed text-foreground/80">{step.body}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
