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
    <section id="how" className="flex h-[calc(100svh-4rem)] scroll-mt-16 bg-background py-6 md:py-10">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5 px-6 md:gap-8 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="flex max-w-3xl flex-col gap-2 md:gap-3">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-3xl leading-[1.05] text-foreground text-balance md:text-5xl">{copy.title}</h2>
          </div>
          <p className="hidden max-w-sm font-serif text-xl italic leading-relaxed text-foreground/70 text-pretty md:block">
            {copy.note}
          </p>
        </div>

        <ol className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
          {copy.steps.map((step, index) => {
            const open = active === index
            return (
              <li
                key={step.title}
                onMouseEnter={() => setActive(index)}
                className={`relative isolate min-h-0 overflow-hidden rounded-sm transition-[flex-grow] duration-700 ease-out ${
                  open ? "flex-[6] lg:flex-[3.2]" : "flex-1"
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

                <span
                  className={`absolute left-4 font-sans text-xs uppercase tracking-[0.3em] text-brass lg:left-5 lg:top-5 lg:translate-y-0 ${
                    open ? "top-4" : "top-1/2 -translate-y-1/2"
                  }`}
                >
                  {copy.scene} {String(index + 1).padStart(2, "0")}
                  {!open && <span className="ml-3 font-serif text-base normal-case tracking-normal text-foreground/85 lg:hidden">{step.title}</span>}
                </span>

                <span
                  className={`absolute bottom-8 left-4 hidden font-serif text-2xl text-foreground/80 transition-opacity duration-300 [writing-mode:vertical-rl] lg:block lg:rotate-180 ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                  aria-hidden="true"
                >
                  {step.title}
                </span>

                {open && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 md:p-8 lg:hidden">
                    <h3 className="font-serif text-2xl text-foreground md:text-3xl">{step.title}</h3>
                    <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/80">{step.body}</p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      className="pointer-events-none absolute bottom-0 left-0 hidden w-[min(30rem,40vw)] flex-col gap-3 p-10 lg:flex"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5, ease: EASE } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    >
                      <h3 className="font-serif text-4xl leading-tight text-foreground">{step.title}</h3>
                      <p className="max-w-md font-sans text-base leading-relaxed text-foreground/80">{step.body}</p>
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
