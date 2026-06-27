// ─────────────────────────────────────────────────────────────────────────
//  Trackable marketing links ("campaigns").
//
//  For every physical thing we hand out (flyers, posters, t-shirts, stickers)
//  we mint a campaign link. Its token resolves at /c/<token>, which logs the
//  visit and redirects to the landing page. Admins create/manage links in the
//  dashboard and read per-link visit stats.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { campaignLink, campaignVisit } from "@/lib/db/schema"
import { siteUrl } from "@/lib/hunt"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"

/** A campaign link with its rolled-up visit summary. */
export type CampaignRow = {
  id: string
  token: string
  name: string
  label: string | null
  createdAt: Date
  /** Absolute, shareable link that redirects to the landing page. */
  link: string
  /** Total raw visits (every redirect hit). */
  totalVisits: number
  /** Distinct visitors (collapsed by anonymous cookie id). */
  uniqueVisits: number
  /** Visits since local midnight (UTC-based). */
  today: number
  /** Visits in the last 7 days. */
  last7: number
  /** Most recent visit time, or null if never visited. */
  lastVisitAt: Date | null
}

/** A single point in a per-day visit series. */
export type DayCount = { date: string; visits: number; unique: number }

/** A recent individual visit, for the per-link detail log. */
export type VisitRow = {
  id: string
  createdAt: Date
  isUnique: boolean
  device: string
  referrer: string | null
}

/** Detailed stats for one campaign link. */
export type CampaignStats = {
  /** Per-day series for the last 14 days (oldest first). */
  daily: DayCount[]
  /** Most recent individual visits (capped). */
  recent: VisitRow[]
}

/** The public link a campaign token resolves to. */
export function campaignLinkFor(token: string): string {
  return `${siteUrl()}/c/${token}`
}

/** Generate a short, URL-safe, unguessable token. */
function freshToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10)
}

/** Condense a User-Agent string into a short, human label for the visit log. */
export function deviceFromUA(ua: string | null | undefined): string {
  if (!ua) return "Unknown"
  const s = ua.toLowerCase()
  if (s.includes("ipad")) return "iPad"
  if (s.includes("iphone") || s.includes("ios")) return "iPhone"
  if (s.includes("android")) return "Android"
  if (s.includes("windows")) return "Windows"
  if (s.includes("mac os") || s.includes("macintosh")) return "Mac"
  if (s.includes("linux")) return "Linux"
  return "Other"
}

/**
 * All campaign links, newest first, each with a rolled-up visit summary.
 * Admin only (call from a guarded action).
 */
export async function listCampaigns(): Promise<CampaignRow[]> {
  const links = await db.select().from(campaignLink).orderBy(desc(campaignLink.createdAt))
  if (links.length === 0) return []

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // One grouped aggregate query covering every link.
  const agg = await db
    .select({
      linkId: campaignVisit.linkId,
      total: sql<number>`count(*)::int`,
      unique: sql<number>`count(*) filter (where ${campaignVisit.isUnique})::int`,
      today: sql<number>`count(*) filter (where ${campaignVisit.createdAt} >= ${startOfToday})::int`,
      last7: sql<number>`count(*) filter (where ${campaignVisit.createdAt} >= ${sevenDaysAgo})::int`,
      lastVisitAt: sql<Date | null>`max(${campaignVisit.createdAt})`,
    })
    .from(campaignVisit)
    .groupBy(campaignVisit.linkId)

  const byLink = new Map(agg.map((a) => [a.linkId, a]))

  return links.map((l) => {
    const a = byLink.get(l.id)
    return {
      id: l.id,
      token: l.token,
      name: l.name,
      label: l.label,
      createdAt: l.createdAt,
      link: campaignLinkFor(l.token),
      totalVisits: a?.total ?? 0,
      uniqueVisits: a?.unique ?? 0,
      today: a?.today ?? 0,
      last7: a?.last7 ?? 0,
      lastVisitAt: a?.lastVisitAt ? new Date(a.lastVisitAt) : null,
    }
  })
}

