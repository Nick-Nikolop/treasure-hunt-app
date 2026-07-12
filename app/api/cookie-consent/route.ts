import { NextResponse, type NextRequest } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { recordCookieConsent, type IncomingConsent } from "@/lib/cookie-consent"

// Cookie-consent ingestion. The banner POSTs the visitor's decision here. We
// resolve the signed-in user from the session cookie server-side (never trusting
// a client-supplied id), then persist an auditable record. Always returns 200 so
// a logging failure never surfaces to the visitor.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let body: Partial<IncomingConsent> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    userId = session?.user?.id ?? null
  } catch {
    userId = null
  }

  const ok = await recordCookieConsent(
    {
      decision: body.decision as IncomingConsent["decision"],
      analytics: body.analytics,
      anonId: body.anonId ?? null,
      policyVersion: body.policyVersion ?? null,
      locale: body.locale ?? null,
      path: body.path ?? null,
    },
    { userId, userAgent: req.headers.get("user-agent") },
  )

  return NextResponse.json({ ok })
}
