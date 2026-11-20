"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { EASE } from "./data"
import { Dial } from "./ornaments"

/** Flat gold master; also the alpha mask for the shimmer. */
export const BRAND_MARK = "/brand/th-gold.png"

const MARK_SRC = "/brand/th-mark.webp"

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
          src={MARK_SRC}
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

/** Brand mark as a plain image. */
export function BrandMarkImage({ className, alt = "", height }: { className?: string; alt?: string; height: number }) {
  return <Image src={MARK_SRC} alt={alt} width={Math.round(height * 0.82)} height={height} unoptimized loading="eager" className={cn("w-auto", className)} />
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
