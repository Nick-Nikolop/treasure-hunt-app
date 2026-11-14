"use client"

// TEMPORARY: lets the team compare logo options on `/`. Delete this file and the
// <LogoSwitcher /> in topbar.tsx once a logo is chosen.

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useSyncExternalStore, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { EASE } from "./data"
import { Dial } from "./ornaments"

export type LogoVariant = "old" | "wordmark" | "emblem"

const VARIANTS: { id: LogoVariant; label: string; short: string }[] = [
  { id: "old", label: "Παλιό", short: "1" },
  { id: "wordmark", label: "Wordmark", short: "2" },
  { id: "emblem", label: "Πυξίδα", short: "3" },
]

const KEY = "l6-logo-variant"
const DEFAULT: LogoVariant = "wordmark"
const listeners = new Set<() => void>()

function read(): LogoVariant {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === "old" || v === "wordmark" || v === "emblem" ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

function setVariant(v: LogoVariant) {
  try {
    window.localStorage.setItem(KEY, v)
  } catch {}
  listeners.forEach((l) => l())
}

export function useLogoVariant() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => DEFAULT,
  )
}

const GOLD_FILL = "linear-gradient(180deg, #f8e3a3 0%, var(--l6-gold) 48%, #a8761f 100%)"

function maskStyle(src: string, background: string, extra?: CSSProperties): CSSProperties {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    backgroundImage: background,
    ...extra,
  }
}

function GoldMark({ src, className }: { src: string; className?: string }) {
  return <span aria-hidden="true" className={cn("block", className)} style={maskStyle(src, GOLD_FILL)} />
}

function Shimmer({ src }: { src: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0 mix-blend-screen"
      style={maskStyle(src, "linear-gradient(110deg, transparent 38%, rgba(255,246,214,0.75) 50%, transparent 62%)", { backgroundSize: "300% 100%" })}
      initial={{ backgroundPosition: "120% 0%" }}
      animate={{ backgroundPosition: ["120% 0%", "-20% 0%"] }}
      transition={{ duration: 2.4, delay: 1.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 5.5, ease: "easeInOut" }}
    />
  )
}

const SQUARE_SIZE =
  "size-36 min-[400px]:size-40 max-sm:[@media(min-height:820px)]:size-48 max-sm:[@media(max-height:680px)]:size-28 sm:size-44 sm:[@media(min-height:900px)]:size-72"

export function HeroLogo() {
  const variant = useLogoVariant()
  const reduce = useReducedMotion()
  const intro = {
    initial: { opacity: 0, scale: reduce ? 1 : 0.9, filter: reduce ? "blur(0px)" : "blur(10px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    transition: { duration: reduce ? 0.2 : 1.6, ease: EASE },
  }

  if (variant === "wordmark") {
    const src = "/landing/wordmark-gold.webp"
    return (
      <motion.h1
        key={variant}
        id="l6-title"
        {...intro}
        className="relative mb-3 aspect-[1200/689] w-52 min-[400px]:w-60 max-sm:[@media(min-height:820px)]:w-64 max-sm:[@media(max-height:680px)]:w-44 sm:w-80 sm:[@media(min-height:900px)]:mb-4 sm:[@media(min-height:900px)]:w-96"
      >
        <Image src={src} alt="The Hunt" fill priority sizes="(min-width: 640px) 384px, 256px" className="object-contain opacity-0" />
        <span aria-hidden="true" className="absolute inset-0 drop-shadow-[0_18px_40px_rgba(224,176,74,0.3)]">
          <GoldMark src={src} className="absolute inset-0" />
        </span>
        {!reduce && <Shimmer src={src} />}
      </motion.h1>
    )
  }

  if (variant === "emblem") {
    const src = "/landing/emblem-gold.webp"
    return (
      <motion.div key={variant} {...intro} className={cn("relative my-4 sm:my-6", SQUARE_SIZE)}>
          <span aria-hidden="true" className="absolute inset-0 drop-shadow-[0_18px_40px_rgba(224,176,74,0.3)]">
            <GoldMark src={src} className="absolute inset-0" />
          </span>
          {!reduce && <Shimmer src={src} />}
        </motion.div>
    )
  }

  const src = "/landing/logo.webp"
  return (
      <motion.div
        key={variant}
        {...intro}
        className={cn(
          "relative my-6 flex items-center justify-center min-[400px]:my-7 max-sm:[@media(min-height:820px)]:my-8 max-sm:[@media(max-height:680px)]:my-5 sm:my-8 sm:[@media(min-height:900px)]:my-12",
          SQUARE_SIZE,
        )}
      >
        <motion.div
          className="absolute -inset-6 text-[var(--l6-gold)] min-[400px]:-inset-7 max-sm:[@media(min-height:820px)]:-inset-8 max-sm:[@media(max-height:680px)]:-inset-5 sm:-inset-8 sm:[@media(min-height:900px)]:-inset-12"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 160, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <Dial className="size-full" />
        </motion.div>
        <div className="relative size-full">
          <Image src={src} alt="" fill priority sizes="(min-width: 640px) 288px, 224px" className="object-contain drop-shadow-[0_18px_40px_rgba(224,176,74,0.28)]" />
          {!reduce && <Shimmer src={src} />}
        </div>
      </motion.div>
  )
}

/** Text heading used with the square logos (the wordmark is its own heading). */
export function HeroTextTitle({ className }: { className?: string }) {
  const variant = useLogoVariant()
  if (variant === "wordmark") return null
  return (
    <h1 id="l6-title" className={cn("font-sans text-4xl font-black uppercase leading-none tracking-[0.18em] text-[var(--l6-cream)] sm:text-6xl sm:tracking-[0.22em]", className)}>
      The Hunt
    </h1>
  )
}

export function TopbarBrand() {
  const variant = useLogoVariant()

  if (variant === "wordmark") return <GoldMark src="/landing/wordmark-gold.webp" className="aspect-[1200/689] h-10" />

  return (
    <span className="flex items-center gap-3">
      {variant === "emblem" ? (
        <GoldMark src="/landing/emblem-gold.webp" className="size-9" />
      ) : (
        <Image src="/landing/logo-sm.webp" alt="" width={40} height={40} priority className="size-9 object-contain" />
      )}
      <span className="flex flex-col leading-none">
        <span className="font-sans text-sm font-black uppercase tracking-[0.28em] text-[var(--l6-gold)]">The Hunt</span>
        <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--l6-cream)]/50">Καλαμάτα</span>
      </span>
    </span>
  )
}

export function LogoSwitcher() {
  const variant = useLogoVariant()
  return (
    <div
      role="radiogroup"
      aria-label="Δοκιμή λογότυπου (προσωρινό)"
      data-no-track
      className="flex items-center gap-0.5 rounded-full border border-dashed border-[var(--l6-gold)]/50 p-0.5"
    >
      {VARIANTS.map((v) => {
        const active = v.id === variant
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={v.label}
            onClick={() => setVariant(v.id)}
            className={cn(
              "h-8 rounded-full px-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]",
              active ? "bg-[var(--l6-gold)] text-[var(--l6-night)]" : "text-[var(--l6-cream)]/70 hover:text-[var(--l6-cream)]",
            )}
          >
            <span className="sm:hidden">{v.short}</span>
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        )
      })}
    </div>
  )
}
