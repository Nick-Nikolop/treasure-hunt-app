// ─────────────────────────────────────────────────────────────────────────
//  Behavioural analytics.
//
//  This is the high-volume, front-end behaviour stream: page views, CTA/button
//  clicks, funnel steps, and timing (how long login/registration took). It is
//  deliberately separate from `lib/activity.ts` (a curated audit trail of
//  business events). Events arrive in batches from the client at POST /api/track
//  and are written here; the admin Analytics tab reads the aggregates below.
//
//  Writing is best-effort and must NEVER throw to the caller (it can't break a
//  page or an auth flow). All inserts swallow errors with a console warning.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { analyticsEvent } from "@/lib/db/schema"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { EV } from "@/lib/analytics-events"

export { EV } from "@/lib/analytics-events"
export type { EventName } from "@/lib/analytics-events"

/** One event as sent by the client. Only `name` is required. */
export type IncomingEvent = {
  name: string
  category?: string
  path?: string
  referrer?: string
  device?: string
  browser?: string
  os?: string
  sessionId?: string
  anonId?: string
  durationMs?: number
  props?: Record<string, unknown>
}

/** Server-resolved context shared by every event in a batch. */
export type IngestContext = {
  /** Signed-in user id, resolved server-side from the session (never trusted from client). */
  userId: string | null
  /** Request User-Agent, used as a fallback when the client omits device info. */
  userAgent: string | null
}

const MAX_BATCH = 50
const STR = (v: unknown, max = 512): string | null =>
  typeof v === "string" && v.length ? v.slice(0, max) : null

/** Derive a coarse device class from a UA string. */
function deviceClass(ua: string | null): string {
  if (!ua) return "unknown"
  const s = ua.toLowerCase()
  if (s.includes("ipad") || (s.includes("tablet") && !s.includes("mobile"))) return "tablet"
  if (s.includes("mobi") || s.includes("iphone") || s.includes("android")) return "mobile"
  return "desktop"
}

/** Best-effort browser family from a UA string. */
function browserFromUA(ua: string | null): string {
  if (!ua) return "Unknown"
  const s = ua.toLowerCase()
  if (s.includes("edg/")) return "Edge"
  if (s.includes("opr/") || s.includes("opera")) return "Opera"
  if (s.includes("chrome") && !s.includes("chromium")) return "Chrome"
  if (s.includes("firefox")) return "Firefox"
  if (s.includes("safari")) return "Safari"
  return "Other"
}

/** Best-effort OS family from a UA string. */
function osFromUA(ua: string | null): string {
  if (!ua) return "Unknown"
  const s = ua.toLowerCase()
  if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) return "iOS"
  if (s.includes("android")) return "Android"
  if (s.includes("windows")) return "Windows"
  if (s.includes("mac os") || s.includes("macintosh")) return "macOS"
  if (s.includes("linux")) return "Linux"
  return "Other"
}

/**
 * Persist a batch of events. Best-effort: returns the number written and never
 * throws. The signed-in `userId` and UA fallbacks come from `ctx`.
 */
export async function recordEvents(
  events: IncomingEvent[],
  ctx: IngestContext,
): Promise<number> {
  if (!Array.isArray(events) || events.length === 0) return 0
  const batch = events.slice(0, MAX_BATCH)

  const rows = batch
    .filter((e) => e && typeof e.name === "string" && e.name.length > 0)
    .map((e) => {
      const device = STR(e.device, 24) ?? deviceClass(ctx.userAgent)
      const browser = STR(e.browser, 32) ?? browserFromUA(ctx.userAgent)
      const os = STR(e.os, 32) ?? osFromUA(ctx.userAgent)
      const duration =
        typeof e.durationMs === "number" && Number.isFinite(e.durationMs) && e.durationMs >= 0
          ? Math.min(Math.round(e.durationMs), 1000 * 60 * 60 * 6) // cap at 6h
          : null
      let props: Record<string, unknown> | null = null
      if (e.props && typeof e.props === "object") {
        try {
          const json = JSON.stringify(e.props)
          if (json.length <= 4000) props = e.props
        } catch {
          props = null
        }
      }
      return {
        id: randomUUID(),
        name: e.name.slice(0, 120),
        category: STR(e.category, 32) ?? "general",
        userId: ctx.userId,
        anonId: STR(e.anonId, 64),
        sessionId: STR(e.sessionId, 64),
        path: STR(e.path, 256),
        referrer: STR(e.referrer, 512),
        device,
        browser,
        os,
        durationMs: duration,
        props,
        createdAt: new Date(),
      }
    })

  if (rows.length === 0) return 0
  try {
    await db.insert(analyticsEvent).values(rows)
    return rows.length
  } catch (err) {
    console.log("[v0] analytics insert failed:", (err as Error)?.message)
    return 0
  }
}

