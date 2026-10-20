import { NextResponse, type NextRequest } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { recordSourceHit, type SourceClientInfo } from "@/lib/source-hits"
import { hasAnalyticsConsentCookie } from "@/lib/consent-server"

export const dynamic = "force-dynamic"

/** Logs one `?source=` arrival. Always 200 so tracking never surfaces to visitors. */
export async function POST(req: NextRequest) {
  let body: SourceClientInfo = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    userId = session?.user?.id ?? null
  } catch {
    userId = null
  }

  const h = req.headers
  const consent = hasAnalyticsConsentCookie(req)
  // No analytics consent: count the arrival without IP, device ids or fingerprint details.
  const ip = consent ? (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) : null
  if (!consent) {
    const { source, sourceKey, path, query, referrer } = body
    body = { source, sourceKey, path, query, referrer }
  }

  const ok = await recordSourceHit(body, {
    userId: consent ? userId : null,
    ip,
    userAgent: h.get("user-agent"),
    acceptLanguage: h.get("accept-language"),
    geo: {
      country: h.get("x-vercel-ip-country"),
      region: h.get("x-vercel-ip-country-region"),
      city: h.get("x-vercel-ip-city"),
      timezone: h.get("x-vercel-ip-timezone"),
    },
  })

  return NextResponse.json({ ok })
}
