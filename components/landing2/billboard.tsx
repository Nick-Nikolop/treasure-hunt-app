"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronDown, Info, Play } from "lucide-react"
import { useRef } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { type BeamPath, Grain, beamMask, useBeam } from "@/components/landing/hero/shared"
import type { ReelCopy } from "./copy"

const EASE = [0.22, 1, 0.36, 1] as const
export const HERO_IMAGES = [
  { id: "original", label: "1", src: "/landing/hero-kalamata-map.png" },
  { id: "hd", label: "2", src: "/landing/hero-kalamata-map-hd.webp" },
  { id: "hd2", label: "3", src: "/landing/hero-kalamata-map-hd2.webp" },
] as const
export type HeroImageId = (typeof HERO_IMAGES)[number]["id"]

const BEAM: BeamPath = { x: 0.74, y: 0.44, reachX: 0.13, reachY: 0.17, mobileX: 0.5, mobileReachX: 0.22, speed: 0.8 }

type Props = {
  ready: boolean
  hero: LandingCopy["hero"]
  reel: ReelCopy["billboard"]
  onExplore: () => void
  onMore: () => void
  image: HeroImageId
}

export function Billboard({ hero, reel, onExplore, onMore, image }: Props) {
  const HERO_IMAGE = (HERO_IMAGES.find((h) => h.id === image) ?? HERO_IMAGES[1]).src
  const sectionRef = useRef<HTMLElement>(null)
  useBeam(sectionRef, BEAM)
  const mask = beamMask("12rem", "26rem")

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

      <div aria-hidden="true" className="absolute inset-0 hidden bg-linear-to-r from-reel/90 via-reel/20 to-transparent md:block" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-reel via-reel/75 to-transparent md:h-2/5 md:via-reel/60" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-reel/70 to-transparent" />
      <Grain opacity={0.07} />

      <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-5 pb-24 md:w-1/2 md:gap-5 md:px-14 md:pb-[14svh]">
        <div className="flex items-center gap-2.5 font-sans text-sm font-bold uppercase tracking-[0.35em] text-reel-white/85">
          <Image unoptimized src="/landing/logo.webp" alt="" width={28} height={27} className="h-auto w-7" />
          {reel.kind}
        </div>

        <h1 className="font-serif text-7xl font-black leading-[0.85] tracking-tight text-reel-white [text-shadow:0_4px_30px_rgb(0_0_0/0.6)] md:text-[clamp(5rem,8.5vw,9.5rem)]">
          The Hunt
        </h1>

        <p className="font-serif text-2xl italic leading-tight text-reel-white/90 md:text-3xl">{hero.title.join(" ")}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-base">
          <span className="rounded-sm bg-brass px-2 py-0.5 text-sm font-bold uppercase tracking-wider text-reel">{reel.badge}</span>
          {reel.meta.map((item) => (
            <span key={item} className="text-reel-white/80">
              {item}
            </span>
          ))}
        </div>

        <p className="max-w-xl text-pretty font-sans text-base leading-relaxed text-reel-white/85 md:text-lg">{hero.body}</p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExplore}
            className="flex items-center gap-2.5 rounded-md bg-reel-white px-6 py-2.5 font-sans text-lg font-bold text-reel transition hover:bg-reel-white/80 md:px-8 md:py-3"
          >
            <Play className="size-6 fill-current" aria-hidden="true" />
            {hero.primary}
          </button>
          <button
            type="button"
            onClick={onMore}
            className="flex items-center gap-2.5 rounded-md border border-reel-white/40 bg-reel/40 px-6 py-2.5 font-sans text-lg font-bold text-reel-white backdrop-blur-sm transition hover:border-reel-white hover:bg-reel-white/10 md:px-8 md:py-3"
          >
            <Info className="size-6" aria-hidden="true" />
            {reel.more}
          </button>
        </div>
      </div>

      <a
        href="#what"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 font-sans text-xs font-bold uppercase tracking-[0.3em] text-reel-white/70 transition hover:text-reel-white"
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
