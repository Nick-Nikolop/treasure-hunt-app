"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAdminUser } from "@/lib/admin"
import { del } from "@vercel/blob"
import {
  checkScanLocation,
  resolveScanContext,
  unlockByToken,
  getCrewUserIds,
  getFinishPlacement,
  type UnlockResult,
} from "@/lib/hunt"
import { getFinaleConfig, composeCompassNote } from "@/lib/finale"
import { getOrAssignCompassVariant, resolveCrewKey } from "@/lib/compass-variant"
import { getLeadDefs } from "@/lib/leads"
import {
  createProofSubmission,
  getCrewPendingProof,
  deletePendingCrewProofs,
  type ProofContext,
} from "@/lib/proofs"
import { logActivity } from "@/lib/activity"
import { recordScanPing } from "@/lib/scan-ping"

/**
 * Client payload for a location-gated scan: either the explorer's reported
 * position (with optional GPS accuracy in metres), or a superadmin request to
 * skip the check. The coordinates are compared against the lead's mark and are
 * also captured to `scan_ping` for the founder's manual proof review.
 */
export type ScanVerifyPayload =
  | { lat: number; lng: number; accuracy?: number }
  | { skip: true }

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

  // Recorded on the unlock so the activity feed can tell an automated GPS pass
  // apart from an unverified superadmin bypass. Both arrive via the same QR.
  let source: "gps" | "skip" = "gps"

  if ("skip" in payload) {
    // Only superadmins may bypass the location gate. This is the placeholder
    // fallback so an admin can proceed if their location is denied/unavailable.
    const admin = await getAdminUser()
    if (!admin) return { ok: false, reason: "forbidden_skip" }
    source = "skip"
  } else {
    const check = await checkScanLocation(token, payload.lat, payload.lng)
    // Silently record where this scan was attempted from. Best-effort only: it
    // never throws (see recordScanPing), so it cannot affect the scan outcome.
    await recordScanPing({
      userId: session.user.id,
      token,
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? null,
      distanceM: check.ok ? null : check.distanceM ?? null,
      radiusM: check.ok ? null : check.radiusM ?? null,
      ok: check.ok,
    })
    if (!check.ok) {
      return {
        ok: false,
        reason: "too_far",
        distanceM: check.distanceM ?? 0,
        radiusM: check.radiusM,
      }
    }
  }

  const result = await unlockByToken(session.user.id, token, {}, source)
  return { ok: true, result }
}

export type FinaleSummary = {
  /** 1-based finish position (who reached the compass first), or null. */
  place: number | null
  /** How many crews/solos have finished so far. */
  totalFinishers: number
  /**
   * The trail-end note (Pytheas's first note), both languages, already ending
   * with this crew's assigned hiding hint.
   */
  note1: string
  note1En: string
  /** The shared "put the compass back" aside shown under the compass note. */
  compassReturn: string
  compassReturnEn: string
  /** The call-to-action stamped under the first note, both languages. */
  note1Cta: string
  note1CtaEn: string
  /** The compass-scan note, both languages. */
  note2: string
  note2En: string
  /** The call-to-action stamped under that note, both languages. */
  note2Cta: string
  note2CtaEn: string
  /** The winner-screen message, both languages. */
  winner: string
  winnerEn: string
  /** The top-3 prize fine-print, both languages. */
  winnerNote: string
  winnerNoteEn: string
}

/**
 * Everything the winner screen needs after a finish: the crew's finishing
 * placement (by finish order) plus the editable compass note and winner
 * message. Safe to call for any signed-in explorer; placement is null until
 * their crew has actually scanned the compass.
 */
export async function getFinaleSummary(): Promise<FinaleSummary | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const [placement, finale, crewKey] = await Promise.all([
    getFinishPlacement(session.user.id),
    getFinaleConfig(),
    resolveCrewKey(session.user.id),
  ])

  // Assign on demand so the hint shown the instant the trail-end QR is scanned is
  // the same one the journal will keep showing this crew.
  const composed = composeCompassNote(finale, await getOrAssignCompassVariant(crewKey))

  return {
    place: placement.place,
    totalFinishers: placement.totalFinishers,
    note1: composed.body,
    note1En: composed.bodyEn,
    compassReturn: finale.compassReturn,
    compassReturnEn: finale.compassReturnEn,
    note1Cta: finale.note1Cta,
    note1CtaEn: finale.note1CtaEn,
    note2: finale.note2,
    note2En: finale.note2En,
    note2Cta: finale.note2Cta,
    note2CtaEn: finale.note2CtaEn,
    winner: finale.winner,
    winnerEn: finale.winnerEn,
    winnerNote: finale.winnerNote,
    winnerNoteEn: finale.winnerNoteEn,
  }
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

  // "skip": this call performs no location check of its own, so it must not be
  // logged as an automated GPS pass even though the crew may have passed one
  // moments earlier on the gate screen.
  const result = await unlockByToken(session.user.id, token, { bypassCooldown: true }, "skip")
  return { ok: true, result }
}

// Photo-proof fallback: at most 3 images. The images themselves are uploaded
// directly from the browser to Blob (see app/api/proof-upload/route.ts); this
// action only receives their resulting URLs, keeping the payload tiny and
// avoiding the Server Action request-body limit.
const MAX_PROOF_PHOTOS = 3
const PROOF_CONTEXTS: ProofContext[] = ["denied", "too_far"]

