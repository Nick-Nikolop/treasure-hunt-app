// ─────────────────────────────────────────────────────────────────────────
//  User journey: where people came from and which account they became.
//
//  - Every new browsing session's `session.start` event carries the entry
//    point (landing path, referrer, UTM tags, campaign, ad click id). We store
//    it as a `visitor_touch` and upsert the device's `visitor` row, whose
//    first-touch columns are written once and never overwritten.
//  - A device (anonId) gets tied to an account at sign-up, at sign-in, or the
//    first time it sends an event while signed in. From then on the device's
//    whole history (including everything BEFORE sign-up) belongs to that user.
//
//  Best-effort like lib/analytics.ts: nothing here may throw to the caller.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { visitor, visitorTouch } from "@/lib/db/schema"
import { isNull, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { ensureAnalyticsStorage } from "@/lib/analytics-storage"

/** First-party cookie mirroring the analytics anonId, so server auth hooks can read it. */
export const ANON_COOKIE = "pythea_aid"

export type TouchInput = {
  anonId: string
  sessionId: string | null
  userId: string | null
  device: string | null
  browser: string | null
  os: string | null
  props: Record<string, unknown> | null
}

const str = (v: unknown, max = 256): string | null =>
  typeof v === "string" && v.trim().length ? v.trim().slice(0, max) : null

function hostOf(referrer: string | null): string {
  if (!referrer) return "direct"
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || "direct"
  } catch {
    return "unknown"
  }
}

/** Store one session's entry point and upsert the device's first-touch row. */
export async function recordTouch(t: TouchInput): Promise<void> {
  await ensureAnalyticsStorage().catch(() => {})
  const p = t.props ?? {}
  const referrer = str(p.landingReferrer, 512)
  // A referrer from our own site is a navigation, not a source.
  const rawHost = hostOf(referrer)
  const ownHost = str(p.host, 128)?.replace(/^www\./, "")
  const referrerHost = ownHost && rawHost === ownHost ? "direct" : rawHost
  const touch = {
    landingPath: str(p.landingPath),
    referrer,
    referrerHost,
    utmSource: str(p.utmSource, 128),
    utmMedium: str(p.utmMedium, 128),
    utmCampaign: str(p.utmCampaign, 128),
    utmContent: str(p.utmContent, 128),
    utmTerm: str(p.utmTerm, 128),
    campaign: str(p.campaignSource, 64),
  }
  const now = new Date()
  try {
    await db.insert(visitorTouch).values({
      id: randomUUID(),
      anonId: t.anonId,
      sessionId: t.sessionId,
      userId: t.userId,
      clickId: str(p.clickId, 16),
      device: t.device,
      createdAt: now,
      ...touch,
    })
    await db
      .insert(visitor)
      .values({
        anonId: t.anonId,
        firstSeenAt: now,
        lastSeenAt: now,
        visitCount: 1,
        firstPath: touch.landingPath,
        firstReferrer: touch.referrer,
        firstReferrerHost: touch.referrerHost,
        utmSource: touch.utmSource,
        utmMedium: touch.utmMedium,
        utmCampaign: touch.utmCampaign,
        utmContent: touch.utmContent,
        utmTerm: touch.utmTerm,
        campaign: touch.campaign,
        device: t.device,
        browser: t.browser,
        os: t.os,
        language: str(p.language, 16),
        userId: t.userId,
        linkedAt: t.userId ? now : null,
        linkedVia: t.userId ? "event" : null,
      })
      .onConflictDoUpdate({
        target: visitor.anonId,
        set: {
          lastSeenAt: now,
          visitCount: sql`${visitor.visitCount} + 1`,
          // Fill attribution the first touch lacked (e.g. arrived direct, came back via a campaign) without overwriting it.
          campaign: sql`coalesce(${visitor.campaign}, ${touch.campaign})`,
        },
      })
  } catch (err) {
    console.log("[v0] journey touch failed:", (err as Error)?.message)
  }
}

/**
 * Tie a device to an account. Only claims devices that are not linked yet, so
 * a shared computer keeps its first owner rather than flip-flopping.
 */
export async function linkVisitor(
  anonId: string | null | undefined,
  userId: string,
  via: "signup" | "login" | "event",
): Promise<void> {
  await ensureAnalyticsStorage().catch(() => {})
  const id = str(anonId, 64)
  if (!id || !userId) return
  const now = new Date()
  try {
    await db
      .insert(visitor)
      .values({ anonId: id, firstSeenAt: now, lastSeenAt: now, userId, linkedAt: now, linkedVia: via })
      .onConflictDoUpdate({
        target: visitor.anonId,
        set: { userId, linkedAt: now, linkedVia: via, lastSeenAt: now },
        setWhere: isNull(visitor.userId),
      })
  } catch (err) {
    console.log("[v0] journey link failed:", (err as Error)?.message)
  }
}

/** Read the anonId cookie out of a raw Cookie header. */
export function anonIdFromCookieHeader(cookie: string | null | undefined): string | null {
  if (!cookie) return null
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${ANON_COOKIE}=([^;]+)`))
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}
