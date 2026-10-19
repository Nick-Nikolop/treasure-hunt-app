// ─────────────────────────────────────────────────────────────────────────
//  `?source=` link tracking.
//
//  Any page opened with ?source=<name> (or utm_source / ref / src) is logged
//  as a `source_hit` with everything the request and the browser expose:
//  geo from Vercel's edge headers, device + browser details, screen, locale,
//  network, and whether this device / network was new for that source.
//  Best-effort: nothing here may throw to the caller.
// ─────────────────────────────────────────────────────────────────────────

import { createHash, randomUUID } from "node:crypto"
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { analyticsEvent, sourceHit, visitor } from "@/lib/db/schema"
import { EV } from "@/lib/analytics-events"

export type SourceClientInfo = {
  source?: unknown
  sourceKey?: unknown
  path?: unknown
  query?: unknown
  referrer?: unknown
  anonId?: unknown
  sessionId?: unknown
  isNewVisitor?: unknown
  language?: unknown
  languages?: unknown
  timezone?: unknown
  screen?: unknown
  viewport?: unknown
  pixelRatio?: unknown
  touch?: unknown
  colorScheme?: unknown
  reducedMotion?: unknown
  connection?: unknown
  saveData?: unknown
  deviceMemory?: unknown
  cpuCores?: unknown
  standalone?: unknown
  localTime?: unknown
}

export type SourceServerInfo = {
  userId: string | null
  ip: string | null
  userAgent: string | null
  acceptLanguage: string | null
  geo: {
    country: string | null
    region: string | null
    city: string | null
    postalCode: string | null
    latitude: number | null
    longitude: number | null
    timezone: string | null
  }
}

const str = (v: unknown, max = 256): string | null =>
  typeof v === "string" && v.trim().length ? v.trim().slice(0, max) : null
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null)

/** Lower-case, URL-safe source name so "First_Rollover " and "first_rollover" count together. */
export function normalizeSource(v: unknown): string | null {
  const s = str(v, 80)?.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-.]/g, "")
  return s && s.length ? s : null
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.BETTER_AUTH_SECRET ?? "th-source"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)
}

function hostOf(url: string | null): string {
  if (!url) return "direct"
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "direct"
  } catch {
    return "unknown"
  }
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|discord|headless|lighthouse|curl|wget|python|axios/i

