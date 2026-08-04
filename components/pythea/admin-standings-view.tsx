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
  MapPin,
  Medal,
  ScrollText,
  Trophy,
  User,
  Users,
} from "lucide-react"
import type { StandingRow, StandingsBoard } from "@/lib/standings"

/**
 * The closing-ceremony standings board. Superadmin-only, rendered on its own
 * page so it can be projected full-screen without the admin chrome around it.
 *
 * Ranking is still decided server-side in lib/standings.ts (stage, then progress,
 * then who got there first), but arrival TIMES are deliberately never shown: the
 * board reports what each team achieved, not when.
 *
 * The top three keep their podium, and below it the rest of the ranking is
 * presented as ACHIEVEMENT BANDS rather than one long table, so the story reads as
 * "these found the treasure, these reached the compass, these solved all ten..."
 * Each band states its achievement once in its header and its rows carry only a
 * position and a name.
 *
 * The bands intentionally still contain the medallists, so a band's count is the
 * true number of teams at that achievement rather than "the ones not on a plinth".
 *
 * Rosters are private: a team's members are never listed and no per-team headcount
 * is shown. The only counts on the page are teams per band and course-wide totals.
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
 * Per-digit correction, measured off both rendered families at 100px/700:
 * Alegreya Sans (cap 70, digits 52-62 tall) and Alegreya (cap 72, digits 52-64).
 * The two are the same oldstyle design and their scale factors agree to ~2%, so
 * one averaged table serves both rather than branching on family.
 *
 * `s` scales a digit up to cap height; `y` lifts the ones drawn below the
 * baseline (3/4/5/7/9 hang ~9 units), in the scaled glyph's own em.
 */
const FIGURE_FIX: Record<string, { s: number; y: number }> = {
  "0": { s: 1.34, y: 0 },
  "1": { s: 1.37, y: 0 },
  "2": { s: 1.35, y: 0 },
  "3": { s: 1.15, y: 0.1 },
  "4": { s: 1.15, y: 0.11 },
  "5": { s: 1.14, y: 0.1 },
  "6": { s: 1.15, y: 0 },
  "7": { s: 1.16, y: 0.105 },
  "8": { s: 1.16, y: 0 },
  "9": { s: 1.15, y: 0.1 },
}

/**
 * Renders digits at cap height, e.g. "8 ΑΠΟ 10 ΓΡΙΦΟΥΣ" or a bare "40".
 *
 * Alegreya has exactly ONE figure set and it is OLDSTYLE: measured against a cap
 * height of ~71, the digits 0/1/2 are only ~52 tall and 3/4/5/7/9 hang 9 units
 * below the baseline. Next to uppercase Greek that reads as the numbers being in
 * a different, smaller font, which is precisely what looked wrong. It also makes
 * a number ragged on its own, since "40" pairs a descending 4 with a short 0.
 *
 * Applied to every number the board presents as DATA (labels, counts, ranks,
 * scores). That is all of them: the board has no lowercase running prose, which
 * is the one setting oldstyle figures are actually designed for.
 *
 * **`font-variant-numeric: lining-nums` cannot fix this.** The Google-hosted file
 * ships no lining alternate, so that declaration (and `font-feature-settings:
 * 'lnum'`) renders byte-identically. Verified by rendering the real element at
 * 30px in all three modes. So each digit is instead optically normalised to cap
 * height and dropped back onto the baseline.
 *
 * Letter-spacing needs no compensation: `tracking-chip` is an em value, which CSS
 * resolves to px at the parent and inherits as that px, so the wide chip tracking
 * stays even across the resized glyphs.
 */
