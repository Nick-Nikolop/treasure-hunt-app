"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Users, User as UserIcon, MapPin, Flag, X, Lock } from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { useI18n } from "@/components/pythea/language-provider"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"
import { buildVoyageRoute, TREASURE_XY, MAP_VIEWBOX } from "@/lib/voyage-map"
import { ENDGAME_AFTER_LEAD, isEndgameProgress, type LeaderboardEntry } from "@/lib/hunt"

type Port = { order: number; country: string; countryEn: string }

type Props = {
  entries: LeaderboardEntry[]
  total: number
  myEntryId: string
  /** The viewer's own furthest lead; ports beyond this stay sealed. */
  viewerProgress: number
  /** Named ports up to the viewer's progress (no spoilers beyond). */
  revealedPorts: Port[]
}

// Chart ink tones, matched to the journal map so both read as one hand.
const INK_BROWN = "oklch(0.45 0.1 40)"
const INK_BROWN_RING = "oklch(0.3 0.08 40)"
const NODE_TEXT = "oklch(0.94 0.02 80)"
const BRASS = "oklch(0.62 0.14 70)"
const TEAL = "oklch(0.5 0.07 200)"

// The endgame cutoff and its test both come from the server so the board, the
// journal widgets and the admin panel can never disagree about who is sealed.

