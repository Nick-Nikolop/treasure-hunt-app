"use client"

import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Info, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { BILLBOARD, type ReelCopy } from "./copy"

const EASE = [0.22, 1, 0.36, 1] as const
/** Trailer phases: 0 = opening line on the still, 1-3 = archive shots, 4 = closing line, 5 = ended. */
const PHASE_MS = [3800, 4800, 4800, 4800, 4200]
const ENDED = 5
const ARCHIVE_FILTER = "grayscale(1) sepia(0.35) contrast(1.12) brightness(0.72)"

type Props = {
  ready: boolean
  hero: LandingCopy["hero"]
  film: LandingCopy["film"]
  reel: ReelCopy["billboard"]
  onExplore: () => void
  onMore: () => void
}

export function Billboard({ ready, hero, film, reel, onExplore, onMore }: Props) {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState(-1)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio > 0.45), { threshold: [0, 0.45, 1] })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!ready || phase !== -1) return
    if (reduce) {
      setPhase(ENDED)
      return
    }
    const timer = setTimeout(() => setPhase(0), 2400)
    return () => clearTimeout(timer)
  }, [ready, reduce, phase])

  useEffect(() => {
    if (phase < 0 || phase >= ENDED || paused || !inView) return
    const timer = setTimeout(() => setPhase((p) => p + 1), PHASE_MS[phase])
    return () => clearTimeout(timer)
  }, [phase, paused, inView])

  const playing = phase >= 0 && phase < ENDED
  const shot = phase >= 1 && phase <= 3 ? film.frames[phase - 1] : null
  const layerKey = shot ? `shot-${phase}` : phase >= 4 ? "still-end" : "still"
  const subtitle =
    phase === 0 ? film.open : shot ? `${shot.title} ${shot.hint}` : phase === 4 ? film.close : null

  const control = () => {
    if (phase === ENDED) {
      setPaused(false)
      setPhase(0)
    } else if (phase === -1) {
      setPhase(0)
    } else {
      setPaused((p) => !p)
    }
  }
  const controlLabel = phase === ENDED ? reel.replay : phase === -1 ? reel.start : paused ? reel.resume : reel.pause
  const ControlIcon = phase === ENDED ? RotateCcw : phase === -1 || paused ? Play : Pause

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-label="The Hunt"
      className="relative h-[88svh] min-h-[560px] overflow-hidden bg-reel md:h-[min(56.25vw,100svh)] md:min-h-[600px]"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={layerKey}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.4, ease: "easeInOut" }, scale: { duration: 14, ease: "linear" } }}
        >
          {shot ? (
            <Image src={shot.image} alt={shot.alt} fill sizes="100vw" className="object-cover" style={{ filter: ARCHIVE_FILTER }} />
          ) : (
            <Image
              src={BILLBOARD}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[72%_center] md:object-center"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div aria-hidden="true" className="absolute inset-0 hidden bg-linear-to-r from-reel/95 via-reel/30 to-transparent md:block" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-reel via-reel/75 to-transparent md:h-2/5 md:via-reel/60" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-reel/70 to-transparent" />

      <AnimatePresence mode="wait">
        {subtitle && (
          <motion.p
            key={subtitle}
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-x-5 top-[26%] z-10 text-balance text-center font-sans text-lg font-medium leading-snug text-reel-white [text-shadow:0_2px_12px_rgb(0_0_0/0.9)] md:inset-x-auto md:left-[52%] md:right-[8%] md:top-auto md:bottom-[42%] md:text-2xl"
          >
            {subtitle}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-5 pb-24 md:w-1/2 md:gap-5 md:px-14 md:pb-44">
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
          <span className="rounded-sm bg-reel-red px-2 py-0.5 text-sm font-bold uppercase tracking-wider text-reel-white">{reel.badge}</span>
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

      <div className="absolute right-5 top-20 z-10 flex items-center gap-3 md:bottom-44 md:right-0 md:top-auto">
        <button
          type="button"
          onClick={control}
          aria-label={controlLabel}
          title={controlLabel}
          className="flex size-11 items-center justify-center rounded-full border border-reel-white/70 bg-reel/30 text-reel-white transition hover:bg-reel-white/15"
        >
          <ControlIcon className="size-5" aria-hidden="true" />
        </button>
        <span className="hidden border-l-[3px] border-reel-white/80 bg-reel/50 py-1.5 pl-3 pr-16 font-sans text-base text-reel-white md:inline">
          {reel.rating}
        </span>
      </div>
    </section>
  )
}
