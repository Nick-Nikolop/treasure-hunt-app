import "server-only"

// ─────────────────────────────────────────────────────────────────────────
//  People + journeys for /analytics (admin only).
//
//  A "person" is an account (all of its devices merged) or, until they sign
//  up, a single anonymous device (`visitor.anonId`). Because a device is tied
//  to its account at sign-up / login, everything it did BEFORE creating the
//  account shows up in that account's journey too.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { analyticsEvent, sourceHit, sourceLabel, user, visitor, visitorTouch } from "@/lib/db/schema"
import { asc, eq, inArray, or, sql } from "drizzle-orm"
import { ensureAnalyticsStorage } from "@/lib/analytics-storage"

const PEOPLE_LIMIT = 400
const JOURNEY_EVENT_LIMIT = 4000
const MAX_PAGE_STAY_MS = 30 * 60 * 1000

export type EntrySource = {
  /** Short human label: link title, campaign, referrer host or "Direct / QR". */
  label: string
  kind: "link" | "utm" | "campaign" | "referrer" | "direct"
  /** Raw id when it's a ?s= / ?source= link. */
  id: string | null
}

function entrySource(input: {
  linkSource?: string | null
  linkTitle?: string | null
  utmSource?: string | null
  campaign?: string | null
  referrerHost?: string | null
}): EntrySource {
  if (input.linkSource) return { label: input.linkTitle ?? input.linkSource, kind: "link", id: input.linkSource }
  if (input.utmSource) return { label: input.linkTitle ?? input.utmSource, kind: "utm", id: input.utmSource }
  if (input.campaign) return { label: `Campaign ${input.campaign}`, kind: "campaign", id: null }
  if (input.referrerHost && input.referrerHost !== "direct" && input.referrerHost !== "unknown")
    return { label: input.referrerHost, kind: "referrer", id: null }
  return { label: "Direct / QR", kind: "direct", id: null }
}

// ── People list ───────────────────────────────────────────────────────────

export type PersonRow = {
  key: string
  userId: string | null
  name: string | null
  email: string | null
  isAdmin: boolean
  accountCreatedAt: string | null
  /** True when the account was created by a device we had already tracked. */
  signedUpHere: boolean
  devices: { anonId: string; label: string }[]
  source: EntrySource
  firstPath: string | null
  city: string | null
  firstSeenAt: string
  lastSeenAt: string
  visits: number
  pageViews: number
  pages: number
  events: number
}

export type SourceConversion = { label: string; id: string | null; devices: number; accounts: number }

/** What was clicked in the last 7 days, by everyone (consented or not). Admins excluded. */
export type ClickRow = {
  path: string
  label: string
  href: string | null
  clicks: number
  /** Clicks from visitors without analytics consent (no id, counted only). */
  anonymous: number
  /** Distinct consented devices that clicked it. */
  devices: number
  lastAt: string
}

export type PeopleSnapshot = {
  people: PersonRow[]
  conversion: SourceConversion[]
  clicks: ClickRow[]
  totals: {
    devices: number
    newLast7: number
    accounts: number
    signedUpAfterVisit: number
    activeToday: number
    /** Page views from visitors without analytics consent (counted, never linked). */
    anonymousViews7: number
  }
}

type RawPersonDevice = {
  anonId: string
  userId: string | null
  firstSeenAt: Date
  lastSeenAt: Date
  visitCount: number
  firstPath: string | null
  firstReferrerHost: string | null
  utmSource: string | null
  campaign: string | null
  device: string | null
  browser: string | null
  os: string | null
  linkedVia: string | null
  name: string | null
  email: string | null
  role: string | null
  userCreatedAt: Date | null
  linkSource: string | null
  linkTitle: string | null
  deviceModel: string | null
  city: string | null
  events: number
  sessions: number
  views: number
  pages: number
}

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null)

function deviceLabel(d: Pick<RawPersonDevice, "deviceModel" | "device" | "os" | "browser">): string {
  return [d.deviceModel ?? d.device, d.os, d.browser].filter((x) => x && x !== "Unknown" && x !== "unknown").join(" · ") || "Unknown device"
}

