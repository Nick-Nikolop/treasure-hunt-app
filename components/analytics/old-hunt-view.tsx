import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Count, OldHuntAnalytics } from "@/lib/old-analytics"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"

const TZ = "Europe/Athens"
const dateFmt = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ })
const dateTimeFmt = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
})
const shortDay = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
const num = new Intl.NumberFormat("el-GR")

const fmt = (v: number) => num.format(v)
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "—")
const when = (v: string | null) => (v ? dateTimeFmt.format(new Date(v)) : "—")
const seconds = (s: number | null) => (s === null ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`)
const hours = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`)

const SOURCE_LABEL: Record<string, string> = {
  gps: "GPS",
  proof: "Photo proof",
  qr: "QR",
  admin: "Admin",
  skip: "Skip",
}

const SCAN_LABEL: Record<string, string> = {
  unlocked: "Unlocked the next lead",
  already: "Already unlocked",
  out_of_order: "Wrong order",
  trail_end_reached: "Reached the trail end",
  invalid: "Invalid QR",
  cooldown: "Hit the cooldown",
  compass_reached: "Reached the compass",
  held: "Held (waiting)",
}

const FINALE_LABEL: Record<string, string> = {
  note1: "Trail End note",
  note2: "Compass note",
  treasure: "Treasure",
}

const STAGE_LABEL: Record<string, string> = {
  none: "On the trail",
  trail_end: "Trail End",
  compass: "Compass",
  treasure: "Treasure",
}

const WEEKDAYS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]

