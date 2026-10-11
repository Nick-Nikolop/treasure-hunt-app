"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { Instagram } from "lucide-react"
import type { CSSProperties } from "react"
import { LEGAL_ORG } from "@/lib/legal"

const EASE = [0.16, 1, 0.3, 1] as const
const TITLE = "Περισσότερες Πληροφορίες"
const SUBTITLE = "στο σύντομο μέλλον"
const HANDLE = "@thehuntkalamata"

/** Carnival palette, taken from the "Carnival" hunt theme (lib/brand/themes.ts). */
const PALETTE = {
  "--cv-bg": "#3a0105",
  "--cv-deep": "#240003",
  "--cv-ink": "#f4e6c8",
  "--cv-muted": "#c79a90",
  "--cv-gold": "#e0b04a",
} as CSSProperties

const GLINTS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  duration: 9 + ((i * 13) % 8),
  delay: (i * 0.7) % 9,
  drift: ((i * 17) % 40) - 20,
}))

function GoldGlints() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {GLINTS.map((g, i) => (
        <motion.span
          key={i}
          className="absolute -top-4 rounded-full bg-[var(--cv-gold)]"
          style={{ left: `${g.left}%`, width: g.size, height: g.size, boxShadow: "0 0 8px var(--cv-gold)" }}
          initial={{ y: "-5vh", x: 0, opacity: 0 }}
          animate={{ y: "105vh", x: [0, g.drift, -g.drift / 2, 0], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: g.duration, delay: g.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  )
}

function Emblem() {
  return (
    <motion.div
      className="relative aspect-square w-[min(62vw,40svh,22rem)]"
      initial={{ opacity: 0, scale: 0.6, rotate: -8, filter: "blur(16px)" }}
      animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
      transition={{ duration: 1.8, ease: EASE }}
    >
      <motion.div
        className="absolute inset-[8%] rounded-full bg-[var(--cv-gold)] blur-3xl"
        animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <motion.div
        className="relative size-full"
        animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
      >
        <Image
          src="/carnival/logo.webp"
          alt="The Hunt Carnival"
          fill
          priority
          sizes="22rem"
          className="object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
        />
        {/* Gold light sweeping across the emblem, clipped to its own silhouette. */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(110deg, transparent 35%, rgba(255,240,200,0.75) 50%, transparent 65%)",
            backgroundSize: "250% 100%",
            maskImage: "url(/carnival/logo.webp)",
            WebkitMaskImage: "url(/carnival/logo.webp)",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            mixBlendMode: "overlay",
          }}
          initial={{ backgroundPosition: "150% 0" }}
          animate={{ backgroundPosition: ["150% 0", "-50% 0"] }}
          transition={{ duration: 2.4, delay: 2.2, repeat: Infinity, repeatDelay: 3.6, ease: "easeInOut" }}
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  )
}

function Title() {
  const words = TITLE.split(" ")
  return (
    <h1 className="text-balance font-serif text-3xl font-bold leading-tight text-[var(--cv-ink)] sm:text-5xl">
      {words.map((word, w) => (
        <span key={word} className="inline-block whitespace-nowrap">
          {[...word].map((char, c) => (
            <motion.span
              key={c}
              className="inline-block"
              initial={{ opacity: 0, y: 24, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 1.2 + (w * 12 + c) * 0.035, duration: 0.7, ease: EASE }}
            >
              {char}
            </motion.span>
          ))}
          {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </h1>
  )
}

export function CarnivalScreen() {
  const reduceMotion = useReducedMotion()

  return (
    <main
      style={PALETTE}
      className="fixed inset-0 z-50 flex h-svh flex-col items-center justify-center overflow-hidden bg-[var(--cv-bg)] px-6 text-center"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: reduceMotion ? 1.15 : [1.15, 1.05, 1.15], opacity: 1 }}
        transition={{ scale: { duration: 30, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 1.2 } }}
        aria-hidden="true"
      >
        <Image src="/brand/alt/backdrops/burgundy-velvet-v2.webp" alt="" fill priority sizes="100vw" className="object-cover" />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 20%, var(--cv-deep) 85%)" }}
        aria-hidden="true"
      />
      {!reduceMotion && <GoldGlints />}

      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-7">
        <Emblem />

        <motion.span
          className="h-px w-40 bg-gradient-to-r from-transparent via-[var(--cv-gold)] to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 1.2, ease: EASE }}
          aria-hidden="true"
        />

        <div className="flex flex-col items-center gap-2">
          <Title />
          <motion.p
            className="font-serif text-lg italic text-[var(--cv-muted)] sm:text-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 1, ease: EASE }}
          >
            {SUBTITLE}
          </motion.p>
        </div>

        <motion.a
          href={LEGAL_ORG.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative mt-2 inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-[var(--cv-gold)]/60 bg-[var(--cv-deep)]/60 px-6 py-3 font-sans text-sm font-bold tracking-wide text-[var(--cv-gold)] backdrop-blur-sm transition-colors hover:bg-[var(--cv-gold)] hover:text-[var(--cv-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cv-gold)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.9, ease: EASE }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <Instagram className="size-4" aria-hidden="true" />
          {HANDLE}
          <span className="sr-only"> στο Instagram</span>
        </motion.a>
      </div>
    </main>
  )
}
