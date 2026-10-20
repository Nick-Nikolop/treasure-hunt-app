"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Check, RotateCcw, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExplainerCopy } from "./copy"
import {
  GATE_TIMEOUT,
  chapterById,
  easeInOut,
  easeOut,
  lerp,
  span,
  type ChapterId,
  type Solved,
} from "./timeline"

const EASE = [0.22, 1, 0.36, 1] as const
export const SCENE_SIZES = "(min-width: 1280px) 1200px, 100vw"

type SceneImage = { src: string; ratio: number }
const IMG = {
  team: { src: "/landing/scene-team.webp", ratio: 928 / 1152 },
  clue: { src: "/landing/scene-clue.webp", ratio: 928 / 1152 },
  finale: { src: "/landing/scene-finale.webp", ratio: 928 / 1152 },
  map: { src: "/landing/hero-kalamata-map.webp", ratio: 3344 / 1882 },
} satisfies Record<string, SceneImage>

export type SceneProps = {
  t: number
  wait: number
  solved: Solved
  wrong: string[]
  copy: ExplainerCopy
  reduce: boolean
  onPick: (id: string) => void
  onScan: () => void
}

export function Scene({ id, ...props }: SceneProps & { id: ChapterId }) {
  if (id === "mission") return <MissionScene {...props} />
  if (id === "riddle") return <RiddleScene {...props} />
  if (id === "route") return <RouteScene {...props} />
  if (id === "scan") return <ScanScene {...props} />
  return <EndingScene {...props} />
}

/** Renders every scene still once (hidden) so the page loader preloads them. */
export function PreloadScenes() {
  return (
    <div aria-hidden="true" className="relative hidden">
      {Object.values(IMG).map((img) => (
        <Image key={img.src} src={img.src} alt="" fill sizes={SCENE_SIZES} loading="eager" />
      ))}
      <Image src="/landing/logo-sm.webp" alt="" fill sizes="40px" loading="eager" />
    </div>
  )
}

export function captionFor(id: ChapterId, t: number, solved: Solved, copy: ExplainerCopy): string {
  if (id === "mission") return t < 3400 ? copy.mission.captions[0] : copy.mission.captions[1]
  if (id === "riddle") {
    if (solved.riddle) return copy.riddle.captions.after
    return t >= (chapterById("riddle").gate ?? 0) ? copy.riddle.pick : copy.riddle.captions.before
  }
  if (id === "route") return t < 3800 ? copy.route.captions[0] : copy.route.captions[1]
  if (id === "scan") {
    if (solved.scan) return copy.scan.captions.after
    return t >= (chapterById("scan").gate ?? 0) ? copy.scan.captions.prompt : copy.scan.captions.before
  }
  return t < 3800 ? copy.ending.captions[0] : copy.ending.captions[1]
}

/**
 * Object-cover for a known image ratio, centred on a focus point (fx, fy) and
 * zoomed around it. Children are positioned in image fractions, so overlays stay
 * glued to the picture at any player size.
 */
function Cover({
  img,
  fx,
  fy,
  zoom,
  imgClassName,
  children,
}: {
  img: SceneImage
  fx: number
  fy: number
  zoom: number
  imgClassName?: string
  children?: React.ReactNode
}) {
  const w = `max(100cqw, calc(100cqh * ${img.ratio}))`
  const h = `calc(${w} / ${img.ratio})`
  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]">
      <div
        className="absolute"
        style={{
          width: w,
          height: h,
          left: `clamp(calc(100cqw - ${w}), calc(50cqw - ${w} * ${fx}), 0px)`,
          top: `clamp(calc(100cqh - ${h}), calc(50cqh - ${h} * ${fy}), 0px)`,
          transform: `scale(${zoom})`,
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
        }}
      >
        <Image src={img.src} alt="" fill sizes={SCENE_SIZES} className={cn("object-cover", imgClassName)} />
        {children}
      </div>
    </div>
  )
}

