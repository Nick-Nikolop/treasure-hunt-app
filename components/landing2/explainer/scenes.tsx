"use client"

import { motion } from "framer-motion"
import { Check, Compass, RotateCcw, ScanLine } from "lucide-react"
import { useId, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ExplainerCopy } from "./copy"
import { MAP_BOX, MAP_CASTLE, MAP_CHURCH, MAP_ROUTE, MAP_START, MAP_STREET, MAP_TARGET } from "./kalamata-map"
import {
  GATE_TIMEOUT,
  chapterById,
  clamp01,
  easeInOut,
  easeOut,
  lerp,
  span,
  type ChapterId,
  type Solved,
} from "./timeline"

const EASE = [0.22, 1, 0.36, 1] as const

type Pt = [number, number]

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

/** Each chapter gets its own ground colour so the cuts read like a motion piece. */
const SCENE_BG: Record<ChapterId, string> = {
  mission: "bg-reel",
  riddle: "bg-reel-raised",
  route: "bg-reel-white",
  scan: "bg-reel",
  ending: "bg-reel-white",
}

/** Images the later chapters need, fetched once the viewer presses play. */
export const SCENE_IMAGES = ["/landing2/explainer/kalamata-map.svg", "/landing2/explainer/kalamata-1686.webp", "/landing/logo-sm.webp"]

export function Scene({ id, ...props }: SceneProps & { id: ChapterId }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden [container-type:size]", SCENE_BG[id])}>
      {id === "mission" && <MissionScene {...props} />}
      {id === "riddle" && <RiddleScene {...props} />}
      {id === "route" && <RouteScene {...props} />}
      {id === "scan" && <ScanScene {...props} />}
      {id === "ending" && <EndingScene {...props} />}
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

/* ---------- Motion helpers ---------- */

const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const mix = ([ax, ay]: Pt, [bx, by]: Pt, k: number): Pt => [lerp(ax, bx, k), lerp(ay, by, k)]
const last = (points: Pt[]) => points[points.length - 1]
const poly = (points: Pt[]) => points.map(([x, y]) => `${x},${y}`).join(" ")

/** The part of a polyline covered after `progress` (0–1) of its length. */
function along(points: Pt[], progress: number): Pt[] {
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]))
  let left = clamp01(progress) * lengths.reduce((sum, length) => sum + length, 0)
  const out: Pt[] = [points[0]]
  for (let i = 0; i < lengths.length; i++) {
    if (left >= lengths[i]) {
      out.push(points[i + 1])
      left -= lengths[i]
      continue
    }
    out.push(mix(points[i], points[i + 1], left / lengths[i]))
    break
  }
  return out
}

/** The polyline up to a fractional point index, e.g. 2.5 = halfway from point 2 to 3. */
function upTo(points: Pt[], index: number): Pt[] {
  const whole = Math.min(points.length - 1, Math.floor(index))
  const out = points.slice(0, whole + 1)
  if (whole < points.length - 1) out.push(mix(points[whole], points[whole + 1], index - whole))
  return out
}

/**
 * A square stage the size of the player's shorter side with a 0–100 coordinate
 * space. Drawings may spill past it to fill the frame. The camera centres
 * `focus` and zooms around it.
 */
function Stage({ focus = [50, 50], zoom = 1, children }: { focus?: Pt; zoom?: number; children: ReactNode }) {
  const [fx, fy] = focus
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-[100cqmin] -translate-x-1/2 -translate-y-1/2">
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${(50 - fx) * zoom}%, ${(50 - fy) * zoom}%) scale(${zoom})` }}
      >
        {children}
      </div>
    </div>
  )
}

function Canvas({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
      {children}
    </svg>
  )
}

/** HTML pinned to a stage point. `keep` cancels the camera zoom so labels keep their size. */
function Pin({
  at: [x, y],
  keep = 1,
  className,
  style,
  children,
}: {
  at: Pt
  keep?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute", className)}
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${1 / keep})`, ...style }}
    >
      {children}
    </span>
  )
}

