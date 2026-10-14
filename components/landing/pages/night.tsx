"use client"

import Image from "next/image"
import { type MotionValue, motion, useScroll, useTransform } from "framer-motion"
import { Eye, Hourglass, Landmark, ShieldCheck } from "lucide-react"
import { useRef } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { EASE, Label, Rise } from "./kit"

const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  // Function form keeps this on the JS path; the accelerated scroll-timeline path misplaces per-word ranges.
  const opacity = useTransform(progress, (v) => 0.12 + 0.88 * Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0]))))
  return (
    <motion.span style={{ opacity }} className="inline-block pr-[0.25em]">
      {word}
    </motion.span>
  )
}

/** The idea lights up word by word while the paragraph stays pinned. */
export function NightStory({ copy }: { copy: LandingCopy["story"] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const words = copy.lines.join(" ").split(" ")

  return (
    <section className="bg-background">
      <div ref={ref} className="relative h-[260svh]">
        <div className="sticky top-0 flex h-svh items-center">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:px-10">
            <Label>{copy.label}</Label>
            <p className="font-serif text-4xl leading-[1.1] text-foreground text-balance md:text-7xl">
              {words.map((word, index) => {
                const start = (index / words.length) * 0.85
                return <Word key={`${word}-${index}`} word={word} progress={scrollYProgress} range={[start, start + 0.85 / words.length]} />
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-32 md:px-10 md:pb-44">
        <Rise>
          <p className="font-serif text-5xl italic text-brass md:text-8xl">{copy.close}</p>
        </Rise>
        <Rise delay={0.15}>
          <p className="max-w-xl font-sans text-lg leading-relaxed text-foreground/75 text-pretty">
            {copy.after} <Clue id="story" className="-my-2" />
          </p>
        </Rise>
      </div>
    </section>
  )
}

function ScenePanel({ step, index, scene, className = "" }: { step: LandingCopy["how"]["steps"][number]; index: number; scene: string; className?: string }) {
  return (
    <article className={`relative isolate flex shrink-0 flex-col justify-end overflow-hidden ${className}`}>
      <Image unoptimized loading="eager" src={step.image} alt={step.alt} fill sizes="100vw" className="-z-10 object-cover brightness-[0.55]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/30 to-transparent" aria-hidden="true" />
      {index === 2 && <Clue id="scene" className="absolute right-[12%] top-[30%]" />}
      <div className="flex max-w-2xl flex-col gap-4 p-6 pb-14 md:p-14 md:pb-20">
        <span className="font-sans text-xs uppercase tracking-[0.35em] text-brass">
          {scene} {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-serif text-5xl leading-[0.95] text-foreground md:text-8xl">{step.title}</h3>
        <p className="max-w-md font-sans text-lg leading-relaxed text-foreground/80">{step.body}</p>
      </div>
    </article>
  )
}

/** Desktop: the four scenes slide past horizontally while the section is pinned. Mobile: stacked. */
export function NightHow({ copy }: { copy: LandingCopy["how"] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const panels = copy.steps.length + 1
  const x = useTransform(scrollYProgress, [0.05, 0.95], ["0%", `-${((panels - 1) / panels) * 100}%`])
  const bar = useTransform(scrollYProgress, [0.05, 0.95], [0, 1])

  const intro = (
    <div className="flex flex-col gap-6">
      <Label>{copy.label}</Label>
      <h2 className="font-serif text-5xl leading-[0.95] text-foreground text-balance md:text-8xl">{copy.title}</h2>
      <p className="max-w-md font-serif text-xl italic leading-relaxed text-foreground/70 text-pretty">{copy.note}</p>
    </div>
  )

  return (
    <section id="how" className="scroll-mt-16 bg-background">
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${panels * 100}svh` }}>
        <div className="sticky top-0 h-svh overflow-hidden">
          <motion.div className="flex h-full" style={{ x, width: `${panels * 100}vw` }}>
            <div className="flex h-full w-screen shrink-0 items-center px-10">
              <div className="mx-auto w-full max-w-7xl">{intro}</div>
            </div>
            {copy.steps.map((step, index) => (
              <ScenePanel key={step.title} step={step} index={index} scene={copy.scene} className="h-full w-screen" />
            ))}
          </motion.div>
          <div className="absolute inset-x-10 bottom-8 h-px bg-foreground/15">
            <motion.div className="h-px origin-left bg-brass" style={{ scaleX: bar }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:hidden">
        <div className="px-6 py-24">{intro}</div>
        {copy.steps.map((step, index) => (
          <ScenePanel key={step.title} step={step} index={index} scene={copy.scene} className="min-h-[85svh]" />
        ))}
      </div>
    </section>
  )
}

/** Five reasons as oversized lines that light up on hover. */
export function NightWhy({ copy, who }: { copy: LandingCopy["why"]; who: LandingCopy["who"] }) {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center bg-background py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 md:gap-10 md:px-10">
        <div className="flex flex-col items-center gap-3 text-center md:gap-4">
          <Label>{copy.label}</Label>
          <h2 className="max-w-4xl font-serif text-3xl leading-[1.05] text-foreground text-balance md:text-5xl">{who.title}</h2>
          <ul className="flex flex-wrap justify-center gap-1.5 md:gap-2" aria-label={who.needLabel}>
            {who.needs.map((need) => (
              <li key={need} className="rounded-full border border-brass/40 px-3 py-1 font-sans text-sm text-foreground md:px-4 md:py-1.5">
                {need}
              </li>
            ))}
          </ul>
        </div>
        <ul className="flex flex-col">
          {copy.items.map((item, index) => (
            <Rise key={item.title} delay={index * 0.05} y={16}>
              <li className="group grid gap-1 border-t border-border/60 py-3 md:py-4 lg:grid-cols-[1.5fr_1fr] lg:items-baseline lg:gap-12">
                <h3 className="font-serif text-xl leading-tight text-foreground transition-colors duration-500 md:text-4xl lg:text-foreground/35 lg:group-hover:text-foreground">
                  {item.title}
                </h3>
                <p className="hidden font-sans text-[15px] leading-relaxed text-muted-foreground transition-colors duration-500 sm:block lg:group-hover:text-foreground/85">
                  {item.body}
                </p>
              </li>
            </Rise>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** The one bright moment on the page: a solid brass band. */
export function NightCode({ copy }: { copy: LandingCopy["code"] }) {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center bg-brass py-8 text-ink md:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 md:gap-12 md:px-10">
        <div className="flex items-start justify-between gap-4 md:items-end md:gap-12">
          <div className="flex max-w-2xl flex-col gap-2 md:gap-4">
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-ink/70">{copy.label}</p>
            <h2 className="font-serif text-3xl leading-tight text-balance md:text-5xl">{copy.title}</h2>
          </div>
          <Clue id="code" className="shrink-0 rounded-full bg-ink" />
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-8 lg:grid-cols-4">
          {copy.rules.map((rule, index) => {
            const Icon = RULE_ICONS[index] ?? Eye
            return (
              <motion.li
                key={rule.title}
                className="flex flex-col gap-2 border-t-2 border-ink/80 pt-3 md:gap-4 md:pt-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ delay: index * 0.1, duration: 0.9, ease: EASE }}
              >
                <Icon className="size-5 md:size-6" aria-hidden="true" />
                <h3 className="font-serif text-xl italic md:text-3xl">{rule.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-ink/80 md:text-base">{rule.body}</p>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/** The next hunt takes the full screen; the finished one sits beneath as an archive row. */
export function NightMissions({ copy }: { copy: LandingCopy["missions"] }) {
  const fields = ["city", "period", "entry"] as const
  return (
    <section id="missions" className="flex h-[calc(100svh-4rem)] scroll-mt-16 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 pb-4 pt-6 md:gap-3 md:px-10 md:pb-6 md:pt-10">
        <Label>{copy.label}</Label>
        <h2 className="max-w-3xl font-serif text-3xl text-foreground text-balance md:text-5xl">{copy.title}</h2>
      </div>

      <article className="relative isolate flex min-h-0 flex-1 items-end overflow-hidden">
        <Image unoptimized loading="eager" src="/landing/scene-mission.webp" alt="" fill sizes="100vw" className="-z-10 object-cover brightness-50" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-background/10" aria-hidden="true" />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 pb-5 md:gap-5 md:px-10 md:pb-8">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-brass px-3 py-1 font-sans text-xs uppercase tracking-[0.2em] text-brass">{copy.next.status}</span>
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{copy.file} TH-02</span>
          </div>
          <h3 className="font-serif text-4xl leading-[0.95] text-foreground text-balance md:text-7xl">{copy.next.title}</h3>
          <p className="max-w-lg font-sans text-[15px] leading-relaxed text-foreground/80 md:text-base">{copy.next.body}</p>
          <dl className="grid max-w-2xl grid-cols-3 gap-x-4 border-t border-foreground/20 pt-3 md:gap-x-6 md:pt-4">
            {fields.map((field) => (
              <div key={field} className="flex min-w-0 flex-col gap-1">
                <dt className="truncate font-sans text-[10px] uppercase tracking-[0.2em] text-foreground/50 md:text-[11px] md:tracking-[0.25em]">
                  {copy.fields[field]}
                </dt>
                <dd className="font-serif text-sm text-foreground md:text-lg">{copy.next[field]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <div className="mx-auto w-full max-w-7xl px-6 py-4 md:px-10 md:py-6">
        <article className="relative grid grid-cols-[5rem_1fr] items-center gap-4 border-y border-border/60 py-3 md:grid-cols-[10rem_1fr_auto] md:gap-8 md:py-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
            <Image unoptimized loading="eager" src="/landing/scene-finale.webp" alt="" fill sizes="10rem" className="object-cover brightness-75 grayscale" />
            <Clue id="file" className="absolute bottom-1 right-1 scale-75 opacity-60 md:bottom-2 md:right-2 md:scale-100" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-sans text-[11px] uppercase tracking-[0.25em] text-muted-foreground md:text-xs md:tracking-[0.3em]">
              {copy.past.status} · {copy.file} TH-01
            </span>
            <h3 className="font-serif text-lg text-foreground md:text-2xl">{copy.past.title}</h3>
            <p className="hidden max-w-xl font-sans text-[15px] leading-relaxed text-muted-foreground md:block">{copy.past.body}</p>
          </div>
          <dl className="hidden md:flex md:flex-col md:gap-2 md:text-right">
            {fields.map((field) => (
              <div key={field} className="flex flex-col">
                <dt className="font-sans text-[11px] uppercase tracking-[0.25em] text-foreground/50">{copy.fields[field]}</dt>
                <dd className="font-serif text-sm text-foreground/80">{copy.past[field]}</dd>
              </div>
            ))}
          </dl>
        </article>
        <ul className="hidden flex-wrap gap-2 pt-4 md:flex" aria-label={copy.definesLabel}>
          {copy.defines.map((item) => (
            <li key={item} className="rounded-full border border-border px-4 py-1.5 font-sans text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