function Note({
  shown,
  reduce,
  app,
  now,
  title,
  body,
}: {
  shown: number
  reduce: boolean
  app: string
  now: string
  title: string
  body: string
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-4 md:top-6">
      <div
        className="flex w-full max-w-sm items-center gap-3 rounded-2xl bg-reel/80 p-3 pr-4 shadow-2xl shadow-reel ring-1 ring-reel-white/15 backdrop-blur-md"
        style={{
          opacity: shown,
          transform: reduce ? undefined : `translateY(${(shown - 1) * 28}px) scale(${0.95 + 0.05 * shown})`,
        }}
      >
        <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-reel ring-1 ring-reel-white/10">
          <Image src="/landing/logo-sm.webp" alt="" fill sizes="40px" className="object-contain p-1.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center justify-between gap-3 font-sans text-xs font-bold uppercase tracking-[0.15em] text-reel-mute">
            {app}
            <span className="font-normal normal-case tracking-normal">{now}</span>
          </span>
          <span className="truncate font-sans text-sm font-bold text-reel-white md:text-base">{title}</span>
          <span className="truncate font-sans text-sm text-reel-white/75">{body}</span>
        </span>
      </div>
    </div>
  )
}

function Dashes({ total, done }: { total: number; done: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < done ? "bg-brass" : "bg-reel-white/20")}
        />
      ))}
    </span>
  )
}

/* ---------- 1. The mission: the team, the phone lights up ---------- */

function MissionScene({ t, copy, reduce }: SceneProps) {
  const { duration } = chapterById("mission")
  const p = easeInOut(t / duration)
  const zoom = reduce ? 1.15 : 1 + 0.42 * p
  const glow = span(t, 2400, 1600)
  const note = easeOut(span(t, 1300, 700))

  return (
    <>
      <Cover img={IMG.team} fx={0.498} fy={lerp(0.44, 0.53, p)} zoom={zoom}>
        <span
          aria-hidden="true"
          className="absolute size-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/60 blur-2xl"
          style={{ left: "49.8%", top: "52.7%", opacity: glow }}
        />
      </Cover>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel/25" />
      <Note
        shown={note}
        reduce={reduce}
        app={copy.mission.app}
        now={copy.mission.now}
        title={copy.mission.noteTitle}
        body={copy.mission.noteBody}
      />
    </>
  )
}

/* ---------- 2. The puzzle: viewer picks where to go ---------- */

