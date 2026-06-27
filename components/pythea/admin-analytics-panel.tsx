"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  Activity,
  Eye,
  Users,
  UserCheck,
  MousePointerClick,
  Timer,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { adminGetAnalytics } from "@/app/admin/actions"
import type { AnalyticsSnapshot, LabelCount } from "@/lib/analytics"

// Lookback windows offered in the header.
const WINDOWS = [7, 14, 30, 90] as const

const chartConfig: ChartConfig = {
  events: { label: "Events", color: "var(--color-brass, oklch(0.62 0.14 70))" },
  pageViews: { label: "Page views", color: "oklch(0.5 0.07 200)" },
  visitors: { label: "Visitors", color: "oklch(0.45 0.1 40)" },
}

/** Format a millisecond duration as a compact human string (e.g. 4.2s, 1m 03s). */
function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return "—"
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = Math.round(s % 60)
  return `${m}m ${String(rem).padStart(2, "0")}s`
}

/** Short weekday + day label for the x-axis (e.g. "Mon 14"). */
function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
}

/**
 * The Analytics tab: behavioural analytics for the whole app. Loads a snapshot
 * from the server (counters, timeline, breakdowns, the auth funnel with timing,
 * and scan outcomes) for a chosen lookback window, and renders it.
 */
export function AdminAnalyticsPanel({ initial }: { initial: AnalyticsSnapshot }) {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(initial)
  const [days, setDays] = useState<number>(initial.days)
  const [pending, startTransition] = useTransition()

  function load(nextDays: number) {
    setDays(nextDays)
    startTransition(async () => {
      const next = await adminGetAnalytics(nextDays)
      setSnapshot(next)
    })
  }

  const { overview, timeline, topEvents, topPages, devices, browsers, auth, scan } = snapshot

  return (
    <div className="flex flex-col gap-6">
      {/* Window selector + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-sm border border-border p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => load(w)}
              disabled={pending}
              className={`rounded-sm px-3 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors disabled:opacity-50 ${
                days === w
                  ? "bg-brass text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w}D
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => load(days)}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Headline counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric icon={Activity} label="Events" value={overview.totalEvents} />
        <Metric icon={Eye} label="Page views" value={overview.pageViews} />
        <Metric icon={Users} label="Visitors" value={overview.uniqueVisitors} />
        <Metric icon={UserCheck} label="Signed-in" value={overview.signedInActive} />
        <Metric icon={MousePointerClick} label="Sessions" value={overview.sessions} />
      </div>

      {/* Timeline */}
      <Card title="Activity over time">
        {timeline.length === 0 ? (
          <Empty>No events recorded in this window yet.</Empty>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={timeline} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-events)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-events)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-pageViews)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-pageViews)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={fmtDay}
                className="font-sans text-[10px]"
              />
              <YAxis tickLine={false} axisLine={false} width={28} className="font-sans text-[10px]" />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={(v) => fmtDay(String(v))} />}
              />
              <Area
                dataKey="events"
                type="monotone"
                fill="url(#fillEvents)"
                stroke="var(--color-events)"
                strokeWidth={2}
              />
              <Area
                dataKey="pageViews"
                type="monotone"
                fill="url(#fillViews)"
                stroke="var(--color-pageViews)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </Card>

      {/* Auth funnel + timing */}
      <Card title="Auth funnel">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <FunnelRow label="Sign-up submitted" value={auth.registerSubmit} max={auth.registerSubmit} />
            <FunnelRow label="Sign-up success" value={auth.registerSuccess} max={auth.registerSubmit} />
            <FunnelRow label="Verify screen shown" value={auth.verifyOpen} max={auth.registerSubmit} />
            <FunnelRow label="Sign-up errors" value={auth.registerError} max={auth.registerSubmit} tone="warn" />
            <div className="h-px bg-border" />
            <FunnelRow label="Login submitted" value={auth.loginSubmit} max={auth.loginSubmit} />
            <FunnelRow label="Login success" value={auth.loginSuccess} max={auth.loginSubmit} />
            <FunnelRow label="Login errors" value={auth.loginError} max={auth.loginSubmit} tone="warn" />
            <FunnelRow label="Password resets done" value={auth.resetComplete} max={auth.loginSubmit} />
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            <TimingCard
              label="Login time"
              median={auth.loginTiming.medianMs}
              avg={auth.loginTiming.avgMs}
              n={auth.loginTiming.n}
            />
            <TimingCard
              label="Sign-up time"
              median={auth.registerTiming.medianMs}
              avg={auth.registerTiming.avgMs}
              n={auth.registerTiming.n}
            />
          </div>
        </div>
      </Card>

      {/* Two-column breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top events">
          <BarList items={topEvents} empty="No events yet." />
        </Card>
        <Card title="Top pages">
          <BarList items={topPages} empty="No page views yet." />
        </Card>
        <Card title="Scan outcomes">
          <BarList items={scan} empty="No QR scans yet." />
        </Card>
        <Card title="Devices & browsers">
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                Devices
              </p>
              <div className="flex flex-wrap gap-2">
                {devices.length === 0 ? (
                  <Empty>No data.</Empty>
                ) : (
                  devices.map((d) => <DeviceChip key={d.label} item={d} />)
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                Browsers
              </p>
              <BarList items={browsers} empty="No data." compact />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ── Building blocks ──────────────────────────────────────────────────────── */

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 text-brass" />
        <span className="font-sans text-[10px] font-bold uppercase tracking-chip">{label}</span>
      </div>
      <p className="mt-2 font-serif text-2xl font-black text-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card/40 p-5">
      <h3 className="mb-4 font-sans text-xs font-bold uppercase tracking-chip text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-muted-foreground">{children}</p>
}