function Figures({ children }: { children: string | number }) {
  return (
    <>
      {[...String(children)].map((ch, i) => {
        const fix = FIGURE_FIX[ch]
        if (!fix) return ch
        return (
          <span
            key={i}
            // inline-block only where a transform is actually needed, so the
            // remaining digits stay ordinary inline text.
            className={fix.y ? "inline-block" : undefined}
            style={{
              fontSize: `${fix.s}em`,
              transform: fix.y ? `translateY(-${fix.y}em)` : undefined,
            }}
          >
            {ch}
          </span>
        )
      })}
    </>
  )
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

/**
 * Gold, silver and bronze, defined once so the podium and the rank badges in the
 * bands below cannot drift apart.
 *
 * Every value is a COMPLETE literal class string: Tailwind cannot compile an
 * interpolated arbitrary value, so a `bg-${metal}/10` template would silently
 * produce no style at all.
 *
 * The winner stays dominant despite all three now glowing: gold alone gets a
 * full-strength border and the strongest wash, and its plinth is also taller with
 * a larger name. Silver's wash is dialled lower than bronze's because a pale
 * neutral reads stronger than a dark warm one at equal alpha.
 */
const MEDALS = [
  {
    icon: Trophy,
    frame: "border-brass bg-brass/10",
    ink: "text-brass",
    glow: "bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brass)_30%,transparent),transparent_70%)]",
    rank: "border-brass bg-brass text-background",
  },
  {
    icon: Medal,
    frame: "border-silver/65 bg-silver/[0.08]",
    ink: "text-silver",
    glow: "bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--silver)_20%,transparent),transparent_70%)]",
    rank: "border-silver/60 bg-silver/20 text-silver",
  },
  {
    icon: Award,
    frame: "border-bronze/65 bg-bronze/[0.08]",
    ink: "text-bronze",
    glow: "bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--bronze)_26%,transparent),transparent_70%)]",
    rank: "border-bronze/60 bg-bronze/20 text-bronze",
  },
] as const

/**
 * The metal for a finishing position. Clamped, so when a tie pushes the third
 * plinth's number past 3 it still reads as the third standing rather than
 * falling through to no medal at all.
 */
function medalFor(position: number) {
  return MEDALS[Math.min(position, MEDALS.length) - 1]
}

/** Medal colouring for the top three, plain numeral for everyone else. */
function RankMark({ position }: { position: number }) {
  const tone =
    position <= 3
      ? medalFor(position).rank
      : "border-border bg-muted/20 text-muted-foreground"
  return (
    <span
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-sm border font-serif text-lg font-bold tabular-nums ${tone}`}
    >
      <Figures>{position}</Figures>
    </span>
  )
}

/** The tall plinths at the top. Usually three; more when a position is tied. */
function Podium({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return null
  // How many share each position, so a tie can be labelled as one instead of
  // printing "ΝΙΚΗΤΗΣ" on several identical-looking cards.
  const sharedCount = new Map<number, number>()
  for (const r of rows) sharedCount.set(r.position, (sharedCount.get(r.position) ?? 0) + 1)

  // DOM order stays rank order (1, 2, 3) so a screen reader and the mobile stack
  // both read the winner first. Only the desktop grid reshuffles to 2nd-1st-3rd
  // so the winner stands in the middle, and only for a clean untied top three.
  const classicPodium = rows.length === 3 && new Set(rows.map((r) => r.position)).size === 3
  const DESKTOP_ORDER = classicPodium ? ["sm:order-2", "sm:order-1", "sm:order-3"] : []

  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {rows.map((row, i) => {
        const isWinner = row.position === 1
        const tied = (sharedCount.get(row.position) ?? 1) > 1
        const medal = medalFor(row.position)
        const Icon = medal.icon
        return (
          <div
            key={`${row.kind}-${row.id}`}
            className={`relative overflow-hidden rounded-sm border p-4 text-center ${DESKTOP_ORDER[i] ?? ""} ${medal.frame} ${
              isWinner ? "sm:pb-8 sm:pt-7" : "sm:pb-5"
            }`}
          >
            {/* Each plinth is washed in its own metal, gold strongest, so the eye
                still lands on the winner first. */}
            <div className={`pointer-events-none absolute inset-0 ${medal.glow}`} aria-hidden />
            <div className="relative">
              <Icon className={`mx-auto size-7 ${medal.ink}`} />
              <p className={`mt-2 font-sans text-[10px] font-bold tracking-chip ${medal.ink}`}>
                <Figures>
                  {isWinner && !tied ? "ΝΙΚΗΤΗΣ" : `${row.position}Η ΘΕΣΗ${tied ? " ΕΞ ΙΣΟΥ" : ""}`}
                </Figures>
              </p>
              <p
                className={`mt-1 text-balance font-serif font-bold leading-tight text-foreground ${
                  isWinner ? "text-2xl" : "text-xl"
                }`}
              >
                {row.name}
              </p>
              {/* The headline number: riddles cracked out of the ten on the trail. */}
              <p className="mt-3 font-serif text-3xl font-bold tabular-nums leading-none text-foreground">
                <Figures>{riddlesSolved(row)}</Figures>
                <span className="text-lg text-muted-foreground">
                  {" / "}
                  <Figures>{row.total}</Figures>
                </span>
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

/** An achievement band, and the teams that share it. */
type StandingsGroup = {
  key: string
  label: string
  icon: typeof Gem
  tone: "gold" | "teal" | "plain"
  riddles: number
  total: number
  /** The three finale bands spell out the two milestones; the rest are below it. */
  showMilestones: boolean
  compass: boolean
  treasure: boolean
  rows: StandingRow[]
}

/**
 * Buckets the ranked list into bands: the treasure, then the compass, then the
 * first note, then one band per riddle count.
 *
 * It walks the ALREADY RANKED rows in order and keys a Map, so band order simply
 * follows the ranking and a band only exists once something lands in it. There is
 * deliberately no 10..1 countdown: the real data skips some counts entirely (no
 * team sits on exactly five), and a fixed loop would print empty bands.
 *
 * The bands cannot overlap, because a team that reached any finale step is keyed
 * by that step, and everyone else tops out at total - 1 riddles.
 */
function groupRows(rows: StandingRow[]): StandingsGroup[] {
  const bands = new Map<string, StandingsGroup>()

  for (const row of rows) {
    const solved = riddlesSolved(row)
    const key =
      row.stage === "treasure"
        ? "treasure"
        : row.stage === "compass"
          ? "compass"
          : row.stage === "trail_end"
            ? "note"
            : `riddles-${solved}`

    let band = bands.get(key)
    if (!band) {
      band = {
        key,
        label:
          key === "treasure"
            ? "ΒΡΗΚΑΝ ΤΟΝ ΘΗΣΑΥΡΟ"
            : key === "compass"
              ? "ΕΦΤΑΣΑΝ ΣΤΗΝ ΠΥΞΙΔΑ"
              : key === "note"
                ? "ΕΦΤΑΣΑΝ ΣΤΟ ΠΡΩΤΟ ΣΗΜΕΙΩΜΑ"
                : `${solved} ΑΠΟ ${row.total} ΓΡΙΦΟΥΣ`,
        icon:
          key === "treasure"
            ? Gem
            : key === "compass"
              ? Compass
              : key === "note"
                ? ScrollText
                : MapPin,
        tone: key === "treasure" ? "gold" : key === "compass" ? "teal" : "plain",
        riddles: solved,
        total: row.total,
        showMilestones: key === "treasure" || key === "compass" || key === "note",
        compass: reachedCompass(row),
        treasure: row.stage === "treasure",
        rows: [],
      }
      bands.set(key, band)
    }
    band.rows.push(row)
  }

  return [...bands.values()]
}

/**
 * One achievement band: everyone inside it got exactly as far as everyone else.
 *
 * Because that is true by construction, the riddle count and the two milestone
 * ticks live on the HEADER and never repeat per row. Rows carry only a position
 * and a name, so a band of eight teams reads as one fact plus eight names rather
 * than eight identical-looking lines.
 */
function GroupPanel({ group, headline }: { group: StandingsGroup; headline: boolean }) {
  const Icon = group.icon
  const gold = group.tone === "gold"
  const teal = group.tone === "teal"

  // Teams per BAND, which says nothing about how many people are in any team.
  const n = group.rows.length
  const allTeams = group.rows.every((r) => r.kind === "team")
  const countWord = allTeams
    ? n === 1
      ? "ΟΜΑΔΑ"
      : "ΟΜΑΔΕΣ"
    : n === 1
      ? "ΣΥΜΜΕΤΟΧΗ"
      : "ΣΥΜΜΕΤΟΧΕΣ"

  return (
    <section
      className={`relative overflow-hidden rounded-sm border ${
        gold
          ? "border-brass/70 bg-brass/[0.07]"
          : teal
            ? "border-teal/50 bg-card/60"
            : "border-border bg-card/40"
      }`}
    >
      {/* The top band gets a warm wash so the eye lands there first. */}
      {headline && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brass)_22%,transparent),transparent_72%)]"
        />
      )}

      <div
        className={`relative border-b px-3 py-3 sm:px-4 ${gold ? "border-brass/30" : "border-border"}`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-sm border ${
              gold
                ? "border-brass/60 bg-brass/20 text-brass"
                : teal
                  ? "border-teal/50 bg-teal/15 text-teal"
                  : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
          </span>
          <h3
            className={`min-w-0 flex-1 font-sans text-[11px] font-bold tracking-chip ${
              gold ? "text-brass" : teal ? "text-teal" : "text-foreground"
            }`}
          >
            <Figures>{group.label}</Figures>
          </h3>
          <span className="shrink-0 rounded-sm border border-border bg-background/40 px-2 py-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
            <Figures>{`${n} ${countWord}`}</Figures>
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-[110px] flex-1">
            {/* Spelled out only for the finale bands, whose label names the
                milestone instead of the number. */}
            {group.showMilestones && (
              <span className="font-sans text-[11px] font-bold tabular-nums text-foreground">
                <Figures>{group.riddles}</Figures>
                <span className="text-muted-foreground">
                  /<Figures>{group.total}</Figures>
                </span>
                <span className="ml-1 font-normal text-[10px] text-muted-foreground">γρίφοι</span>
              </span>
            )}
            <div
              className={`h-1.5 overflow-hidden rounded-sm bg-muted/40 ${group.showMilestones ? "mt-1" : ""}`}
            >
              <div
                className={`h-full ${gold ? "bg-brass" : "bg-brass/55"}`}
                style={{
                  width: `${group.total > 0 ? (group.riddles / group.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          {group.showMilestones && (
            <div className="flex shrink-0 gap-1.5">
              <Milestone label="ΠΥΞΙΔΑ" icon={Compass} reached={group.compass} />
              <Milestone label="ΘΗΣΑΥΡΟΣ" icon={Gem} reached={group.treasure} />
            </div>
          )}
        </div>
      </div>

      <ul className="relative divide-y divide-border/60">
        {group.rows.map((row) => (
          <li key={`${row.kind}-${row.id}`} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <RankMark position={row.position} />
            <div className="min-w-0 flex-1">
              {/* No truncation: with only a rank beside it, a long team name has
                  room to wrap and be read in full. */}
              <p
                className={`text-pretty font-serif font-bold leading-tight text-foreground ${
                  headline ? "text-lg sm:text-xl" : "text-base"
                }`}
              >
                {row.name}
              </p>
              {row.kind === "player" && (
                <p className="font-sans text-[11px] italic text-muted-foreground/70">Χωρίς ομάδα</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
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
        <Figures>{value}</Figures>
      </p>
      <p className="mt-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

export function AdminStandingsView({ data }: { data: StandingsBoard }) {
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
  // Counted server-side, because the full player list is exactly the roster data
  // this board must not ship to the browser.
  const activePlayers = data.activePlayers
  const soloShown = useMemo(() => rows.filter((r) => r.kind === "player").length, [rows])

  // We take the top three DISTINCT positions and every row sharing them, so a
  // tie (teammates who all scanned the treasure) never silently drops a
  // co-winner into the list below. Capped so a pathological many-way tie cannot
  // blow up the layout.
  const podium = useMemo(() => {
    const top = [...new Set(rows.map((r) => r.position))].sort((a, b) => a - b).slice(0, 3)
    // Add one position-group at a time and stop before any group that would not
    // fit whole, so the podium never shows "3 of the 5 who tied".
    const out: StandingRow[] = []
    for (const pos of top) {
      const group = rows.filter((r) => r.position === pos)
      if (out.length > 0 && out.length + group.length > 6) break
      out.push(...group)
    }
    return out
  }, [rows])

  // The bands below deliberately keep EVERY row, including the medallists. The
  // podium is a spotlight, not a slice: lifting the top three out would have torn
  // two teams out of the compass band and left that band's count wrong.
  const groups = useMemo(() => groupRows(rows), [rows])

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
          <StatTile icon={ScrollText} value={data.endgameTeams} label="ΣΤΟ ΦΙΝΑΛΕ" />
          <StatTile icon={Gem} value={data.finishedTeams} label="ΟΛΟΚΛΗΡΩΣΑΝ" />
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
            ΚΑΤΑΤΑΞΗ ΚΑΤΑ ΕΠΙΤΕΥΓΜΑ
          </h2>
          <span className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
            <Figures>{`${rows.length} ΣΥΝΟΛΟ`}</Figures>
            {/* Only worth saying when a lone explorer is actually in the list. */}
            {soloShown > 0 && <Figures>{` · ${soloShown} ΧΩΡΙΣ ΟΜΑΔΑ`}</Figures>}
          </span>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
            Καμία καταχώρηση.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((group, i) => (
              // The warm wash and the larger names belong to whichever element is
              // carrying the spotlight, so they stay off the top band while the
              // podium is above it repeating those same names.
              <GroupPanel key={group.key} group={group} headline={i === 0 && podium.length === 0} />
            ))}
          </div>
        )}
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