function RiddleScene({ t, wait, solved, wrong, copy, onPick }: SceneProps) {
  const { gate = 0 } = chapterById("riddle")
  const r = copy.riddle
  const answer = solved.riddle
  const chars = Math.floor(r.clue.length * span(t, 400, 2600))
  const asking = t >= gate - 150 || Boolean(answer)

  return (
    <>
      <Cover img={IMG.team} fx={0.498} fy={0.53} zoom={2.2} imgClassName="scale-110 blur-xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel/55" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 pb-24 pt-14 md:flex-row md:gap-12 md:pb-20 md:pt-12">
        <motion.div layout="position" transition={{ duration: 0.6, ease: EASE }} className="shrink-0">
          <div
            className={cn(
              "w-[13.5rem] origin-top rounded-[2rem] border-[5px] border-reel bg-reel p-1.5 shadow-2xl shadow-reel ring-1 ring-reel-white/15 transition-transform duration-500 md:w-[17rem]",
              asking && "max-md:scale-[0.82]",
            )}
          >
            <div className="flex flex-col gap-3 rounded-[1.6rem] bg-reel-raised p-4 md:gap-4 md:p-5">
              <div className="flex flex-col gap-2">
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-reel-mute">{r.step}</span>
                <Dashes total={10} done={1} />
              </div>
              <p className="font-serif text-[15px] leading-snug text-reel-white md:text-lg">
                <span className="sr-only">{r.clue}</span>
                <span aria-hidden="true">
                  {r.clue.slice(0, chars)}
                  <span className="opacity-0">{r.clue.slice(chars)}</span>
                </span>
              </p>
              <span
                aria-hidden="true"
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center font-sans text-sm font-bold transition-colors duration-500",
                  answer ? "bg-brass text-reel" : "bg-reel-white/10 text-reel-white/55",
                )}
              >
                {answer && <Check className="size-4 shrink-0" />}
                {answer ? r.right : r.placeholder}
              </span>
            </div>
          </div>
        </motion.div>

        {asking && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="-mt-8 flex w-full max-w-xs flex-col gap-2 md:mt-0"
          >
            <p className="font-serif text-lg font-bold leading-tight text-reel-white md:text-2xl">{r.question}</p>
            {r.options.map((option) => {
              const isWrong = wrong.includes(option.id)
              const isRight = Boolean(answer) && option.correct
              return (
                <button
                  key={`${option.id}-${isWrong}`}
                  type="button"
                  disabled={Boolean(answer) || isWrong}
                  onClick={() => onPick(option.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-left font-sans text-sm font-bold transition-colors duration-300 md:text-base",
                    isRight && "border-brass bg-brass text-reel",
                    isWrong && "explainer-shake border-reel-white/10 bg-reel/40 text-reel-white/40",
                    !isRight &&
                      !isWrong &&
                      "border-reel-white/25 bg-reel/60 text-reel-white backdrop-blur-sm enabled:hover:border-brass enabled:hover:bg-reel-white/10 disabled:opacity-50",
                  )}
                >
                  <span className={cn(isWrong && "line-through")}>{option.label}</span>
                  {isRight && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  {isWrong && <span className="shrink-0 text-xs">{r.wrongTag}</span>}
                </button>
              )
            })}
            {!answer && (
              <span aria-hidden="true" className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-reel-white/15">
                <span className="block h-full bg-brass" style={{ width: `${(1 - wait / GATE_TIMEOUT) * 100}%` }} />
              </span>
            )}
            {wrong.length > 0 && !answer && (
              <p role="status" className="text-pretty font-sans text-sm leading-relaxed text-reel-white/80">
                {r.wrong}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </>
  )
}

/* ---------- 3. The route: walk the real streets to the spot ---------- */

const MAP_H = 100 / IMG.map.ratio
const ROUTE: [number, number][] = [
  [0.457, 0.698],
  [0.478, 0.63],
  [0.462, 0.568],
  [0.482, 0.512],
  [0.455, 0.478],
  [0.4425, 0.447],
]
const ROUTE_LENGTHS = ROUTE.slice(1).map(([x, y], i) => Math.hypot(x - ROUTE[i][0], (y - ROUTE[i][1]) / IMG.map.ratio))
const ROUTE_TOTAL = ROUTE_LENGTHS.reduce((sum, length) => sum + length, 0)

function routeUntil(progress: number) {
  let left = progress * ROUTE_TOTAL
  const points: [number, number][] = [ROUTE[0]]
  for (let i = 0; i < ROUTE_LENGTHS.length; i++) {
    const [ax, ay] = ROUTE[i]
    const [bx, by] = ROUTE[i + 1]
    if (left >= ROUTE_LENGTHS[i]) {
      points.push(ROUTE[i + 1])
      left -= ROUTE_LENGTHS[i]
      continue
    }
    const k = left / ROUTE_LENGTHS[i]
    points.push([lerp(ax, bx, k), lerp(ay, by, k)])
    break
  }
  return points
}

const toSvg = (points: [number, number][]) => points.map(([x, y]) => `${x * 100},${y * MAP_H}`).join(" ")
const at = ([x, y]: [number, number]) => ({ left: `${x * 100}%`, top: `${y * 100}%` })

function RouteScene({ t, copy, reduce }: SceneProps) {
  const { duration } = chapterById("route")
  const p = easeInOut(t / duration)
  const draw = reduce ? 1 : easeInOut(span(t, 600, 4200))
  const points = routeUntil(draw)
  const tip = points[points.length - 1]
  const arrived = draw >= 1
  const zoom = reduce ? 1.5 : 1.25 + 0.35 * p
  const counter = { transform: `translate(-50%, -50%) scale(${1 / zoom})` }
  const startShown = 1 - span(t, 2800, 600)

  return (
    <>
      <Cover img={IMG.map} fx={lerp(0.462, 0.45, p)} fy={lerp(0.64, 0.52, p)} zoom={zoom}>
        <svg
          aria-hidden="true"
          viewBox={`0 0 100 ${MAP_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          <polyline
            points={toSvg(points)}
            fill="none"
            className="stroke-reel-pytheos-ink"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.1 10"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span
          aria-hidden="true"
          className="absolute whitespace-nowrap rounded-md bg-reel px-2.5 py-1 font-sans text-xs font-bold text-reel-white shadow-lg"
          style={{ ...at([ROUTE[0][0] - 0.045, ROUTE[0][1] + 0.012]), ...counter, opacity: startShown }}
        >
          {copy.route.start}
        </span>

        <span aria-hidden="true" className="absolute" style={{ ...at(ROUTE[ROUTE.length - 1]), ...counter }}>
          <span className="relative flex size-11 items-center justify-center">
            {arrived && <span className="absolute inset-0 animate-ping rounded-full bg-brass/50" />}
            <span
              className={cn(
                "relative size-11 rounded-full border-[3px] transition-colors duration-500",
                arrived ? "border-brass bg-brass/25" : "border-reel/70",
              )}
            />
          </span>
        </span>

        {arrived && (
          <span
            aria-hidden="true"
            className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-md bg-reel px-2.5 py-1.5 font-sans text-xs font-bold text-reel-white shadow-lg md:text-sm"
            style={{
              ...at([ROUTE[ROUTE.length - 1][0], ROUTE[ROUTE.length - 1][1] - 0.06]),
              ...counter,
            }}
          >
            <Check className="size-3.5 text-brass" />
            {copy.route.target}
          </span>
        )}

        {!arrived && (
          <span
            aria-hidden="true"
            className="absolute size-4 rounded-full bg-brass shadow-[0_0_18px_rgb(226_176_79/0.9)] ring-[3px] ring-reel"
            style={{ ...at(tip), ...counter }}
          />
        )}
      </Cover>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-reel)_100%)] opacity-80"
      />
    </>
  )
}

/* ---------- 4. The QR: viewer scans it ---------- */

const CORNERS = [
  "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-md",
  "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-md",
  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md",
  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md",
]

function ScanScene({ t, solved, copy, reduce, onScan }: SceneProps) {
  const { gate = 0 } = chapterById("scan")
  const done = Boolean(solved.scan)
  const after = done ? t - gate : -1
  const approach = easeOut(span(t, 0, gate))
  const zoom = reduce ? 1.3 : 1.05 + 0.3 * approach
  const lock = easeOut(span(t, gate * 0.3, gate * 0.7))
  const sweep = done ? span(after, 0, 700) : 0
  const flash = done ? Math.max(0, 1 - Math.abs(after - 760) / 220) : 0
  const note = done ? easeOut(span(after, 950, 600)) : 0
  const asking = !done && t >= gate - 100

  return (
    <>
      <Cover img={IMG.clue} fx={0.515} fy={0.46} zoom={zoom}>
        <div className="absolute" style={{ left: "41.5%", top: "37.2%", width: "20%", height: "18.3%" }}>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ transform: `scale(${1.5 - 0.5 * lock})`, opacity: 0.25 + 0.75 * lock }}
          >
            {CORNERS.map((corner) => (
              <span
                key={corner}
                className={cn(
                  "absolute size-[24%] transition-colors duration-300",
                  corner,
                  done ? "border-brass" : "border-reel-white",
                )}
              />
            ))}
          </div>
          {done && sweep < 1 && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 h-0.5 bg-brass shadow-[0_0_14px_rgb(226_176_79/0.95)]"
              style={{ top: `${sweep * 100}%` }}
            />
          )}
          {asking && (
            <button
              type="button"
              onClick={onScan}
              className="absolute inset-0 flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-reel-white"
            >
              <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-md bg-brass/20" />
              <span
                className="relative flex items-center gap-2 whitespace-nowrap rounded-full bg-brass px-4 py-2 font-sans text-sm font-bold text-reel shadow-lg"
                style={{ transform: `scale(${1 / zoom})` }}
              >
                <ScanLine className="size-4" aria-hidden="true" />
                {copy.scan.button}
              </span>
            </button>
          )}
        </div>
      </Cover>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel/15" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel-white" style={{ opacity: flash * 0.35 }} />
      <Note
        shown={note}
        reduce={reduce}
        app={copy.mission.app}
        now={copy.mission.now}
        title={copy.scan.noteTitle}
        body={copy.scan.noteBody}
      />
    </>
  )
}

/* ---------- 5. The ending: ten puzzles, one chest ---------- */

function EndingScene({ t, copy, reduce }: SceneProps) {
  const { duration } = chapterById("ending")
  const p = easeInOut(t / duration)
  const zoom = reduce ? 1.12 : 1.04 + 0.22 * p
  const count = Math.round(2 + 8 * easeInOut(span(t, 300, 3000)))
  const finished = count >= 10
  const glow = 0.2 + 0.6 * span(t, 1400, 3200)

  return (
    <>
      <Cover img={IMG.finale} fx={0.6} fy={0.6} zoom={zoom}>
        <span
          aria-hidden="true"
          className="absolute size-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass blur-3xl mix-blend-screen"
          style={{ left: "58%", top: "57%", opacity: glow * 0.45 }}
        />
      </Cover>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel/20" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-4 md:top-6">
        <div className="flex w-full max-w-xs flex-col gap-2.5 rounded-2xl bg-reel/80 p-4 ring-1 ring-reel-white/15 backdrop-blur-md">
          <span
            className={cn(
              "flex items-center justify-between font-sans text-xs font-bold uppercase tracking-[0.15em]",
              finished ? "text-brass" : "text-reel-mute",
            )}
          >
            {finished ? copy.ending.done : copy.ending.progress(count)}
            {finished && <Check className="size-4" />}
          </span>
          <Dashes total={10} done={count} />
        </div>
      </div>
    </>
  )
}

/* ---------- End card ---------- */

export function EndCard({
  copy,
  equation,
  result,
  onReplay,
  onHow,
}: {
  copy: ExplainerCopy
  equation: string[]
  result: string
  onReplay: () => void
  onHow: () => void
}) {
  const item = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE, delay: 0.15 + i * 0.12 },
  })
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 flex items-center justify-center bg-reel/85 p-6 backdrop-blur-sm"
    >
      <div className="flex max-w-3xl flex-col items-center gap-5 text-center md:gap-7">
        <motion.p {...item(0)} className="font-sans text-xs font-bold uppercase tracking-[0.3em] text-brass md:text-sm">
          {copy.end.label}
        </motion.p>
        <ul className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {equation.map((part, i) => (
            <motion.li key={part} {...item(i + 1)} className="flex items-center gap-2 md:gap-3">
              {i > 0 && (
                <span aria-hidden="true" className="font-serif text-xl text-brass md:text-2xl">
                  +
                </span>
              )}
              <span className="rounded-full border border-reel-white/25 px-3 py-1.5 font-sans text-sm font-bold text-reel-white md:px-4 md:text-base">
                {part}
              </span>
            </motion.li>
          ))}
        </ul>
        <motion.p
          {...item(equation.length + 1)}
          className="text-balance font-serif text-2xl font-black leading-tight text-reel-white md:text-5xl"
        >
          <span aria-hidden="true" className="text-brass">
            {"= "}
          </span>
          {result}
        </motion.p>
        <motion.div {...item(equation.length + 2)} className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onHow}
            className="reel-cta rounded-md px-6 py-3 font-sans text-base font-bold md:text-lg"
          >
            {copy.how}
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="flex items-center gap-2 rounded-md border border-reel-white/40 px-6 py-3 font-sans text-base font-bold text-reel-white transition hover:border-reel-white hover:bg-reel-white/10 md:text-lg"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {copy.replay}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
