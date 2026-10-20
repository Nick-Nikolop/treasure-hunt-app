"use client"

import { motion } from "framer-motion"
import { Check, Compass, RotateCcw, ScanLine } from "lucide-react"
import { useId, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ExplainerCopy } from "./copy"
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
  ending: "bg-brass",
}

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

/* ---------- 1. The mission: four friends converge, a phone lights up ---------- */

const GRID_X = Array.from({ length: 16 }, (_, i) => -74 + i * 14)
const GRID_Y = Array.from({ length: 13 }, (_, i) => -52 + i * 12)
const TEAM_CENTER: Pt = [52, 50]
const TEAM_PATHS: Pt[][] = [
  [[-70, 44], [38, 44], [47, 45.5]],
  [[170, 32], [66, 32], [66, 44], [57, 45.5]],
  [[-70, 68], [38, 68], [38, 56], [47, 54.5]],
  [[170, 56], [66, 56], [57, 54.5]],
]
const TEAM_TONES = ["bg-brass text-reel", "bg-reel-white text-reel", "bg-reel-white text-reel", "bg-brass text-reel"]

function MissionScene({ t, copy, reduce }: SceneProps) {
  const m = copy.mission
  const fade = easeInOut(span(t, 1500, 1000))
  const push = reduce ? 0 : easeInOut(span(t, 3500, 1500))
  const rise = reduce ? (t >= 3700 ? 1 : 0) : easeOut(span(t, 3700, 1100))
  const ring = easeOut(span(t, 3200, 600))
  const note = easeOut(span(t, 4800, 650))
  const walk = (i: number) => easeInOut(span(t, 1500 + i * 160, 1700))

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ opacity: lerp(1, 0.06, fade), transform: `scale(${lerp(1, 1.35, fade) + 0.6 * push})` }}
      >
        <span className="whitespace-nowrap font-serif text-[min(15cqw,30cqh)] font-black leading-none tracking-tight text-reel-white">
          {Array.from(m.city).map((char, i) => {
            const k = reduce ? 1 : easeOut(span(t, 100 + i * 85, 650))
            return (
              <span key={i} className="inline-block" style={{ opacity: k, transform: `translateY(${(1 - k) * 0.5}em)` }}>
                {char}
              </span>
            )
          })}
        </span>
      </div>

      <Stage focus={TEAM_CENTER} zoom={1 + 1.6 * push}>
        <Canvas>
          {GRID_X.map((x, i) => (
            <Line
              key={`x${x}`}
              d={`M${x} -90V190`}
              progress={reduce ? 1 : easeOut(span(t, 80 * (i % 8), 1600))}
              width={0.35}
              className="stroke-reel-white/10"
            />
          ))}
          {GRID_Y.map((y, i) => (
            <Line
              key={`y${y}`}
              d={`M-130 ${y}H230`}
              progress={reduce ? 1 : easeOut(span(t, 120 + 80 * (i % 6), 1600))}
              width={0.35}
              className="stroke-reel-white/10"
            />
          ))}
          {TEAM_PATHS.map((path, i) => {
            const walked = along(path, walk(i))
            if (walk(i) <= 0) return null
            return (
              <polyline
                key={i}
                points={poly(walked)}
                fill="none"
                strokeWidth={0.7}
                strokeLinecap="round"
                strokeDasharray="0.01 1.8"
                className="stroke-brass/70"
                opacity={1 - push}
              />
            )
          })}
          <circle
            cx={TEAM_CENTER[0]}
            cy={TEAM_CENTER[1]}
            r={12 * (0.7 + 0.3 * ring)}
            fill="none"
            strokeWidth={0.5}
            className="stroke-brass"
            opacity={ring * (1 - push)}
          />
        </Canvas>
        {TEAM_PATHS.map((path, i) => {
          if (walk(i) <= 0) return null
          return (
            <Pin
              key={i}
              at={last(along(path, walk(i)))}
              className={cn(
                "flex size-[8cqmin] items-center justify-center rounded-full font-sans text-[3.4cqmin] font-bold shadow-lg shadow-reel ring-[0.6cqmin] ring-reel",
                TEAM_TONES[i],
              )}
            >
              {m.team[i]}
            </Pin>
          )
        })}
      </Stage>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-reel" style={{ opacity: 0.6 * rise }} />
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

/* ---------- 3. The route: walk a drawn city plan to the square ---------- */

const ROUTE: Pt[] = [
  [24, 91],
  [24, 68],
  [38, 68],
  [38, 44],
  [52, 44],
  [52, 32],
]
const PLAZA = last(ROUTE)
const CASTLE: Pt = [9, 9]
const BLOCKS = Array.from({ length: 16 }, (_, i) =>
  Array.from({ length: 11 }, (_, j) => ({ x: -72.6 + i * 14, y: -50.6 + j * 12, park: rand(i * 31 + j * 17) > 0.87 })),
)
  .flat()
  .filter((block) => Math.hypot(block.x + 5.6 - CASTLE[0], block.y + 4.6 - CASTLE[1]) > 13)