function relabel(items: Count[], map: Record<string, string>): Count[] {
  return items.map((i) => ({ ...i, label: map[i.label] ?? i.label }))
}

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-serif text-2xl font-black text-foreground">
          {title}
        </h2>
        {description && (
          <p className="max-w-[70ch] text-pretty font-sans text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-sm border border-border bg-card/90 p-5", className)}>{children}</div>
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</span>
      <span className={cn("font-sans font-bold leading-none tabular-nums", strong ? "text-3xl text-brass" : "text-xl text-foreground")}>
        {value}
      </span>
      {hint && <span className="font-sans text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
      <div className="h-full rounded-full bg-brass" style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%` }} />
    </div>
  )
}

function TallyPanel({ title, items, empty = "Nothing recorded." }: { title: string; items: Count[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const total = items.reduce((a, i) => a + i.count, 0)
  return (
    <Panel className="flex min-w-0 flex-col gap-3">
      <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((i) => (
            <li key={i.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 font-sans text-sm">
                <span className="truncate text-foreground">{i.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmt(i.count)} <span className="text-xs">· {pct(i.count, total)}</span>
                </span>
              </div>
              <Meter value={i.count} max={max} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function DayBars({ title, values, days, closeIndex }: { title: string; values: number[]; days: string[]; closeIndex: number }) {
  const max = Math.max(1, ...values)
  const peak = values.indexOf(Math.max(...values))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{title}</h3>
        {peak >= 0 && values[peak] > 0 && (
          <span className="font-sans text-xs text-muted-foreground">
            Peak {fmt(values[peak])} on {shortDay.format(new Date(days[peak]))}
          </span>
        )}
      </div>
      <div className="flex h-24 items-end gap-px" role="img" aria-label={`${title} per day`}>
        {values.map((v, i) => (
          <div
            key={days[i]}
            className={cn("flex h-full flex-1 flex-col justify-end", i === closeIndex && "border-r border-dashed border-brass/70")}
            title={`${shortDay.format(new Date(days[i]))}: ${fmt(v)}`}
          >
            <div
              className={cn("w-full rounded-t-[1px]", v ? "bg-brass" : "bg-border")}
              style={{ height: v ? `${Math.max(4, (v / max) * 100)}%` : "1px" }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-sans text-[10px] tabular-nums text-muted-foreground">
        <span>{days[0] ? shortDay.format(new Date(days[0])) : ""}</span>
        <span>{days.length ? shortDay.format(new Date(days[days.length - 1])) : ""}</span>
      </div>
    </div>
  )
}

function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat())
  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-0.5">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center font-sans text-[10px] tabular-nums text-muted-foreground">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
        {grid.map((row, d) => (
          <div key={WEEKDAYS[d]} className="contents">
            <span className="flex items-center font-sans text-xs text-muted-foreground">{WEEKDAYS[d]}</span>
            {row.map((v, h) => (
              <div
                key={h}
                className="aspect-square rounded-[2px] bg-brass"
                style={{ opacity: v ? 0.12 + (v / max) * 0.88 : 0.05 }}
                title={`${WEEKDAYS[d]} ${String(h).padStart(2, "0")}:00 · ${fmt(v)} views`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="font-sans text-xs text-muted-foreground">Page views by weekday and hour, Athens time. Brighter = busier.</p>
    </div>
  )
}

const th = "px-3 py-2 font-bold"
const td = "px-3 py-2"

function Table({ head, children, minWidth = "min-w-[720px]" }: { head: ReactNode; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-card/90">
      <table className={cn("w-full font-sans text-sm", minWidth)}>
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function OldHuntView({ data }: { data: OldHuntAnalytics }) {
  const { totals, funnel, leads, campaigns, window } = data
  const days = data.days.map((d) => d.day)
  const closeDay = new Date(window.close).toISOString().slice(0, 10)
  const closeIndex = days.indexOf(closeDay)
  const maxLeadPlayers = Math.max(1, ...leads.map((l) => l.players))
  const top = data.standings.slice(0, 25)
  const rest = data.standings.slice(25)

  const actionsByCategory = new Map<string, Count[]>()
  for (const a of data.actions) {
    const list = actionsByCategory.get(a.category) ?? []
    list.push({ label: a.label, count: a.count })
    actionsByCategory.set(a.category, list)
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <AnalyticsHeader
        title="Hunt #1 archive"
        description={
          <>
            {"Everything the database recorded for the first hunt, from the first sign-up ("}
            {dateFmt.format(new Date(window.start))}
            {") to the close ("}
            {dateFmt.format(new Date(window.close))}
            {"). Admin accounts are left out of player numbers."}
          </>
        }
      />

      <Panel className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="PLAYERS" value={fmt(totals.players)} hint={`${fmt(totals.verified)} verified`} strong />
        <Stat label="TEAMS" value={fmt(totals.teams)} hint={`${fmt(totals.teamPlayers)} in teams · ${fmt(totals.soloPlayers)} solo`} />
        <Stat label="FINISHED TRAIL" value={fmt(totals.finishers)} hint={pct(totals.finishers, totals.players) + " of players"} />
        <Stat label="LEAD UNLOCKS" value={fmt(totals.leadUnlocks)} />
        <Stat label="PHOTO PROOFS" value={fmt(totals.proofs)} />
        <Stat label="DEVICES" value={fmt(totals.devices)} hint="unique browsers" />
        <Stat label="VISITS" value={fmt(totals.visits)} />
        <Stat label="PAGE VIEWS" value={fmt(totals.pageViews)} />
        <Stat label="LOGIN SESSIONS" value={fmt(totals.sessions)} />
        <Stat label="PRE-REGISTRATIONS" value={fmt(totals.preRegistrations)} hint={`${fmt(totals.events)} events total`} />
      </Panel>

      <Section id="old-days" title="Day by day" description="The dashed line marks the day the hunt closed.">
        <Panel className="flex flex-col gap-8">
          <DayBars title="DEVICES ON THE SITE" values={data.days.map((d) => d.devices)} days={days} closeIndex={closeIndex} />
          <DayBars title="PAGE VIEWS" values={data.days.map((d) => d.views)} days={days} closeIndex={closeIndex} />
          <DayBars title="NEW ACCOUNTS" values={data.days.map((d) => d.signups)} days={days} closeIndex={closeIndex} />
        </Panel>
      </Section>

      <Section
        id="old-funnel"
        title="From visit to treasure"
        description="How many made it to each step. The percentage is compared with the step before. Event tracking started on 07/07, so the first two steps undercount the early weeks."
      >
        <Panel className="flex flex-col gap-3">
          {funnel.map((step, i) => (
            <div key={step.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 sm:grid-cols-[14rem_1fr_7rem]">
              <span className="truncate font-sans text-sm text-foreground">{step.label}</span>
              <Meter value={step.count} max={funnel[0]?.count ?? 1} />
              <span className="text-right font-sans text-sm tabular-nums text-foreground">
                {fmt(step.count)}
                {i > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{pct(step.count, funnel[i - 1].count)}</span>}
              </span>
            </div>
          ))}
        </Panel>
      </Section>

      <Section
        id="old-trail"
        title="The trail, lead by lead"
        description="Players who reached each lead, how they unlocked it, journal opens, photo proofs and the median time from the previous lead."
      >
        <Table
          minWidth="min-w-[960px]"
          head={
            <tr>
              <th className={th}>#</th>
              <th className={th}>Lead</th>
              <th className={cn(th, "w-48")}>Players</th>
              <th className={th}>Unlocked by</th>
              <th className={cn(th, "text-right")}>Journal views</th>
              <th className={cn(th, "text-right")}>Proofs ✓ / ✗</th>
              <th className={cn(th, "text-right")}>Median time</th>
              <th className={th}>First there</th>
            </tr>
          }
        >
          {leads.map((l) => (
            <tr key={l.order} className="border-t border-border align-top">
              <td className={cn(td, "font-serif text-lg font-black text-brass")}>{l.order}</td>
              <td className={cn(td, "font-bold text-foreground")}>{l.country}</td>
              <td className={td}>
                <div className="flex flex-col gap-1">
                  <span className="tabular-nums text-foreground">
                    {fmt(l.players)}
                    <span className="ml-1.5 text-xs text-muted-foreground">{pct(l.players, totals.players)}</span>
                  </span>
                  <Meter value={l.players} max={maxLeadPlayers} />
                </div>
              </td>
              <td className={td}>
                {l.order === 1 ? (
                  <span className="text-xs text-muted-foreground">Starting lead</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(l.bySource)
                      .sort((a, b) => b[1] - a[1])
                      .map(([s, c]) => (
                        <span key={s} className="rounded-sm border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                          {SOURCE_LABEL[s] ?? s} <span className="tabular-nums text-foreground">{c}</span>
                        </span>
                      ))}
                  </div>
                )}
              </td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(l.journalViews)}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>
                {l.proofs.approved + l.proofs.rejected + l.proofs.pending === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  `${l.proofs.approved} / ${l.proofs.rejected}`
                )}
              </td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{hours(l.medianHours)}</td>
              <td className={td}>
                {l.firstName ? (
                  <span className="flex flex-col">
                    <span className="text-foreground">{l.firstName}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{when(l.firstAt)}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="old-standings" title="Final standings" description="Teams and solo players ranked the same way as the public standings page.">
        <Table
          head={
            <tr>
              <th className={th}>Pos</th>
              <th className={th}>Name</th>
              <th className={th}>Type</th>
              <th className={th}>Stage</th>
              <th className={cn(th, "text-right")}>Progress</th>
              <th className={th}>Standing on</th>
              <th className={cn(th, "text-right")}>Decided at</th>
            </tr>
          }
        >
          {top.map((r) => (
            <tr key={`${r.kind}-${r.id}`} className="border-t border-border">
              <td className={cn(td, "font-serif font-black tabular-nums text-brass")}>{r.position}</td>
              <td className={cn(td, "font-bold text-foreground")}>{r.name}</td>
              <td className={cn(td, "text-muted-foreground")}>{r.kind === "team" ? "Team" : "Solo"}</td>
              <td className={cn(td, r.stage === "treasure" ? "font-bold text-brass" : "text-foreground")}>{STAGE_LABEL[r.stage]}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{`${r.progress} / ${r.total}`}</td>
              <td className={cn(td, "text-muted-foreground")}>{r.country ?? "—"}</td>
              <td className={cn(td, "whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground")}>
                {r.decidedAt ? dateTimeFmt.format(new Date(r.decidedAt)) : "—"}
              </td>
            </tr>
          ))}
        </Table>
        {rest.length > 0 && (
          <details className="group rounded-sm border border-border bg-card/90">
            <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-foreground marker:hidden">
              {`Show the other ${rest.length}`}
            </summary>
            <ul className="grid gap-x-6 gap-y-1 border-t border-border px-4 py-3 font-sans text-sm sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-foreground">
                    <span className="mr-2 tabular-nums text-muted-foreground">{r.position}</span>
                    {r.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{`${r.progress}/${r.total}`}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section id="old-heat" title="When people played">
        <Panel>
          <Heatmap grid={data.heatmap} />
        </Panel>
      </Section>

      <Section
        id="old-campaigns"
        title="Campaign links"
        description="The old ?c= links, over their whole life (they kept counting after the close). Sign-ups and button clicks are credited to the link the visitor arrived from."
      >
        <Table
          head={
            <tr>
              <th className={th}>Link</th>
              <th className={cn(th, "text-right")}>Visits</th>
              <th className={cn(th, "text-right")}>Unique</th>
              <th className={cn(th, "text-right")}>Sign-ups</th>
              <th className={cn(th, "text-right")}>Button clicks</th>
              <th className={cn(th, "text-right")}>Active</th>
            </tr>
          }
        >
          {campaigns.map((c) => (
            <tr key={c.token} className="border-t border-border">
              <td className={td}>
                <span className="flex flex-col">
                  <span className="font-bold text-foreground">
                    {c.name}
                    {c.label && <span className="ml-2 text-xs font-normal text-muted-foreground">{c.label}</span>}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{c.token}</span>
                </span>
              </td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(c.visits)}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(c.unique)}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>
                {fmt(c.signups)}
                {c.unique > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{pct(c.signups, c.unique)}</span>}
              </td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(c.ctaClicks)}</td>
              <td className={cn(td, "whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground")}>
                {c.firstAt ? `${shortDay.format(new Date(c.firstAt))} → ${shortDay.format(new Date(c.lastAt ?? c.firstAt))}` : "—"}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="old-gameplay" title="Gameplay">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TallyPanel title="QR SCAN RESULTS" items={relabel(data.scans.results, SCAN_LABEL)} />
          <Panel className="flex flex-col gap-4">
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">GPS CHECK ON SCAN</h3>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="IN RANGE" value={fmt(data.scans.gpsOk)} hint={pct(data.scans.gpsOk, data.scans.gpsOk + data.scans.gpsFail)} />
              <Stat label="TOO FAR" value={fmt(data.scans.gpsFail)} hint={data.scans.failAvgDistanceM === null ? undefined : `avg ${fmt(data.scans.failAvgDistanceM)} m away`} />
            </div>
          </Panel>
          <Panel className="flex flex-col gap-4">
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">PHOTO PROOFS</h3>
            <Stat
              label="MEDIAN REVIEW TIME"
              value={data.proofs.medianDecisionMinutes === null ? "—" : `${data.proofs.medianDecisionMinutes} min`}
              hint="from upload to decision"
            />
          </Panel>
          <TallyPanel title="PROOF OUTCOMES (STATUS · WHY)" items={data.proofs.byOutcome} />
          <TallyPanel title="PROOFS REVIEWED BY" items={data.proofs.reviewers} />
          <TallyPanel title="TEAM SIZES" items={data.teamSizes} />
          <TallyPanel title="ENDGAME REACHED" items={relabel(data.finale, FINALE_LABEL)} />
        </div>
      </Section>

      <Section id="old-audience" title="Audience">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TallyPanel title="DEVICE" items={data.audience.devices} />
          <TallyPanel title="OPERATING SYSTEM" items={data.audience.os} />
          <TallyPanel title="BROWSER" items={data.audience.browsers} />
          <TallyPanel title="AGE (FROM YEAR OF BIRTH)" items={data.audience.ages} />
          <TallyPanel title="LANGUAGE SWITCHES" items={data.audience.languages} />
          <TallyPanel title="SETTINGS USED" items={data.audience.settings} />
          <TallyPanel title="LOGIN / SIGN-UP ERRORS" items={data.audience.loginErrors} />
          <TallyPanel title="BUTTON CLICKS (BUTTON · PLACE)" items={data.audience.cta} />
        </div>
      </Section>

      <Section id="old-pages" title="Top pages" description="Average time is how long the page stayed open (between 1 second and 1 hour).">
        <Table
          minWidth="min-w-[560px]"
          head={
            <tr>
              <th className={th}>Page</th>
              <th className={cn(th, "text-right")}>Views</th>
              <th className={cn(th, "text-right")}>Devices</th>
              <th className={cn(th, "text-right")}>Avg time</th>
            </tr>
          }
        >
          {data.pages.map((p) => (
            <tr key={p.path} className="border-t border-border">
              <td className={cn(td, "font-mono text-xs text-foreground")}>{p.path}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(p.views)}</td>
              <td className={cn(td, "text-right tabular-nums text-foreground")}>{fmt(p.devices)}</td>
              <td className={cn(td, "text-right tabular-nums text-muted-foreground")}>{seconds(p.avgSeconds)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="old-log" title="Activity log" description="Every logged action of the hunt, grouped by area.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...actionsByCategory.entries()].map(([category, items]) => (
            <TallyPanel key={category} title={category.toUpperCase()} items={items} />
          ))}
        </div>
      </Section>
    </main>
  )
}