function BarList({
  items,
  empty,
  compact = false,
}: {
  items: LabelCount[]
  empty: string
  compact?: boolean
}) {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.count)), [items])
  if (items.length === 0) return <Empty>{empty}</Empty>
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span
              className={`truncate font-sans ${compact ? "text-xs" : "text-sm"} text-foreground`}
              title={item.label}
            >
              {item.label}
            </span>
            <span className="shrink-0 font-sans text-xs font-bold tabular-nums text-muted-foreground">
              {item.count.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-brass"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function FunnelRow({
  label,
  value,
  max,
  tone = "normal",
}: {
  label: string
  value: number
  max: number
  tone?: "normal" | "warn"
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-sm text-foreground">{label}</span>
        <span className="shrink-0 font-sans text-xs font-bold tabular-nums text-muted-foreground">
          {value.toLocaleString()}
          {max > 0 && value !== max ? ` · ${pct}%` : ""}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
        <div
          className={`h-full rounded-full ${tone === "warn" ? "bg-destructive" : "bg-brass"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function TimingCard({
  label,
  median,
  avg,
  n,
}: {
  label: string
  median: number
  avg: number
  n: number
}) {
  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Timer className="size-3.5 text-brass" />
        <span className="font-sans text-[10px] font-bold uppercase tracking-chip">{label}</span>
      </div>
      <p className="mt-2 font-serif text-2xl font-black text-foreground">{fmtDuration(median)}</p>
      <p className="mt-1 font-sans text-[11px] text-muted-foreground">
        median · avg {fmtDuration(avg)} · n={n}
      </p>
    </div>
  )
}

function DeviceChip({ item }: { item: LabelCount }) {
  const Icon =
    item.label === "mobile" ? Smartphone : item.label === "tablet" ? Tablet : Monitor
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5">
      <Icon className="size-3.5 text-brass" />
      <span className="font-sans text-xs font-semibold capitalize text-foreground">{item.label}</span>
      <span className="font-sans text-xs font-bold tabular-nums text-muted-foreground">
        {item.count.toLocaleString()}
      </span>
    </span>
  )
}
