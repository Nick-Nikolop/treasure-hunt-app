"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useSyncExternalStore, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { EASE } from "./data"
import { Dial } from "./ornaments"

/** Flat gold master; also the alpha mask for the shimmer (same shape for every texture). */
export const BRAND_MARK = "/brand/th-gold.png"

// TEMPORARY texture comparison: delete TEXTURES/useTexture/TextureSwitcher and
// point TEXTURE_SRC at the chosen file once the team picks one.
export type Texture =
  | "flat"
  | "brushed"
  | "polished"
  | "antique"
  | "hammered"
  | "leaf"
  | "rose"
  | "champagne"
  | "guilloche"
  | "glitter"
  | "molten"
  | "faceted"
  | "sunray"
  | "crackle"
  | "sandblast"
  | "verdigris"

export const TEXTURES: { id: Texture; label: string }[] = [
  { id: "flat", label: "Χωρίς υφή" },
  { id: "brushed", label: "Βουρτσισμένο" },
  { id: "polished", label: "Γυαλιστερό" },
  { id: "antique", label: "Αντίκα" },
  { id: "hammered", label: "Σφυρήλατο" },
  { id: "leaf", label: "Φύλλο χρυσού" },
  { id: "rose", label: "Ροζ χρυσό" },
  { id: "champagne", label: "Σαμπανί σατέν" },
  { id: "guilloche", label: "Γκιλοσέ" },
  { id: "glitter", label: "Γκλίτερ" },
  { id: "molten", label: "Λιωμένο" },
  { id: "faceted", label: "Διαμαντοκομμένο" },
  { id: "sunray", label: "Ηλιαχτίδες" },
  { id: "crackle", label: "Κρακελέ" },
  { id: "sandblast", label: "Αμμοβολή" },
  { id: "verdigris", label: "Πατίνα" },
]

const KEY = "l6-logo-texture"
const DEFAULT: Texture = "brushed"
const listeners = new Set<() => void>()

function read(): Texture {
  try {
    const v = window.localStorage.getItem(KEY)
    return TEXTURES.some((t) => t.id === v) ? (v as Texture) : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function setTexture(t: Texture) {
  try {
    window.localStorage.setItem(KEY, t)
  } catch {}
  listeners.forEach((l) => l())
}

export function useTexture() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => DEFAULT,
  )
}

function useMarkSrc() {
  return `/brand/tex/th-${useTexture()}.webp`
}

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

function Shimmer() {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0 mix-blend-screen"
      style={maskStyle(BRAND_MARK, "linear-gradient(110deg, transparent 38%, rgba(255,246,214,0.75) 50%, transparent 62%)", { backgroundSize: "300% 100%" })}
      initial={{ backgroundPosition: "120% 0%" }}
      animate={{ backgroundPosition: ["120% 0%", "-20% 0%"] }}
      transition={{ duration: 2.4, delay: 1.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 5.5, ease: "easeInOut" }}
    />
  )
}

const SQUARE_SIZE =
  "size-36 min-[400px]:size-40 max-sm:[@media(min-height:820px)]:size-48 max-sm:[@media(max-height:680px)]:size-28 sm:size-44 sm:[@media(min-height:900px)]:size-72"

const DIAL_FRAME =
  "relative my-6 flex items-center justify-center min-[400px]:my-7 max-sm:[@media(min-height:820px)]:my-8 max-sm:[@media(max-height:680px)]:my-5 sm:my-8 sm:[@media(min-height:900px)]:my-12"

export function HeroLogo() {
  const reduce = useReducedMotion()
  const src = useMarkSrc()
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduce ? 1 : 0.9, filter: reduce ? "blur(0px)" : "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0.2 : 1.6, ease: EASE }}
      className={cn(DIAL_FRAME, SQUARE_SIZE)}
    >
      <motion.div
        className="absolute -inset-6 text-[var(--l6-gold)] min-[400px]:-inset-7 max-sm:[@media(min-height:820px)]:-inset-8 max-sm:[@media(max-height:680px)]:-inset-5 sm:-inset-8 sm:[@media(min-height:900px)]:-inset-12"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 160, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <Dial className="size-full" />
      </motion.div>
      <div className="relative size-full">
        <Image
          src={src}
          alt=""
          fill
          priority
          unoptimized
          sizes="(min-width: 640px) 288px, 192px"
          className="object-contain drop-shadow-[0_18px_40px_rgba(224,176,74,0.3)]"
        />
        {!reduce && <Shimmer />}
      </div>
    </motion.div>
  )
}

