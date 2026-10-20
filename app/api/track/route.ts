import { NextResponse, type NextRequest } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { recordEvents, type IncomingEvent } from "@/lib/analytics"
import { hasAnalyticsConsentCookie, isServiceEvent } from "@/lib/consent-server"

// Analytics ingestion. The client batches events and POSTs them here (via
// fetch keepalive or navigator.sendBeacon). We resolve the signed-in user from
// the session cookie server-side (never trusting a client-supplied id), then
// persist. Always returns 200 so a tracking failure never surfaces to users.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let events: IncomingEvent[] = []
  try {
    const body = await req.json()
    events = Array.isArray(body?.events) ? body.events : []
  } catch {
    return NextResponse.json({ ok: true, written: 0 })
  }
  if (events.length === 0) return NextResponse.json({ ok: true, written: 0 })

  // Resolve the signed-in user from the session (best-effort; anonymous is fine).
  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    userId = session?.user?.id ?? null
  } catch {
    userId = null
  }

  const userAgent = req.headers.get("user-agent")
  if (hasAnalyticsConsentCookie(req)) {
    const written = await recordEvents(events, { userId, userAgent })
    return NextResponse.json({ ok: true, written })
  }

  // No analytics consent: keep anonymous counts only. Device/session ids are
  // dropped, and only service records (account, gameplay) keep the account link.
  const anonymous = events
    .filter((e) => e && typeof e.name === "string")
    .map((e) => ({ ...e, anonId: undefined, sessionId: undefined }))
  const service = anonymous.filter((e) => isServiceEvent(e.name))
  const other = anonymous.filter((e) => !isServiceEvent(e.name))
  const [a, b] = await Promise.all([
    service.length && userId ? recordEvents(service, { userId, userAgent }) : 0,
    recordEvents(userId ? other : anonymous, { userId: null, userAgent }),
  ])
  const written = a + b

  return NextResponse.json({ ok: true, written })
}
