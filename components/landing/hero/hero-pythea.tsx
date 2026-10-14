"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { EASE, Grain, type HeroCopy } from "./shared"

/** Splits "is full of stories." into a quiet lead-in and the one word that gets the gold treatment. */
function splitAccent(line: string) {
  const words = line.trim().split(/\s+/)
  const accent = words.pop() ?? ""
  return { lead: words.join(" "), accent }
}

function rise(delay: number) {
  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 1, ease: EASE },
  }
}

/** Centred, map-backed hero modelled on the Pythea landing: three-tier black-weight title with one huge gold word. */
export function HeroPythea({ copy }: { copy: HeroCopy }) {
  const [first, second = ""] = copy.title
  const { lead, accent } = splitAccent(second)

  return (
    <section className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 pb-12 pt-16 text-center md:pb-14">
      <motion.div
        className="absolute inset-0 -z-20"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1.03 }}
        transition={{ duration: 6, ease: EASE }}
        aria-hidden="true"
      >
        <Image
          unoptimized
          src="/landing/hero-kalamata-map.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.55] saturate-[0.8] sepia-[0.25]"
        />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_60%_at_50%_48%,var(--background)_0%,color-mix(in_oklab,var(--background)_75%,transparent)_45%,transparent_100%)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
      <Grain opacity={0.06} />

      <div className="flex max-w-4xl flex-col items-center gap-5 md:gap-7">
        <h1 className="flex flex-col items-center font-serif font-black leading-[0.92] text-foreground text-shadow-vintage">
          <motion.span className="block text-3xl sm:text-5xl md:text-6xl" {...rise(0.6)}>
            {first}
          </motion.span>
          {lead ? (
            <motion.span className="block pt-2 text-3xl sm:text-5xl md:text-6xl" {...rise(0.8)}>
              {lead}
            </motion.span>
          ) : null}
          <motion.span
            className="my-1 block text-[18vw] leading-[0.95] text-brass sm:text-8xl md:text-[8.5rem]"
            initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.3, duration: 1.4, ease: EASE }}
          >
            {accent}
          </motion.span>
        </h1>

        <motion.p
          className="max-w-xl font-serif text-lg italic leading-relaxed text-muted-foreground text-pretty md:text-xl"
          {...rise(1.9)}
        >
          {copy.body}
        </motion.p>

        <motion.div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row" {...rise(2.2)}>
          <a
            href="#missions"
            className="w-full rounded-sm bg-brass px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            {copy.primary}
          </a>
          <a
            href="#how"
            className="w-full rounded-sm border border-border bg-background/60 px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-chip text-foreground backdrop-blur-sm transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {copy.secondary}
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#what"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 font-sans text-[10px] uppercase tracking-chip text-muted-foreground transition-colors hover:text-brass"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
      >
        {copy.scroll}
        <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}>
          <ChevronDown className="size-4" aria-hidden="true" />
        </motion.span>
      </motion.a>
    </section>
  )
}