export function HeroTextTitle({ className }: { className?: string }) {
  return (
    <h1 id="l6-title" className={cn("font-sans text-4xl font-black uppercase leading-none tracking-[0.18em] text-[var(--l6-cream)] sm:text-6xl sm:tracking-[0.22em]", className)}>
      The Hunt
    </h1>
  )
}

/** Brand mark as a plain image, following the selected texture. */
export function BrandMarkImage({ className, alt = "", height }: { className?: string; alt?: string; height: number }) {
  const src = useMarkSrc()
  return <Image src={src} alt={alt} width={Math.round(height * 0.82)} height={height} unoptimized loading="eager" className={cn("w-auto", className)} />
}

export function TopbarBrand() {
  return (
    <span className="flex items-center gap-3">
      <BrandMarkImage height={36} className="h-9" />
      <span className="hidden flex-col leading-none min-[420px]:flex">
        <span className="font-sans text-sm font-black uppercase tracking-[0.28em] text-[var(--l6-gold)]">The Hunt</span>
        <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--l6-cream)]/50">Καλαμάτα</span>
      </span>
    </span>
  )
}

const STEP_BTN =
  "flex size-8 items-center justify-center rounded-full font-sans text-base font-bold text-[var(--l6-cream)]/80 transition hover:text-[var(--l6-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"

function TextureStepper() {
  const texture = useTexture()
  const index = TEXTURES.findIndex((t) => t.id === texture)
  const go = (delta: number) => setTexture(TEXTURES[(index + delta + TEXTURES.length) % TEXTURES.length].id)
  return (
    <div
      data-no-track
      className="flex items-center rounded-full border border-dashed border-[var(--l6-gold)]/50 p-0.5 2xl:hidden"
    >
      <button type="button" aria-label="Προηγούμενη υφή" onClick={() => go(-1)} className={STEP_BTN}>
        {"‹"}
      </button>
      <span aria-live="polite" className="min-w-12 text-center font-sans text-[11px] font-bold tabular-nums text-[var(--l6-gold)]">
        <span className="sr-only">{TEXTURES[index].label}, </span>
        {index}/{TEXTURES.length - 1}
      </span>
      <button type="button" aria-label="Επόμενη υφή" onClick={() => go(1)} className={STEP_BTN}>
        {"›"}
      </button>
    </div>
  )
}

export function TextureSwitcher() {
  return (
    <>
      <TextureStepper />
      <TextureRow />
      <a
        href="/brand/textures"
        data-no-track
        aria-label="Συλλογή υφών σε πλήρη οθόνη"
        title="Συλλογή υφών"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--l6-gold)]/50 text-[var(--l6-gold)] transition hover:bg-[var(--l6-gold)] hover:text-[var(--l6-night)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)]"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      </a>
    </>
  )
}

function TextureRow() {
  const texture = useTexture()
  return (
    <div
      role="radiogroup"
      aria-label="Δοκιμή υφής λογότυπου (προσωρινό)"
      data-no-track
      className="hidden items-center gap-0.5 rounded-full border border-dashed border-[var(--l6-gold)]/50 p-0.5 2xl:flex"
    >
      {TEXTURES.map((t, i) => {
        const active = t.id === texture
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={t.label}
            onClick={() => setTexture(t.id)}
            className={cn(
              "h-7 min-w-6 rounded-full px-1 font-sans text-[11px] font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l6-gold)] sm:h-8 sm:min-w-7",
              active ? "bg-[var(--l6-gold)] text-[var(--l6-night)]" : "text-[var(--l6-cream)]/70 hover:text-[var(--l6-cream)]",
            )}
          >
            {i}
          </button>
        )
      })}
    </div>
  )
}