export type SubmitProofResponse =
  | { ok: true }
  | {
      ok: false
      reason: "auth" | "not_verify" | "duplicate" | "no_files" | "too_many" | "bad_url"
    }
  // Unexpected failure. `detail` is only populated for superadmins, so a
  // technical message can be surfaced (and copied) to them.
  | { ok: false; reason: "error"; detail?: string }

export type SubmitProofInput = {
  context: string
  note?: string
  /** Blob URLs of the images already uploaded from the client. */
  photoUrls: string[]
  /**
   * When true, delete the crew's existing pending proof for this lead first, so
   * the new submission replaces it instead of being rejected as a duplicate.
   */
  replace?: boolean
}

export type ScanPendingProof =
  | { pending: false }
  | {
      pending: true
      photoUrls: string[]
      note: string | null
      /** Who filed it, and whether that was the current explorer. */
      submittedByName: string
      isMine: boolean
      leadOrder: number
      country: string
      countryEn: string
    }

/**
 * If the crew already has a pending photo proof for the lead this token unlocks,
 * return it (photos + note + who sent it) so a re-scan can show an "already
 * submitted" state instead of asking again. Returns `{ pending: false }` when
 * there is nothing pending or the scan isn't a genuine in-order gated unlock.
 */
export async function getScanPendingProof(token: string): Promise<ScanPendingProof> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { pending: false }
  const userId = session.user.id

  const ctx = await resolveScanContext(userId, token)
  if (ctx.mode !== "verify") return { pending: false }

  const crew = await getCrewUserIds(userId)
  const existing = await getCrewPendingProof(crew, ctx.leadOrder)
  if (!existing) return { pending: false }

  const def = (await getLeadDefs()).find((d) => d.order === ctx.leadOrder)
  return {
    pending: true,
    photoUrls: existing.photoUrls,
    note: existing.note,
    submittedByName: existing.userName,
    isMine: existing.userId === userId,
    leadOrder: ctx.leadOrder,
    country: def?.country ?? "",
    countryEn: def?.countryEn ?? def?.country ?? "",
  }
}

/** A URL is an acceptable proof photo only if it's an https Blob URL under the proofs/ prefix. */
function isValidProofUrl(url: unknown): url is string {
  if (typeof url !== "string") return false
  try {
    const u = new URL(url)
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".blob.vercel-storage.com") &&
      u.pathname.startsWith("/proofs/")
    )
  } catch {
    return false
  }
}

/**
 * Record 1-3 already-uploaded photos as manual proof of presence when the GPS
 * gate was denied or the explorer was too far. Re-checks that this really is the
 * crew's in-order next gated lead (so proofs can't be filed for arbitrary or
 * finished leads), guards against a duplicate pending proof, validates the photo
 * URLs, and records a pending submission for a superadmin to review. Raw
 * coordinates are never stored, only the `context` label ("denied" | "too_far").
 */
export async function submitLocationProof(
  token: string,
  input: SubmitProofInput,
): Promise<SubmitProofResponse> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, reason: "auth" }
  const userId = session.user.id

  // Must be a genuine in-order, location-gated lead for this crew.
  const ctx = await resolveScanContext(userId, token)
  if (ctx.mode !== "verify") return { ok: false, reason: "not_verify" }
  const leadOrder = ctx.leadOrder

  const context: ProofContext = PROOF_CONTEXTS.includes(input.context as ProofContext)
    ? (input.context as ProofContext)
    : "denied"
  const noteRaw = (input.note ?? "").trim()
  const note = noteRaw ? noteRaw.slice(0, 500) : null

  const photoUrls = Array.isArray(input.photoUrls) ? input.photoUrls : []
  if (photoUrls.length === 0) return { ok: false, reason: "no_files" }
  if (photoUrls.length > MAX_PROOF_PHOTOS) return { ok: false, reason: "too_many" }
  if (!photoUrls.every(isValidProofUrl)) return { ok: false, reason: "bad_url" }

  // One pending proof per lead per crew. If replacing, delete the crew's current
  // pending submission (and its photos) first; otherwise a duplicate is blocked.
  const crew = await getCrewUserIds(userId)
  if (input.replace) {
    const removed = await deletePendingCrewProofs(crew, leadOrder)
    if (removed.photoUrls.length > 0) {
      try {
        await del(removed.photoUrls)
      } catch {
        // orphaned blobs are harmless; don't block the replacement
      }
    }
  } else if (await getCrewPendingProof(crew, leadOrder)) {
    return { ok: false, reason: "duplicate" }
  }

  const def = (await getLeadDefs()).find((d) => d.order === leadOrder)
  const leadId = def?.id ?? null

  try {
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
  } catch (err) {
    // Surface the raw error to superadmins only (so they can copy/report it);
    // regular explorers just see a generic failure message.
    const admin = await getAdminUser()
    if (!admin) return { ok: false, reason: "error" }
    const detail =
      err instanceof Error
        ? `${err.name}: ${err.message}${err.stack ? `\n\n${err.stack}` : ""}`
        : String(err)
    return { ok: false, reason: "error", detail }
  }
}
