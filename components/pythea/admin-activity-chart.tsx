"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CalendarRange, RefreshCw, TrendingUp, UserCheck, Users, Zap } from "lucide-react"
import { adminGetActivitySeries } from "@/app/admin/actions"
import type { ActivitySeries } from "@/lib/analytics"
import { cn } from "@/lib/utils"

/** The range presets. `points` is how many buckets of `granularity` to fetch. */
const RANGES = [
  { id: "24h", label: "24h", granularity: "hour" as const, points: 24 },
  { id: "72h", label: "72h", granularity: "hour" as const, points: 72 },
  { id: "14d", label: "14d", granularity: "day" as const, points: 14 },
  { id: "30d", label: "30d", granularity: "day" as const, points: 30 },
]

const chartConfig: ChartConfig = {
  users: { label: "Signed-in users", color: "var(--color-brass, oklch(0.62 0.14 70))" },
  anon: { label: "Signed out", color: "oklch(0.5 0.07 200)" },
  events: { label: "Events", color: "oklch(0.55 0.09 40)" },
}

/** Axis tick: hourly buckets show the clock, daily buckets show the date. */
function fmtTick(iso: string, granularity: "hour" | "day") {
  const d = new Date(iso)
  return granularity === "hour"
    ? d.toLocaleTimeString(undefined, { hour: "numeric" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Tooltip heading: the full bucket, since the axis is abbreviated. */
function fmtFull(iso: string, granularity: "hour" | "day") {
  const d = new Date(iso)
  return granularity === "hour"
    ? d.toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

/**
 * "How many users were active" over time, for the Users tab.
 *
 * Two deliberate choices:
 *
 * - The FINAL bucket is always partial (the current hour or day is still being
 *   filled), so it is drawn as a dashed boundary and excluded from the peak and
 *   the average. Without that, today's half-finished count reads as a cliff next
 *   to yesterday's full one and looks like a crash in activity.
 * - Signed-in users and signed-out devices are separate series. They measure
 *   different things and the signed-out count dwarfs the other, so stacking them
 *   would bury the number an admin actually cares about.
 */
export function AdminActivityChart({ initial }: { initial: ActivitySeries }) {
  const [rangeId, setRangeId] = useState("24h")
  const [series, setSeries] = useState(initial)
  const [mode, setMode] = useState<"area" | "bars">("area")
  const [showAnon, setShowAnon] = useState(true)
  const [pending, startTransition] = useTransition()

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[0]

  function load(id: string) {
    const r = RANGES.find((x) => x.id === id) ?? RANGES[0]
    setRangeId(id)
    startTransition(async () => {
      setSeries(await adminGetActivitySeries(r.granularity, r.points))
    })
  }

  const { rows, stats } = useMemo(() => {
    const b = series.buckets
    const rows = b.map((x, i) => ({ ...x, partial: i === b.length - 1 }))
    // Stats ignore the still-filling last bucket so they describe complete
    // periods only.
    const settled = rows.filter((r) => !r.partial)
    const peak = settled.reduce((m, r) => (r.users > m.users ? r : m), {
      users: -1,
      bucket: "",
    } as (typeof settled)[number])
    const avg =
      settled.length > 0 ? settled.reduce((s, r) => s + r.users, 0) / settled.length : 0

    // Per-CALENDAR-DAY figures, from the server's own daily aggregation. Today is
    // dropped for the same reason as above: it is still filling.
    const settledDays = series.daily.slice(0, -1)
    const dayPeak = settledDays.reduce<(typeof settledDays)[number] | null>(
      (best, d) => (d.users > (best?.users ?? -1) ? d : best),
      null,
    )
    const dayAvg =
      settledDays.length > 0
        ? settledDays.reduce((s, d) => s + d.users, 0) / settledDays.length
        : 0

    return {
      rows,
      stats: {
        peak: peak.users >= 0 ? peak : null,
        avg,
        dayPeak: dayPeak && dayPeak.users > 0 ? dayPeak : null,
        dayAvg,
        dayCount: settledDays.length,
        totalEvents: rows.reduce((s, r) => s + r.events, 0),
        current: rows.at(-1) ?? null,
      },
    }
  }, [series])

  const hasAny = rows.some((r) => r.users > 0 || r.anon > 0 || r.events > 0)

  return (
    <section className="rounded-sm border border-border bg-card/40">
      {/* Header: title, range presets, chart controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-sm bg-brass/15 text-brass">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-chip text-foreground">
              Active users over time
            </h3>
            <p className="font-sans text-[10px] text-muted-foreground/70">
              Distinct people per {series.granularity}, not a running total
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-sm border border-border bg-background p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => load(r.id)}
                disabled={pending}
                aria-pressed={rangeId === r.id}
                className={`rounded-[3px] px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-chip transition-colors disabled:opacity-50 ${
                  rangeId === r.id
                    ? "bg-brass text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-sm border border-border bg-background p-0.5">
            {(["area", "bars"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-[3px] px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-chip transition-colors ${
                  mode === m
                    ? "bg-brass text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => load(rangeId)}
            disabled={pending}
            title="Reload this range"
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${pending ? "animate-spin" : ""}`} />
            Reload
          </button>
        </div>
      </div>

      {/*
        Summary tiles. Per-day peak and average always show; the per-hour pair is
        added only on hourly ranges, since on a daily range it would render the
        same two numbers twice.
      */}
      <div
        className={cn(
          "grid grid-cols-2 gap-px border-b border-border/60 bg-border/40",
          series.granularity === "hour" ? "sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-4",
        )}
      >
        <Tile
          icon={UserCheck}
          label="Unique users"
          value={series.uniqueUsers}
          hint={`across the last ${range.label}`}
        />
        {series.granularity === "hour" && (
          <>
            <Tile
              icon={Users}
              label="Peak / hour"
              value={stats.peak?.users ?? 0}
              hint={stats.peak ? fmtFull(stats.peak.bucket, "hour") : "no activity"}
            />
            <Tile
              icon={TrendingUp}
              label="Avg / hour"
              value={stats.avg < 10 ? Number(stats.avg.toFixed(1)) : Math.round(stats.avg)}
              hint="complete hours only"
            />
          </>
        )}
        <Tile
          icon={CalendarRange}
          label="Peak / day"
          value={stats.dayPeak?.users ?? 0}
          hint={stats.dayPeak ? fmtFull(stats.dayPeak.bucket, "day") : "no activity"}
        />
        <Tile
          icon={TrendingUp}
          label="Avg / day"
          value={stats.dayAvg < 10 ? Number(stats.dayAvg.toFixed(1)) : Math.round(stats.dayAvg)}
          hint={
            stats.dayCount > 0
              ? `over ${stats.dayCount} full ${stats.dayCount === 1 ? "day" : "days"}`
              : "no full day yet"
          }
        />
        <Tile
          icon={Zap}
          label="Events"
          value={stats.totalEvents}
          hint="total actions recorded"
        />
      </div>

      {/* Chart */}
      <div className="p-4">
        {!hasAny ? (
          <p className="py-10 text-center font-sans text-sm text-muted-foreground">
            No activity recorded in this range yet.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={`h-[280px] w-full transition-opacity ${pending ? "opacity-50" : ""}`}
          >
            {mode === "area" ? (
              <AreaChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillActiveUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillActiveAnon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-anon)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--color-anon)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.15} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(v) => fmtTick(String(v), series.granularity)}
                  className="font-sans text-[10px]"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                  className="font-sans text-[10px]"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => fmtFull(String(v), series.granularity)}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {/* The last bucket is still filling; mark where it starts. */}
                {rows.length > 1 && (
                  <ReferenceLine
                    x={rows[rows.length - 1].bucket}
                    stroke="var(--color-muted-foreground, #888)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                )}
                {showAnon && (
                  <Area
                    dataKey="anon"
                    type="monotone"
                    fill="url(#fillActiveAnon)"
                    stroke="var(--color-anon)"
                    strokeWidth={2}
                  />
                )}
                <Area
                  dataKey="users"
                  type="monotone"
                  fill="url(#fillActiveUsers)"
                  stroke="var(--color-users)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            ) : (
              <BarChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.15} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(v) => fmtTick(String(v), series.granularity)}
                  className="font-sans text-[10px]"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                  className="font-sans text-[10px]"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => fmtFull(String(v), series.granularity)}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {showAnon && (
                  <Bar dataKey="anon" fill="var(--color-anon)" radius={[2, 2, 0, 0]} />
                )}
                <Bar dataKey="users" fill="var(--color-users)" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ChartContainer>
        )}

        {/* Footnotes + the signed-out toggle */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
          <label className="flex cursor-pointer items-center gap-2 font-sans text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showAnon}
              onChange={(e) => setShowAnon(e.target.checked)}
              className="size-3.5 accent-brass"
            />
            Include signed-out devices
          </label>
          <p className="font-sans text-[10px] leading-snug text-muted-foreground/60">
            The last {series.granularity} is still in progress (dashed), so it is left out of the
            peak and average.
          </p>
        </div>
      </div>
    </section>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="bg-card/60 px-4 py-3">
      <div className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-chip text-muted-foreground/70">
        <Icon className="size-3 text-brass" />
        {label}
      </div>
      <p className="mt-1 font-serif text-2xl font-black leading-none text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 truncate font-sans text-[10px] text-muted-foreground/60" title={hint}>
        {hint}
      </p>
    </div>
  )
}
