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
function DossierStory({ copy }: { copy: LandingCopy["story"] }) {
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
function DossierHow({ copy }: { copy: LandingCopy["how"] }) {
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
function DossierWhy({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <section className="light bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-28 md:px-10 md:py-36">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div className="flex flex-col gap-5">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-4xl leading-[1.05] text-balance md:text-7xl">{who.title}</h2>
          </div>
          <p className="max-w-md font-sans text-lg leading-relaxed text-foreground/75 text-pretty">{who.body}</p>
        </div>

        <ul className="grid gap-px border border-foreground/15 bg-foreground/15 sm:grid-cols-2 lg:grid-cols-3">
          {copy.items.map((item, index) => (
            <motion.li
              key={item.title}
              className="flex flex-col gap-3 bg-background p-8 md:p-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: index * 0.08, duration: 0.8 }}
            >
              <h3 className="font-serif text-2xl leading-tight md:text-3xl">{item.title}</h3>
              <p className="font-sans text-base leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.li>
          ))}
          <li className="dark flex flex-col justify-between gap-8 bg-background p-8 text-foreground md:p-10">
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{who.needLabel}</p>
            <ul className="flex flex-col gap-2">
              {who.needs.map((need) => (
                <li key={need} className="font-serif text-2xl italic">
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
function DossierCode({ copy }: { copy: LandingCopy["code"] }) {
  const logoSrc = useLogoSrc()
  return (
    <section className="relative isolate overflow-hidden bg-background py-28 md:py-40">
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
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 md:px-10">
        <div className="relative flex max-w-2xl flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-6xl">{copy.title}</h2>
          <Clue id="code" className="absolute -right-12 top-0 md:-right-20" />
        </div>
        <ul className="flex flex-col">
          {copy.rules.map((rule, index) => {
            const Icon = RULE_ICONS[index] ?? Eye
            return (
              <Rise key={rule.title} delay={index * 0.08} y={20}>
                <li className="grid gap-4 border-t border-border/60 py-10 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12">
                  <h3 className="font-serif text-4xl italic leading-none text-brass md:text-6xl">{rule.title}</h3>
                  <div className="flex items-start gap-4">
                    <Icon className="mt-1 size-5 shrink-0 text-foreground/60" aria-hidden="true" />
                    <p className="font-sans text-lg leading-relaxed text-muted-foreground">{rule.body}</p>
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
function DossierMissions({ copy }: { copy: LandingCopy["missions"] }) {
  const cards = [
    { ...copy.next, image: "/landing/scene-mission.webp", live: true, ref: "TH-02" },
    { ...copy.past, image: "/landing/scene-finale.webp", live: false, ref: "TH-01" },
  ]
  return (
    <section id="missions" className="light scroll-mt-16 bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-28 md:px-10 md:py-36">
        <div className="flex max-w-2xl flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl leading-[1.05] text-balance md:text-6xl">{copy.title}</h2>
          <p className="font-sans text-lg leading-relaxed text-foreground/75">{copy.body}</p>
        </div>

        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          {cards.map((card, index) => (
            <Rise key={card.ref} delay={index * 0.12}>
              <article className="relative pt-9">
                <div className="absolute left-0 top-0 flex h-10 items-center rounded-t-md border border-b-0 border-foreground/15 bg-card px-5 font-sans text-xs uppercase tracking-[0.3em] text-foreground/70">
                  {copy.file} {card.ref}
                </div>
                <div className="relative flex flex-col gap-6 rounded-sm rounded-tl-none border border-foreground/15 bg-card p-5 shadow-[0_40px_60px_-40px_oklch(0.2_0.03_60/0.6)] md:p-7">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
                    <Image
                      unoptimized
                      loading="eager"
                      src={card.image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className={`object-cover ${card.live ? "sepia-[0.35]" : "grayscale brightness-75"}`}
                    />
                    <span
                      className={`absolute right-4 top-4 -rotate-6 border-2 bg-card/90 px-3 py-1 font-sans text-xs font-medium uppercase tracking-[0.25em] ${
                        card.live ? "border-brass text-brass" : "border-foreground/50 text-foreground/70"
                      }`}
                    >
                      {card.status}
                    </span>
                    {!card.live && <Clue id="file" className="absolute bottom-[22%] left-[18%] opacity-70" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-serif text-3xl leading-tight md:text-4xl">{card.title}</h3>
                    <p className="font-sans text-base leading-relaxed text-muted-foreground">{card.body}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed sm:grid-cols-3 border-foreground/25 pt-5">
                    {(["city", "period", "entry"] as const).map((field) => (
                      <div key={field} className="flex flex-col gap-1">
                        <dt className="font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/55">{copy.fields[field]}</dt>
                        <dd className="font-serif text-base leading-snug md:text-lg">{card[field]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            </Rise>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{copy.definesLabel}</p>
          <ul className="flex flex-wrap gap-2">
            {copy.defines.map((item) => (
              <li key={item} className="rounded-full border border-foreground/25 px-4 py-1.5 font-sans text-sm text-foreground/80">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function DossierBody({ copy }: { copy: LandingCopy }) {
  return (
    <>
      <DossierStory copy={copy.story} />
      <DossierHow copy={copy.how} />
      <DossierWhy copy={copy.why} who={copy.who} />
      <DossierCode copy={copy.code} />
      <DossierMissions copy={copy.missions} />
    </>
  )
}
