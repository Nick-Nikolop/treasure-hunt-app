"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronDown, Info, Play } from "lucide-react"
import { useRef } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { type BeamPath, Grain, beamMask, useBeam } from "@/components/landing/hero/shared"
import type { ReelCopy } from "./copy"

const EASE = [0.22, 1, 0.36, 1] as const
const HERO_IMAGE = "/landing/hero-kalamata-map.webp"

const BEAM: BeamPath = {
  x: 0.74,
  y: 0.44,
  reachX: 0.13,
  reachY: 0.17,
  mobileX: 0.5,
  mobileReachX: 0.22,
  mobileY: 0.26,
  mobileReachY: 0.08,
  speed: 0.8,
  followPointer: true,
  stickToMouse: true,
  followTouch: true,
}

type Props = {
  ready: boolean
  hero: LandingCopy["hero"]
  reel: ReelCopy["billboard"]
  onExplore: () => void
  onMore: () => void
}

export function Billboard({ hero, reel, onExplore, onMore }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  useBeam(sectionRef, BEAM)
  const mask = beamMask("9rem", "20rem")
  const shadeMask =
    "radial-gradient(circle at var(--beam-x, 60%) var(--beam-y, 55%), rgb(0 0 0 / 0.25) 0, rgb(0 0 0 / 0.25) 8rem, #000 22rem)"

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-label="The Hunt"
      className="relative isolate h-svh min-h-[560px] overflow-hidden bg-reel"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 3.2, ease: EASE }}
      >
        <Image unoptimized src={HERO_IMAGE} alt="" fill priority sizes="100vw" className="object-cover object-center brightness-[0.2] saturate-[0.5]" />
        <div className="absolute inset-0" style={{ maskImage: mask, WebkitMaskImage: mask }}>
          <Image unoptimized loading="eager" src={HERO_IMAGE} alt="" fill sizes="100vw" className="object-cover object-center brightness-[1.15] saturate-[1.05] sepia-[0.15]" />
        </div>
      </motion.div>

      <div aria-hidden="true" className="absolute inset-0" style={{ maskImage: shadeMask, WebkitMaskImage: shadeMask }}>
        <div className="absolute inset-0 hidden bg-linear-to-r from-reel/90 via-reel/20 to-transparent md:block" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-reel via-reel/75 to-transparent max-md:hidden md:via-reel/60" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-reel/70 to-transparent" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[68%] bg-linear-to-t from-reel from-55% via-reel/85 to-transparent md:hidden"
      />
      <Grain opacity={0.07} />

      <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-5 pb-8 md:w-1/2 md:gap-5 md:px-14 md:pb-[14svh]">
        <div className="hidden items-center gap-2.5 font-sans text-sm md:flex font-bold uppercase tracking-[0.35em] text-reel-white/85">
          <Image unoptimized src="/landing/logo-sm.webp" alt="" width={28} height={27} className="h-auto w-7" />
          {reel.kind}
        </div>

        <h1 className="font-serif text-[4rem] font-black leading-[0.85] tracking-tight text-reel-white [text-shadow:0_4px_30px_rgb(0_0_0/0.6)] md:text-[clamp(5rem,8.5vw,9.5rem)]">
          The Hunt
        </h1>

        <p className="text-balance font-serif text-xl italic leading-snug text-reel-white/90 md:text-3xl md:leading-tight">{hero.title.join(" ")}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-sans text-sm md:text-base">
          <span className="rounded-sm bg-brass px-2 py-0.5 text-sm font-bold uppercase tracking-wider text-reel">{reel.badge}</span>
          {reel.meta.map((item) => (
            <span key={item} className="text-reel-white/75">
              {item}
            </span>
          ))}
        </div>

        <p className="hidden max-w-xl text-pretty font-sans text-[15px] leading-relaxed text-reel-white/85 md:block md:text-lg [@media(min-height:660px)]:block">{hero.body}</p>

        <div className="flex items-center gap-2 pt-2 md:gap-3 md:pt-1">
          <button
            type="button"
            onClick={onExplore}
            className="flex flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-md bg-reel-white px-4 py-3 font-sans text-base font-bold text-reel transition hover:bg-reel-white/80 md:flex-none md:px-8 md:text-lg"
          >
            <Play className="size-5 fill-current md:size-6" aria-hidden="true" />
            {hero.primary}
          </button>
          <button
            type="button"
            onClick={onMore}
            aria-label={reel.more}
            className="flex size-12 shrink-0 items-center justify-center gap-2.5 rounded-md border border-reel-white/40 bg-reel/40 font-sans text-lg font-bold text-reel-white backdrop-blur-sm transition hover:border-reel-white hover:bg-reel-white/10 md:size-auto md:px-8 md:py-3"
          >
            <Info className="size-6" aria-hidden="true" />
            <span className="hidden md:inline">{reel.more}</span>
          </button>
        </div>
      </div>

      <a
        href="#what"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:flex flex-col items-center gap-1 font-sans text-xs font-bold uppercase tracking-[0.3em] text-reel-white/70 transition hover:text-reel-white"
      >
        {reel.scroll}
        <ChevronDown className="size-5 motion-safe:animate-bounce" aria-hidden="true" />
      </a>

      <span className="absolute bottom-[14svh] right-0 z-10 hidden border-l-[3px] border-reel-white/80 bg-reel/50 py-1.5 pl-3 pr-16 font-sans text-base text-reel-white md:inline">
        {reel.rating}
      </span>
    </section>
  )
}
