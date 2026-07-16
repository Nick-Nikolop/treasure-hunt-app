// ─────────────────────────────────────────────────────────────────────────
//  Photo-proof-of-location submissions.
//
//  When an explorer cannot (or will not) pass the GPS scan gate, they may
//  upload 1-3 photos as manual proof they are at the mark. A superadmin then
//  approves (which unlocks the lead for their crew) or rejects the submission.
//  This module is the thin data layer over `proof_submission`; progression and
//  the actual unlock live in lib/hunt.ts, and the server actions wire the two
//  together plus the activity log.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { proofSubmission } from "@/lib/db/schema"
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm"
import { randomUUID } from "node:crypto"

export type ProofContext = "denied" | "too_far"
export type ProofStatus = "pending" | "approved" | "rejected"
export type ProofDecision = "approved" | "rejected"

export type ProofRow = typeof proofSubmission.$inferSelect

/** Insert a new pending submission. Returns the created row's id. */
export async function createProofSubmission(input: {
  userId: string
  userName: string
  leadOrder: number
  leadId: string | null
  token: string
  context: ProofContext
  photoUrls: string[]
  note: string | null
}): Promise<string> {
  const id = randomUUID()
  await db.insert(proofSubmission).values({
    id,
    userId: input.userId,
    userName: input.userName,
    leadOrder: input.leadOrder,
    leadId: input.leadId,
    token: input.token,
    context: input.context,
    photoUrls: input.photoUrls,
    note: input.note,
    status: "pending",
  })
  return id
}

/**
 * True if this user already has a pending proof for this lead. Used to stop an
 * explorer stacking multiple pending submissions for the same mark.
 */
export async function hasPendingProof(userId: string, leadOrder: number): Promise<boolean> {
  const rows = await db
    .select({ id: proofSubmission.id })
    .from(proofSubmission)
    .where(
      and(
        eq(proofSubmission.userId, userId),
        eq(proofSubmission.leadOrder, leadOrder),
        eq(proofSubmission.status, "pending"),
      ),
    )
    .limit(1)
  return rows.length > 0
}

/** All pending submissions, oldest first (fair review order). */
export async function getPendingProofs(): Promise<ProofRow[]> {
  return db
    .select()
    .from(proofSubmission)
    .where(eq(proofSubmission.status, "pending"))
    .orderBy(proofSubmission.createdAt)
}

/** Count of pending submissions (for the admin tab badge). */
export async function getPendingProofCount(): Promise<number> {
  const rows = await db
    .select({ id: proofSubmission.id })
    .from(proofSubmission)
    .where(eq(proofSubmission.status, "pending"))
  return rows.length
}

/** The most recently decided submissions (approved/rejected), newest first. */
export async function getRecentDecidedProofs(limit = 20): Promise<ProofRow[]> {
  const rows = await db
    .select()
    .from(proofSubmission)
    .orderBy(desc(proofSubmission.decidedAt))
    .limit(200)
  return rows.filter((r) => r.status !== "pending").slice(0, limit)
}

/** A single submission by id. */
export async function getProofById(id: string): Promise<ProofRow | null> {
  const rows = await db.select().from(proofSubmission).where(eq(proofSubmission.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * This user's decided-but-unacknowledged submissions (newest first). Drives the
 * decision popup: shown live (poll) and on their next visit until acknowledged.
 */
export async function getMyUnacknowledgedDecisions(userId: string): Promise<ProofRow[]> {
  return db
    .select()
    .from(proofSubmission)
    .where(
      and(
        eq(proofSubmission.userId, userId),
        isNull(proofSubmission.acknowledgedAt),
        // decided rows only: status is approved or rejected (pending has no decidedAt)
      ),
    )
    .orderBy(desc(proofSubmission.decidedAt))
    .then((rows) => rows.filter((r) => r.status !== "pending"))
}

/** Mark a decision as seen by the explorer (scoped to that user). */
export async function acknowledgeDecision(id: string, userId: string): Promise<void> {
  await db
    .update(proofSubmission)
    .set({ acknowledgedAt: new Date() })
    .where(and(eq(proofSubmission.id, id), eq(proofSubmission.userId, userId)))
}

/**
 * Record a reviewer's decision on a pending submission. Only flips rows that are
 * still pending (so two admins can't double-decide). Returns the updated row, or
 * null if it was already decided / not found.
 */
export async function decideProof(
  id: string,
  decision: ProofDecision,
  reviewer: { id: string; name: string },
  reason: string | null,
): Promise<ProofRow | null> {
  const rows = await db
    .update(proofSubmission)
    .set({
      status: decision,
      reason: decision === "rejected" ? reason : null,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      decidedAt: new Date(),
    })
    .where(and(eq(proofSubmission.id, id), eq(proofSubmission.status, "pending")))
    .returning()
  return rows[0] ?? null
}

export type DeletedProofs = { count: number; photoUrls: string[] }

/**
 * Delete decided (approved/rejected) submissions by id, to free up storage.
 * Pending rows are never deleted (a review shouldn't be able to vanish out from
 * under an explorer). Returns the count removed and the flat list of their photo
 * URLs so the caller can also purge them from Blob.
 */
export async function deleteProofsByIds(ids: string[]): Promise<DeletedProofs> {
  if (ids.length === 0) return { count: 0, photoUrls: [] }
  const rows = await db
    .delete(proofSubmission)
    .where(and(inArray(proofSubmission.id, ids), ne(proofSubmission.status, "pending")))
    .returning({ photoUrls: proofSubmission.photoUrls })
  return { count: rows.length, photoUrls: rows.flatMap((r) => r.photoUrls) }
}

/**
 * Delete every decided submission (approved/rejected). Pending rows are kept.
 * Returns the count removed and all their photo URLs for Blob cleanup.
 */
export async function deleteAllDecidedProofs(): Promise<DeletedProofs> {
  const rows = await db
    .delete(proofSubmission)
    .where(ne(proofSubmission.status, "pending"))
    .returning({ photoUrls: proofSubmission.photoUrls })
  return { count: rows.length, photoUrls: rows.flatMap((r) => r.photoUrls) }
}