/** A stroke that draws itself in as `progress` runs 0 → 1. */
function Line({
  d,
  progress,
  width = 0.4,
  className,
}: {
  d: string
  progress: number
  width?: number
  className?: string
}) {
  if (progress <= 0) return null
  return (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
      fill="none"
      strokeWidth={width}
      strokeLinecap="round"
      className={cn("transition-colors duration-700", className)}
    />
  )
}

function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

function NoteCard({
  shown,
  reduce,
  app,
  now,
  title,
  body,
  className,
}: {
  shown: number
  reduce: boolean
  app: string
  now: string
  title: string
  body: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-2xl bg-reel-raised/95 p-2.5 pr-3 shadow-2xl shadow-reel ring-1 ring-reel-white/15 md:gap-3 md:p-3",
        className,
      )}
      style={{
        opacity: shown,
        transform: reduce ? undefined : `translateY(${(shown - 1) * 24}px) scale(${0.94 + 0.06 * shown})`,
      }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-reel ring-1 ring-brass/40 md:size-10">
        <Compass className="size-5 text-brass" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center justify-between gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-reel-mute md:text-xs">
          {app}
          <span className="font-normal normal-case tracking-normal">{now}</span>
        </span>
        <span className="font-sans text-[13px] font-bold leading-tight text-reel-white md:text-base">{title}</span>
        <span className="font-sans text-[13px] leading-snug text-reel-white/75 md:text-sm">{body}</span>
      </span>
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

/* ---------- 1. The mission: Kalamata at night, the team gathers, a phone lights up ---------- */

/** Long exposure of the Kalamata waterfront, Evangelos Gkikopoulos, CC BY 3.0 (credited under the player). */
const NIGHT_PHOTO = "/landing2/explainer/kalamata-night.webp"
/** Where each friend waits along the waterfront (frame %) and their seat in the huddle (cqmin from the centre). */
const FRIENDS: { from: Pt; seat: number }[] = [
  { from: [13, 64], seat: -10.5 },
  { from: [36, 62], seat: -3.5 },
  { from: [64, 62], seat: 3.5 },
  { from: [87, 64], seat: 10.5 },
]
const HUDDLE_Y = 71
const TEAM_TONES = ["bg-brass text-reel", "bg-reel-white text-reel", "bg-reel-white text-reel", "bg-brass text-reel"]

function MissionScene({ t, copy, reduce }: SceneProps) {
  const m = copy.mission
  const light = reduce ? 1 : easeOut(span(t, 0, 1200))
  const drift = reduce ? 1 : easeOut(span(t, 0, 3600))
  const push = reduce ? 0 : easeInOut(span(t, 3400, 1600))
  const rise = reduce ? (t >= 3700 ? 1 : 0) : easeOut(span(t, 3700, 1100))
  const note = easeOut(span(t, 4800, 650))
  const huddle = easeOut(span(t, 3000, 500))
  const titleOut = reduce ? (t >= 3300 ? 1 : 0) : easeInOut(span(t, 3300, 800))

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- moved by the video camera every frame */}
      <img
        src={NIGHT_PHOTO}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
        style={{
          objectPosition: "50% 60%",
          opacity: light,
          transform: `scale(${lerp(1.14, 1.03, drift) + 0.45 * push})`,
          transformOrigin: "50% 64%",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-reel/50 via-transparent to-reel/60"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel" style={{ opacity: 0.65 * rise }} />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[17cqh] flex justify-center"
        style={{ opacity: 1 - titleOut, transform: `translateY(${-6 * titleOut}cqh)` }}
      >
        <span className="whitespace-nowrap font-serif text-[min(13cqw,19cqh)] font-black leading-none tracking-tight text-reel-white">
          {Array.from(m.city).map((char, i) => {
            const k = reduce ? 1 : easeOut(span(t, 250 + i * 85, 650))
            return (
              <span key={i} className="inline-block" style={{ opacity: k, transform: `translateY(${(1 - k) * 0.5}em)` }}>
                {char}
              </span>
            )
          })}
        </span>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[11.5cqmin] w-[31cqmin] rounded-full border-[0.5cqmin] border-brass"
        style={{
          left: "50%",
          top: `${HUDDLE_Y}%`,
          opacity: huddle * (1 - push),
          transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * huddle})`,
        }}
      />
      {FRIENDS.map(({ from: [fx, fy], seat }, i) => {
        const shown = reduce ? 1 : easeOut(span(t, 800 + i * 150, 450))
        const k = reduce ? 1 : easeInOut(span(t, 1900 + i * 80, 1250))
        if (shown <= 0) return null
        return (
          <span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `calc(${lerp(fx, 50, k)}% + ${seat * k}cqmin)`,
              top: `${lerp(fy, HUDDLE_Y, k)}%`,
              opacity: shown * (1 - push),
              transform: `translate(-50%, -50%) scale(${0.4 + 0.6 * shown})`,
            }}
          >
            {k === 0 && <span className="absolute inset-0 animate-ping rounded-full bg-brass/50" />}
            <span
              className={cn(
                "relative flex size-[8cqmin] items-center justify-center rounded-full font-sans text-[3.4cqmin] font-bold shadow-lg shadow-reel ring-[0.6cqmin] ring-reel",
                TEAM_TONES[i],
              )}
            >
              {m.team[i]}
            </span>
          </span>
        )
      })}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[13cqh] w-[min(46cqh,66cqw)]"
        style={{ transform: `translate(-50%, ${(1 - rise) * 100}cqh)` }}
      >
        <div className="flex aspect-[9/19] flex-col gap-[4cqh] rounded-[2.2rem] border-[6px] border-reel-raised bg-reel px-2.5 pt-3 shadow-2xl shadow-reel ring-1 ring-reel-white/15">
          <span className="mx-auto h-[1.8cqh] w-[32%] rounded-full bg-reel-raised" />
          <span className="flex flex-col items-center gap-1 text-reel-white">
            <span className="font-sans text-[max(12px,2.2cqh)] font-bold text-reel-white/70">{m.date}</span>
            <span className="font-sans text-[min(11cqh,15cqw)] font-bold leading-none tracking-tight">{m.time}</span>
          </span>
          <NoteCard shown={note} reduce={reduce} app={m.app} now={m.now} title={m.noteTitle} body={m.noteBody} />
        </div>
      </div>
    </>
  )
}

/* ---------- 2. The puzzle: viewer picks where to go ---------- */

const RAYS: Pt[] = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + 0.2
  return [50 + Math.cos(angle) * 120, 50 + Math.sin(angle) * 120]
})

function RiddleScene({ t, wait, solved, wrong, copy, reduce, onPick }: SceneProps) {
  const { gate = 0, duration } = chapterById("riddle")
  const r = copy.riddle
  const answer = solved.riddle
  const chars = Math.floor(r.clue.length * span(t, 400, 2600))
  const asking = t >= gate - 150 || Boolean(answer)
  const pulse = 0.5 + 0.5 * Math.sin(t / 320)

  return (
    <>
      <Stage zoom={reduce ? 1 : lerp(1.15, 1, easeOut(t / duration))}>
        <Canvas>
          {[18, 34, 52, 74].map((radius, i) => (
            <Line
              key={radius}
              d={`M${50 - radius} 50a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`}
              progress={reduce ? 1 : easeOut(span(t, 300 + i * 150, 1600))}
              width={0.3}
              className="stroke-reel-white/[0.06]"
            />
          ))}
          {RAYS.map(([x, y], i) => (
            <Line
              key={i}
              d={`M${x} ${y}L50 50`}
              progress={reduce ? 1 : easeOut(span(t, i * 60, 1400))}
              width={0.5}
              className={answer ? "stroke-brass/50" : "stroke-reel-white/10"}
            />
          ))}
          <circle
            cx={50}
            cy={50}
            r={5 + 1.5 * pulse}
            fill="none"
            strokeWidth={0.5}
            className="stroke-brass"
            opacity={0.25 + 0.35 * pulse}
          />
        </Canvas>
      </Stage>

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
                      "border-reel-white/25 bg-reel/60 text-reel-white enabled:hover:border-brass enabled:hover:bg-reel-white/10 disabled:opacity-50",
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

/* ---------- 3. The route: a real walk through Kalamata, on OpenStreetMap data ---------- */

const MAP_SRC = "/landing2/explainer/kalamata-map.svg"
const [MAP_X, MAP_Y, MAP_W, MAP_H] = MAP_BOX
/** Opening shot frames the castle, the cathedral and the start; the camera then follows the walk south. */
const MAP_OPEN: Pt = [74, 10]
const MAP_CLOSE: Pt = [MAP_TARGET[0] + 4, MAP_TARGET[1] - 7]
const MAP_INK_ORIGIN = `${((MAP_START[0] - MAP_X) / MAP_W) * 100}% ${((MAP_START[1] - MAP_Y) / MAP_H) * 100}%`
const STREET_LABEL: Pt = (() => {
  const angle = (MAP_STREET.angle * Math.PI) / 180
  return [MAP_STREET.at[0] - Math.sin(angle) * 3.4, MAP_STREET.at[1] + Math.cos(angle) * 3.4]
})()
const MAP_LABEL = "font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel/60"

function RouteScene({ t, copy, reduce }: SceneProps) {
  const ink = reduce ? 1 : easeOut(span(t, 0, 1800))
  const draw = reduce ? 1 : easeInOut(span(t, 900, 4300))
  const walked = along(MAP_ROUTE, draw)
  const tip = last(walked)
  const arrived = draw >= 1
  const travel = reduce ? 0.6 : easeInOut(span(t, 600, 4900))
  const zoom = lerp(1.05, 1.55, travel)
  const focus = mix(MAP_OPEN, MAP_CLOSE, travel)

  return (
    <>
      <Stage focus={focus} zoom={zoom}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static vector plan moved by the video camera */}
        <img
          src={MAP_SRC}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute max-w-none"
          style={{
            left: `${MAP_X}%`,
            top: `${MAP_Y}%`,
            width: `${MAP_W}%`,
            height: `${MAP_H}%`,
            clipPath: reduce ? undefined : `circle(${lerp(3, 70, ink)}% at ${MAP_INK_ORIGIN})`,
          }}
        />
        <Canvas>
          <polyline
            points={poly(MAP_ROUTE)}
            fill="none"
            strokeWidth={0.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.01 1.5"
            className="stroke-reel/45"
            opacity={ink}
          />
          {walked.length > 1 && (
            <>
              <polyline
                points={poly(walked)}
                fill="none"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-reel"
              />
              <polyline
                points={poly(walked)}
                fill="none"
                strokeWidth={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-brass"
              />
            </>
          )}
          <circle cx={MAP_START[0]} cy={MAP_START[1]} r={1.4} className="fill-reel" />
          <circle
            cx={MAP_TARGET[0]}
            cy={MAP_TARGET[1]}
            r={4.6}
            fill="none"
            strokeWidth={arrived ? 0.8 : 0.45}
            strokeDasharray={arrived ? undefined : "1.2 1"}
            className={cn("transition-colors duration-500", arrived ? "stroke-brass" : "stroke-reel/50")}
          />
        </Canvas>

        <Pin at={[MAP_CASTLE[0], MAP_CASTLE[1] + 5]} keep={zoom} className={MAP_LABEL}>
          {copy.route.castle}
        </Pin>
        <Pin at={[MAP_CHURCH[0], MAP_CHURCH[1] + 4]} keep={zoom} className={MAP_LABEL}>
          {copy.route.church}
        </Pin>
        <Pin
          at={STREET_LABEL}
          className="whitespace-nowrap font-sans text-xs font-bold tracking-[0.12em] text-reel/50"
          style={{ transform: `translate(-50%, -50%) rotate(${MAP_STREET.angle}deg) scale(${1 / zoom})` }}
        >
          {MAP_STREET.name}
        </Pin>
        <Pin
          at={[MAP_START[0], MAP_START[1] - 5]}
          keep={zoom}
          className="whitespace-nowrap rounded-md bg-reel px-2.5 py-1 font-sans text-xs font-bold text-reel-white shadow-lg"
          style={{ opacity: 1 - span(t, 2600, 600) }}
        >
          {copy.route.start}
        </Pin>

        {arrived ? (
          <>
            <Pin at={MAP_TARGET} keep={zoom} className="size-12 animate-ping rounded-full bg-brass/40" />
            <Pin
              at={[MAP_TARGET[0], MAP_TARGET[1] + 9]}
              keep={zoom}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-reel px-2.5 py-1.5 font-sans text-xs font-bold text-reel-white shadow-lg md:text-sm"
            >
              <Check className="size-3.5 text-brass" />
              {copy.route.target}
            </Pin>
          </>
        ) : (
          draw > 0 && (
            <Pin at={tip} keep={zoom} className="flex size-5 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-brass/60" />
              <span className="relative size-4 rounded-full bg-brass shadow-lg ring-[3px] ring-reel" />
            </Pin>
          )
        )}
      </Stage>
      <span className="pointer-events-none absolute right-3 top-3.5 font-sans text-[11px] font-medium text-reel/55 md:right-5 md:top-6">
        © OpenStreetMap
      </span>
    </>
  )
}

/* ---------- 4. The QR: a torch finds the plaque, viewer scans it ---------- */

const QR_SIZE = 21
const QR_PATH = (() => {
  let d = ""
  for (let row = 0; row < QR_SIZE; row++) {
    for (let col = 0; col < QR_SIZE; col++) {
      const inFinder = (row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)
      let dark = rand(row * QR_SIZE + col + 3) > 0.5
      if (inFinder) {
        const r = row > 12 ? row - 14 : row
        const c = col > 12 ? col - 14 : col
        const inside = r >= 0 && r < 7 && c >= 0 && c < 7
        dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
      }
      if (dark) d += `M${col} ${row}h1v1h-1z`
    }
  }
  return d
})()

const TORCH: Pt[] = [
  [16, 24],
  [80, 62],
  [28, 74],
  [50, 46],
]
const CORNERS = [
  "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-md",
  "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-md",
  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md",
  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md",
]

function ScanScene({ t, solved, copy, reduce, onScan }: SceneProps) {
  const brick = useSvgId()
  const { gate = 0 } = chapterById("scan")
  const done = Boolean(solved.scan)
  const after = done ? t - gate : -1
  const [lx, ly] = last(along(TORCH, reduce ? 1 : easeInOut(span(t, 0, 2300))))
  const reveal = done ? easeInOut(span(after, 500, 1100)) : 0
  const radius = lerp(14, 26, easeOut(span(t, 2000, 600))) + 120 * reveal
  const zoom = reduce ? 1.2 : lerp(1, 1.3, easeOut(span(t, 1800, 1400)))
  const lock = easeOut(span(t, 1900, 700))
  const sweep = done ? span(after, 0, 700) : 0
  const flash = done ? Math.max(0, 1 - Math.abs(after - 760) / 220) : 0
  const note = done ? easeOut(span(after, 950, 600)) : 0
  const asking = !done && t >= gate - 100

  return (
    <>
      <svg aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <pattern id={brick} width={56} height={28} patternUnits="userSpaceOnUse">
            <rect x={1} y={1} width={54} height={12} rx={1.5} className="fill-reel-white/[0.07]" />
            <rect x={-27} y={15} width={54} height={12} rx={1.5} className="fill-reel-white/[0.07]" />
            <rect x={29} y={15} width={54} height={12} rx={1.5} className="fill-reel-white/[0.07]" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${brick})`} />
      </svg>

      <Stage focus={[50, 46]} zoom={zoom}>
        <div
          aria-hidden="true"
          className="absolute rounded-[2cqmin] bg-reel-raised p-[2.6cqmin] shadow-2xl shadow-reel ring-[0.5cqmin] ring-brass/60"
          style={{ left: "33%", top: "29%", width: "34%", height: "34%" }}
        >
          {["left-[0.8cqmin] top-[0.8cqmin]", "right-[0.8cqmin] top-[0.8cqmin]", "bottom-[0.8cqmin] left-[0.8cqmin]", "bottom-[0.8cqmin] right-[0.8cqmin]"].map(
            (corner) => (
              <span key={corner} className={cn("absolute size-[1.3cqmin] rounded-full bg-brass/70", corner)} />
            ),
          )}
          <svg viewBox="-2 -2 25 25" shapeRendering="crispEdges" className="size-full rounded-[1cqmin]">
            <rect x={-2} y={-2} width={25} height={25} className="fill-reel-white" />
            <path d={QR_PATH} className="fill-reel" />
          </svg>
        </div>

        <span
          aria-hidden="true"
          className="absolute size-[600cqmax]"
          style={{
            left: `${lx}%`,
            top: `${ly}%`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle at center, color-mix(in srgb, var(--color-brass) 16%, transparent), transparent ${radius}cqmin), radial-gradient(circle at center, transparent ${radius}cqmin, color-mix(in srgb, var(--color-reel) 94%, transparent) ${radius + 14}cqmin)`,
          }}
        />

        <div className="absolute" style={{ left: "29%", top: "25%", width: "42%", height: "42%" }}>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ transform: `scale(${1.5 - 0.5 * lock})`, opacity: lock }}
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
              className="absolute inset-x-[8%] h-0.5 bg-brass shadow-[0_0_14px_rgb(226_176_79/0.95)]"
              style={{ top: `${8 + sweep * 84}%` }}
            />
          )}
          {asking && (
            <button
              type="button"
              onClick={onScan}
              className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-reel-white"
            >
              <span aria-hidden="true" className="absolute inset-[8%] animate-ping rounded-md bg-brass/20" />
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
      </Stage>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel-white" style={{ opacity: flash * 0.35 }} />
      <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-4 md:top-6">
        <NoteCard
          shown={note}
          reduce={reduce}
          app={copy.mission.app}
          now={copy.mission.now}
          title={copy.scan.noteTitle}
          body={copy.scan.noteBody}
          className="max-w-sm"
        />
      </div>
    </>
  )
}

/* ---------- 5. The ending: the trail crosses Kalamata in 1686 and seals the castle gate ---------- */

/** "Calamata", Vincenzo Coronelli, 1686 (scan CC BY-SA 4.0, retouched and toned; credited under the player). */
const ENGRAVING = "/landing2/explainer/kalamata-1686.webp"
const ENGRAVING_W = 190
const ENGRAVING_H = ENGRAVING_W / (2000 / 1614)
const ENGRAVING_X = 50 - ENGRAVING_W / 2
const ENGRAVING_Y = 50 - ENGRAVING_H / 2
const onEngraving = ([u, v]: Pt): Pt => [ENGRAVING_X + u * ENGRAVING_W, ENGRAVING_Y + v * ENGRAVING_H]
/** Ten stops along the lanes of the engraved town, then the castle gate. */
const STOPS: Pt[] = (
  [
    [0.3, 0.745],
    [0.365, 0.675],
    [0.42, 0.585],
    [0.47, 0.49],
    [0.53, 0.585],
    [0.585, 0.7],
    [0.685, 0.655],
    [0.745, 0.545],
    [0.712, 0.462],
    [0.668, 0.398],
  ] as Pt[]
).map(onEngraving)
const GATE = onEngraving([0.662, 0.318])
const SAMPLES = 12
const FINALE: Pt = [56, 46]

/** Catmull-Rom curve through `points`, `samples` points per segment, so index `i * samples` = point i. */
function smooth(points: Pt[], samples: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let s = 0; s < samples; s++) {
      const k = s / samples
      const at = (j: 0 | 1) =>
        0.5 *
        (2 * p1[j] +
          (p2[j] - p0[j]) * k +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * k * k +
          (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * k * k * k)
      out.push([at(0), at(1)])
    }
  }
  out.push(last(points))
  return out
}
const TRAIL = smooth([...STOPS, GATE], SAMPLES)

function EndingScene({ t, reduce }: SceneProps) {
  const glowId = useSvgId()
  const reached = reduce ? STOPS.length - 1 : (STOPS.length - 1) * easeInOut(span(t, 250, 3050))
  const toGate = reduce ? 1 : easeInOut(span(t, 3300, 350))
  const progress = reached + toGate
  const trail = upTo(TRAIL, progress * SAMPLES)
  const head = last(trail)
  const pull = reduce ? 1 : easeInOut(span(t, 3550, 1500))
  const zoom = lerp(lerp(2.1, 1.65, span(t, 0, 3300)), 1, pull) + 0.05 * easeInOut(span(t, 5000, 2000))
  const focus = mix(head, FINALE, pull)
  const seal = reduce ? 1 : easeOut(span(t, 3700, 320))
  const glow = reduce ? 1 : easeOut(span(t, 3600, 900))
  const shock = (delay: number) => span(t, 3750 + delay, 900)

  return (
    <>
      <Stage focus={focus} zoom={zoom}>
        {/* eslint-disable-next-line @next/next/no-img-element -- moved by the video camera every frame */}
        <img
          src={ENGRAVING}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute max-w-none"
          style={{
            left: `${ENGRAVING_X}%`,
            top: `${ENGRAVING_Y}%`,
            width: `${ENGRAVING_W}%`,
            height: `${ENGRAVING_H}%`,
          }}
        />
        <Canvas>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0%" className="[stop-color:var(--color-brass)]" stopOpacity={0.85} />
              <stop offset="100%" className="[stop-color:var(--color-brass)]" stopOpacity={0} />
            </radialGradient>
          </defs>

          {glow > 0 && (
            <circle
              cx={GATE[0]}
              cy={GATE[1]}
              r={(10 + 16 * glow) * (1 + 0.04 * Math.sin(t / 260))}
              fill={`url(#${glowId})`}
              opacity={glow}
            />
          )}
          <polyline
            points={poly(TRAIL)}
            fill="none"
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeDasharray="0.01 1.4"
            className="stroke-reel/50"
          />
          <polyline
            points={poly(trail)}
            fill="none"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-reel"
          />
          <polyline
            points={poly(trail)}
            fill="none"
            strokeWidth={0.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-brass"
          />

          {STOPS.map(([x, y], i) => {
            const stamp = reduce ? 1 : easeOut(clamp01((progress - i) * 3.5 + 0.3))
            if (progress < i) return null
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r={3 + 6 * stamp} fill="none" strokeWidth={0.4} className="stroke-reel" opacity={0.5 * (1 - stamp)} />
                <g transform={`scale(${1 + 0.9 * (1 - stamp)})`} opacity={stamp}>
                  <circle r={3} strokeWidth={0.45} className="fill-reel stroke-brass" />
                  <text dy="0.36em" textAnchor="middle" fontSize={2.7} className="fill-brass font-sans font-bold">
                    {i + 1}
                  </text>
                </g>
              </g>
            )
          })}

          {[0, 220].map((delay) => {
            const k = shock(delay)
            if (k <= 0 || k >= 1) return null
            return (
              <circle
                key={delay}
                cx={GATE[0]}
                cy={GATE[1]}
                r={5.2 + 30 * easeOut(k)}
                fill="none"
                strokeWidth={0.7 * (1 - k)}
                className="stroke-brass"
              />
            )
          })}
          {seal > 0 && (
            <g transform={`translate(${GATE[0]} ${GATE[1]}) scale(${lerp(1.5, 1, seal)})`} opacity={clamp01(seal * 2.5)}>
              <circle r={5.2} strokeWidth={0.5} className="fill-reel stroke-brass" />
              <circle r={4.4} fill="none" strokeWidth={0.18} className="stroke-brass/60" />
              <image href="/landing/logo-sm.webp" x={-3.3} y={-3.2} width={6.6} height={6.4} />
            </g>
          )}
        </Canvas>
      </Stage>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,var(--color-reel)_135%)]"
      />
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
      className="absolute inset-0 z-10 flex items-center justify-center bg-reel/90 p-6 backdrop-blur-sm"
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