/** Look up a single campaign link by its public token. Null when not found. */
export async function getCampaignByToken(
  token: string,
): Promise<typeof campaignLink.$inferSelect | null> {
  const rows = await db.select().from(campaignLink).where(eq(campaignLink.token, token)).limit(1)
  return rows[0] ?? null
}

/** Create a campaign link. Returns the created row id + token. */
export async function createCampaign(input: {
  name: string
  label: string | null
}): Promise<{ id: string; token: string }> {
  const id = randomUUID()
  const token = freshToken()
  await db.insert(campaignLink).values({
    id,
    token,
    name: input.name,
    label: input.label,
    createdAt: new Date(),
  })
  return { id, token }
}

/** Update a campaign link's name / label. */
export async function updateCampaign(
  id: string,
  input: { name: string; label: string | null },
): Promise<void> {
  await db
    .update(campaignLink)
    .set({ name: input.name, label: input.label })
    .where(eq(campaignLink.id, id))
}

/** Delete a campaign link and all of its recorded visits. */
export async function deleteCampaign(id: string): Promise<void> {
  await db.delete(campaignVisit).where(eq(campaignVisit.linkId, id))
  await db.delete(campaignLink).where(eq(campaignLink.id, id))
}

/** Issue a fresh token, invalidating the old link. Visit history is kept. */
export async function regenerateCampaignToken(id: string): Promise<void> {
  await db.update(campaignLink).set({ token: freshToken() }).where(eq(campaignLink.id, id))
}

/**
 * Whether this visitor id has been seen before for the given link. Used to set
 * `isUnique` on the new visit row.
 */
async function isFirstVisit(linkId: string, visitorId: string): Promise<boolean> {
  const rows = await db
    .select({ id: campaignVisit.id })
    .from(campaignVisit)
    .where(and(eq(campaignVisit.linkId, linkId), eq(campaignVisit.visitorId, visitorId)))
    .limit(1)
  return rows.length === 0
}

/** Record a visit to a campaign link. Returns nothing; never throws to caller. */
export async function recordVisit(input: {
  linkId: string
  visitorId: string | null
  userAgent: string | null
  referrer: string | null
}): Promise<void> {
  const unique = input.visitorId ? await isFirstVisit(input.linkId, input.visitorId) : true
  await db.insert(campaignVisit).values({
    id: randomUUID(),
    linkId: input.linkId,
    visitorId: input.visitorId,
    isUnique: unique,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
    referrer: input.referrer?.slice(0, 512) ?? null,
    createdAt: new Date(),
  })
}

/** Detailed per-link stats: a 14-day series and a list of recent visits. */
export async function getCampaignStats(id: string): Promise<CampaignStats> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 13) // 14 days inclusive

  const series = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${campaignVisit.createdAt}), 'YYYY-MM-DD')`,
      visits: sql<number>`count(*)::int`,
      unique: sql<number>`count(*) filter (where ${campaignVisit.isUnique})::int`,
    })
    .from(campaignVisit)
    .where(and(eq(campaignVisit.linkId, id), gte(campaignVisit.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${campaignVisit.createdAt})`)

  const byDay = new Map(series.map((r) => [r.day, r]))
  const daily: DayCount[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const hit = byDay.get(key)
    daily.push({ date: key, visits: hit?.visits ?? 0, unique: hit?.unique ?? 0 })
  }

  const recentRows = await db
    .select()
    .from(campaignVisit)
    .where(eq(campaignVisit.linkId, id))
    .orderBy(desc(campaignVisit.createdAt))
    .limit(50)

  const recent: VisitRow[] = recentRows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    isUnique: r.isUnique,
    device: deviceFromUA(r.userAgent),
    referrer: r.referrer,
  }))

  return { daily, recent }
}
