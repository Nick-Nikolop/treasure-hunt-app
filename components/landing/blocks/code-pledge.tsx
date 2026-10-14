"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Eye, Hourglass, Landmark, ShieldCheck } from "lucide-react"
import { Clue } from "../clues"
import type { LandingCopy } from "../copy"
import { useLogoSrc } from "../logo-context"
import { EASE, Label } from "../pages/kit"

const RULE_ICONS = [Eye, Hourglass, Landmark, ShieldCheck]

/** The code as a paper pledge on the dark page, closed with a brass seal that stamps down. */
export function CodePledge({ copy }: { copy: LandingCopy["code"] }) {
  const logoSrc = useLogoSrc()
  return (
    <section className="bg-background px-6 py-28 md:px-10 md:py-40">
      <motion.article
        className="light relative mx-auto flex max-w-3xl flex-col gap-10 bg-background px-7 py-12 text-foreground shadow-[0_50px_90px_-40px_black] md:-rotate-[0.6deg] md:px-16 md:py-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 1, ease: EASE }}
      >
        <div className="pointer-events-none absolute inset-3 border border-foreground/15" aria-hidden="true" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-3xl leading-tight text-balance md:text-5xl">{copy.title}</h2>
        </div>

        <ul className="flex flex-col">
          {copy.rules.map((rule, index) => {
            const Icon = RULE_ICONS[index] ?? Eye
            return (
              <motion.li
                key={rule.title}
                className="flex gap-5 border-t border-dashed border-foreground/25 py-6"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ delay: 0.2 + index * 0.12, duration: 0.8, ease: EASE }}
              >
                <Icon className="mt-1.5 size-5 shrink-0 text-brass" aria-hidden="true" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-2xl italic md:text-3xl">{rule.title}</h3>
                  <p className="font-sans text-base leading-relaxed text-foreground/70">{rule.body}</p>
                </div>
              </motion.li>
            )
          })}
        </ul>

        <div className="flex items-end justify-between gap-6 border-t border-foreground/25 pt-8">
          <div className="flex flex-1 flex-col gap-2">
            <span className="h-px w-full max-w-56 bg-foreground/40" aria-hidden="true" />
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/55">{copy.sign}</span>
          </div>
          <div className="relative">
            <motion.div
              className="flex size-24 items-center justify-center rounded-full bg-brass shadow-[inset_0_-6px_12px_rgba(0,0,0,0.3),0_8px_16px_-6px_rgba(0,0,0,0.5)] md:size-28"
              initial={{ opacity: 0, scale: 2.2, rotate: -40 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -12 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.5, 0, 0.75, 0] }}
            >
              <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={72} height={70} className="h-auto w-14 opacity-80 mix-blend-multiply md:w-16" />
            </motion.div>
            <Clue id="code" className="absolute -left-10 -top-6" />
          </div>
        </div>
      </motion.article>
    </section>
  )
}
