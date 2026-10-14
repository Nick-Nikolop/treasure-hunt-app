"use client"

import Image from "next/image"
import { motion, useScroll, useSpring } from "framer-motion"
import { Compass, Eye, Footprints, Hourglass, Landmark, Search, ShieldCheck, Shuffle, Users } from "lucide-react"
import { type ReactNode, useRef } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { Label, Rise } from "./kit"

const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]
const WHY_ICONS = [Footprints, Search, Users, Compass, Shuffle]

/** A parchment station on the route: a dashed line down the left gutter that inks in as you scroll, with a dot. */
function Station({ children, id, className = "" }: { children: ReactNode; id?: string; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 50%"] })
  const ink = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return (
    <section
      ref={ref}
      id={id}
      className={`light relative isolate min-h-[calc(100svh-4rem)] scroll-mt-16 bg-background py-8 text-foreground md:py-12 ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-6 w-0 border-l border-dashed border-foreground/25 md:left-12" aria-hidden="true" />
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-6 w-0.5 origin-top -translate-x-1/2 bg-brass md:left-12"
        style={{ scaleY: ink }}
        aria-hidden="true"
      />
      <span
        className="absolute left-6 top-[2.6rem] size-3 -translate-x-1/2 rounded-full border-2 border-brass bg-background md:left-12 md:top-[3.6rem] md:size-4"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl pl-14 pr-6 md:pl-28 md:pr-10">{children}</div>
    </section>
  )
}

export function MapStory({ copy }: { copy: LandingCopy["story"] }) {
  return (
    <Station>
      <div className="flex flex-col gap-10">
        <Label>{copy.label}</Label>
        <div className="flex max-w-4xl flex-col gap-3">
          {copy.lines.map((line, index) => (
            <Rise key={line} delay={index * 0.08} y={18}>
              <p className="font-serif text-3xl leading-[1.15] text-foreground text-balance md:text-5xl">{line}</p>
            </Rise>
          ))}
        </div>
        <Rise className="flex flex-col gap-4">
          <p className="font-serif text-5xl italic text-brass md:text-7xl">{copy.close}</p>
          <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">
            {copy.after} <Clue id="story" className="-my-2" />
          </p>
        </Rise>
      </div>
    </Station>
  )
}

export function MapHow({ copy }: { copy: LandingCopy["how"] }) {
  return (
    <Station id="how">
      <div className="flex flex-col gap-16 md:gap-24">
        <div className="flex max-w-3xl flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl leading-[1.05] text-foreground text-balance md:text-6xl">{copy.title}</h2>
        </div>
        <ol className="flex flex-col gap-20 md:gap-28">
          {copy.steps.map((step, index) => {
            const flip = index % 2 === 1
            return (
              <li key={step.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                <Rise className={flip ? "md:order-2" : ""}>
                  <figure
                    className={`relative border border-foreground/15 bg-card p-3 shadow-[0_30px_50px_-30px_oklch(0.2_0.03_60/0.55)] ${
                      flip ? "md:rotate-1" : "md:-rotate-1"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image unoptimized loading="eager" src={step.image} alt={step.alt} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover sepia-[0.25]" />
                      {index === 2 && <Clue id="scene" className="absolute bottom-6 right-6" />}
                    </div>
                  </figure>
                </Rise>
                <Rise delay={0.1} className="flex flex-col gap-4">
                  <span className="font-sans text-xs uppercase tracking-[0.3em] text-brass">
                    {copy.scene} {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">{step.title}</h3>
                  <p className="max-w-md font-sans text-lg leading-relaxed text-muted-foreground">{step.body}</p>
                </Rise>
              </li>
            )
          })}
        </ol>
        <p className="max-w-2xl font-serif text-2xl italic leading-relaxed text-foreground/80 text-pretty">{copy.note}</p>
      </div>
    </Station>
  )
}

export function MapWhy({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <Station>
      <div className="flex flex-col gap-6 md:gap-10">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <Label>{copy.label}</Label>
            <h2 className="font-serif text-3xl leading-[1.05] text-foreground text-balance md:text-5xl">{who.title}</h2>
          </div>
          <div className="flex flex-col gap-3 md:gap-4">
            <p className="hidden font-sans text-base leading-relaxed text-foreground/75 text-pretty md:block">{who.body}</p>
            <ul className="flex flex-wrap gap-1.5 md:gap-2" aria-label={who.needLabel}>
              {who.needs.map((need) => (
                <li key={need} className="rounded-full border border-foreground/30 px-3 py-1 font-sans text-sm text-foreground md:px-4 md:py-1.5">
                  {need}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-x-10 md:gap-y-8 lg:grid-cols-3">
          {copy.items.map((item, index) => {
            const Icon = WHY_ICONS[index] ?? Compass
            return (
              <Rise key={item.title} delay={index * 0.07} y={20}>
                <li className="flex flex-col gap-2 md:gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full border border-brass/60 text-brass md:size-11">
                    <Icon className="size-4 md:size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-lg leading-tight text-foreground md:text-2xl">{item.title}</h3>
                  <p className="hidden font-sans text-[15px] leading-relaxed text-muted-foreground sm:block">{item.body}</p>
                </li>
              </Rise>
            )
          })}
        </ul>
      </div>
    </Station>
  )
}

/** A dark ink plate set into the parchment, stamped with the logo. */
export function MapCode({ copy }: { copy: LandingCopy["code"] }) {
  const logoSrc = useLogoSrc()
  return (
    <Station>
      <Rise>
        <div className="dark relative isolate overflow-hidden rounded-sm bg-background px-5 py-7 text-foreground md:px-12 md:py-12">
          <Image
            unoptimized
            loading="eager"
            key={logoSrc}
            src={logoSrc}
            alt=""
            width={520}
            height={505}
            className="pointer-events-none absolute -right-24 -top-16 -z-10 w-[26rem] opacity-[0.07] md:w-[34rem]"
          />
          <Clue id="code" className="absolute right-4 top-4 md:right-[8.5rem] md:top-[6.5rem]" />
          <div className="flex flex-col gap-5 md:gap-10">
            <div className="flex max-w-2xl flex-col gap-2 pr-10 md:gap-4">
              <Label>{copy.label}</Label>
              <h2 className="font-serif text-2xl leading-tight text-balance md:text-5xl">{copy.title}</h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 md:gap-8">
              {copy.rules.map((rule, index) => {
                const Icon = RULE_ICONS[index] ?? Eye
                return (
                  <li key={rule.title} className="flex gap-3 border-t border-brass/30 pt-3 md:gap-5 md:pt-5">
                    <Icon className="mt-1 size-5 shrink-0 text-brass md:size-6" aria-hidden="true" />
                    <div className="flex flex-col gap-1 md:gap-2">
                      <h3 className="font-serif text-lg italic md:text-2xl">{rule.title}</h3>
                      <p className="font-sans text-sm leading-relaxed text-muted-foreground md:text-base">{rule.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Rise>
    </Station>
  )
}

/** Each hunt is an entry ticket: a stub, a perforation, and the details. */