/** Device, browser, OS (with versions) and in-app browser from a User-Agent. */
export function parseUA(ua: string | null) {
  const s = ua ?? ""
  const pick = (re: RegExp) => s.match(re)?.[1]?.replace(/_/g, ".") ?? null

  let os = "Other"
  let osVersion: string | null = null
  if (/iPhone|iPad|iPod/.test(s)) {
    os = "iOS"
    osVersion = pick(/OS (\d+[_.]\d+)/)
  } else if (/Android/.test(s)) {
    os = "Android"
    osVersion = pick(/Android (\d+(?:\.\d+)?)/)
  } else if (/Windows NT/.test(s)) {
    os = "Windows"
    osVersion = pick(/Windows NT (\d+\.\d+)/)
  } else if (/Mac OS X/.test(s)) {
    os = "macOS"
    osVersion = pick(/Mac OS X (\d+[_.]\d+)/)
  } else if (/CrOS/.test(s)) os = "ChromeOS"
  else if (/Linux/.test(s)) os = "Linux"

  const inApp = /Instagram/.test(s)
    ? "Instagram"
    : /FBAN|FBAV|FB_IAB/.test(s)
      ? "Facebook"
      : /musical_ly|TikTok|BytedanceWebview/.test(s)
        ? "TikTok"
        : /Messenger/.test(s)
          ? "Messenger"
          : /LinkedInApp/.test(s)
            ? "LinkedIn"
            : /Snapchat/.test(s)
              ? "Snapchat"
              : /Twitter/.test(s)
                ? "X"
                : /Viber/.test(s)
                  ? "Viber"
                  : null

  let browser = "Other"
  let browserVersion: string | null = null
  if (/Edg\//.test(s)) [browser, browserVersion] = ["Edge", pick(/Edg\/(\d+)/)]
  else if (/SamsungBrowser/.test(s)) [browser, browserVersion] = ["Samsung Internet", pick(/SamsungBrowser\/(\d+)/)]
  else if (/OPR\/|Opera/.test(s)) [browser, browserVersion] = ["Opera", pick(/OPR\/(\d+)/)]
  else if (/Firefox\/|FxiOS/.test(s)) [browser, browserVersion] = ["Firefox", pick(/(?:Firefox|FxiOS)\/(\d+)/)]
  else if (/CriOS|Chrome\//.test(s)) [browser, browserVersion] = ["Chrome", pick(/(?:CriOS|Chrome)\/(\d+)/)]
  else if (/Safari\//.test(s)) [browser, browserVersion] = ["Safari", pick(/Version\/(\d+(?:\.\d+)?)/)]

  const lower = s.toLowerCase()
  const device =
    lower.includes("ipad") || (lower.includes("android") && !lower.includes("mobile")) || lower.includes("tablet")
      ? "tablet"
      : lower.includes("mobi") || lower.includes("iphone") || lower.includes("android")
        ? "mobile"
        : "desktop"

  const deviceModel = /iPhone/.test(s)
    ? "iPhone"
    : /iPad/.test(s)
      ? "iPad"
      : (s.match(/Android [\d.]+; (?:[a-z]{2}-[a-z]{2}; )?([^;)]+?)(?: Build|\))/i)?.[1]?.trim() ?? null)

  return { os, osVersion, browser, browserVersion, device, deviceModel, inApp, isBot: BOT.test(s) }
}

async function seenBefore(source: string, column: "anonId" | "ipHash", value: string | null): Promise<boolean> {
  if (!value) return false
  const col = column === "anonId" ? sourceHit.anonId : sourceHit.ipHash
  const rows = await db
    .select({ id: sourceHit.id })
    .from(sourceHit)
    .where(and(eq(sourceHit.source, source), eq(col, value)))
    .limit(1)
  return rows.length > 0
}

/** Store one source arrival. Returns false when the payload had no usable source. */
export async function recordSourceHit(c: SourceClientInfo, s: SourceServerInfo): Promise<boolean> {
  const source = normalizeSource(c.source)
  if (!source) return false
  const ua = parseUA(s.userAgent)
  const anonId = str(c.anonId, 64)
  const ipHash = hashIp(s.ip)
  const referrer = str(c.referrer, 512)

  let query: Record<string, string> | null = null
  if (c.query && typeof c.query === "object" && !Array.isArray(c.query)) {
    const entries = Object.entries(c.query as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string")
      .slice(0, 20)
      .map(([k, v]) => [k.slice(0, 40), (v as string).slice(0, 200)])
    if (entries.length) query = Object.fromEntries(entries)
  }

  try {
    const [anonSeen, ipSeen] = await Promise.all([
      seenBefore(source, "anonId", anonId),
      seenBefore(source, "ipHash", ipHash),
    ])
    await db.insert(sourceHit).values({
      id: randomUUID(),
      source,
      sourceKey: str(c.sourceKey, 16),
      path: str(c.path, 256) ?? "/",
      query,
      anonId,
      sessionId: str(c.sessionId, 64),
      userId: s.userId,
      isUnique: !anonSeen,
      isUniqueIp: !ipSeen,
      isNewVisitor: bool(c.isNewVisitor) ?? false,
      ipHash,
      country: s.geo.country,
      region: s.geo.region,
      city: s.geo.city,
      postalCode: s.geo.postalCode,
      latitude: s.geo.latitude,
      longitude: s.geo.longitude,
      ipTimezone: s.geo.timezone,
      referrer,
      referrerHost: hostOf(referrer),
      userAgent: s.userAgent?.slice(0, 512) ?? null,
      device: ua.device,
      deviceModel: ua.deviceModel?.slice(0, 64) ?? null,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      osVersion: ua.osVersion,
      inApp: ua.inApp,
      isBot: ua.isBot,
      language: str(c.language, 16),
      languages: str(c.languages, 128),
      acceptLanguage: s.acceptLanguage?.slice(0, 128) ?? null,
      timezone: str(c.timezone, 64),
      screen: str(c.screen, 24),
      viewport: str(c.viewport, 24),
      pixelRatio: num(c.pixelRatio),
      touch: bool(c.touch),
      colorScheme: str(c.colorScheme, 8),
      reducedMotion: bool(c.reducedMotion),
      connection: str(c.connection, 16),
      saveData: bool(c.saveData),
      deviceMemory: num(c.deviceMemory),
      cpuCores: num(c.cpuCores) === null ? null : Math.round(num(c.cpuCores) as number),
      standalone: bool(c.standalone),
      localTime: str(c.localTime, 40),
      createdAt: new Date(),
    })
    return true
  } catch (err) {
    console.log("[v0] source hit failed:", (err as Error)?.message)
    return false
  }
}

// ── Admin read side ────────────────────────────────────────────────────────

export type Tally = { label: string; count: number }

export type SourceRow = {
  source: string
  /** Every recorded arrival (bots excluded). */
  visits: number
  /** Distinct devices. */
  uniqueDevices: number
  /** Distinct networks (hashed IPs) — catches one person opening the link in two apps. */
  uniqueNetworks: number
  /** Devices that had never been on the site before. */
  newVisitors: number
  /** Devices from this source that are now tied to an account. */
  signedUp: number
  today: number
  last7: number
  /** Median seconds on site per session, from page.leave events. */
  medianSeconds: number | null
  firstAt: Date | null
  lastAt: Date | null
  paths: Tally[]
  devices: Tally[]
  apps: Tally[]
  cities: Tally[]
  bots: number
}

export type SourceHitRow = {
  id: string
  source: string
  path: string
  createdAt: Date
  isUnique: boolean
  device: string | null
  deviceModel: string | null
  os: string | null
  browser: string | null
  inApp: string | null
  city: string | null
  country: string | null
  referrerHost: string | null
}

export type SourcesSnapshot = { sources: SourceRow[]; recent: SourceHitRow[] }

function tally(values: (string | null)[], top = 5): Tally[] {
  const m = new Map<string, number>()
  for (const v of values) {
    const k = v ?? "Unknown"
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([label, count]) => ({ label, count }))
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2)
}

/** Every source with its rolled-up numbers, plus the 60 latest hits. Admin only. */
export async function listSources(): Promise<SourcesSnapshot> {
  try {
    const hits = await db.select().from(sourceHit).orderBy(desc(sourceHit.createdAt)).limit(20000)
    if (hits.length === 0) return { sources: [], recent: [] }

    const anonIds = [...new Set(hits.map((h) => h.anonId).filter(Boolean))] as string[]
    const sessionIds = [...new Set(hits.map((h) => h.sessionId).filter(Boolean))] as string[]

    const linked = anonIds.length
      ? await db
          .select({ anonId: visitor.anonId })
          .from(visitor)
          .where(and(inArray(visitor.anonId, anonIds), isNotNull(visitor.userId)))
      : []
    const linkedSet = new Set(linked.map((l) => l.anonId))

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const dwell = sessionIds.length
      ? await db
          .select({
            sessionId: analyticsEvent.sessionId,
            ms: sql<number>`sum(${analyticsEvent.durationMs})::bigint`,
          })
          .from(analyticsEvent)
          .where(
            and(
              eq(analyticsEvent.name, EV.pageLeave),
              inArray(analyticsEvent.sessionId, sessionIds),
              gte(analyticsEvent.createdAt, since),
            ),
          )
          .groupBy(analyticsEvent.sessionId)
      : []
    const dwellBySession = new Map(dwell.map((d) => [d.sessionId, Number(d.ms)]))

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const bySource = new Map<string, typeof hits>()
    for (const h of hits) {
      const list = bySource.get(h.source) ?? []
      list.push(h)
      bySource.set(h.source, list)
    }

    const sources: SourceRow[] = [...bySource.entries()].map(([source, all]) => {
      const real = all.filter((h) => !h.isBot)
      const devices = new Set(real.map((h) => h.anonId ?? h.id))
      const sessions = [...new Set(real.map((h) => h.sessionId).filter(Boolean))] as string[]
      return {
        source,
        visits: real.length,
        uniqueDevices: devices.size,
        uniqueNetworks: new Set(real.map((h) => h.ipHash ?? h.id)).size,
        newVisitors: new Set(real.filter((h) => h.isNewVisitor).map((h) => h.anonId ?? h.id)).size,
        signedUp: [...devices].filter((d) => linkedSet.has(d)).length,
        today: real.filter((h) => h.createdAt >= startOfToday).length,
        last7: real.filter((h) => h.createdAt.getTime() >= weekAgo).length,
        medianSeconds: median(
          sessions.map((s) => dwellBySession.get(s)).filter((v): v is number => typeof v === "number").map((ms) => ms / 1000),
        ),
        firstAt: real.length ? real[real.length - 1].createdAt : null,
        lastAt: real.length ? real[0].createdAt : null,
        paths: tally(real.map((h) => h.path)),
        devices: tally(real.map((h) => (h.os ? `${h.device} · ${h.os}` : h.device))),
        apps: tally(real.map((h) => h.inApp ?? (h.referrerHost === "direct" ? "Direct / QR" : h.referrerHost))),
        cities: tally(real.map((h) => (h.city ? `${decodeURIComponent(h.city)}${h.country ? `, ${h.country}` : ""}` : h.country))),
        bots: all.length - real.length,
      }
    })
    sources.sort((a, b) => b.visits - a.visits)

    const recent: SourceHitRow[] = hits.slice(0, 60).map((h) => ({
      id: h.id,
      source: h.source,
      path: h.path,
      createdAt: h.createdAt,
      isUnique: h.isUnique,
      device: h.device,
      deviceModel: h.deviceModel,
      os: h.os,
      browser: h.browser,
      inApp: h.inApp,
      city: h.city ? decodeURIComponent(h.city) : null,
      country: h.country,
      referrerHost: h.referrerHost,
    }))

    return { sources, recent }
  } catch (err) {
    console.log("[v0] list sources failed:", (err as Error)?.message)
    return { sources: [], recent: [] }
  }
}
