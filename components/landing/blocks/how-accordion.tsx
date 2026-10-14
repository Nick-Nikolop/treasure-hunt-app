"use client"

import Image from "next/image"
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, useState } from "react"
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

        <MobileSteps copy={copy} />

        <ol className="hidden min-h-0 flex-1 flex-col gap-2 lg:flex lg:flex-row lg:gap-3">
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

const STEP_MS = 6000

/**
 * Phones: one step at a time, story-style. Gold bars at the top fill and advance on their own
 * while the section is on screen; swipe or use the arrows to move manually.
 */
function MobileSteps({ copy }: { copy: LandingCopy["how"] }) {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.6 })
  const reduce = useReducedMotion()
  const total = copy.steps.length
  const step = copy.steps[active]
  const go = (index: number) => setActive((index + total) % total)
  const playing = inView && !reduce

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden">
      <div className="flex gap-1.5" role="tablist" aria-label={copy.label}>
        {copy.steps.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`${copy.scene} ${index + 1}: ${item.title}`}
            onClick={() => go(index)}
            className="flex h-6 flex-1 items-center"
          >
            <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-foreground/15">
              {index < active && <span className="absolute inset-0 bg-brass" />}
              {index === active && (
                <motion.span
                  key={`${active}-${playing}`}
                  className="absolute inset-y-0 left-0 bg-brass"
                  initial={{ width: playing ? "0%" : "100%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: playing ? STEP_MS / 1000 : 0, ease: "linear" }}
                  onAnimationComplete={() => playing && go(active + 1)}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        className="relative isolate min-h-0 flex-1 touch-pan-y overflow-hidden rounded-sm border border-brass/25"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) go(active + 1)
          else if (info.offset.x > 50) go(active - 1)
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={step.image}
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <Image unoptimized loading="eager" src={step.image} alt={step.alt} fill sizes="100vw" className="object-cover brightness-[0.62]" draggable={false} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/35 to-transparent" aria-hidden="true" />
        {active === 2 && <Clue id="scene" className="absolute right-4 top-4 z-20" />}

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.1 } }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            >
              <span className="font-serif text-5xl leading-none text-brass">{String(active + 1).padStart(2, "0")}</span>
              <h3 className="font-serif text-[1.7rem] leading-tight text-foreground text-balance">{step.title}</h3>
              <p className="font-sans text-[15px] leading-relaxed text-foreground/80 text-pretty">{step.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-foreground/15 pt-3">
            <span className="font-sans text-xs uppercase tracking-[0.25em] text-foreground/60">
              {copy.scene} {active + 1} / {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label={`${copy.scene} ${((active - 1 + total) % total) + 1}`}
                className="flex size-10 items-center justify-center rounded-full border border-brass/40 text-brass"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label={`${copy.scene} ${((active + 1) % total) + 1}`}
                className="flex size-10 items-center justify-center rounded-full bg-brass text-background"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
