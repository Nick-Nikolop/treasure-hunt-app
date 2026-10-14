"use client"

import { motion } from "framer-motion"
import type { LandingCopy } from "../copy"
import { EASE, Label } from "../pages/kit"

const TILTS = [-2.5, 1.8, -1.2, 2.2, -1.6, 1.2]

function Pin() {
  return (
    <span
      className="absolute left-1/2 top-3 size-3.5 -translate-x-1/2 rounded-full bg-brass shadow-[0_3px_4px_rgba(0,0,0,0.45)] ring-2 ring-brass/30"
      aria-hidden="true"
    />
  )
}

/** Reasons pinned to a dark board as paper notes, each landing at its own angle. */
export function WhyBoard({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-card py-8 md:py-12">
      <div
        className="absolute inset-0 -z-10 opacity-[0.15]"
        style={{ backgroundImage: "radial-gradient(var(--foreground) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        aria-hidden="true"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 md:gap-10 md:px-10">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-3xl leading-[1.05] text-foreground text-balance md:text-5xl">{who.title}</h2>
          </div>
          <p className="hidden max-w-md font-sans text-base leading-relaxed text-muted-foreground text-pretty md:block">{who.body}</p>
        </div>

        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-8">
          {copy.items.map((item, index) => (
            <motion.li
              key={item.title}
              className="light relative flex flex-col gap-2 bg-background px-4 pb-4 pt-7 text-foreground shadow-[0_24px_40px_-20px_rgba(0,0,0,0.7)] md:px-6 md:pb-6 md:pt-9"
              initial={{ opacity: 0, y: -40, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: TILTS[index] }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.09, duration: 0.8, ease: EASE }}
            >
              <Pin />
              <h3 className="font-serif text-lg leading-tight md:text-2xl">{item.title}</h3>
              <p className="hidden font-sans text-[15px] leading-relaxed text-foreground/70 sm:block">{item.body}</p>
            </motion.li>
          ))}
          <motion.li
            className="relative flex flex-col gap-2 border border-dashed border-brass/60 px-4 pb-4 pt-7 md:gap-4 md:px-6 md:pb-6 md:pt-9"
            initial={{ opacity: 0, y: -40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: TILTS[5] }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: copy.items.length * 0.09, duration: 0.8, ease: EASE }}
          >
            <Pin />
            <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-brass md:text-xs md:tracking-[0.3em]">{who.needLabel}</p>
            <ul className="flex flex-col gap-1 md:gap-2">
              {who.needs.map((need) => (
                <li key={need} className="font-serif text-base italic text-foreground md:text-2xl">
                  {need}
                </li>
              ))}
            </ul>
          </motion.li>
        </ul>
      </div>
    </section>
  )
}
