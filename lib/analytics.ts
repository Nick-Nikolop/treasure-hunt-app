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

// ── Presence: who is online right now ──────────────────────────────────────
//
// There is no websocket and no heartbeat ping, so "online" is derived from the
// behaviour stream: a user counts as online if ANY event of theirs landed in the
// last `ONLINE_WINDOW_MIN` minutes. The client emits page.view on every
// navigation, page.leave on unload, plus interaction events, which is dense
// enough to be a good proxy.
//
// The honest caveat: someone who opens a lead page and reads it for ten minutes
// without touching anything emits nothing in that time, so they drop to "idle"
// even though the tab is open. That is why the middle band exists rather than a
// hard online/offline flag. `session.updatedAt` is deliberately NOT used - Better
// Auth only refreshes it about once a day, so it cannot see a live visit.

/** Active within this many minutes counts as online now. */
export const ONLINE_WINDOW_MIN = 5
/** Active within this many minutes counts as recently active (idle). */
export const RECENT_WINDOW_MIN = 30

/** Last-known footprint of one signed-in user, from their newest event. */
export type PresenceInfo = {
  /** Epoch ms of this user's most recent event, ever. */
  lastSeenAt: number
  /** Page they were last on. */
  path: string | null
  device: string | null
  browser: string | null
  os: string | null
}

export type PresenceSummary = {
  /** Server epoch ms the snapshot was taken, so the UI can age it client-side. */
  takenAt: number
  /** Distinct signed-in users active inside the online window. */
  onlineNow: number
  /** Distinct signed-in users active inside the wider recent window. */
  recentlyActive: number
  /** Distinct signed-out devices active inside the online window. */
  anonOnline: number
  onlineWindowMin: number
  recentWindowMin: number
  /** Keyed by user id. Only holds users who have ever emitted an event. */
  byUser: Record<string, PresenceInfo>
}

/**
 * One row per signed-in user: their newest event, with the page and device it
 * came from. `DISTINCT ON` is a Postgres feature that keeps the first row of
 * each `userId` group, and the matching `ORDER BY` makes that the newest one.
 *
 * The join onto `user` is load-bearing, not decorative: events outlive the
 * accounts that made them, so without it a deleted user's recent event would be
 * counted in `onlineNow` while no row exists to render, and the headline number
 * would disagree with the list underneath it.
 */