export function LeaderboardView({
  entries,
  total,
  myEntryId,
  viewerProgress,
  revealedPorts,
}: Props) {
  const { t, locale } = useI18n()
  const lb = t.leaderboard

  useEffect(() => {
    track(EV.leaderboardView, { entrants: entries.length }, { category: "leaderboard" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Group every entry by the port (lead order) it currently sits on.
  const byPort = useMemo(() => {
    const map = new Map<number, LeaderboardEntry[]>()
    for (const e of entries) {
      if (e.progress < 1) continue
      const list = map.get(e.progress) ?? []
      list.push(e)
      map.set(e.progress, list)
    }
    return map
  }, [entries])

  const portName = useMemo(() => {
    const map = new Map<number, Port>()
    for (const p of revealedPorts) map.set(p.order, p)
    return map
  }, [revealedPorts])

  // Chart plotted for the hunt's real stop count, matching the journal map.
  const {
    stops: stopXY,
    routeD,
    tailD,
  } = useMemo(() => buildVoyageRoute(total), [total])

  // Which port is open in the detail modal. Null means no modal is open, so
  // the info surfaces only when the player taps a port or a standings row.
  const [selected, setSelected] = useState<number | null>(null)

  const fmt = (ms: number | null) => {
    if (ms === null) return lb.notStarted
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms))
  }

  const frac = total > 1 ? (viewerProgress - 1) / (total - 1) : 1
  const allDone = viewerProgress >= total

  const selectedPort = selected !== null ? (portName.get(selected) ?? null) : null
  const selectedEntries = selected !== null ? (byPort.get(selected) ?? []) : []
  const selectedRevealed = selected !== null && selected <= viewerProgress

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <header className="text-center">
          <p className="font-sans text-[11px] font-bold tracking-chip text-brass">{lb.eyebrow}</p>
          <h1 className="mt-3 text-balance font-serif text-4xl font-black text-foreground md:text-5xl">
            {lb.title}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:text-lg">
            {lb.lead}
          </p>
        </header>

        {/* The chart: a parchment leaf torn from the same atlas as the journal. */}
        <section className="relative mt-10 overflow-hidden rounded-sm border border-[oklch(0.78_0.04_80)] bg-paper text-ink shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)]">
          <div className="px-5 pt-5 md:px-7 md:pt-7">
            <p className="font-sans text-[11px] font-bold tracking-chip text-ink/55">
              {lb.eyebrow}
            </p>
            <p className="mt-2 max-w-md text-pretty font-serif text-sm italic leading-relaxed text-ink/65 md:text-base">
              {lb.mapHint}
            </p>
          </div>

          <svg
            viewBox={MAP_VIEWBOX}
            role="img"
            aria-label={lb.title}
            className="w-full px-2 pb-2 text-ink"
          >
            {/* Compass */}
            <g transform="translate(354, 42)" opacity="0.45">
              <circle r="17" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle r="2" fill="currentColor" />
              <path d="M0 -13 L3 0 L0 13 L-3 0 Z" fill="currentColor" opacity="0.7" />
              <path d="M-13 0 L0 3 L13 0 L0 -3 Z" fill="currentColor" opacity="0.35" />
              <text y="-22" textAnchor="middle" fontSize="9" fill="currentColor" className="font-serif font-bold">
                N
              </text>
            </g>

            {/* Sea waves */}
            {[
              [36, 408],
              [330, 392],
              [40, 130],
            ].map(([x, y]) => (
              <g key={`${x}-${y}`} transform={`translate(${x}, ${y})`} opacity="0.3">
                <path d="M0 0 q 6 -4 12 0 t 12 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M5 7 q 6 -4 12 0 t 12 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            ))}

            {/* Full faint course */}
            <path
              d={routeD}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeDasharray="5 7"
              strokeLinecap="round"
              opacity="0.22"
            />
            {/* Inked portion up to where the viewer has reached */}
            {frac > 0 && (
              <motion.path
                d={routeD}
                fill="none"
                stroke={INK_BROWN}
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: frac }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
              />
            )}

            {/* Final leg + treasure */}
            <path d={tailD} fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 8" strokeLinecap="round" opacity="0.25" />
            {allDone && (
              <motion.path
                d={tailD}
                fill="none"
                stroke={INK_BROWN}
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: "easeInOut", delay: 1.9 }}
              />
            )}
            <g transform={`translate(${TREASURE_XY[0]}, ${TREASURE_XY[1]})`} opacity={allDone ? 1 : 0.25}>
              <path
                d="M-9 -9 L9 9 M9 -9 L-9 9"
                stroke={allDone ? "oklch(0.45 0.13 30)" : "currentColor"}
                strokeWidth={allDone ? 4 : 2.5}
                strokeLinecap="round"
              />
            </g>

            {/* Stops 1..total */}
            {Array.from({ length: total }, (_, i) => i + 1).map((order) => {
              const [x, y] = stopXY[order - 1] ?? [200, 240]
              const revealed = order <= viewerProgress
              const here = byPort.get(order) ?? []
              const count = here.length
              const isSelected = order === selected
              const isMine = order === viewerProgress
              const port = portName.get(order)
              const name = port ? (locale === "en" ? port.countryEn : port.country) : null
              const labelAbove = (order - 1) % 2 === 0
              const lx = Math.min(355, Math.max(45, x))

              return (
                <motion.g
                  key={order}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.35 + (order - 1) * 0.12, ease: "easeOut" }}
                  style={{ transformOrigin: `${x}px ${y}px`, cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    revealed && name
                      ? `${name} — ${lb.explorersHere(count)}`
                      : `${lb.portLabel(order)} — ${lb.explorersHere(count)}`
                  }
                  onClick={() => setSelected(order)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelected(order)
                    }
                  }}
                >
                  {/* Generous invisible hit area for touch */}
                  <circle cx={x} cy={y} r="20" fill="transparent" />

                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={x} cy={y} r="15" fill="none" stroke={BRASS} strokeWidth="2" />
                  )}
                  {/* "You are here" pulse */}
                  {isMine && (
                    <motion.circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill="none"
                      stroke={BRASS}
                      strokeWidth="1.5"
                      initial={{ opacity: 0.7, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.8 }}
                      transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  )}

                  {revealed ? (
                    <>
                      <circle cx={x} cy={y} r="9.5" fill={INK_BROWN} />
                      <circle cx={x} cy={y} r="9.5" fill="none" stroke={INK_BROWN_RING} strokeWidth="1" opacity="0.5" />
                      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9.5" fill={NODE_TEXT} className="font-sans font-bold">
                        {order}
                      </text>
                    </>
                  ) : (
                    <>
                      <circle cx={x} cy={y} r="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 3" opacity="0.6" />
                      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7" className="font-serif italic">
                        ?
                      </text>
                    </>
                  )}

                  {/* Occupancy badge */}
                  {count > 0 && (
                    <g transform={`translate(${x + 9}, ${y - 9})`}>
                      <circle r="7" fill={TEAL} />
                      <text y="3" textAnchor="middle" fontSize="8.5" fill={NODE_TEXT} className="font-sans font-bold">
                        {count}
                      </text>
                    </g>
                  )}

                  {/* Country label for revealed ports only */}
                  {revealed && name && (
                    <text
                      x={lx}
                      y={labelAbove ? y - 16 : y + 24}
                      textAnchor="middle"
                      fontSize="11.5"
                      fill="currentColor"
                      className="font-serif font-bold italic"
                    >
                      {name}
                    </text>
                  )}
                </motion.g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/10 px-5 py-3 md:px-7">
            <LegendDot className="bg-[oklch(0.45_0.1_40)]" label={lb.legendReached} />
            <LegendDot ring label={lb.legendSealed} />
            <LegendDot className="bg-[oklch(0.5_0.07_200)]" label={lb.youAreHere} pulse />
          </div>
        </section>

        {/* Full standings, compact */}
        <section className="mt-8">
          <p className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
            {lb.standingsLabel}
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {entries.map((entry, i) => {
              const isMe = entry.id === myEntryId
              const rank = i + 1
              const country = locale === "en" ? entry.countryEn : entry.country
              const done = entry.progress >= total
              return (
                <li
                  key={`row-${entry.kind}-${entry.id}`}
                  className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 ${
                    isMe ? "border-brass bg-brass/5" : "border-border bg-card/30"
                  }`}
                >
                  <div className="flex w-7 shrink-0 justify-center">
                    {rank <= 3 ? (
                      <Trophy
                        className={`size-4 ${rank === 1 ? "text-brass" : rank === 2 ? "text-muted-foreground" : "text-muted-foreground/70"}`}
                        aria-hidden
                      />
                    ) : (
                      <span className="font-serif text-sm font-black text-muted-foreground">{rank}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(entry.progress)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {entry.kind === "team" ? (
                      <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    ) : (
                      <UserIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="truncate font-serif text-sm font-bold text-foreground">
                      {entry.name}
                    </span>
                    {isMe && (
                      <span className="shrink-0 rounded-sm bg-brass px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-background">
                        {lb.you}
                      </span>
                    )}
                    {country && (
                      <span className="hidden items-center gap-1 truncate font-sans text-[11px] text-muted-foreground sm:inline-flex">
                        <MapPin className="size-3" aria-hidden />
                        {country}
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {done && <Flag className="size-3.5 text-brass" aria-label={lb.finished} />}
                    <span className="inline-flex items-baseline gap-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground/70">
                      <span className="font-serif text-sm font-black text-muted-foreground">
                        {entry.progress}
                      </span>
                      /{total}
                    </span>
                    <ScoreCell
                      score={entry.score}
                      hidden={isScoreHidden(entry.progress)}
                      lb={lb}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </main>

      {/* Port detail surfaces in a modal right where the player tapped, so the
          standings and map never need scrolling to read who is where. */}
      <ModalShell
        open={selected !== null}
        onClose={() => setSelected(null)}
        labelledBy="port-detail-title"
      >
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-label={lb.home}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-brass/15 font-serif text-base font-black text-brass">
            {String(selected ?? 0).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h2
              id="port-detail-title"
              className="truncate font-serif text-xl font-black text-foreground md:text-2xl"
            >
              {selectedRevealed && selectedPort
                ? locale === "en"
                  ? selectedPort.countryEn
                  : selectedPort.country
                : lb.unknownWaters}
            </h2>
            <p className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">
              {selected !== null && lb.portLabel(selected)}
              {selected === viewerProgress && (
                <span className="ml-2 text-brass">{lb.youAreHere}</span>
              )}
            </p>
          </div>
        </div>

        {!selectedRevealed && (
          <p className="mt-4 text-pretty font-serif text-sm italic leading-relaxed text-muted-foreground">
            {lb.sealedPort}
          </p>
        )}

        {selectedEntries.length === 0 ? (
          <p className="mt-5 font-serif text-base italic text-muted-foreground">{lb.noOneHere}</p>
        ) : (
          <ul className="mt-5 flex max-h-[55vh] flex-col gap-2.5 overflow-y-auto">
            {selectedEntries.map((entry) => (
              <PortEntryRow
                key={`${entry.kind}-${entry.id}`}
                entry={entry}
                total={total}
                isMe={entry.id === myEntryId}
                reachedText={fmt(entry.reachedAt)}
                lb={lb}
              />
            ))}
          </ul>
        )}
      </ModalShell>
    </>
  )
}

function PortEntryRow({
  entry,
  total,
  isMe,
  reachedText,
  lb,
}: {
  entry: LeaderboardEntry
  total: number
  isMe: boolean
  reachedText: string
  lb: ReturnType<typeof useI18n>["t"]["leaderboard"]
}) {
  const done = entry.progress >= total
  return (
    <li
      className={`flex items-start gap-3 rounded-sm border px-4 py-3 ${
        isMe ? "border-brass bg-brass/5" : "border-border bg-card/40"
      }`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background">
        {entry.kind === "team" ? (
          <Users className="size-4 text-muted-foreground" aria-hidden />
        ) : (
          <UserIcon className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-serif text-base font-bold text-foreground">{entry.name}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-muted-foreground">
            {entry.kind === "team" ? lb.teamTag : lb.soloTag}
          </span>
          {isMe && (
            <span className="shrink-0 rounded-sm bg-brass px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-background">
              {lb.you}
            </span>
          )}
          {done && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-brass/15 px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-brass">
              <Flag className="size-3" aria-hidden />
              {lb.finished}
            </span>
          )}
        </div>
        {entry.kind === "team" && entry.members.length > 0 && (
          <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground">
            {lb.membersLabel}: {entry.members.join(", ")}
          </p>
        )}
        <p className="mt-0.5 font-sans text-[11px] text-muted-foreground/80">
          {lb.reachedLabel} {reachedText}
        </p>
      </div>
      <span className="shrink-0">
        <ScoreCell score={entry.score} hidden={isScoreHidden(entry.progress)} big lb={lb} />
      </span>
    </li>
  )
}

function ScoreCell({
  score,
  hidden,
  big,
  lb,
}: {
  score: number
  hidden: boolean
  big?: boolean
  lb: ReturnType<typeof useI18n>["t"]["leaderboard"]
}) {
  const numClass = big ? "text-lg" : "text-base"
  if (hidden) {
    return (
      <span className="flex flex-col items-end leading-none">
        <span className="relative inline-flex items-center">
          {/* Blurred placeholder digits, decoupled from the real score so the
              value cannot be read or inferred through the blur. */}
          <span
            aria-hidden
            className={`select-none font-serif ${numClass} font-black text-brass blur-[6px]`}
          >
            888
          </span>
          <Lock className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 text-brass/90" aria-hidden />
        </span>
        <span className="font-sans text-[9px] font-bold tracking-chip text-muted-foreground/70">
          {lb.scoreSealed}
        </span>
        <span className="sr-only">{lb.scoreSealedSr}</span>
      </span>
    )
  }
  return (
    <span className="flex flex-col items-end leading-none">
      <span className={`font-serif ${numClass} font-black text-brass`}>{score}</span>
      <span className="font-sans text-[9px] font-bold tracking-chip text-muted-foreground/70">
        {lb.points}
      </span>
    </span>
  )
}

function LegendDot({
  className,
  ring,
  pulse,
  label,
}: {
  className?: string
  ring?: boolean
  pulse?: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block size-3 rounded-full ${
          ring ? "border border-dashed border-muted-foreground" : className
        } ${pulse ? "ring-2 ring-[oklch(0.62_0.14_70)]/40" : ""}`}
      />
      <span className="font-sans text-[11px] text-muted-foreground">{label}</span>
    </span>
  )
}
