"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import type { LandingCopy } from "@/components/landing/copy"

export function Manifesto({ story }: { story: LandingCopy["story"] }) {
  return (
    <section id="idea" className="scroll-mt-16 px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 md:gap-8">
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-brass">{story.label}</p>
        {story.lines.map((line) => (
          <motion.p
            key={line}
            initial={{ opacity: 0.12 }}
            whileInView={{ opacity: 1 }}
            viewport={{ amount: 1, margin: "0px 0px -18% 0px" }}
            transition={{ duration: 0.8 }}
            className="font-serif text-3xl leading-tight text-foreground text-balance md:text-5xl"
          >
            {line}
          </motion.p>
        ))}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mt-6 font-serif text-4xl italic text-brass md:text-6xl"
        >
          {story.close}
        </motion.p>
        <p className="max-w-xl font-sans text-[15px] leading-relaxed text-muted-foreground md:text-base">{story.after}</p>
      </div>
    </section>
  )
}

export function Equation({ what }: { what: LandingCopy["what"] }) {
  return (
    <section id="what" className="scroll-mt-16 bg-parchment text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-6 py-24 md:px-10 md:py-32">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-ink/60">{what.label}</p>
          <h2 className="font-serif text-3xl leading-tight text-balance md:text-5xl">{what.compare}</h2>
        </div>

        <ol className="grid gap-y-10 md:grid-cols-4">
          {what.equation.map((term, index) => (
            <motion.li
              key={term}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              className="relative flex flex-col gap-3 md:border-l md:border-ink/15 md:px-6 md:first:border-l-0 md:first:pl-0 lg:px-8"
            >
              {index > 0 && (
                <span
                  className="font-serif text-3xl leading-none text-thread md:absolute md:-left-3 md:top-1 md:bg-parchment md:px-1"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
              <span className="font-serif text-4xl leading-none md:text-3xl lg:text-4xl xl:whitespace-nowrap">{term}</span>
              <span className="max-w-[26ch] font-sans text-[15px] leading-relaxed text-ink/70">{what.notes[index]}</span>
            </motion.li>
          ))}
        </ol>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-6 border-t border-ink/15 pt-10 md:flex-row md:items-center md:gap-8"
        >
          <div className="flex items-center gap-5">
            <span className="font-serif text-5xl leading-none text-thread" aria-hidden="true">
              =
            </span>
            <Image unoptimized src="/landing/logo.webp" alt="" width={72} height={70} className="h-auto w-16 md:w-[72px]" />
            <span className="font-serif text-4xl leading-none md:text-6xl">The Hunt</span>
          </div>
          <p className="max-w-md font-serif text-xl italic leading-snug text-ink/80 md:ml-auto md:text-2xl">{what.result}</p>
        </motion.div>
      </div>
    </section>
  )
}
