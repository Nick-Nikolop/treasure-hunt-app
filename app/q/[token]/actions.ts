"use server"

import { headers } from "next/headers"
import { put } from "@vercel/blob"
import { auth } from "@/lib/auth"
import { getAdminUser } from "@/lib/admin"
import {
  checkScanLocation,
  resolveScanContext,
  unlockByToken,
  type UnlockResult,
} from "@/lib/hunt"
import { getLeadDefs } from "@/lib/leads"
import { createProofSubmission, hasPendingProof, type ProofContext } from "@/lib/proofs"
import { logActivity } from "@/lib/activity"

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

export type BypassCooldownResponse =
  | { ok: true; result: UnlockResult }
  | { ok: false; reason: "auth" | "forbidden" }

/**
 * Superadmin-only: unlock the scanned lead while skipping the anti-cheat solve
 * cooldown. Ordering rules still apply. Used by the bypass button on the
 * cooldown card so an admin isn't blocked by the wait during the event.
 */
export async function bypassCooldownScan(token: string): Promise<BypassCooldownResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, reason: "auth" }

  const admin = await getAdminUser()
  if (!admin) return { ok: false, reason: "forbidden" }

  const result = await unlockByToken(session.user.id, token, { bypassCooldown: true })
  return { ok: true, result }
}

// Photo-proof fallback: at most 3 images, each <=10 MB, images only.
const MAX_PROOF_PHOTOS = 3
const MAX_PROOF_BYTES = 10 * 1024 * 1024
const PROOF_CONTEXTS: ProofContext[] = ["denied", "too_far"]

export type SubmitProofResponse =
  | { ok: true }
  | {
      ok: false
      reason: "auth" | "not_verify" | "duplicate" | "no_files" | "too_many" | "too_large" | "bad_type"
    }

/**
 * Submit 1-3 photos as manual proof of presence when the GPS gate was denied or
 * the explorer was too far. Re-checks that this really is the crew's in-order
 * next gated lead (so proofs can't be filed for arbitrary/finished leads), guards
 * against a duplicate pending proof, uploads the images to Blob, and records a
 * pending submission for a superadmin to review. Raw coordinates are never
 * stored, only the `context` label ("denied" | "too_far").
 */
export async function submitLocationProof(
  token: string,
  formData: FormData,
): Promise<SubmitProofResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, reason: "auth" }
  const userId = session.user.id

  // Must be a genuine in-order, location-gated lead for this crew.
  const ctx = await resolveScanContext(userId, token)
  if (ctx.mode !== "verify") return { ok: false, reason: "not_verify" }
  const leadOrder = ctx.leadOrder

  const contextRaw = String(formData.get("context") ?? "")
  const context: ProofContext = PROOF_CONTEXTS.includes(contextRaw as ProofContext)
    ? (contextRaw as ProofContext)
    : "denied"
  const noteRaw = String(formData.get("note") ?? "").trim()
  const note = noteRaw ? noteRaw.slice(0, 500) : null

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { ok: false, reason: "no_files" }
  if (files.length > MAX_PROOF_PHOTOS) return { ok: false, reason: "too_many" }
  for (const f of files) {
    if (f.size > MAX_PROOF_BYTES) return { ok: false, reason: "too_large" }
    if (!f.type.startsWith("image/")) return { ok: false, reason: "bad_type" }
  }

  // One pending proof per lead per explorer.
  if (await hasPendingProof(userId, leadOrder)) return { ok: false, reason: "duplicate" }

  const def = (await getLeadDefs()).find((d) => d.order === leadOrder)
  const leadId = def?.id ?? null

  // Upload each image to Blob. Access is public but the random suffix makes the
  // URL unguessable, matching how lead stamp images are stored.
  const photoUrls: string[] = []
  for (const f of files) {
    const ext = f.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg"
    const blob = await put(`proofs/${userId}-${leadOrder}-${Date.now()}.${ext}`, f, {
      access: "public",
      addRandomSuffix: true,
      contentType: f.type,
    })
    photoUrls.push(blob.url)
  }

  await createProofSubmission({
    userId,
    userName: session.user.name ?? "Explorer",
    leadOrder,
    leadId,
    token,
    context,
    photoUrls,
    note,
  })

  await logActivity({
    category: "lead",
    action: "proof.submitted",
    actorId: userId,
    actorName: session.user.name ?? "Explorer",
    targetUserId: userId,
    targetUserName: session.user.name ?? "Explorer",
    leadOrder,
    summary: `${session.user.name ?? "An explorer"} submitted photo proof for lead No. ${String(
      leadOrder,
    ).padStart(2, "0")}`,
    metadata: { context, photoCount: photoUrls.length },
  })

  return { ok: true }
}
