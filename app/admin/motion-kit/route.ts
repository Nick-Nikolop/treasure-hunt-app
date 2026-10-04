import { NextResponse, type NextRequest } from "next/server"
import { getAdminUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

// The zip (~42 MB) is too large to stream through a function, so it is served
// statically under an unguessable name and only handed out to admins here.
const KIT_PATH = "/downloads/the-hunt-motion-kit-f6de284e31a5f5bb90bb6841.zip"

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.redirect(new URL("/", request.url))
  return NextResponse.redirect(new URL(KIT_PATH, request.url))
}
