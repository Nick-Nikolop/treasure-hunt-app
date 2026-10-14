"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import type { LandingCopy } from "../copy"

const HOLES = Array.from({ length: 40 })

function Sprockets() {
  return (
    <div className="flex gap-3 overflow-hidden px-2 py-2" aria-hidden="true">
      {HOLES.map((_, index) => (
        <span key={index} className="h-3 w-5 shrink-0 rounded-[3px] bg-foreground/70" />
      ))}
    </div>
  )
}

/** A strip of film slides sideways while the section is pinned: the opening line, three frames, the closing line. */
export function FilmStrip({ copy }: { copy: LandingCopy["film"] }) {
  const ref = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const travel = (v: number) => Math.min(1, Math.max(0, (v - 0.06) / 0.86))
  const x = useTransform(scrollYProgress, (v) => -travel(v) * distance)
  const bar = useTransform(scrollYProgress, travel)

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const measure = () => setDistance(Math.max(0, strip.scrollWidth - window.innerWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(strip)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  return (
    <section className="bg-background" aria-label={copy.place}>
      <div ref={ref} className="relative h-[340svh]">
        <div className="sticky top-0 flex h-svh flex-col justify-center gap-10 overflow-hidden pt-16">
          <motion.div ref={stripRef} style={{ x }} className="flex w-max items-center pl-6 pr-[12vw] md:pl-10">
            <p className="w-[78vw] shrink-0 pr-10 font-serif text-3xl leading-tight text-foreground text-balance md:w-[30rem] md:text-5xl">
              {copy.open}
            </p>

            <div className="flex shrink-0 rotate-[-1deg] bg-ink shadow-[0_40px_80px_-40px_black]">
              {copy.frames.map((frame, index) => (
                <figure key={frame.title} className="flex w-[78vw] shrink-0 flex-col border-x border-foreground/10 md:w-[min(42rem,58vw)]">
                  <Sprockets />
                  <div className="relative mx-3 h-[38svh] overflow-hidden md:h-[46svh]">
                    <Image unoptimized loading="eager" src={frame.image} alt={frame.alt} fill sizes="(min-width: 768px) 42rem, 78vw" className="object-cover sepia-[0.45] brightness-90" />
                    <span className="absolute left-3 top-3 bg-ink/80 px-2 py-1 font-sans text-[11px] uppercase tracking-[0.3em] text-foreground/90">
                      {copy.take} {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <figcaption className="flex flex-col gap-1 px-4 pb-1 pt-4">
                    <span className="font-serif text-2xl text-foreground md:text-3xl">{frame.title}</span>
                    <span className="font-sans text-sm leading-relaxed text-foreground/65 text-pretty">{frame.hint}</span>
                  </figcaption>
                  <Sprockets />
                </figure>
              ))}
            </div>

            <p className="w-[78vw] shrink-0 pl-12 font-serif text-3xl italic leading-tight text-brass text-balance md:w-[30rem] md:text-5xl">
              {copy.close}
            </p>
          </motion.div>

          <div className="mx-6 h-px bg-foreground/15 md:mx-10">
            <motion.div className="h-px origin-left bg-brass" style={{ scaleX: bar }} />
          </div>
        </div>
      </div>
    </section>
  )
}
