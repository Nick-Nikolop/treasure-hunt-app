"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { MapPin, ChevronDown } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"

const reveal = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: { duration: 1, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Hero() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const yMap = useTransform(scrollYProgress, [0, 1], [0, 140])
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, 120])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1.05, 1.18])

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5"
    >
      {/* Antique map backdrop: widescreen on desktop, square crop on mobile */}
      <motion.div
        style={{ y: yMap, scale: scaleBg }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/map-square.jpg"
          alt=""
          className="size-full object-cover md:hidden"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/map-wide.png"
          alt=""
          className="hidden size-full object-cover md:block"
          fetchPriority="high"
        />
      </motion.div>

      {/* Readability scrim: darken the whole map, then a focused vignette behind
          the title so the text always sits on a calm, high-contrast field. */}
      <div
        className="hero-scrim pointer-events-none absolute inset-0 bg-background/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 64% 52% at 50% 46%, var(--background) 0%, color-mix(in oklch, var(--background) 72%, transparent) 42%, transparent 78%)",
        }}
      />
      {/* Top and bottom fades to blend into the page */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />

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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1 backdrop-blur-sm">
            <MapPin className="size-3 text-brass" />
            {t.hero.coords}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-brass backdrop-blur-sm">
            {t.hero.season}
          </span>
          <span className="inline-flex items-center rounded-full border border-brass/60 bg-brass/15 px-3 py-1 font-bold text-brass backdrop-blur-sm">
            {t.hero.free}
          </span>
        </motion.div>

        <h1 className="font-serif font-black leading-[0.92] text-foreground text-shadow-vintage">
          <span className="sr-only">{t.hero.srTitle}</span>
          <span aria-hidden className="block text-3xl sm:text-5xl md:text-6xl">
            {t.hero.titleTop.map((w, i) => (
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
            className="my-1 block text-[18vw] leading-[0.95] text-brass sm:text-8xl md:text-[8.5rem]"
          >
            <span className="inline-block overflow-hidden px-[0.08em] pb-[0.12em] align-bottom">
              <motion.span
                className="inline-block italic"
                variants={reveal}
                initial="hidden"
                animate="show"
                custom={3}
              >
                {t.hero.titleName}
              </motion.span>
            </span>
          </span>
          <span aria-hidden className="block text-3xl sm:text-5xl md:text-6xl">
            {t.hero.titleBottom.map((w, i) => (
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
          {t.hero.subtitle}
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
            {t.hero.ctaStart}
          </a>
          <a
            href="#story"
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-background/60 px-7 py-3.5 font-sans text-sm font-bold tracking-chip text-foreground backdrop-blur-sm transition-colors hover:border-brass hover:text-brass"
          >
            {t.hero.ctaStory}
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
        {t.hero.scroll}
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
