"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAdminUser } from "@/lib/admin"
import { checkScanLocation, unlockByToken, type UnlockResult } from "@/lib/hunt"

/**
 * Client payload for a location-gated scan: either the explorer's reported
 * position, or a superadmin request to skip the check. Reported coordinates
 * are used only to compare against the lead's mark and are never stored.
 */
export type ScanVerifyPayload = { lat: number; lng: number } | { skip: true }

export type VerifyScanResponse =
  | { ok: true; result: UnlockResult }
  | { ok: false; reason: "too_far"; distanceM: number; radiusM: number }
  | { ok: false; reason: "auth" }
  | { ok: false; reason: "forbidden_skip" }

/**
 * Verify an explorer is at the lead's location (or let a superadmin skip), then
 * perform the real unlock. The unlock itself re-validates order/cooldown, so a
 * passed check never bypasses progression rules.
 */
export async function verifyScan(
  token: string,
  payload: ScanVerifyPayload,
): Promise<VerifyScanResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, reason: "auth" }

  if ("skip" in payload) {
    // Only superadmins may bypass the location gate. This is the placeholder
    // fallback so an admin can proceed if their location is denied/unavailable.
    const admin = await getAdminUser()
    if (!admin) return { ok: false, reason: "forbidden_skip" }
  } else {
    const check = await checkScanLocation(token, payload.lat, payload.lng)
    if (!check.ok) {
      return {
        ok: false,
        reason: "too_far",
        distanceM: check.distanceM ?? 0,
        radiusM: check.radiusM,
      }
    }
  }

  const result = await unlockByToken(session.user.id, token)
  return { ok: true, result }
}
