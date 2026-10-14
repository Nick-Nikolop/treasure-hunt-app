"use client"

import { useInView, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { Label, Rise } from "../pages/kit"

const GLYPHS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩABCDEFGHJKLMNPRSTUVWXYZ0123456789"

/** Letters spin through random glyphs and settle left to right, like a split-flap board. */
function Flap({ text, start, delay = 0 }: { text: string; start: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(text)

  useEffect(() => {
    if (!start || reduceMotion) {
      setShown(text)
      return
    }
    const begin = performance.now() + delay * 1000
    const id = window.setInterval(() => {
      const settled = Math.floor(Math.max(0, performance.now() - begin) / 45)
      const next = [...text]
        .map((char, index) => (char === " " || index < settled ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("")
      setShown(next)
      if (settled >= text.length) window.clearInterval(id)
    }, 50)
    return () => window.clearInterval(id)
  }, [text, start, delay, reduceMotion])

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}

/** The hunts listed on a station departure board, with the live one blinking. */
export function MissionsBoard({ copy }: { copy: LandingCopy["missions"] }) {
  const boardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(boardRef, { once: true, margin: "-15% 0px" })
  const rows = [
    { ...copy.next, ref: "TH-02", live: true },
    { ...copy.past, ref: "TH-01", live: false },
  ]
  const head = "font-sans text-[11px] uppercase tracking-[0.3em] text-foreground/45"

  return (
    <section id="missions" className="scroll-mt-16 bg-background py-28 md:py-36">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 md:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-4xl leading-[1.05] text-foreground text-balance md:text-6xl">{copy.title}</h2>
          <p className="font-sans text-lg leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <div ref={boardRef} className="overflow-hidden rounded-sm border border-foreground/15 bg-ink shadow-[0_40px_80px_-40px_black]">
          <div className="flex items-center justify-between border-b border-foreground/15 px-5 py-4 md:px-8">
            <span className="font-serif text-xl tracking-[0.25em] text-brass md:text-2xl">
              <Flap text={copy.board.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()} start={inView} />
            </span>
            <span className="hidden items-center gap-2 font-sans text-xs uppercase tracking-[0.3em] text-foreground/50 sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-brass" aria-hidden="true" />
              {copy.next.city}
            </span>
          </div>

          <div className="hidden grid-cols-[7rem_1.6fr_1fr_1fr_10rem] gap-6 border-b border-foreground/10 px-8 py-3 md:grid">
            <span className={head}>{copy.file}</span>
            <span className={head}>{copy.board.mission}</span>
            <span className={head}>{copy.fields.city}</span>
            <span className={head}>{copy.fields.period}</span>
            <span className={head}>{copy.board.status}</span>
          </div>

          {rows.map((row, rowIndex) => (
            <article
              key={row.ref}
              className={`relative grid gap-3 border-b border-foreground/10 px-5 py-6 last:border-b-0 md:grid-cols-[7rem_1.6fr_1fr_1fr_10rem] md:items-center md:gap-6 md:px-8 ${
                row.live ? "" : "opacity-60"
              }`}
            >
              <span className="font-sans text-sm tracking-[0.2em] text-foreground/70">
                <Flap text={row.ref} start={inView} delay={rowIndex * 0.3} />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-serif text-2xl text-foreground md:text-3xl">
                  <Flap text={row.title} start={inView} delay={0.2 + rowIndex * 0.3} />
                </h3>
                <p className="font-sans text-sm leading-relaxed text-muted-foreground">{row.body}</p>
              </div>
              <span className="font-serif text-lg text-foreground/85">
                <span className="mr-2 font-sans text-[11px] uppercase tracking-[0.25em] text-foreground/45 md:hidden">{copy.fields.city}</span>
                {row.city}
              </span>
              <span className="font-serif text-lg text-foreground/85">
                <span className="mr-2 font-sans text-[11px] uppercase tracking-[0.25em] text-foreground/45 md:hidden">{copy.fields.period}</span>
                {row.period}
              </span>
              <span
                className={`w-fit rounded-sm px-3 py-1.5 font-sans text-xs font-medium uppercase tracking-[0.2em] ${
                  row.live ? "animate-pulse bg-brass text-ink" : "border border-foreground/30 text-foreground/70"
                }`}
              >
                {row.status}
              </span>
              {!row.live && <Clue id="file" className="absolute right-5 top-5 opacity-70 md:right-6 md:top-1/2 md:-translate-y-1/2" />}
            </article>
          ))}
        </div>

        <Rise className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 font-sans text-xs uppercase tracking-[0.3em] text-foreground/60">{copy.definesLabel}</p>
          <ul className="flex flex-wrap gap-2">
            {copy.defines.map((item) => (
              <li key={item} className="rounded-full border border-border px-4 py-1.5 font-sans text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </Rise>
      </div>
    </section>
  )
}
