// Server-side persistence for cookie-consent decisions. One row is written per
// decision the visitor makes in the banner, giving us an auditable GDPR record
// of who consented to what (and to which policy version) and when.
//
// Writing is best-effort: a failure here must never break a page render, so the
// insert swallows errors with a console warning, mirroring lib/analytics.ts.

import { db } from "@/lib/db"
import { cookieConsent } from "@/lib/db/schema"
import { randomUUID } from "node:crypto"
import type { CookieDecision } from "@/lib/legal"

export type IncomingConsent = {
  decision: CookieDecision
  /** Whether the visitor allowed non-essential analytics cookies. */
  analytics?: boolean
  anonId?: string | null
  policyVersion?: string | null
  locale?: string | null
  path?: string | null
}

export type ConsentContext = {
  /** Signed-in user id, resolved server-side from the session (never trusted from the client). */
  userId?: string | null
  userAgent?: string | null
}

function isDecision(value: unknown): value is CookieDecision {
  return value === "accepted" || value === "rejected"
}

/**
 * Record a single cookie-consent decision. Returns true when a row was written.
 * Never throws.
 */
export async function recordCookieConsent(
  input: IncomingConsent,
  ctx: ConsentContext = {},
): Promise<boolean> {
  if (!isDecision(input.decision)) return false

  try {
    await db.insert(cookieConsent).values({
      id: randomUUID(),
      anonId: input.anonId?.slice(0, 128) ?? null,
      userId: ctx.userId ?? null,
      decision: input.decision,
      // "accepted" implies analytics on; "rejected" is necessary-only.
      analytics: input.decision === "accepted" ? true : Boolean(input.analytics),
      policyVersion: input.policyVersion?.slice(0, 32) ?? null,
      locale: input.locale?.slice(0, 8) ?? null,
      path: input.path?.slice(0, 512) ?? null,
      userAgent: ctx.userAgent?.slice(0, 512) ?? null,
    })
    return true
  } catch (err) {
    console.warn("[v0] recordCookieConsent failed:", err)
    return false
  }
}