// ── Aggregate queries (admin dashboard) ─────────────────────────────────────

const sinceDate = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

export type AnalyticsOverview = {
  totalEvents: number
  pageViews: number
  uniqueVisitors: number
  signedInActive: number
  sessions: number
}

/** Headline counters for the last `days`. */
export async function getOverview(days = 14): Promise<AnalyticsOverview> {
  const since = sinceDate(days)
  const rows = await db
    .select({
      totalEvents: sql<number>`count(*)::int`,
      pageViews: sql<number>`count(*) filter (where ${analyticsEvent.name} = ${EV.pageView})::int`,
      uniqueVisitors: sql<number>`count(distinct ${analyticsEvent.anonId})::int`,
      signedInActive: sql<number>`count(distinct ${analyticsEvent.userId})::int`,
      sessions: sql<number>`count(distinct ${analyticsEvent.sessionId})::int`,
    })
    .from(analyticsEvent)
    .where(gte(analyticsEvent.createdAt, since))
  const r = rows[0]
  return {
    totalEvents: r?.totalEvents ?? 0,
    pageViews: r?.pageViews ?? 0,
    uniqueVisitors: r?.uniqueVisitors ?? 0,
    signedInActive: r?.signedInActive ?? 0,
    sessions: r?.sessions ?? 0,
  }
}

export type DayPoint = { date: string; events: number; pageViews: number; visitors: number }

/** Per-day series (oldest first) covering the last `days`. */
export async function getTimeline(days = 14): Promise<DayPoint[]> {
  const since = sinceDate(days - 1)
  since.setHours(0, 0, 0, 0)
  const series = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${analyticsEvent.createdAt}), 'YYYY-MM-DD')`,
      events: sql<number>`count(*)::int`,
      pageViews: sql<number>`count(*) filter (where ${analyticsEvent.name} = ${EV.pageView})::int`,
      visitors: sql<number>`count(distinct ${analyticsEvent.anonId})::int`,
    })
    .from(analyticsEvent)
    .where(gte(analyticsEvent.createdAt, since))
    .groupBy(sql`date_trunc('day', ${analyticsEvent.createdAt})`)

  const byDay = new Map(series.map((r) => [r.day, r]))
  const out: DayPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const hit = byDay.get(key)
    out.push({
      date: key,
      events: hit?.events ?? 0,
      pageViews: hit?.pageViews ?? 0,
      visitors: hit?.visitors ?? 0,
    })
  }
  return out
}

export type LabelCount = { label: string; count: number }

/** Top event names by volume in the window. */
export async function getTopEvents(days = 14, limit = 12): Promise<LabelCount[]> {
  const rows = await db
    .select({ label: analyticsEvent.name, count: sql<number>`count(*)::int` })
    .from(analyticsEvent)
    .where(gte(analyticsEvent.createdAt, sinceDate(days)))
    .groupBy(analyticsEvent.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
  return rows.map((r) => ({ label: r.label, count: r.count }))
}

/** Most-viewed paths in the window (page.view events only). */
export async function getTopPages(days = 14, limit = 12): Promise<LabelCount[]> {
  const rows = await db
    .select({ label: analyticsEvent.path, count: sql<number>`count(*)::int` })
    .from(analyticsEvent)
    .where(and(gte(analyticsEvent.createdAt, sinceDate(days)), eq(analyticsEvent.name, EV.pageView)))
    .groupBy(analyticsEvent.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
  return rows.map((r) => ({ label: r.label ?? "(unknown)", count: r.count }))
}

/** Device-class split of events in the window. */
export async function getDeviceBreakdown(days = 14): Promise<LabelCount[]> {
  const rows = await db
    .select({ label: analyticsEvent.device, count: sql<number>`count(*)::int` })
    .from(analyticsEvent)
    .where(gte(analyticsEvent.createdAt, sinceDate(days)))
    .groupBy(analyticsEvent.device)
    .orderBy(desc(sql`count(*)`))
  return rows.map((r) => ({ label: r.label ?? "unknown", count: r.count }))
}

/** Browser split of events in the window. */
export async function getBrowserBreakdown(days = 14): Promise<LabelCount[]> {
  const rows = await db
    .select({ label: analyticsEvent.browser, count: sql<number>`count(*)::int` })
    .from(analyticsEvent)
    .where(gte(analyticsEvent.createdAt, sinceDate(days)))
    .groupBy(analyticsEvent.browser)
    .orderBy(desc(sql`count(*)`))
  return rows.map((r) => ({ label: r.label ?? "Unknown", count: r.count }))
}

/** Count of a specific event name in the window (funnel building block). */
async function countEvent(name: string, days: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvent)
    .where(and(gte(analyticsEvent.createdAt, sinceDate(days)), eq(analyticsEvent.name, name)))
  return rows[0]?.count ?? 0
}

/** Median + average durationMs for a timing event in the window. */
async function timingFor(name: string, days: number): Promise<{ avgMs: number; medianMs: number; n: number }> {
  const rows = await db
    .select({
      avg: sql<number>`coalesce(avg(${analyticsEvent.durationMs}), 0)::int`,
      median: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${analyticsEvent.durationMs}), 0)::int`,
      n: sql<number>`count(${analyticsEvent.durationMs})::int`,
    })
    .from(analyticsEvent)
    .where(and(gte(analyticsEvent.createdAt, sinceDate(days)), eq(analyticsEvent.name, name)))
  const r = rows[0]
  return { avgMs: r?.avg ?? 0, medianMs: r?.median ?? 0, n: r?.n ?? 0 }
}

