"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Award,
  Compass,
  Crown,
  Gem,
  MapPin,
  Medal,
  ScrollText,
  Trophy,
  User,
  Users,
} from "lucide-react"
import type { FinalStandings, StandingRow, Stage } from "@/lib/standings"

/**
 * The closing-ceremony standings board. Superadmin-only, rendered on its own
 * page so it can be projected full-screen without the admin chrome around it.
 *
 * Ranking is decided server-side in lib/standings.ts (stage, then progress, then
 * arrival time). This component only presents it.
 */

const STAGE_META: Record<Stage, { el: string; icon: typeof Gem; tone: string }> = {
  treasure: { el: "Βρήκε τον θησαυρό", icon: Gem, tone: "brass" },
  compass: { el: "Έφτασε στην πυξίδα", icon: Compass, tone: "teal" },
  trail_end: { el: "Βρήκε το 1ο σημείωμα", icon: ScrollText, tone: "muted" },
  none: { el: "Στην πορεία", icon: MapPin, tone: "muted" },
}

/** Athens wall-clock, since the whole hunt was played in Greece. */
function fmtAthens(ms: number | null): string {
  if (ms === null) return "—"
  return new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms))
}

function stageClasses(tone: string): string {
  if (tone === "brass") return "border-brass/50 bg-brass/15 text-brass"
  if (tone === "teal") return "border-teal/50 bg-teal/15 text-teal"
  return "border-border bg-muted/30 text-muted-foreground"
}

function StageBadge({ stage }: { stage: Stage }) {
  const meta = STAGE_META[stage]
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip ${stageClasses(meta.tone)}`}
    >
      <Icon className="size-3" />
      {meta.el}
    </span>
  )
}

/** Medal colouring for the top three, plain brass numeral for everyone else. */
function RankMark({ position }: { position: number }) {
  const tone =
    position === 1
      ? "border-brass bg-brass text-background"
      : position === 2
        ? "border-brass/60 bg-brass/20 text-brass"
        : position === 3
          ? "border-teal/60 bg-teal/15 text-teal"
          : "border-border bg-muted/20 text-muted-foreground"
  return (
    <span
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-sm border font-serif text-lg font-bold tabular-nums ${tone}`}
    >
      {position}
    </span>
  )
}

