"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import type { LandingCopy } from "@/components/landing/copy"

const PODIUM = ["border-brass text-brass", "border-silver text-silver", "border-bronze text-bronze"]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="font-serif text-lg text-foreground">{value}</dd>
    </div>
  )
}

export function Missions({ missions }: { missions: LandingCopy["missions"] }) {
  const { next, past, archive, fields } = missions

  return (
    <section id="missions" className="scroll-mt-16 border-t border-border/60 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <div className="flex max-w-2xl flex-col gap-4">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{missions.label}</p>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-6xl">{missions.title}</h2>
          <p className="font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{missions.body}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col overflow-hidden rounded-sm border border-brass/40 bg-card"
          >
            <div className="relative aspect-[16/9] overflow-hidden lg:aspect-[2/1]">
              <img src="/landing/mission-carnival.webp" alt="" className="size-full object-cover object-[50%_70%] transition-transform duration-[1.5s] hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" aria-hidden="true" />
              <span className="absolute left-4 top-4 rounded-sm bg-ink/80 px-3 py-1 font-serif text-sm text-foreground">{missions.file} #2</span>
              <span className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-brass px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-ink">
                <span className="size-1.5 animate-pulse rounded-full bg-ink" aria-hidden="true" />
                {next.status}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
              <h3 className="font-serif text-3xl leading-tight text-foreground">{next.title}</h3>
              <p className="font-sans text-[15px] leading-relaxed text-muted-foreground">{next.body}</p>
              <dl className="grid grid-cols-2 gap-4 border-t border-border/60 pt-5">
                <Field label={fields.period} value={next.period} />
                <Field label={fields.entry} value={next.entry} />
              </dl>
              <div className="mt-auto flex flex-col gap-3 pt-2">
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">{missions.definesLabel}</p>
                <ul className="flex flex-wrap gap-2">
                  {missions.defines.map((item) => (
                    <li key={item} className="rounded-full border border-border px-3 py-1 font-sans text-sm text-foreground/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="flex flex-col overflow-hidden rounded-sm border border-border bg-card"
          >
            <div className="relative aspect-[16/9] overflow-hidden lg:aspect-[2/1]">
              <img src="/landing/mission-pythea.webp" alt="" className="size-full object-cover opacity-70 grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" aria-hidden="true" />
              <span className="absolute left-4 top-4 rounded-sm bg-ink/80 px-3 py-1 font-serif text-sm text-foreground">{missions.file} #1</span>
              <span className="absolute right-4 top-4 rounded-full border border-foreground/30 bg-ink/70 px-3 py-1 font-sans text-xs uppercase tracking-[0.15em] text-foreground/80">
                {past.status}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-3xl leading-tight text-foreground">{past.title}</h3>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">{archive.closed}</p>
              </div>
              <p className="font-sans text-[15px] leading-relaxed text-muted-foreground">{past.body}</p>
              <dl className="grid grid-cols-2 gap-4 border-t border-border/60 pt-5">
                <Field label={fields.period} value={past.period} />
                <Field label={archive.entryLabel} value={archive.entryValue} />
              </dl>
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">{archive.prizeLabel}</p>
                  <p className="font-serif text-3xl text-brass">{archive.prizeValue}</p>
                </div>
                <ul className="grid grid-cols-3 gap-2">
                  {archive.split.map((row, index) => (
                    <li key={row.place} className={`flex flex-col gap-1 border-t-2 bg-background/40 px-3 py-2 ${PODIUM[index]}`}>
                      <span className="font-sans text-xs uppercase tracking-[0.15em]">{row.place}</span>
                      <span className="font-serif text-lg text-foreground">{row.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/standings"
                className="group mt-auto flex items-center gap-2 pt-2 font-sans text-sm font-semibold text-brass hover:text-foreground"
              >
                {archive.standings}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  )
}
