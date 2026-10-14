"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, Hourglass, Landmark, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { EASE, Label, Rise } from "./kit"

const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]

/** Paper: the idea is written on a ruled page, left margin carries the label. */
export function DossierStory({ copy }: { copy: LandingCopy["story"] }) {
  return (
    <section className="light relative bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-28 md:grid-cols-[11rem_1fr] md:px-10 md:py-44">
        <div className="flex flex-col gap-4 md:sticky md:top-28 md:self-start">
          <Label>{copy.label}</Label>
          <span className="h-px w-14 bg-brass" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-7 border-l border-foreground/20 pl-6 md:pl-14">
          {copy.lines.map((line) => (
            <motion.p
              key={line}
              className="font-serif text-3xl leading-[1.08] text-balance md:text-6xl"
              initial={{ opacity: 0.15 }}
              whileInView={{ opacity: 1 }}
              viewport={{ margin: "-38% 0px -38% 0px" }}
              transition={{ duration: 0.7 }}
            >
              {line}
            </motion.p>
          ))}
          <Rise className="flex flex-col gap-5 pt-6">
            <p className="font-serif text-5xl italic leading-none text-brass md:text-7xl">{copy.close}</p>
            <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">
              {copy.after} <Clue id="story" className="-my-2" />
            </p>
          </Rise>
        </div>
      </div>
    </section>
  )
}

/** Night: one sticky photograph that swaps as each scene scrolls past. */
export function DossierHow({ copy }: { copy: LandingCopy["how"] }) {
  const [active, setActive] = useState(0)
  const step = copy.steps[active]

  return (
    <section id="how" className="scroll-mt-16 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 pt-28 md:px-10 md:pt-36">
        <Label>{copy.label}</Label>
        <h2 className="max-w-3xl font-serif text-4xl text-foreground text-balance md:text-6xl">{copy.title}</h2>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 md:px-10 lg:grid-cols-2 lg:gap-20">
        <div className="sticky top-24 hidden h-[calc(100svh-8rem)] self-start py-8 lg:block">
          <div className="relative h-full overflow-hidden rounded-sm bg-card">
            <AnimatePresence initial={false}>
              <motion.div
                key={active}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <Image unoptimized loading="eager" src={step.image} alt={step.alt} fill sizes="50vw" className="object-cover brightness-75" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-background/90 to-transparent p-6 pt-24">
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/80">
                {copy.scene} {String(active + 1).padStart(2, "0")} / {String(copy.steps.length).padStart(2, "0")}
              </span>
            </div>
            {active === 2 && <Clue id="scene" className="absolute bottom-24 right-8" />}
          </div>
        </div>

        <ol className="flex flex-col">
          {copy.steps.map((item, index) => (
            <motion.li
              key={item.title}
              onViewportEnter={() => setActive(index)}
              viewport={{ margin: "-48% 0px -48% 0px" }}
              className="flex flex-col justify-center gap-5 border-t border-border/60 py-12 lg:min-h-[80svh]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm lg:hidden">
                <Image unoptimized loading="eager" src={item.image} alt={item.alt} fill sizes="100vw" className="object-cover brightness-75" />
                {index === 2 && <Clue id="scene" className="absolute bottom-6 right-6" />}
              </div>
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-brass">
                {copy.scene} {String(index + 1).padStart(2, "0")}
              </span>
              <h3
                className={`font-serif text-4xl leading-tight transition-colors duration-700 md:text-6xl ${
                  active === index ? "text-foreground" : "text-foreground lg:text-foreground/25"
                }`}
              >
                {item.title}
              </h3>
              <p className="max-w-md font-sans text-lg leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        <p className="max-w-2xl border-l-2 border-brass pl-6 font-serif text-2xl italic leading-relaxed text-foreground/85 text-pretty">
          {copy.note}
        </p>
      </div>
    </section>
  )
}

/** Paper: who it is for, then a ruled grid of reasons. The last cell is a dark index card. */
export function DossierWhy({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <section className="light flex min-h-[calc(100svh-4rem)] items-center bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:gap-10 md:px-10 md:py-12">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-3xl leading-[1.05] text-balance md:text-5xl">{who.title}</h2>
          </div>
          <p className="hidden max-w-md font-sans text-base leading-relaxed text-foreground/75 text-pretty md:block">{who.body}</p>
        </div>

        <ul className="grid grid-cols-2 gap-px border border-foreground/15 bg-foreground/15 lg:grid-cols-3">
          {copy.items.map((item, index) => (
            <motion.li
              key={item.title}
              className="flex flex-col gap-2 bg-background p-4 md:p-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.08, duration: 0.8 }}
            >
              <h3 className="font-serif text-lg leading-tight md:text-2xl">{item.title}</h3>
              <p className="hidden font-sans text-[15px] leading-relaxed text-muted-foreground sm:block">{item.body}</p>
            </motion.li>
          ))}
          <li className="dark flex flex-col justify-between gap-3 bg-background p-4 text-foreground md:gap-6 md:p-6">
            <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-brass md:text-xs md:tracking-[0.3em]">{who.needLabel}</p>
            <ul className="flex flex-col gap-1 md:gap-2">
              {who.needs.map((need) => (
                <li key={need} className="font-serif text-base italic md:text-2xl">
                  {need}
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </section>
  )
}

/** Night: the code read like a manifesto, one rule per ruled line. */
export function DossierCode({ copy }: { copy: LandingCopy["code"] }) {
  const logoSrc = useLogoSrc()
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-background py-8 md:py-12">
      <Image
        unoptimized
        loading="eager"
        key={logoSrc}
        src={logoSrc}
        alt=""
        width={640}
        height={622}
        className="pointer-events-none absolute -right-40 top-10 -z-10 w-[36rem] opacity-[0.05] md:w-[44rem]"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 md:gap-10 md:px-10">
        <div className="relative flex max-w-2xl flex-col gap-3 pr-12 md:gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl leading-tight text-foreground text-balance md:text-5xl">{copy.title}</h2>
          <Clue id="code" className="absolute right-0 top-0 md:-right-20" />
        </div>
        <ul className="flex flex-col">
          {copy.rules.map((rule, index) => {
            const Icon = RULE_ICONS[index] ?? Eye
            return (
              <Rise key={rule.title} delay={index * 0.08} y={20}>
                <li className="grid gap-2 border-t border-border/60 py-4 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12 md:py-6">
                  <h3 className="font-serif text-2xl italic leading-none text-brass md:text-5xl">{rule.title}</h3>
                  <div className="flex items-start gap-3 md:gap-4">
                    <Icon className="mt-1 size-4 shrink-0 text-foreground/60 md:size-5" aria-hidden="true" />
                    <p className="font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{rule.body}</p>
                  </div>
                </li>
              </Rise>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/** Paper: each hunt is a manila case folder with a tab and a stamp. */