export async function getPeopleSnapshot(): Promise<PeopleSnapshot> {
  await ensureAnalyticsStorage().catch(() => {})
  try {
    const [rowsRes, convRes, totalsRes, clicksRes] = await Promise.all([
      db.execute(sql`
        with v as (
          select * from visitor order by "lastSeenAt" desc limit ${PEOPLE_LIMIT}
        ), ev as (
          select e."anonId",
            count(*)::int as events,
            count(distinct e."sessionId")::int as sessions,
            (count(*) filter (where e.name = 'page.view'))::int as views,
            (count(distinct e.path) filter (where e.name = 'page.view'))::int as pages
          from analytics_event e
          where e."anonId" in (select "anonId" from v)
          group by e."anonId"
        ), fs as (
          select distinct on ("anonId") "anonId", source, "deviceModel", city
          from source_hit
          where "anonId" in (select "anonId" from v)
          order by "anonId", "createdAt" asc
        )
        select v."anonId", v."userId", v."firstSeenAt", v."lastSeenAt", v."visitCount", v."firstPath",
          v."firstReferrerHost", v."utmSource", v.campaign, v.device, v.browser, v.os, v."linkedVia",
          u.name, u.email, u.role, u."createdAt" as "userCreatedAt",
          fs.source as "linkSource", coalesce(sl.title, sl2.title) as "linkTitle", fs."deviceModel", fs.city,
          coalesce(ev.events, 0)::int as events, coalesce(ev.sessions, 0)::int as sessions,
          coalesce(ev.views, 0)::int as views, coalesce(ev.pages, 0)::int as pages
        from v
        left join "user" u on u.id = v."userId"
        left join ev on ev."anonId" = v."anonId"
        left join fs on fs."anonId" = v."anonId"
        left join source_label sl on sl.source = fs.source
        left join source_label sl2 on sl2.source = v."utmSource"
        order by v."lastSeenAt" desc
      `),
      db.execute(sql`
        with fs as (
          select distinct on ("anonId") "anonId", source from source_hit
          where "anonId" is not null
          order by "anonId", "createdAt" asc
        ), tagged as (
          select v."userId",
            coalesce(fs.source, v."utmSource") as sid,
            v.campaign,
            v."firstReferrerHost" as host
          from visitor v left join fs on fs."anonId" = v."anonId"
        )
        select t.sid, t.campaign, case when t.sid is null and t.campaign is null then t.host end as host,
          sl.title, count(*)::int as devices, count(distinct t."userId")::int as accounts
        from tagged t left join source_label sl on sl.source = t.sid
        group by 1, 2, 3, 4
        order by devices desc
        limit 40
      `),
      db.execute(sql`
        select count(*)::int as devices,
          (count(*) filter (where "firstSeenAt" > now() - interval '7 days'))::int as "newLast7",
          count(distinct "userId")::int as accounts,
          (count(distinct "userId") filter (where "linkedVia" = 'signup'))::int as "signedUpAfterVisit",
          (count(*) filter (where "lastSeenAt" >= date_trunc('day', now())))::int as "activeToday",
          (select count(*)::int from analytics_event
            where name = 'page.view' and "anonId" is null and "userId" is null
              and "createdAt" > now() - interval '7 days') as "anonymousViews7"
        from visitor
      `),
      db.execute(sql`
        select coalesce(e.path, '/') as path,
          coalesce(e.props->>'label', '') as label,
          e.props->>'href' as href,
          count(*)::int as clicks,
          (count(*) filter (where e."anonId" is null))::int as anonymous,
          count(distinct e."anonId")::int as devices,
          max(e."createdAt") as "lastAt"
        from analytics_event e
        left join "user" u on u.id = e."userId"
        where e.name = 'ui.click'
          and e."createdAt" > now() - interval '7 days'
          and coalesce(u.role, '') <> 'superadmin'
          and coalesce(e.path, '') not like '/admin%'
          and coalesce(e.path, '') not like '/analytics%'
        group by 1, 2, 3
        order by clicks desc
        limit 60
      `),
    ])

    const raw = rowsRes.rows as unknown as RawPersonDevice[]
    const people = new Map<string, PersonRow>()
    for (const d of raw) {
      const key = d.userId ? `u_${d.userId}` : `a_${d.anonId}`
      const source = entrySource({
        linkSource: d.linkSource,
        linkTitle: d.linkTitle,
        utmSource: d.utmSource,
        campaign: d.campaign,
        referrerHost: d.firstReferrerHost,
      })
      const existing = people.get(key)
      if (!existing) {
        people.set(key, {
          key,
          userId: d.userId,
          name: d.name,
          email: d.email,
          isAdmin: d.role === "superadmin",
          accountCreatedAt: iso(d.userCreatedAt),
          signedUpHere: d.linkedVia === "signup",
          devices: [{ anonId: d.anonId, label: deviceLabel(d) }],
          source,
          firstPath: d.firstPath,
          city: d.city,
          firstSeenAt: iso(d.firstSeenAt)!,
          lastSeenAt: iso(d.lastSeenAt)!,
          visits: Math.max(d.sessions, d.visitCount ?? 0),
          pageViews: d.views,
          pages: d.pages,
          events: d.events,
        })
        continue
      }
      existing.devices.push({ anonId: d.anonId, label: deviceLabel(d) })
      existing.signedUpHere ||= d.linkedVia === "signup"
      existing.visits += Math.max(d.sessions, d.visitCount ?? 0)
      existing.pageViews += d.views
      existing.pages += d.pages
      existing.events += d.events
      existing.city ??= d.city
      if (new Date(d.firstSeenAt) < new Date(existing.firstSeenAt)) {
        existing.firstSeenAt = iso(d.firstSeenAt)!
        existing.source = source
        existing.firstPath = d.firstPath
      }
      if (new Date(d.lastSeenAt) > new Date(existing.lastSeenAt)) existing.lastSeenAt = iso(d.lastSeenAt)!
    }

    const conversion = (
      convRes.rows as unknown as { sid: string | null; campaign: string | null; host: string | null; title: string | null; devices: number; accounts: number }[]
    ).map((r) => {
      const s = entrySource({ linkSource: r.sid, linkTitle: r.title, campaign: r.campaign, referrerHost: r.host })
      return { label: s.label, id: s.id, devices: r.devices, accounts: r.accounts }
    })
    // Rows can collapse to the same label (e.g. several "direct" hosts); merge them.
    const merged = new Map<string, SourceConversion>()
    for (const c of conversion) {
      const m = merged.get(c.label)
      if (m) {
        m.devices += c.devices
        m.accounts += c.accounts
      } else merged.set(c.label, { ...c })
    }

    const t = (totalsRes.rows[0] ?? {}) as PeopleSnapshot["totals"]
    return {
      people: [...people.values()],
      conversion: [...merged.values()].sort((a, b) => b.devices - a.devices),
      clicks: (clicksRes.rows as unknown as (Omit<ClickRow, "lastAt"> & { lastAt: Date })[]).map((r) => ({
        ...r,
        lastAt: iso(r.lastAt)!,
      })),
      totals: {
        devices: t.devices ?? 0,
        newLast7: t.newLast7 ?? 0,
        accounts: t.accounts ?? 0,
        signedUpAfterVisit: t.signedUpAfterVisit ?? 0,
        activeToday: t.activeToday ?? 0,
        anonymousViews7: t.anonymousViews7 ?? 0,
      },
    }
  } catch (err) {
    console.log("[v0] people snapshot failed:", (err as Error)?.message)
    return { people: [], conversion: [], clicks: [], totals: { devices: 0, newLast7: 0, accounts: 0, signedUpAfterVisit: 0, activeToday: 0, anonymousViews7: 0 } }
  }
}

