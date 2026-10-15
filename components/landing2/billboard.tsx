"use client"

import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown, Info, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import type { ReelCopy } from "./copy"
import { HeroFilm } from "./film/hero-film"
import { STILL_TIME } from "./film/render"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  ready: boolean
  hero: LandingCopy["hero"]
  reel: ReelCopy["billboard"]
  onExplore: () => void
  onMore: () => void
}

export function Billboard({ ready, hero, reel, onExplore, onMore }: Props) {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio > 0.45), { threshold: [0, 0.45, 1] })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!ready || started || reduce) return
    const timer = setTimeout(() => setStarted(true), 1600)
    return () => clearTimeout(timer)
  }, [ready, started, reduce])

  const playing = started && !paused
  const control = () => {
    if (!started) setStarted(true)
    else setPaused((p) => !p)
  }
  const controlLabel = !started ? reel.start : paused ? reel.resume : reel.pause
  const ControlIcon = !started || paused ? Play : Pause
  const muteLabel = muted ? reel.unmute : reel.mute
  const MuteIcon = muted ? VolumeX : Volume2

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-label="The Hunt"
      className="relative h-svh min-h-[560px] overflow-hidden bg-reel"
    >
      <HeroFilm
        active={playing && inView}
        muted={muted}
        startAt={reduce ? STILL_TIME : 0}
        className="absolute inset-0 size-full"
      />

      <div aria-hidden="true" className="absolute inset-0 hidden bg-linear-to-r from-reel/95 via-reel/30 to-transparent md:block" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-reel via-reel/75 to-transparent md:h-2/5 md:via-reel/60" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-reel/70 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-5 pb-24 md:w-1/2 md:gap-5 md:px-14 md:pb-[14svh]">
        <div className="flex items-center gap-2.5 font-sans text-sm font-bold uppercase tracking-[0.35em] text-reel-white/85">
          <Image unoptimized src="/landing/logo.webp" alt="" width={28} height={27} className="h-auto w-7" />
          {reel.kind}
        </div>

        <motion.h1
          animate={{ scale: playing ? 0.74 : 1 }}
          transition={{ duration: 1.2, ease: EASE }}
          style={{ originX: 0, originY: 1 }}
          className="font-serif text-7xl font-black leading-[0.85] tracking-tight text-reel-white [text-shadow:0_4px_30px_rgb(0_0_0/0.6)] md:text-[clamp(5rem,8.5vw,9.5rem)]"
        >
          The Hunt
        </motion.h1>

        <p className="font-serif text-2xl italic leading-tight text-reel-white/90 md:text-3xl">{hero.title.join(" ")}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-base">
          <span className="rounded-sm bg-brass px-2 py-0.5 text-sm font-bold uppercase tracking-wider text-reel">{reel.badge}</span>
          {reel.meta.map((item) => (
            <span key={item} className="text-reel-white/80">
              {item}
            </span>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {!playing && (
            <motion.p
              key="body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="max-w-xl overflow-hidden text-pretty font-sans text-base leading-relaxed text-reel-white/85 md:text-lg"
            >
              {hero.body}
            </motion.p>
          )}
        </AnimatePresence>

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
            className="flex items-center gap-2.5 rounded-md bg-reel-mute/40 px-6 py-2.5 font-sans text-lg font-bold text-reel-white backdrop-blur-sm transition hover:bg-reel-mute/30 md:px-8 md:py-3"
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

      <div className="absolute right-5 top-20 z-10 flex items-center gap-3 md:bottom-[14svh] md:right-0 md:top-auto">
        <button
          type="button"
          onClick={control}
          aria-label={controlLabel}
          title={controlLabel}
          className="flex size-11 items-center justify-center rounded-full border border-reel-white/70 bg-reel/30 text-reel-white transition hover:bg-reel-white/15"
        >
          <ControlIcon className="size-5" aria-hidden="true" />
        </button>
        {!reduce && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muteLabel}
            aria-pressed={!muted}
            title={muteLabel}
            className="flex size-11 items-center justify-center rounded-full border border-reel-white/70 bg-reel/30 text-reel-white transition hover:bg-reel-white/15"
          >
            <MuteIcon className="size-5" aria-hidden="true" />
          </button>
        )}
        <span className="hidden border-l-[3px] border-reel-white/80 bg-reel/50 py-1.5 pl-3 pr-16 font-sans text-base text-reel-white md:inline">
          {reel.rating}
        </span>
      </div>
    </section>
  )
}
