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
    <section className="flex min-h-[calc(100svh-4rem)] items-center bg-background px-4 py-6 md:px-10 md:py-10">
      <motion.article
        className="light relative mx-auto flex w-full max-w-4xl flex-col gap-3 bg-background px-5 py-5 text-foreground shadow-[0_50px_90px_-40px_black] md:-rotate-[0.6deg] md:gap-7 md:px-12 md:py-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 1, ease: EASE }}
      >
        <div className="pointer-events-none absolute inset-3 border border-foreground/15" aria-hidden="true" />
        <div className="flex flex-col items-center gap-2 text-center md:gap-3">
          <Label>{copy.label}</Label>
          <h2 className="font-serif text-2xl leading-tight text-balance md:text-4xl">{copy.title}</h2>
        </div>

        <ul className="grid md:grid-cols-2 md:gap-x-10">
          {copy.rules.map((rule, index) => {
            const Icon = RULE_ICONS[index] ?? Eye
            return (
              <motion.li
                key={rule.title}
                className="flex gap-3 border-t border-dashed border-foreground/25 py-2 md:gap-4 md:py-5"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ delay: 0.2 + index * 0.12, duration: 0.8, ease: EASE }}
              >
                <Icon className="mt-1 size-4 shrink-0 text-brass md:size-5" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-serif text-lg italic md:text-2xl">{rule.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-foreground/70 md:text-[15px]">{rule.body}</p>
                </div>
              </motion.li>
            )
          })}
        </ul>

        <div className="flex items-end justify-between gap-6 border-t border-foreground/25 pt-4 md:pt-6">
          <div className="flex flex-1 flex-col gap-2">
            <span className="h-px w-full max-w-56 bg-foreground/40" aria-hidden="true" />
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-foreground/55">{copy.sign}</span>
          </div>
          <div className="relative">
            <motion.div
              className="flex size-14 items-center justify-center rounded-full bg-brass shadow-[inset_0_-6px_12px_rgba(0,0,0,0.3),0_8px_16px_-6px_rgba(0,0,0,0.5)] md:size-24"
              initial={{ opacity: 0, scale: 2.2, rotate: -40 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -12 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.5, 0, 0.75, 0] }}
            >
              <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={72} height={70} className="h-auto w-10 opacity-80 mix-blend-multiply md:w-14" />
            </motion.div>
            <Clue id="code" className="absolute -left-10 -top-6" />
          </div>
        </div>
      </motion.article>
    </section>
  )
}
