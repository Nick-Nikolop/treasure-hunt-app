"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import type { LandingCopy } from "../copy"
import { EASE, Rise } from "../pages/kit"

/** Three tall photographs revealed like prints coming out of the dark; hover (or focus) brings each one to life. */
export function FilmTriptych({ copy }: { copy: LandingCopy["film"] }) {
  return (
    <section className="relative bg-background py-28 md:py-40" aria-label={copy.open}>
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 md:gap-24 md:px-10">
        <Rise>
          <p className="mx-auto max-w-4xl text-center font-serif text-3xl leading-tight text-foreground text-balance md:text-6xl">
            {copy.open}
          </p>
        </Rise>

        <div className="grid gap-6 md:grid-cols-3 md:gap-5">
          {copy.frames.map((frame, index) => (
            <motion.figure
              key={frame.image}
              tabIndex={0}
              className={`group relative aspect-[4/5] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brass md:aspect-[3/4] ${index === 1 ? "md:translate-y-16" : ""}`}
              initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
              whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ delay: index * 0.2, duration: 1.4, ease: EASE }}
            >
              <Image
                src={frame.image}
                alt={frame.alt}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover brightness-[0.55] grayscale transition-[filter,transform] duration-1000 ease-out group-hover:scale-105 group-hover:brightness-90 group-hover:grayscale-0 group-hover:sepia-[0.35] group-focus-visible:brightness-90 group-focus-visible:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" aria-hidden="true" />
              <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6">
                <span className="font-serif text-3xl text-foreground md:text-4xl">{frame.title}</span>
                <span className="font-sans text-[15px] leading-relaxed text-foreground/75 text-pretty transition-all duration-700 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  {frame.hint}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <Rise className="md:pt-16">
          <p className="mx-auto max-w-3xl text-center font-serif text-3xl italic leading-tight text-brass text-balance md:text-5xl">
            {copy.close}
          </p>
        </Rise>
      </div>
    </section>
  )
}