const SEA = `M-130 86 ${Array.from({ length: 36 }, (_, i) => `Q${-125 + i * 10} ${i % 2 ? 87.2 : 84.8} ${-120 + i * 10} 86`).join(" ")} V230 H-130 Z`
const WAVES = Array.from({ length: 14 }, (_, i) => ({ x: -60 + rand(i + 40) * 220, y: 91 + rand(i + 80) * 40 }))

function RouteScene({ t, copy, reduce }: SceneProps) {
  const { duration } = chapterById("route")
  const p = easeInOut(t / duration)
  const draw = reduce ? 1 : easeInOut(span(t, 600, 4200))
  const walked = along(ROUTE, draw)
  const tip = last(walked)
  const arrived = draw >= 1
  const zoom = reduce ? 1.15 : lerp(1.05, 1.45, p)
  const focus = mix([34, 72], [50, 40], draw)
  const drift = (t / 1000) * 1.4

  return (
    <Stage focus={focus} zoom={zoom}>
      <Canvas>
        <path d={SEA} className="fill-reel" />
        {WAVES.map((wave, i) => (
          <path
            key={i}
            d={`M${wave.x + drift} ${wave.y}q1.5 -1.2 3 0t3 0`}
            fill="none"
            strokeWidth={0.4}
            strokeLinecap="round"
            className="stroke-reel-white/30"
          />
        ))}
        <rect x={21} y={84} width={6} height={11} rx={0.8} className="fill-reel-white" />

        {BLOCKS.map((block) => (
          <rect
            key={`${block.x}:${block.y}`}
            x={block.x}
            y={block.y}
            width={11.2}
            height={9.2}
            rx={1}
            className={block.park ? "fill-brass/25" : "fill-reel/[0.08]"}
          />
        ))}
        {[45, 135].map((angle) => {
          const dx = Math.cos((angle * Math.PI) / 180) * 70
          const dy = Math.sin((angle * Math.PI) / 180) * 70
          return (
            <path
              key={angle}
              d={`M${PLAZA[0] - dx} ${PLAZA[1] - dy}L${PLAZA[0] + dx} ${PLAZA[1] + dy}`}
              strokeWidth={2.6}
              className="stroke-reel-white"
            />
          )
        })}
        <circle cx={PLAZA[0]} cy={PLAZA[1]} r={6.5} className="fill-reel-white" />
        <circle
          cx={PLAZA[0]}
          cy={PLAZA[1]}
          r={6.5}
          strokeWidth={arrived ? 0.8 : 0.4}
          className={cn("transition-colors duration-500", arrived ? "fill-brass/40 stroke-brass" : "fill-transparent stroke-reel/30")}
        />

        <circle cx={CASTLE[0]} cy={CASTLE[1]} r={11} className="fill-reel/[0.07]" />
        <path
          d={`M${CASTLE[0] - 4} ${CASTLE[1] + 3}V${CASTLE[1] - 2}h0v-2.5h1.5v1.3h1.75v-1.3h1.5v1.3h1.75v-1.3h1.5v2.5V${CASTLE[1] + 3}Z`}
          className="fill-reel/45"
        />

        {walked.length > 1 && (
          <polyline
            points={poly(walked)}
            fill="none"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.01 2.2"
            className="stroke-reel"
          />
        )}
      </Canvas>

      <Pin at={[CASTLE[0], CASTLE[1] + 7]} keep={zoom} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel/60">
        {copy.route.castle}
      </Pin>
      <Pin at={[35, 92]} keep={zoom} className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-reel-white/60">
        {copy.route.harbour}
      </Pin>
      <Pin
        at={[24, 98.5]}
        keep={zoom}
        className="whitespace-nowrap rounded-md bg-reel-white px-2.5 py-1 font-sans text-xs font-bold text-reel shadow-lg"
        style={{ opacity: 1 - span(t, 2800, 600) }}
      >
        {copy.route.start}
      </Pin>

      {arrived ? (
        <>
          <Pin at={PLAZA} keep={zoom} className="size-12 animate-ping rounded-full bg-brass/40" />
          <Pin
            at={[PLAZA[0], PLAZA[1] - 11]}
            keep={zoom}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-reel px-2.5 py-1.5 font-sans text-xs font-bold text-reel-white shadow-lg md:text-sm"
          >
            <Check className="size-3.5 text-brass" />
            {copy.route.target}
          </Pin>
        </>
      ) : (
        <Pin at={tip} keep={zoom} className="flex size-5 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brass/60" />
          <span className="relative size-4 rounded-full bg-brass shadow-lg ring-[3px] ring-reel" />
        </Pin>
      )}
    </Stage>
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

/* ---------- 5. The ending: ten stops light up, the chest bursts open ---------- */

const NODES: Pt[] = [
  [14, 84],
  [26, 76],
  [20, 63],
  [31, 53],
  [45, 58],
  [56, 70],
  [68, 62],
  [63, 48],
  [50, 41],
  [58, 29],
]
const CHEST: Pt = [76, 24]
const TRACK: Pt[] = [...NODES, CHEST]
const COINS = Array.from({ length: 9 }, (_, i) => ({ vx: (rand(i + 7) - 0.5) * 34, vy: -(18 + rand(i + 21) * 14) }))

function EndingScene({ t, reduce }: SceneProps) {
  const dots = useSvgId()
  const reached = 1 + 8 * easeInOut(span(t, 300, 3000))
  const toChest = easeInOut(span(t, 3300, 450))
  const frame = reduce ? 1 : easeInOut(span(t, 0, 4200))
  const zoom = lerp(1.9, 1, frame)
  const focus = mix(NODES[1], [46, 50], frame)
  const pop = span(t, 3650, 320)
  const lid = easeOut(span(t, 3700, 600)) * 38
  const rays = easeOut(span(t, 3800, 800))
  const coinTime = (t - 3900) / 1000

  return (
    <>
      <svg aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <pattern id={dots} width={22} height={22} patternUnits="userSpaceOnUse">
            <circle cx={11} cy={11} r={1.2} className="fill-reel/15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${dots})`} />
      </svg>

      <Stage focus={focus} zoom={zoom}>
        <Canvas>
          <polyline
            points={poly(TRACK)}
            fill="none"
            strokeWidth={0.6}
            strokeLinecap="round"
            strokeDasharray="0.01 1.6"
            className="stroke-reel/30"
          />
          <polyline
            points={poly(upTo(TRACK, reached + toChest))}
            fill="none"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-reel"
          />

          <g transform={`translate(${CHEST[0]} ${CHEST[1]}) scale(${1.35 * (1 + 0.14 * Math.sin(pop * Math.PI))})`}>
            <circle r={9 + 16 * rays} className="fill-reel-white/30" opacity={rays} />
            <g transform={`rotate(${t / 40})`} opacity={rays * 0.7}>
              {Array.from({ length: 12 }, (_, i) => {
                const angle = (i / 12) * Math.PI * 2
                return (
                  <line
                    key={i}
                    x1={Math.cos(angle) * 11}
                    y1={Math.sin(angle) * 11}
                    x2={Math.cos(angle) * (11 + 22 * rays)}
                    y2={Math.sin(angle) * (11 + 22 * rays)}
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    className="stroke-reel-white"
                  />
                )
              })}
            </g>
            <rect x={-8} y={-1} width={16} height={10} rx={1.2} className="fill-reel" />
            <rect x={-8} y={3.2} width={16} height={1.3} className="fill-brass/60" />
            <rect x={-1.4} y={1.6} width={2.8} height={3.6} rx={0.6} className="fill-brass" />
            <g transform={`rotate(${-lid} -8 -1)`}>
              <path d="M-8 -1V-4Q-8 -7.5 0 -7.5Q8 -7.5 8 -4V-1Z" className="fill-reel" />
              <rect x={-8} y={-2.6} width={16} height={1.2} className="fill-brass/60" />
            </g>
            {coinTime > 0 &&
              COINS.map((coin, i) => {
                const s = coinTime - i * 0.05
                if (s <= 0) return null
                return (
                  <circle
                    key={i}
                    cx={coin.vx * s}
                    cy={-3 + coin.vy * s + 26 * s * s}
                    r={1.4}
                    strokeWidth={0.35}
                    className="fill-reel-white stroke-reel"
                    opacity={1 - clamp01((s - 1) / 0.6)}
                  />
                )
              })}
          </g>

          {NODES.map(([x, y], i) => {
            const isReached = reached >= i - 1e-6
            const bump = isReached ? Math.sin(clamp01((reached - i) * 3) * Math.PI) : 0
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${1 + 0.3 * bump})`}>
                <circle
                  r={3.3}
                  strokeWidth={0.5}
                  className={isReached ? "fill-reel stroke-reel" : "fill-brass stroke-reel/40"}
                />
                <text
                  dy="0.36em"
                  textAnchor="middle"
                  fontSize={2.9}
                  className={cn("font-sans font-bold", isReached ? "fill-brass" : "fill-reel/50")}
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </Canvas>
      </Stage>
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