/** The tall plinths at the top. Usually three; more when a position is tied. */
function Podium({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return null
  const ICONS = [Trophy, Medal, Award]
  // How many share each position, so a tie can be labelled as one instead of
  // printing "ΝΙΚΗΤΗΣ" on several identical-looking cards.
  const sharedCount = new Map<number, number>()
  for (const r of rows) sharedCount.set(r.position, (sharedCount.get(r.position) ?? 0) + 1)

  // DOM order stays rank order (1, 2, 3) so a screen reader and the mobile stack
  // both read the winner first. Only the desktop grid reshuffles to 2nd-1st-3rd
  // so the winner stands in the middle, and only for a clean untied top three.
  const classicPodium =
    rows.length === 3 && new Set(rows.map((r) => r.position)).size === 3
  const DESKTOP_ORDER = classicPodium ? ["sm:order-2", "sm:order-1", "sm:order-3"] : []

  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {rows.map((row, i) => {
        const isWinner = row.position === 1
        const tied = (sharedCount.get(row.position) ?? 1) > 1
        const Icon = ICONS[Math.min(row.position, 3) - 1] ?? Award
        return (
          <div
            key={`${row.kind}-${row.id}`}
            className={`relative overflow-hidden rounded-sm border p-4 text-center ${DESKTOP_ORDER[i] ?? ""} ${
              isWinner
                ? "border-brass bg-brass/10 sm:pb-8 sm:pt-7"
                : "border-border bg-card/60 sm:pb-5"
            }`}
          >
            {/* Winner gets a warm wash so the eye lands there first. */}
            {isWinner && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brass)_28%,transparent),transparent_70%)]"
              />
            )}
            <div className="relative">
              <Icon
                className={`mx-auto size-7 ${isWinner ? "text-brass" : "text-muted-foreground"}`}
              />
              <p
                className={`mt-2 font-sans text-[10px] font-bold tracking-chip ${
                  isWinner ? "text-brass" : "text-muted-foreground"
                }`}
              >
                {isWinner && !tied
                  ? "ΝΙΚΗΤΗΣ"
                  : `${row.position}Η ΘΕΣΗ${tied ? " ΕΞ ΙΣΟΥ" : ""}`}
              </p>
              <p
                className={`mt-1 text-balance font-serif font-bold leading-tight text-foreground ${
                  isWinner ? "text-2xl" : "text-xl"
                }`}
              >
                {row.name}
              </p>
              {row.teamName && (
                <p className="mt-1 font-sans text-[11px] text-muted-foreground">{row.teamName}</p>
              )}
              <div className="mt-3 flex justify-center">
                <StageBadge stage={row.stage} />
              </div>
              <p className="mt-2 font-sans text-[11px] tabular-nums text-muted-foreground">
                {row.progress} / {row.total} στίγματα · {fmtAthens(row.decidedAt)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StandingsList({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
        Καμία καταχώρηση.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-sm border border-border">
      {rows.map((row) => (
        <li
          key={`${row.kind}-${row.id}`}
          className={`flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4 ${
            row.finished ? "bg-brass/[0.06]" : row.position <= 3 ? "bg-card/50" : ""
          }`}
        >
          <RankMark position={row.position} />

          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-base font-bold text-foreground">{row.name}</p>
            {/* Teams list their crew; players name the crew they belonged to. */}
            {row.kind === "team" ? (
              row.members.length > 0 && (
                <p className="truncate font-sans text-[11px] text-muted-foreground">
                  {row.members.join(" · ")}
                </p>
              )
            ) : row.teamName ? (
              <p className="truncate font-sans text-[11px] text-muted-foreground">
                <Users className="mr-1 inline size-3 align-[-2px]" />
                {row.teamName}
              </p>
            ) : (
              <p className="font-sans text-[11px] italic text-muted-foreground/70">Χωρίς πλήρωμα</p>
            )}
          </div>

          <div className="hidden sm:block">
            <StageBadge stage={row.stage} />
          </div>

          {/* Progress: the count, plus a thin bar so the spread reads at a glance. */}
          <div className="w-[104px] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-[11px] font-bold tabular-nums text-foreground">
                {row.progress}/{row.total}
              </span>
              {row.country && (
                <span className="truncate font-sans text-[10px] text-muted-foreground">
                  {row.country}
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted/40">
              <div
                className={`h-full ${row.finished ? "bg-brass" : "bg-brass/55"}`}
                style={{ width: `${row.total > 0 ? (row.progress / row.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="w-[92px] shrink-0 text-right font-sans text-[11px] tabular-nums text-muted-foreground">
            {fmtAthens(row.decidedAt)}
          </div>
        </li>
      ))}
    </ul>
  )
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div className="rounded-sm border border-border bg-card/50 px-3 py-2.5">
      <Icon className="size-4 text-brass" />
      <p className="mt-1 font-serif text-2xl font-bold tabular-nums leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

export function AdminStandingsView({ data }: { data: FinalStandings }) {
  const [view, setView] = useState<"teams" | "players">("teams")
  const rows = view === "teams" ? data.teams : data.players

  // Only crews/players who actually moved deserve a plinth, so an all-zero
  // podium never crowns someone who never left the harbour. We take the top three
  // DISTINCT positions and every row sharing them, so a tie (teammates who all
  // scanned the treasure) never silently drops a co-winner into the list below.
  // Capped so a pathological many-way tie cannot blow up the layout.
  const podium = useMemo(() => {
    const moved = rows.filter((r) => r.progress > 0)
    const top = [...new Set(moved.map((r) => r.position))].sort((a, b) => a - b).slice(0, 3)
    // Add one position-group at a time and stop before any group that would not
    // fit whole, so the podium never shows "3 of the 5 who tied".
    const out: StandingRow[] = []
    for (const pos of top) {
      const group = moved.filter((r) => r.position === pos)
      if (out.length > 0 && out.length + group.length > 6) break
      out.push(...group)
    }
    return out
  }, [rows])
  const rest = useMemo(
    () => rows.filter((r) => !podium.some((p) => p.id === r.id && p.kind === r.kind)),
    [rows, podium],
  )

  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
      >
        <ArrowLeft className="size-3.5" />
        ΠΙΣΩ ΣΤΟ ADMIN
      </Link>

      {/* Ceremony header. */}
      <header className="relative mt-5 overflow-hidden rounded-sm border border-brass/40 bg-card/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-brass to-transparent"
        />
        <div className="border-b border-border px-4 py-5 text-center sm:px-6 sm:py-7">
          <p className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-brass">
            <Crown className="size-3.5" />
            ΤΕΛΙΚΗ ΚΑΤΑΤΑΞΗ
          </p>
          <h1 className="mt-2 text-balance font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Το ταξίδι του Πυθέα
          </h1>
          <p className="mx-auto mt-2 max-w-[52ch] text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
            Η οριστική κατάταξη όλων των πληρωμάτων και των εξερευνητών, όπως την έγραψε το κυνήγι.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
          <StatTile icon={Users} value={data.stats.teamCount} label="ΠΛΗΡΩΜΑΤΑ" />
          <StatTile icon={User} value={data.stats.playerCount} label="ΕΞΕΡΕΥΝΗΤΕΣ" />
          <StatTile icon={ScrollText} value={data.stats.endgameTeams} label="ΣΤΟ ΦΙΝΑΛΕ" />
          <StatTile icon={Gem} value={data.stats.finishedTeams} label="ΟΛΟΚΛΗΡΩΣΑΝ" />
        </div>
      </header>

      {/* Teams / players switch. */}
      <div className="mt-6 inline-flex rounded-sm border border-border bg-card/50 p-1">
        {(
          [
            { id: "teams" as const, label: "ΠΛΗΡΩΜΑΤΑ", icon: Users },
            { id: "players" as const, label: "ΠΑΙΚΤΕΣ", icon: User },
          ] satisfies { id: "teams" | "players"; label: string; icon: typeof Users }[]
        ).map((t) => {
          const Icon = t.icon
          const active = view === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-sans text-[11px] font-bold tracking-chip transition-colors ${
                active ? "bg-brass text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {podium.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
            ΤΟ ΒΑΘΡΟ
          </h2>
          <Podium rows={podium} />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
            {podium.length > 0 ? "Η ΣΥΝΕΧΕΙΑ ΤΗΣ ΚΑΤΑΤΑΞΗΣ" : "ΚΑΤΑΤΑΞΗ"}
          </h2>
          <span className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
            {rows.length} ΣΥΝΟΛΟ
          </span>
        </div>
        <StandingsList rows={rest} />
      </section>

      <p className="mt-6 font-sans text-[11px] leading-relaxed text-muted-foreground">
        Η κατάταξη κρίνεται πρώτα από το πόσο μακριά έφτασε κανείς στο φινάλε (θησαυρός, μετά πυξίδα,
        μετά το 1ο σημείωμα), έπειτα από τα στίγματα της πορείας και τέλος από το ποιος έφτασε πρώτος.
        Οι ώρες είναι σε ώρα Ελλάδας.
      </p>
    </main>
  )
}