export async function getPresence(): Promise<PresenceSummary> {
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (e."userId")
           e."userId", e."createdAt", e."path", e."device", e."browser", e."os"
      FROM ${analyticsEvent} e
      JOIN "user" u ON u.id = e."userId"
     ORDER BY e."userId", e."createdAt" DESC`)

  const anon = await db.execute(sql`
    SELECT count(DISTINCT "anonId")::int AS n
      FROM ${analyticsEvent}
     WHERE "userId" IS NULL
       AND "anonId" IS NOT NULL
       AND "createdAt" > now() - (${ONLINE_WINDOW_MIN} * interval '1 minute')`)

  const takenAt = Date.now()
  const onlineCut = takenAt - ONLINE_WINDOW_MIN * 60_000
  const recentCut = takenAt - RECENT_WINDOW_MIN * 60_000

  const byUser: Record<string, PresenceInfo> = {}
  let onlineNow = 0
  let recentlyActive = 0

  for (const raw of latest.rows as Record<string, unknown>[]) {
    const id = String(raw.userId)
    const lastSeenAt = new Date(raw.createdAt as string).getTime()
    if (!Number.isFinite(lastSeenAt)) continue
    byUser[id] = {
      lastSeenAt,
      path: (raw.path as string | null) ?? null,
      device: (raw.device as string | null) ?? null,
      browser: (raw.browser as string | null) ?? null,
      os: (raw.os as string | null) ?? null,
    }
    if (lastSeenAt >= onlineCut) onlineNow++
    if (lastSeenAt >= recentCut) recentlyActive++
  }

  return {
    takenAt,
    onlineNow,
    recentlyActive,
    anonOnline: Number((anon.rows as { n?: number }[])[0]?.n ?? 0),
    onlineWindowMin: ONLINE_WINDOW_MIN,
    recentWindowMin: RECENT_WINDOW_MIN,
    byUser,
  }
}

// ── Active-users history (the Users-tab chart) ──────────────────────────────

/** One time bucket of the activity chart. */
export type ActivityBucket = {
  /** ISO start of the bucket, in UTC. The client formats it for display. */
  bucket: string
  /** Distinct signed-in users (excluding deleted accounts) active in it. */
  users: number
  /** Distinct signed-out devices active in it. */
  anon: number
  /** Raw event volume, which shows intensity rather than reach. */
  events: number
}

export type ActivitySeries = {
  granularity: "hour" | "day"
  buckets: ActivityBucket[]
  /** Busiest bucket by signed-in users, for annotating the chart. */
  peak: ActivityBucket | null
  /** Distinct users across the WHOLE window (not a sum of buckets). */
  uniqueUsers: number
}

/**
 * Distinct active users per hour or per day.
 *
 * Two things worth knowing about this query:
 *
 * 1. It zero-fills via `generate_series`. Grouping raw events would silently
 *    OMIT quiet buckets, and a line chart would then join 9am straight to 5pm as
 *    if the gap never happened, overstating activity. Empty buckets must exist
 *    and be 0.
 * 2. Distinct counts cannot be summed. A user active in six different hours is
 *    six bucket-hits but one person, so `uniqueUsers` is computed over the whole
 *    window separately rather than by adding the buckets up.
 *
 * The `user` join mirrors `getPresence`: events outlive deleted accounts, and
 * counting ghosts here would disagree with the headline numbers above the chart.
 */
export async function getActivitySeries(
  granularity: "hour" | "day" = "hour",
  points = granularity === "hour" ? 24 : 30,
): Promise<ActivitySeries> {
  // `points` is clamped and interpolated as a literal because Postgres will not
  // accept a bound parameter inside an interval literal.
  const n = Math.max(2, Math.min(granularity === "hour" ? 72 : 180, Math.floor(points)))
  const unit = granularity === "hour" ? "hour" : "day"
  const step = sql.raw(`interval '1 ${unit}'`)
  const span = sql.raw(`interval '${n - 1} ${unit}'`)
  const trunc = sql.raw(`'${unit}'`)

  const res = await db.execute(sql`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${trunc}, now()) - ${span},
        date_trunc(${trunc}, now()),
        ${step}
      ) AS bucket
    )
    SELECT b.bucket,
           count(DISTINCT e."userId") FILTER (WHERE u.id IS NOT NULL)::int AS users,
           count(DISTINCT e."anonId") FILTER (WHERE e."userId" IS NULL
                                                AND e."anonId" IS NOT NULL)::int AS anon,
           count(e.id)::int AS events
      FROM buckets b
      LEFT JOIN ${analyticsEvent} e
             ON e."createdAt" >= b.bucket
            AND e."createdAt" < b.bucket + ${step}
      LEFT JOIN "user" u ON u.id = e."userId"
     GROUP BY b.bucket
     ORDER BY b.bucket`)

  const buckets: ActivityBucket[] = (res.rows as Record<string, unknown>[]).map((r) => ({
    bucket: new Date(r.bucket as string).toISOString(),
    users: Number(r.users ?? 0),
    anon: Number(r.anon ?? 0),
    events: Number(r.events ?? 0),
  }))

  const uniq = await db.execute(sql`
    SELECT count(DISTINCT e."userId")::int AS n
      FROM ${analyticsEvent} e
      JOIN "user" u ON u.id = e."userId"
     WHERE e."createdAt" >= date_trunc(${trunc}, now()) - ${span}`)

  const peak = buckets.reduce<ActivityBucket | null>(
    (best, b) => (b.users > (best?.users ?? -1) ? b : best),
    null,
  )

  return {
    granularity,
    buckets,
    peak: peak && peak.users > 0 ? peak : null,
    uniqueUsers: Number((uniq.rows as { n?: number }[])[0]?.n ?? 0),
  }
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
