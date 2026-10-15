"use client"

import { motion, useScroll } from "framer-motion"
import { useRef } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { cn } from "@/lib/utils"

const THREAD = "repeating-linear-gradient(to bottom, var(--color-thread) 0 10px, transparent 10px 18px)"

export function RouteSteps({ how }: { how: LandingCopy["how"] }) {
  const routeRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: routeRef, offset: ["start 70%", "end 55%"] })

  return (
    <section id="how" className="scroll-mt-16 px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{how.label}</p>
          <h2 className="font-serif text-4xl leading-tight text-foreground text-balance md:text-6xl">{how.title}</h2>
        </div>

        <div ref={routeRef} className="relative mt-16 md:mt-24">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-foreground/10 md:left-1/2" aria-hidden="true" />
          <motion.div
            className="absolute bottom-0 left-5 top-0 w-[3px] origin-top -translate-x-px md:left-1/2"
            style={{ scaleY: scrollYProgress, background: THREAD }}
            aria-hidden="true"
          />

          <ol className="flex flex-col gap-20 md:gap-28">
            {how.steps.map((step, index) => {
              const flip = index % 2 === 1
              return (
                <li key={step.title} className="relative grid gap-8 pl-14 md:grid-cols-2 md:gap-24 md:pl-0">
                  <span className="absolute left-5 top-0 z-10 flex size-11 -translate-x-1/2 items-center justify-center rounded-full border-2 border-thread bg-background font-serif text-lg text-foreground md:left-1/2 md:top-1/2 md:-translate-y-1/2">
                    {index + 1}
                  </span>

                  <motion.figure
                    initial={{ opacity: 0, y: 32, rotate: flip ? 5 : -5 }}
                    whileInView={{ opacity: 1, y: 0, rotate: flip ? 2 : -2 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "relative w-full max-w-md bg-parchment p-3 pb-12 shadow-2xl shadow-black/60",
                      flip ? "md:order-2 md:mr-auto" : "md:ml-auto",
                    )}
                  >
                    <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-brass shadow-md" aria-hidden="true" />
                    <img src={step.image} alt={step.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="absolute bottom-3 left-4 font-serif text-lg italic text-ink/70">
                      {how.scene} {index + 1}
                    </figcaption>
                  </motion.figure>

                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.8, delay: 0.15 }}
                    className={cn("flex flex-col justify-center gap-3", flip && "md:items-end md:text-right")}
                  >
                    <h3 className="font-serif text-3xl leading-tight text-foreground md:text-4xl">{step.title}</h3>
                    <p className="max-w-sm font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{step.body}</p>
                  </motion.div>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="mx-auto mt-24 max-w-2xl text-center font-serif text-2xl italic leading-snug text-brass text-balance md:text-3xl">
          {how.note}
        </p>
      </div>
    </section>
  )
}
