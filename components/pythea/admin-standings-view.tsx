"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Award,
  Check,
  CircleDashed,
  Compass,
  Crown,
  Gem,
  Medal,
  ScrollText,
  Trophy,
  User,
  Users,
} from "lucide-react"
import type { FinalStandings, StandingRow } from "@/lib/standings"

/**
 * The closing-ceremony standings board. Superadmin-only, rendered on its own
 * page so it can be projected full-screen without the admin chrome around it.
 *
 * Ranking is still decided server-side in lib/standings.ts (stage, then progress,
 * then who got there first), but arrival TIMES are deliberately never shown: the
 * board reports what each team achieved, not when. Every row reduces to three
 * plain facts, riddles solved out of ten plus a yes/no on the compass and the
 * treasure, and the stage is implied by them rather than repeated as a label.
 *
 * Greek copy always calls a team "ομάδα" / "ομάδες", matching the rest of the app;
 * nautical synonyms are deliberately not used. Note uppercase Greek drops accents,
 * so the chip label is ΟΜΑΔΕΣ, not ΟΜΆΔΕΣ.
 */

/**
 * Riddles actually cracked, out of the ten on the trail.
 *
 * Careful with the off-by-one: `progress` counts leads UNLOCKED, and lead 1 is
 * handed out at registration without anyone scanning anything, so it always runs
 * one ahead of the riddles genuinely solved. Reaching any endgame step is only
 * possible while standing on the final lead, so the whole trail is behind them
 * and the count reads full.
 */
function riddlesSolved(row: StandingRow): number {
  if (row.stage !== "none") return row.total
  return Math.max(0, row.progress - 1)
}

/** The compass is behind anyone who went on to the treasure. */
function reachedCompass(row: StandingRow): boolean {
  return row.stage === "compass" || row.stage === "treasure"
}

/**
 * One endgame milestone as a plain yes/no. A tick when it was reached, a dashed
 * ring when it was not, so the two states differ in shape as well as colour.
 */
