"use client"

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion"
import { Hand, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LandingCopy } from "@/components/landing/copy"
import { track, trackTiming } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { cn } from "@/lib/utils"
import { SectionEyebrow } from "../spotlights"
import { EXPLAINER_COPY } from "./copy"
import { EndCard, Scene, captionFor } from "./scenes"
import { CHAPTERS, GATE_TIMEOUT, START_CLOCK, advance, type ChapterId, type Clock, type Solved } from "./timeline"

const EASE = [0.22, 1, 0.36, 1] as const

export function ExplainerSection({ locale, what }: { locale: "el" | "en"; what: LandingCopy["what"] }) {
  const copy = EXPLAINER_COPY[locale]
  const reduce = Boolean(useReducedMotion())
  const playerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(playerRef, { amount: 0.45 })

  const [clock, setClock] = useState<Clock>(START_CLOCK)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [solved, setSolved] = useState<Solved>({})
  const [wrong, setWrong] = useState<string[]>([])

  const solvedRef = useRef(solved)
  const startedAt = useRef(0)
  const interactions = useRef(0)
  const completed = useRef(false)
  const autoplayed = useRef(false)

  useEffect(() => {
    solvedRef.current = solved
  }, [solved])

  const running = playing && inView && !clock.ended
  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      setClock((current) => advance(current, dt, solvedRef.current))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])

  const begin = (trigger: "auto" | "play" | "jump" | "replay") => {
    setPlaying(true)
    setStarted(true)
    if (trigger === "replay" || startedAt.current === 0) {
      startedAt.current = performance.now()
      interactions.current = 0
      completed.current = false
      track(EV.explainerStart, { trigger })
    }
  }

  useEffect(() => {
    if (!inView || autoplayed.current || reduce) return
    autoplayed.current = true
    begin("auto")
  }, [inView, reduce])

  const resolve = (id: ChapterId, auto: boolean, option?: string) => {
    setSolved((current) => ({ ...current, [id]: { option, auto } }))
    if (!auto) interactions.current += 1
    track(EV.explainerInteract, { step: id, option, correct: true, auto })
  }

  const chapter = CHAPTERS[clock.chapter]
  useEffect(() => {
    if (chapter.gate === undefined || solved[chapter.id] || clock.wait < GATE_TIMEOUT) return
    const correct = chapter.id === "riddle" ? copy.riddle.options.find((o) => o.correct)?.id : undefined
    resolve(chapter.id, true, correct)
  }, [clock.wait, chapter, solved, copy])

  useEffect(() => {
    if (!clock.ended || completed.current) return
    completed.current = true
    trackTiming(EV.explainerComplete, Math.round(performance.now() - startedAt.current), {
      interactions: interactions.current,
    })
  }, [clock.ended])

  const pick = (optionId: string) => {
    const option = copy.riddle.options.find((o) => o.id === optionId)
    if (!option || solved.riddle) return
    setPlaying(true)
    if (option.correct) {
      resolve("riddle", false, option.id)
      return
    }
    setWrong((current) => [...current, option.id])
    setClock((current) => ({ ...current, wait: 0 }))
    interactions.current += 1
    track(EV.explainerInteract, { step: "riddle", option: option.id, correct: false, auto: false })
  }

  const scan = () => {
    if (solved.scan) return
    setPlaying(true)
    resolve("scan", false)
  }

  const jump = (index: number) => {
    const id = CHAPTERS[index].id
    setSolved((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    if (id === "riddle") setWrong([])
    setClock({ chapter: index, t: 0, wait: 0, ended: false })
    begin("jump")
    track(EV.explainerJump, { chapter: id })
  }

  const replay = () => {
    setSolved({})
    setWrong([])
    setClock(START_CLOCK)
    begin("replay")
  }

  const toggle = () => {
    if (clock.ended) return replay()
    if (!started) return begin("play")
    setPlaying((current) => !current)
  }

  const goHow = () => {
    track(EV.ctaClick, { id: "explainer-how", location: "explainer" })
    document.getElementById("how")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })
  }

  const caption = captionFor(chapter.id, clock.t, solved, copy)
  const atGate = chapter.gate !== undefined && !solved[chapter.id] && clock.t >= chapter.gate - 150
  const PlayIcon = clock.ended ? RotateCcw : playing ? Pause : Play

  return (
    <section id="what" aria-labelledby="what-title" className="scroll-mt-20 px-5 md:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:gap-10">
        <motion.header
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-12"
        >
          <div className="flex flex-col gap-4">
            <SectionEyebrow>{copy.eyebrow}</SectionEyebrow>
            <h2
              id="what-title"
              className="text-balance font-serif text-5xl font-black leading-[1.02] text-reel-white md:text-7xl"
            >
              {copy.title}
            </h2>
          </div>
          <div className="flex max-w-[44ch] flex-col gap-2 md:pb-2">
            <p className="text-pretty font-sans text-xl font-bold leading-snug text-reel-white md:text-2xl">
              {copy.answer}
            </p>
            <p className="flex items-center gap-2 font-sans text-base leading-relaxed text-reel-mute">
              <Hand className="size-4 shrink-0 text-brass" aria-hidden="true" />
              {copy.hint}
            </p>
          </div>
        </motion.header>

        <div className="flex flex-col gap-4">
          <div
            ref={playerRef}
            role="region"
            aria-roledescription={locale === "el" ? "βίντεο" : "video"}
            aria-label={copy.region}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-reel ring-1 ring-reel-white/10 sm:aspect-[4/3] md:aspect-video"
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={chapter.id}
                initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 50% 50%)" }}
                animate={reduce ? { opacity: 1 } : { clipPath: "circle(80% at 50% 50%)" }}
                exit={{
                  zIndex: 0,
                  opacity: 0,
                  transition: { zIndex: { duration: 0 }, opacity: { delay: reduce ? 0 : 0.75, duration: 0.1 } },
                }}
                transition={{ duration: reduce ? 0.5 : 0.8, ease: EASE }}
                className="absolute inset-0 z-[1]"
              >
                <Scene
                  id={chapter.id}
                  t={clock.t}
                  wait={clock.wait}
                  solved={solved}
                  wrong={wrong}
                  copy={copy}
                  reduce={reduce}
                  onPick={pick}
                  onScan={scan}
                />
              </motion.div>
            </AnimatePresence>

            <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-reel/60 px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel-white/90 backdrop-blur-sm md:left-5 md:top-5">
              {copy.chapters[chapter.id]}
            </span>
            {atGate && (
              <span className="pointer-events-none absolute right-3 top-3 z-[2] flex animate-pulse items-center gap-1.5 rounded-full bg-brass px-3 py-1.5 font-sans text-xs font-bold text-reel md:right-5 md:top-5">
                <Hand className="size-3.5" aria-hidden="true" />
                {copy.youPlay}
              </span>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end gap-3 p-3 md:gap-4 md:p-5">
              <button
                type="button"
                onClick={toggle}
                aria-label={clock.ended ? copy.replay : playing ? copy.pause : copy.play}
                className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-reel-white text-reel shadow-lg shadow-reel/30 ring-1 ring-reel/20 transition hover:bg-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-reel-white"
              >
                <PlayIcon className={cn("size-5", PlayIcon === Play && "translate-x-px")} aria-hidden="true" />
              </button>
              <div aria-live="polite" className="flex min-h-11 flex-1 items-end justify-center">
                {started && !clock.ended && (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={caption}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="max-w-[44ch] text-pretty rounded-md bg-reel/70 px-3 py-1.5 text-center font-sans text-[15px] font-medium leading-snug text-reel-white backdrop-blur-sm md:text-lg"
                    >
                      {caption}
                    </motion.p>
                  </AnimatePresence>
                )}
              </div>
              <span aria-hidden="true" className="hidden size-11 shrink-0 sm:block" />
            </div>

            {!started && (
              <button
                type="button"
                onClick={() => begin("play")}
                className="group absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-reel/45"
              >
                <span className="flex size-20 items-center justify-center rounded-full bg-brass text-reel shadow-2xl shadow-reel transition group-hover:scale-105 md:size-24">
                  <Play className="size-8 translate-x-0.5 md:size-10" aria-hidden="true" />
                </span>
                <span className="font-sans text-base font-bold text-reel-white">{copy.start}</span>
              </button>
            )}

            {clock.ended && (
              <EndCard copy={copy} equation={what.equation} result={what.result} onReplay={replay} onHow={goHow} />
            )}
          </div>

          <ol className="grid grid-cols-5 gap-2 md:gap-3">
            {CHAPTERS.map((item, index) => {
              const active = index === clock.chapter && !clock.ended
              const fill = clock.ended || index < clock.chapter ? 1 : active ? clock.t / item.duration : 0
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jump(index)}
                    aria-current={active ? "step" : undefined}
                    className="group flex w-full flex-col gap-2 py-1 text-left"
                  >
                    <span aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-reel-white/15">
                      <span className="block h-full bg-brass" style={{ width: `${fill * 100}%` }} />
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="hidden font-sans text-xs font-bold text-reel-mute md:inline">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "truncate font-sans text-xs font-bold transition-colors md:text-sm",
                          active ? "text-reel-white" : "text-reel-mute group-hover:text-reel-white",
                        )}
                      >
                        {copy.chapters[item.id]}
                      </span>
                      {item.gate !== undefined && (
                        <Hand className="size-3.5 shrink-0 text-brass" aria-label={copy.youPlay} role="img" />
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