export type AuthFunnel = {
  registerSubmit: number
  registerSuccess: number
  registerError: number
  loginSubmit: number
  loginSuccess: number
  loginError: number
  verifyOpen: number
  resetComplete: number
  loginTiming: { avgMs: number; medianMs: number; n: number }
  registerTiming: { avgMs: number; medianMs: number; n: number }
}

/** The auth funnel counts + login/registration timing for the window. */
export async function getAuthFunnel(days = 14): Promise<AuthFunnel> {
  const [
    registerSubmit,
    registerSuccess,
    registerError,
    loginSubmit,
    loginSuccess,
    loginError,
    verifyOpen,
    resetComplete,
    loginTiming,
    registerTiming,
  ] = await Promise.all([
    countEvent(EV.registerSubmit, days),
    countEvent(EV.registerSuccess, days),
    countEvent(EV.registerError, days),
    countEvent(EV.loginSubmit, days),
    countEvent(EV.loginSuccess, days),
    countEvent(EV.loginError, days),
    countEvent(EV.verifyOpen, days),
    countEvent(EV.resetComplete, days),
    timingFor(EV.loginSuccess, days),
    timingFor(EV.registerSuccess, days),
  ])
  return {
    registerSubmit,
    registerSuccess,
    registerError,
    loginSubmit,
    loginSuccess,
    loginError,
    verifyOpen,
    resetComplete,
    loginTiming,
    registerTiming,
  }
}

/** Scan-result outcomes split by status (props.status) in the window. */
export async function getScanBreakdown(days = 14): Promise<LabelCount[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${analyticsEvent.props} ->> 'status', 'unknown')`,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvent)
    .where(and(gte(analyticsEvent.createdAt, sinceDate(days)), eq(analyticsEvent.name, EV.scanResult)))
    .groupBy(sql`coalesce(${analyticsEvent.props} ->> 'status', 'unknown')`)
    .orderBy(desc(sql`count(*)`))
  return rows.map((r) => ({ label: r.label, count: r.count }))
}

export type RecentEvent = {
  id: string
  name: string
  category: string
  path: string | null
  device: string | null
  userId: string | null
  createdAt: Date
  props: Record<string, unknown> | null
}

/** The most recent raw events, for the live feed at the bottom of the tab. */
export async function getRecentEvents(limit = 40): Promise<RecentEvent[]> {
  const rows = await db
    .select()
    .from(analyticsEvent)
    .orderBy(desc(analyticsEvent.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    path: r.path,
    device: r.device,
    userId: r.userId,
    createdAt: r.createdAt,
    props: r.props,
  }))
}

export type AnalyticsSnapshot = {
  days: number
  overview: AnalyticsOverview
  timeline: DayPoint[]
  topEvents: LabelCount[]
  topPages: LabelCount[]
  devices: LabelCount[]
  browsers: LabelCount[]
  auth: AuthFunnel
  scan: LabelCount[]
  recent: RecentEvent[]
}

/** One call that assembles everything the Analytics dashboard tab renders. */
export async function getAnalyticsSnapshot(days = 14): Promise<AnalyticsSnapshot> {
  const [overview, timeline, topEvents, topPages, devices, browsers, auth, scan, recent] =
    await Promise.all([
      getOverview(days),
      getTimeline(days),
      getTopEvents(days),
      getTopPages(days),
      getDeviceBreakdown(days),
      getBrowserBreakdown(days),
      getAuthFunnel(days),
      getScanBreakdown(days),
      getRecentEvents(40),
    ])
  return { days, overview, timeline, topEvents, topPages, devices, browsers, auth, scan, recent }
}
