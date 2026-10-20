import "server-only"
import type { NextRequest } from "next/server"
import { COOKIE_CONSENT_COOKIE } from "@/lib/legal"

/**
 * Server-side truth for "did this visitor accept analytics cookies?", read from
 * the consent cookie on the request. Tracking routes enforce it themselves so a
 * stale or tampered client can't store identifiers without consent.
 */
export function hasAnalyticsConsentCookie(req: NextRequest): boolean {
  const raw = req.cookies.get(COOKIE_CONSENT_COOKIE)?.value
  if (!raw) return false
  for (const candidate of [raw, safeDecode(raw)]) {
    try {
      return (JSON.parse(candidate) as { decision?: string }).decision === "accepted"
    } catch {
      // Try the next encoding.
    }
  }
  return false
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

/**
 * Events that are records of using the service itself (account, gameplay), so
 * they stay tied to a signed-in account even without analytics consent.
 */
export function isServiceEvent(name: string): boolean {
  return /^(auth|hunt|team|hint)\./.test(name)
}
