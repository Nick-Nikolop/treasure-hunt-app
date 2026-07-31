// ─────────────────────────────────────────────────────────────────────────
//  Round-robin compass hint variants.
//
//  NOTE 2 (the compass-scan note) closes with ONE of four hiding hints, handed
//  out in strict rotation: the first crew to scan the compass gets variant 1, the
//  next gets variant 2, and so on, wrapping back around after the fourth.
//
//  The hints rode on note 1 until 07-31, so the assignment used to happen at the
//  trail end. Nothing in this module changed with that move; only the caller's
//  gate did. The table and sequence keep their "compass" names.
//
//  Two properties matter and both are enforced here rather than in the UI:
//
//    1. STICKY. Once a crew has been handed a variant it must read the same one
//       forever, on every reopen and for every teammate. The note names a real
//       hiding place, so a crew that saw "near the lighthouse" and later read
//       "under the stones" would be sent on a wild goose chase. The assignment
//       is therefore persisted on first read, never recomputed.
//
//    2. PER CREW, NOT PER PLAYER. Teammates hunt together, so the whole team
//       shares one variant. The key mirrors the entity idea used by crew
//       progress: "team:<teamId>" when the explorer is on a team, else
//       "solo:<userId>".
//
//  Storage is provisioned at runtime with CREATE TABLE / CREATE SEQUENCE IF NOT
//  EXISTS, exactly like the finale columns in lib/finale.ts, because this
//  project has no drizzle-kit and the hunt is live. It is deliberately kept off
//  the shared Drizzle schema object so no select-all read can reference a table
//  that an older deploy has not created yet.
// ─────────────────────────────────────────────────────────────────────────

import "server-only"
import { pool } from "@/lib/db"

/**
 * How many hint variants exist. FIXED at four on purpose: the stored assignment
 * is an index into this set, so growing or shrinking the set would silently
 * re-point every crew that has already read its note. Admins edit the four
 * texts, never the count.
 */
export const COMPASS_VARIANT_COUNT = 4

/** Stable per-crew key: teammates share one variant, solo explorers get their own. */
export function crewKeyFor(teamId: string | null, userId: string): string {
  return teamId ? `team:${teamId}` : `solo:${userId}`
}

/**
 * The crew key for an explorer, looking up their team membership.
 *
 * Falls back to their solo key if the lookup fails, so a database hiccup can
 * never block the note. Worst case a teammate is assigned separately, which is
 * still a valid hint, rather than the note failing to open.
 */
export async function resolveCrewKey(userId: string): Promise<string> {
  try {
    const res = await pool.query(
      `SELECT "teamId" FROM "team_member" WHERE "userId" = $1 LIMIT 1`,
      [userId],
    )
    const row = res.rows[0] as { teamId: string | null } | undefined
    return crewKeyFor(row?.teamId ?? null, userId)
  } catch {
    return crewKeyFor(null, userId)
  }
}

let ensured: Promise<void> | null = null

/**
 * Create the assignment table and its rotation counter, at most once per
 * process. The sequence is what makes the rotation race-free: two crews landing
 * at the same instant each take a distinct number from it, so neither can be
 * handed the variant meant for the other.
 */
function ensureStorage(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS "compass_note_variant" (
           "crewKey" text PRIMARY KEY,
           "variantIndex" integer NOT NULL,
           "assignedAt" timestamp NOT NULL DEFAULT now()
         )`,
      )
      await pool.query(`CREATE SEQUENCE IF NOT EXISTS "compass_note_variant_seq"`)
    })().catch((err) => {
      // Reset so a transient failure can retry on the next call.
      ensured = null
      throw err
    })
  }
  return ensured
}

/** Normalize any stored index back into range, so bad data can never crash a read. */
function safeIndex(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return ((Math.trunc(n) % COMPASS_VARIANT_COUNT) + COMPASS_VARIANT_COUNT) % COMPASS_VARIANT_COUNT
}

/**
 * The variant this crew has already been given, or null when they have not been
 * assigned one yet. Read-only: this NEVER assigns, so it is safe for the admin
 * panel and for previews, neither of which should consume a slot in the
 * rotation and skew what the next real crew receives.
 */
export async function peekCompassVariant(crewKey: string): Promise<number | null> {
  try {
    await ensureStorage()
    const res = await pool.query(
      `SELECT "variantIndex" AS i FROM "compass_note_variant" WHERE "crewKey" = $1 LIMIT 1`,
      [crewKey],
    )
    const row = res.rows[0] as { i: number } | undefined
    return row ? safeIndex(row.i) : null
  } catch {
    return null
  }
}

/**
 * The crew's variant index, assigning the next one in rotation on first call.
 *
 * Returns 0 if the storage is somehow unavailable rather than throwing: a
 * database hiccup must never block a crew from reading the note they earned.
 * They would see the first hint, which is a valid hint, instead of an error.
 */
export async function getOrAssignCompassVariant(crewKey: string): Promise<number> {
  try {
    await ensureStorage()

    // Fast path. Also keeps the sequence from being burned on every reopen,
    // which would leave large gaps and unbalance the rotation.
    const existing = await peekCompassVariant(crewKey)
    if (existing !== null) return existing

    // Take the next number in the rotation. DO NOTHING covers the race where the
    // same crew opens the note twice at once; the follow-up read resolves it.
    const res = await pool.query(
      `INSERT INTO "compass_note_variant" ("crewKey", "variantIndex")
       VALUES ($1, (nextval('compass_note_variant_seq') - 1) % $2)
       ON CONFLICT ("crewKey") DO NOTHING
       RETURNING "variantIndex" AS i`,
      [crewKey, COMPASS_VARIANT_COUNT],
    )
    const row = res.rows[0] as { i: number } | undefined
    if (row) return safeIndex(row.i)

    const raced = await peekCompassVariant(crewKey)
    return raced ?? 0
  } catch {
    return 0
  }
}

export type CompassVariantAssignment = {
  crewKey: string
  variantIndex: number
  assignedAt: Date
}

/** Every assignment handed out so far, newest first, for the admin panel. */
export async function listCompassVariantAssignments(): Promise<CompassVariantAssignment[]> {
  try {
    await ensureStorage()
    const res = await pool.query(
      `SELECT "crewKey", "variantIndex", "assignedAt"
         FROM "compass_note_variant" ORDER BY "assignedAt" DESC`,
    )
    return (res.rows as { crewKey: string; variantIndex: number; assignedAt: Date }[]).map((r) => ({
      crewKey: r.crewKey,
      variantIndex: safeIndex(r.variantIndex),
      assignedAt: r.assignedAt,
    }))
  } catch {
    return []
  }
}