function Milestone({
  label,
  icon: Icon,
  reached,
}: {
  label: string
  icon: typeof Gem
  reached: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-1 font-sans text-[10px] font-bold tracking-chip ${
        reached
          ? "border-brass/50 bg-brass/15 text-brass"
          : "border-border bg-muted/20 text-muted-foreground/60"
      }`}
    >
      <Icon className="size-3 shrink-0" />
      {label}
      {reached ? (
        <Check className="size-3.5 shrink-0" strokeWidth={3} />
      ) : (
        <CircleDashed className="size-3.5 shrink-0" />
      )}
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
              {/* The headline number: riddles cracked out of the ten on the trail. */}
              <p className="mt-3 font-serif text-3xl font-bold tabular-nums leading-none text-foreground">
                {riddlesSolved(row)}
                <span className="text-lg text-muted-foreground"> / {row.total}</span>
              </p>
              <p className="mt-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                ΓΡΙΦΟΙ
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <Milestone label="ΠΥΞΙΔΑ" icon={Compass} reached={reachedCompass(row)} />
                <Milestone label="ΘΗΣΑΥΡΟΣ" icon={Gem} reached={row.finished} />
              </div>
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
              <p className="font-sans text-[11px] italic text-muted-foreground/70">Χωρίς ομάδα</p>
            )}
          </div>

          {/* Riddles solved, with a bar built from the SAME figure so the two
              can never disagree. */}
          <div className="w-[104px] shrink-0">
            <span className="font-sans text-xs font-bold tabular-nums text-foreground">
              {riddlesSolved(row)}
              <span className="text-muted-foreground">/{row.total}</span>
              <span className="ml-1 font-normal text-[10px] text-muted-foreground">γρίφοι</span>
            </span>
            <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted/40">
              <div
                className={`h-full ${row.finished ? "bg-brass" : "bg-brass/55"}`}
                style={{
                  width: `${row.total > 0 ? (riddlesSolved(row) / row.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Own line on narrow screens, so the team name keeps enough room to
              read in full instead of being truncated to three letters. */}
          <div className="flex w-full shrink-0 gap-1.5 sm:w-auto">
            <Milestone label="ΠΥΞΙΔΑ" icon={Compass} reached={reachedCompass(row)} />
            <Milestone label="ΘΗΣΑΥΡΟΣ" icon={Gem} reached={row.finished} />
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
  // Only crews/explorers who actually SOLVED something are ranked at all.
  // Careful with the off-by-one: `progress` counts leads UNLOCKED, and lead 1 is
  // handed to everyone at registration without a scan, so `progress === 1` means
  // "signed up, never solved a thing". Solving the first stop unlocks lead 2, so
  // the real threshold is > 1. (Anyone in the endgame has progress === total, so
  // they always pass.) This drops ~60 crews and ~230 explorers who never left the
  // harbour, instead of padding the table with identical rows.
  const hasSolved = (r: StandingRow) => r.progress > 1
  // ONE list, no tabs: crews plus any explorer who never joined a crew, already
  // ranked together upstream so their positions are comparable.
  const rows = useMemo(() => data.entries.filter(hasSolved), [data.entries])
  // Counts shown in the header must agree with the table, so they count the
  // ranked entries, not everyone who ever signed up.
  const activeTeams = useMemo(
    () => rows.filter((r) => r.kind === "team").length,
    [rows],
  )
  const activePlayers = useMemo(() => data.players.filter(hasSolved).length, [data.players])
  const soloShown = useMemo(() => rows.filter((r) => r.kind === "player").length, [rows])

  // We take the top three DISTINCT positions and every row sharing them, so a
  // tie (teammates who all scanned the treasure) never silently drops a
  // co-winner into the list below. Capped so a pathological many-way tie cannot
  // blow up the layout.
  const podium = useMemo(() => {
    const moved = rows
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
            Η οριστική κατάταξη κάθε ομάδας και εξερευνητή που έλυσε τουλάχιστον ένα στοιχείο, όπως
            την έγραψε το κυνήγι.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
          <StatTile icon={Users} value={activeTeams} label="ΟΜΑΔΕΣ" />
          <StatTile icon={User} value={activePlayers} label="ΕΞΕΡΕΥΝΗΤΕΣ" />
          <StatTile icon={ScrollText} value={data.stats.endgameTeams} label="ΣΤΟ ΦΙΝΑΛΕ" />
          <StatTile icon={Gem} value={data.stats.finishedTeams} label="ΟΛΟΚΛΗΡΩΣΑΝ" />
        </div>
      </header>

      {podium.length > 0 && (
        <section className="mt-8">
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
            {/* Only worth saying when a lone explorer is actually in the list. */}
            {soloShown > 0 && ` · ${soloShown} ΧΩΡΙΣ ΟΜΑΔΑ`}
          </span>
        </div>
        <StandingsList rows={rest} />
      </section>

      {/* Legend, so the two tick states are unambiguous on a projector. */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-border bg-card/40 px-3 py-2.5">
        <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
          ΥΠΟΜΝΗΜΑ
        </span>
        <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
          <Check className="size-3.5 text-brass" strokeWidth={3} />
          Το βρήκαν
        </span>
        <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
          <CircleDashed className="size-3.5 text-muted-foreground/60" />
          Δεν το έφτασαν
        </span>
      </div>

      <p className="mt-3 font-sans text-[11px] leading-relaxed text-muted-foreground">
        Κάθε ομάδα κρίνεται πρώτα από το πόσο μακριά έφτασε στο φινάλε (θησαυρός, μετά πυξίδα, μετά
        το 1ο σημείωμα) και έπειτα από τους γρίφους που έλυσε. Οι γρίφοι της πορείας είναι{" "}
        {data.total} στο σύνολο.
      </p>
    </main>
  )
}
