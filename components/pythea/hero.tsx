"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { MapPin, ChevronDown } from "lucide-react"
import { CompassRose } from "./compass-rose"

const TITLE_TOP = ["Το", "Ταξίδι", "του"]
const TITLE_NAME = ["Πυθέα"]
const TITLE_BOTTOM = ["του", "Μεσσήνιου"]

const reveal = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: { duration: 1, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const yCompass = useTransform(scrollYProgress, [0, 1], [0, 180])
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, 120])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.15])

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5"
    >
      {/* Longitude/latitude grid backdrop */}
      <motion.div
        style={{ scale: scaleBg }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--brass) 1px, transparent 1px), linear-gradient(to bottom, var(--brass) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* Rotating compass behind title */}
      <motion.div
        style={{ y: yCompass, opacity }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brass"
      >
        <CompassRose className="h-[min(85vw,640px)] w-[min(85vw,640px)] opacity-30" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: yTitle, opacity }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="mb-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-sans text-[11px] font-semibold tracking-chip text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1">
            <MapPin className="size-3 text-brass" />
            36°57′Β · 22°06′Α — ΚΑΛΑΜΑΤΑ
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-brass">
            ΚΑΛΟΚΑΙΡΙ 2026
          </span>
        </motion.div>

        <h1 className="font-serif font-black leading-[0.92] text-foreground text-shadow-vintage">
          <span className="sr-only">Το Ταξίδι του Πυθέα του Μεσσήνιου</span>
          <span aria-hidden className="block text-3xl sm:text-5xl md:text-6xl">
            {TITLE_TOP.map((w, i) => (
              <span key={w} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="mr-[0.22em] inline-block"
                  variants={reveal}
                  initial="hidden"
                  animate="show"
                  custom={i}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
          <span
            aria-hidden
            className="my-1 block text-[18vw] leading-[0.85] text-brass sm:text-8xl md:text-[8.5rem]"
          >
            {TITLE_NAME.map((w) => (
              <span key={w} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="inline-block italic"
                  variants={reveal}
                  initial="hidden"
                  animate="show"
                  custom={3}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
          <span aria-hidden className="block text-3xl sm:text-5xl md:text-6xl">
            {TITLE_BOTTOM.map((w, i) => (
              <span key={w} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="mr-[0.22em] inline-block"
                  variants={reveal}
                  initial="hidden"
                  animate="show"
                  custom={4 + i}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 max-w-xl text-pretty font-serif text-lg italic leading-relaxed text-muted-foreground md:text-xl"
        >
          Ένα κυνήγι θησαυρού στην Καλαμάτα. Ακολούθησε τα ίχνη ενός
          πολυταξιδεμένου εξερευνητή και μάθε να βλέπεις την πόλη σαν να την
          ανακαλύπτεις για πρώτη φορά.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="#register"
            className="group inline-flex items-center gap-2 rounded-sm bg-brass px-7 py-3.5 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            ΞΕΚΙΝΑ ΤΗΝ ΑΝΑΖΗΤΗΣΗ
          </a>
          <a
            href="#story"
            className="inline-flex items-center gap-2 rounded-sm border border-border px-7 py-3.5 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            Η ΙΣΤΟΡΙΑ ΤΟΥ ΠΥΘΕΑ
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        style={{ opacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 font-sans text-[10px] tracking-chip text-muted-foreground"
      >
        ΚΥΛΗΣΕ
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="size-4 text-brass" />
        </motion.span>
      </motion.div>
    </section>
  )
}
