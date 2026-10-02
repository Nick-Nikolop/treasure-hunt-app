import "server-only"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAdminUser, isAiEyeEmail, isBootstrapEmail } from "@/lib/admin"
import { SITE_MAINTENANCE } from "@/lib/maintenance"

/**
 * True when the current request must see the maintenance screen. Only the founder
 * (kept a superadmin via `getAdminUser`'s bootstrap promotion) and the AI EYE
 * account get through, and both must still resolve as superadmin; every other
 * visitor, signed in or not, is held at the screen.
 */
const OPEN_DURING_MAINTENANCE = ["/vote", "/brand"]

function isOpenPath(pathname: string | null): boolean {
  if (!pathname) return false
  return OPEN_DURING_MAINTENANCE.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function isHeldByMaintenance(): Promise<boolean> {
  if (!SITE_MAINTENANCE) return false
  const requestHeaders = await headers()
  // Unlisted pages anyone with the link may open (the team brand vote and its reference page).
  if (isOpenPath(requestHeaders.get("x-pathname"))) return false
  const session = await auth.api.getSession({ headers: requestHeaders })
  const email = session?.user?.email
  if (!isBootstrapEmail(email) && !isAiEyeEmail(email)) return true
  const admin = await getAdminUser()
  return admin === null
}
