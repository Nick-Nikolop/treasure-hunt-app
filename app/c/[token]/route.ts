import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getCampaignByToken, recordVisit } from "@/lib/campaigns"

// Tracking redirect for printed marketing (flyers, posters, t-shirts...).
// /c/<token> logs one visit, then 302s to the landing page. Even unknown
// tokens redirect home so a mistyped/retired code never shows an error.
export const dynamic = "force-dynamic"

// Anonymous visitor cookie: lets us collapse repeat visits from the same device
// into a single unique visitor without identifying anyone.
const VISITOR_COOKIE = "cmp_vid"
const ONE_YEAR = 60 * 60 * 24 * 365

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const home = new URL("/", req.url)
  const res = NextResponse.redirect(home)

  // Resolve (or assign) the anonymous visitor id and persist it on the response.
  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value ?? null
  if (!visitorId) {
    visitorId = randomUUID()
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: ONE_YEAR,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  }

  try {
    const link = await getCampaignByToken(token)
    if (link) {
      await recordVisit({
        linkId: link.id,
        visitorId,
        userAgent: req.headers.get("user-agent"),
        referrer: req.headers.get("referer"),
      })
    }
  } catch {
    // Never let a logging failure block the redirect.
  }

  return res
}
