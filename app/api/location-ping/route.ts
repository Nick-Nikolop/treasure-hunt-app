import { NextResponse, type NextRequest } from "next/server"
import { recordLocationPing } from "@/lib/location-ping"

// Public endpoint for the founder-only location-ping diagnostic. The scan page
// at /ping/[token] posts the visitor's coordinates here. We only accept pings
// for a token that actually exists (created by the admin), and store nothing
// beyond lat/lng/accuracy + a coarse user-agent string.
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const token = typeof b?.token === "string" ? b.token : ""
  const lat = Number(b?.lat)
  const lng = Number(b?.lng)
  const accuracyRaw = b?.accuracy
  const accuracy =
    accuracyRaw == null || Number.isNaN(Number(accuracyRaw)) ? null : Number(accuracyRaw)

  if (!token || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "out_of_range" }, { status: 400 })
  }

  const stored = await recordLocationPing({
    token,
    lat,
    lng,
    accuracy,
    userAgent: req.headers.get("user-agent"),
  })

  if (!stored) {
    return NextResponse.json({ ok: false, error: "unknown_token" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
