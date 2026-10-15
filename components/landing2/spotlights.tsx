"use client"

import Image from "next/image"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { Check, ChevronRight, Eye, Hourglass, Landmark, QrCode, ShieldCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { BILLBOARD, type ReelCopy } from "./copy"

const EASE = [0.22, 1, 0.36, 1] as const
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: EASE },
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.3em] text-brass">
      <span aria-hidden="true" className="h-0.5 w-8 bg-brass" />
      {children}
    </p>
  )
}

export function WhatSection({ what, reel }: { what: LandingCopy["what"]; reel: ReelCopy }) {
  return (
    <section id="what" aria-labelledby="what-title" className="scroll-mt-20 px-5 md:px-14">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <motion.div {...reveal} className="flex flex-col gap-6">
          <SectionEyebrow>{what.label}</SectionEyebrow>
          <h2 id="what-title" className="text-balance font-serif text-4xl font-black leading-[1.05] text-reel-white md:text-6xl">
            {what.title}
          </h2>
          <p className="max-w-[60ch] text-pretty font-sans text-lg leading-relaxed text-reel-white/80">{what.body}</p>
          <p className="border-l-[3px] border-brass pl-4 font-serif text-2xl italic leading-snug text-reel-white">{what.compare}</p>

          <div className="flex flex-col gap-3 pt-2">
            <p className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-reel-mute">{reel.what.facts}</p>
            <dl className="grid gap-px overflow-hidden rounded-md bg-reel-white/10 sm:grid-cols-2">
              {what.facts.map((fact) => (
                <div key={fact.q} className="flex flex-col gap-1 bg-reel-raised p-5">
                  <dt className="font-sans text-sm font-bold text-reel-mute">{fact.q}</dt>
                  <dd className="font-sans text-lg font-bold leading-snug text-reel-white">{fact.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>

        <PhoneDemo what={what} label={reel.what.demo} />
      </div>
    </section>
  )
}

function PhoneDemo({ what, label }: { what: LandingCopy["what"]; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [found, setFound] = useState(false)

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setFound(true)
      return
    }
    const loop = setInterval(() => setFound((f) => !f), 2600)
    return () => clearInterval(loop)
  }, [inView, reduce])

  return (
    <motion.figure {...reveal} ref={ref} className="relative mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md">
        <Image src={what.image} alt={what.alt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-reel via-reel/40 to-reel/10" />

        <div className="absolute inset-x-0 bottom-0 flex justify-center p-6 md:p-10">
          <div className="w-full max-w-[17rem] rounded-[2.2rem] border-[6px] border-reel bg-reel p-1.5 shadow-2xl shadow-reel ring-1 ring-reel-white/15">
            <div className="flex flex-col gap-4 rounded-[1.7rem] bg-reel-raised p-5">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-mute">{what.phone.step}</span>
                <span aria-hidden="true" className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={cn("h-1 w-3 rounded-full", i < 2 ? "bg-brass" : "bg-reel-white/20")} />
                  ))}
                </span>
              </div>
              <p className="font-serif text-lg leading-snug text-reel-white">{what.phone.clue}</p>
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-bold transition-colors duration-500",
                  found ? "bg-brass text-reel" : "bg-reel-white text-reel",
                )}
              >
                {found ? <Check className="size-4" aria-hidden="true" /> : <QrCode className="size-4" aria-hidden="true" />}
                <span aria-live="polite">{found ? what.phone.found : what.phone.scan}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-center font-sans text-sm text-reel-mute">{label}</figcaption>
    </motion.figure>
  )
}

const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]

export function CodeSection({ who, code }: { who: LandingCopy["who"]; code: LandingCopy["code"] }) {
  return (
    <section aria-labelledby="code-title" className="px-5 md:px-14">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
        <motion.div {...reveal} className="flex flex-col gap-6">
          <SectionEyebrow>{code.label}</SectionEyebrow>
          <h2 id="code-title" className="text-balance font-serif text-4xl font-black leading-[1.05] text-reel-white md:text-5xl">
            {who.title}
          </h2>
          <p className="max-w-[60ch] text-pretty font-sans text-lg leading-relaxed text-reel-white/80">{who.body}</p>
          <div className="flex flex-col gap-3">
            <p className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-reel-mute">{who.needLabel}</p>
            <ul className="flex flex-wrap gap-2">
              {who.needs.map((need) => (
                <li
                  key={need}
                  className="flex items-center gap-2 rounded-full border border-reel-white/25 px-4 py-2 font-sans text-base font-bold text-reel-white"
                >
                  <Check className="size-4 text-brass" aria-hidden="true" />
                  {need}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="flex flex-col gap-5 lg:pt-10">
          <h3 className="flex items-center gap-4 font-serif text-2xl font-bold text-reel-white md:text-3xl">
            {code.title}
            <span aria-hidden="true" className="h-px flex-1 bg-reel-white/15" />
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {code.rules.map((rule, index) => {
              const Icon = RULE_ICONS[index % RULE_ICONS.length]
              return (
                <motion.li
                  key={rule.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.08 }}
                  className="group/rule flex flex-col gap-4 rounded-md bg-reel-raised p-6 transition duration-300 hover:bg-reel-white/10 md:p-7"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-reel text-brass ring-1 ring-reel-white/10 transition group-hover/rule:ring-brass/60">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-reel-white">{rule.title}</h3>
                  <p className="text-pretty font-sans text-base leading-relaxed text-reel-white/75">{rule.body}</p>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function ClosingBanner({
  closing,
  line,
  cta,
  notifyHref,
  onExplore,
}: {
  closing: LandingCopy["closing"]
  line: string
  cta: string
  notifyHref: string
  onExplore: () => void
}) {
  return (
    <section aria-labelledby="closing-title" className="relative isolate flex min-h-[80svh] items-center overflow-hidden px-5 py-24 md:px-14">
      <Image src={BILLBOARD} alt="" fill sizes="100vw" className="-z-10 object-cover object-[70%_center]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-reel/70" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-reel via-transparent to-reel" />
      <motion.div {...reveal} className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2 id="closing-title" className="text-balance font-serif text-4xl font-black leading-[1.05] text-reel-white md:text-7xl">
          {closing.title}
        </h2>
        <p className="max-w-[55ch] text-pretty font-sans text-lg leading-relaxed text-reel-white/85 md:text-xl">{closing.body}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href={notifyHref}
            className="flex items-center gap-2 rounded-md border border-brass/60 bg-reel-red px-8 py-3.5 font-sans text-lg font-bold text-reel-white transition hover:border-brass hover:bg-reel-red-hover md:text-xl"
          >
            {cta}
            <ChevronRight className="size-6" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onExplore}
            className="rounded-md border border-reel-white/40 bg-reel/40 px-8 py-3.5 font-sans text-lg font-bold text-reel-white backdrop-blur-sm transition hover:border-reel-white hover:bg-reel-white/10 md:text-xl"
          >
            {closing.cta}
          </button>
        </div>
        <p className="max-w-[50ch] text-pretty font-sans text-base text-reel-mute">{line}</p>
      </motion.div>
    </section>
  )
}