// ── One person's journey ──────────────────────────────────────────────────

export type JourneyEvent = {
  id: string
  at: string
  name: string
  category: string
  path: string | null
  durationMs: number | null
  props: Record<string, unknown> | null
}

export type JourneySession = {
  id: string
  startedAt: string
  endedAt: string
  device: string | null
  entry: EntrySource | null
  landingPath: string | null
  events: JourneyEvent[]
  /** Sum of page.leave durations, i.e. time actually spent on pages. */
  activeMs: number
  signedUp: boolean
}

export type Journey = {
  key: string
  account: {
    id: string
    name: string
    email: string
    createdAt: string
    emailVerified: boolean
    role: string
  } | null
  devices: {
    anonId: string
    label: string
    firstSeenAt: string
    lastSeenAt: string
    linkedVia: string | null
    linkedAt: string | null
    language: string | null
  }[]
  firstTouch: { source: EntrySource; path: string | null; referrer: string | null; at: string } | null
  places: string[]
  sessions: JourneySession[]
  totals: { visits: number; pageViews: number; clicks: number; activeMs: number; events: number; truncated: boolean }
}

/** `key` is `u_<userId>` or `a_<anonId>` (as built by getPeopleSnapshot). */
export async function getJourney(key: string): Promise<Journey | null> {
  await ensureAnalyticsStorage().catch(() => {})
  const isUser = key.startsWith("u_")
  const id = key.slice(2)
  if (!id || (!isUser && !key.startsWith("a_"))) return null

  try {
    let userId: string | null = isUser ? id : null
    if (!userId) {
      const [own] = await db.select({ userId: visitor.userId }).from(visitor).where(eq(visitor.anonId, id)).limit(1)
      userId = own?.userId ?? null
    }

    const devices = userId
      ? await db.select().from(visitor).where(eq(visitor.userId, userId)).orderBy(asc(visitor.firstSeenAt))
      : await db.select().from(visitor).where(eq(visitor.anonId, id))
    const anonIds = devices.map((d) => d.anonId)
    if (!userId && anonIds.length === 0) return null

    const eventWhere =
      userId && anonIds.length
        ? or(inArray(analyticsEvent.anonId, anonIds), eq(analyticsEvent.userId, userId))
        : userId
          ? eq(analyticsEvent.userId, userId)
          : inArray(analyticsEvent.anonId, anonIds)

    const [account, events, touches, hits, labels] = await Promise.all([
      userId ? db.select().from(user).where(eq(user.id, userId)).limit(1).then((r) => r[0] ?? null) : null,
      db
        .select({
          id: analyticsEvent.id,
          at: analyticsEvent.createdAt,
          name: analyticsEvent.name,
          category: analyticsEvent.category,
          path: analyticsEvent.path,
          sessionId: analyticsEvent.sessionId,
          device: analyticsEvent.device,
          durationMs: analyticsEvent.durationMs,
          props: analyticsEvent.props,
        })
        .from(analyticsEvent)
        .where(eventWhere)
        .orderBy(asc(analyticsEvent.createdAt))
        .limit(JOURNEY_EVENT_LIMIT + 1),
      anonIds.length ? db.select().from(visitorTouch).where(inArray(visitorTouch.anonId, anonIds)) : [],
      anonIds.length
        ? db
            .select({
              source: sourceHit.source,
              sessionId: sourceHit.sessionId,
              anonId: sourceHit.anonId,
              city: sourceHit.city,
              country: sourceHit.country,
              deviceModel: sourceHit.deviceModel,
              device: sourceHit.device,
              os: sourceHit.os,
              browser: sourceHit.browser,
              createdAt: sourceHit.createdAt,
            })
            .from(sourceHit)
            .where(inArray(sourceHit.anonId, anonIds))
            .orderBy(asc(sourceHit.createdAt))
        : [],
      db.select({ source: sourceLabel.source, title: sourceLabel.title }).from(sourceLabel),
    ])

    const titleOf = new Map(labels.map((l) => [l.source, l.title]))
    const hitBySession = new Map<string, (typeof hits)[number]>()
    for (const h of hits) if (h.sessionId && !hitBySession.has(h.sessionId)) hitBySession.set(h.sessionId, h)
    const touchBySession = new Map<string, (typeof touches)[number]>()
    for (const t of touches) if (t.sessionId) touchBySession.set(t.sessionId, t)
    const modelByAnon = new Map<string, string>()
    for (const h of hits) if (h.anonId && h.deviceModel && !modelByAnon.has(h.anonId)) modelByAnon.set(h.anonId, h.deviceModel)

    const truncated = events.length > JOURNEY_EVENT_LIMIT
    const kept = truncated ? events.slice(events.length - JOURNEY_EVENT_LIMIT) : events

    const sessions = new Map<string, JourneySession>()
    for (const e of kept) {
      const sid = e.sessionId ?? `day-${new Date(e.at).toISOString().slice(0, 10)}`
      let s = sessions.get(sid)
      if (!s) {
        const touch = e.sessionId ? touchBySession.get(e.sessionId) : undefined
        const hit = e.sessionId ? hitBySession.get(e.sessionId) : undefined
        s = {
          id: sid,
          startedAt: iso(e.at)!,
          endedAt: iso(e.at)!,
          device: e.device,
          entry:
            touch || hit
              ? entrySource({
                  linkSource: hit?.source,
                  linkTitle: (hit?.source && titleOf.get(hit.source)) || (touch?.utmSource && titleOf.get(touch.utmSource)) || null,
                  utmSource: touch?.utmSource,
                  campaign: touch?.campaign,
                  referrerHost: touch?.referrerHost,
                })
              : null,
          landingPath: touch?.landingPath ?? null,
          events: [],
          activeMs: 0,
          signedUp: false,
        }
        sessions.set(sid, s)
      }
      s.endedAt = iso(e.at)!
      // Older rows double-counted background-tab time; cap one page stay at 30 min.
      if (e.name === "page.leave" && e.durationMs) s.activeMs += Math.min(e.durationMs, MAX_PAGE_STAY_MS)
      if (e.name === "auth.register.success") s.signedUp = true
      s.events.push({
        id: e.id,
        at: iso(e.at)!,
        name: e.name,
        category: e.category,
        path: e.path,
        durationMs: e.durationMs,
        props: (e.props as Record<string, unknown> | null) ?? null,
      })
    }

    const first = devices[0]
    const firstHit = hits[0]
    const places = [...new Set(hits.map((h) => [h.city, h.country].filter(Boolean).join(", ")).filter(Boolean))]

    const allSessions = [...sessions.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return {
      key,
      account: account
        ? {
            id: account.id,
            name: account.name,
            email: account.email,
            createdAt: iso(account.createdAt)!,
            emailVerified: account.emailVerified,
            role: account.role,
          }
        : null,
      devices: devices.map((d) => ({
        anonId: d.anonId,
        label: deviceLabel({ deviceModel: modelByAnon.get(d.anonId) ?? null, device: d.device, os: d.os, browser: d.browser }),
        firstSeenAt: iso(d.firstSeenAt)!,
        lastSeenAt: iso(d.lastSeenAt)!,
        linkedVia: d.linkedVia,
        linkedAt: iso(d.linkedAt),
        language: d.language,
      })),
      firstTouch: first
        ? {
            source: entrySource({
              linkSource: firstHit?.source,
              linkTitle: (firstHit?.source && titleOf.get(firstHit.source)) || (first.utmSource && titleOf.get(first.utmSource)) || null,
              utmSource: first.utmSource,
              campaign: first.campaign,
              referrerHost: first.firstReferrerHost,
            }),
            path: first.firstPath,
            referrer: first.firstReferrer,
            at: iso(first.firstSeenAt)!,
          }
        : null,
      places,
      sessions: allSessions,
      totals: {
        visits: allSessions.length,
        pageViews: kept.filter((e) => e.name === "page.view").length,
        clicks: kept.filter((e) => e.name === "ui.click" || e.name === "cta.click").length,
        activeMs: allSessions.reduce((sum, s) => sum + s.activeMs, 0),
        events: kept.length,
        truncated,
      },
    }
  } catch (err) {
    console.log("[v0] journey failed:", (err as Error)?.message)
    return null
  }
}
