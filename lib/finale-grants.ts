import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
// NOTE: this module must NOT import from "@/lib/hunt". hunt.ts writes a grant when
// an admin approves a finale photo, so importing a helper back from there would
// form a cycle. The crew is resolved with a local query instead.
import { finaleGrant, teamMember } from "@/lib/db/schema"

/**
 * The three sealed finale reveals an admin can hand out per crew:
 *   note1     — the first handwritten note (points to the compass)
 *   note2     — the second note (points to the treasure)
 *   treasure  — the winner / "you found it" screen
 *
 * A grant is a display permission that sits ON TOP of in-game progress. Nothing
 * shows unless the crew has BOTH reached the step AND been granted it here, so
 * the default (no rows) is fully sealed. This is the lock that stops a crew from
 * surfacing a reveal on its own.
 */
export type FinaleView = "note1" | "note2" | "treasure"
export const FINALE_VIEWS: readonly FinaleView[] = ["note1", "note2", "treasure"]

export type FinaleGrants = { note1: boolean; note2: boolean; treasure: boolean }

const NONE: FinaleGrants = { note1: false, note2: false, treasure: false }

/**
 * Every user id that shares this user's progress: their team's members, or just
 * themselves when solo. Mirrors `getCrewUserIds` in lib/hunt, duplicated here
 * only to keep this module free of the cycle described above.
 */
async function crewIds(userId: string): Promise<string[]> {
  const mine = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  const teamId = mine[0]?.teamId
  if (!teamId) return [userId]
  const mates = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  const ids = mates.map((m) => m.userId)
  return ids.length ? ids : [userId]
}

/**
 * Which reveals the signed-in user's CREW has been granted. A crew shares
 * progress, so a grant to any member counts for all of them: we check every
 * member's rows, not just this user's, so a member who joined or was toggled
 * separately can never desync the crew.
 */
export async function getCrewGrants(userId: string): Promise<FinaleGrants> {
  const crew = await crewIds(userId)
  if (crew.length === 0) return NONE
  const rows = await db
    .select({ view: finaleGrant.view })
    .from(finaleGrant)
    .where(inArray(finaleGrant.userId, crew))
  const out: FinaleGrants = { ...NONE }
  for (const r of rows) {
    if (r.view === "note1") out.note1 = true
    else if (r.view === "note2") out.note2 = true
    else if (r.view === "treasure") out.treasure = true
  }
  return out
}

/**
 * Every granted (userId, view) pair, folded into one set per view. Used by the
 * admin finale audience list to show current state without a query per entrant.
 */
export async function getAllGrants(): Promise<{
  note1: Set<string>
  note2: Set<string>
  treasure: Set<string>
}> {
  const rows = await db
    .select({ userId: finaleGrant.userId, view: finaleGrant.view })
    .from(finaleGrant)
  const out = { note1: new Set<string>(), note2: new Set<string>(), treasure: new Set<string>() }
  for (const r of rows) {
    if (r.view === "note1") out.note1.add(r.userId)
    else if (r.view === "note2") out.note2.add(r.userId)
    else if (r.view === "treasure") out.treasure.add(r.userId)
  }
  return out
}

/**
 * Grant or revoke one reveal for a set of users (a whole crew, or a lone solo).
 * Writing a row per member mirrors how progress is replicated across a crew, so
 * the read side stays simple. Idempotent: granting twice is a no-op, revoking
 * something already absent is a no-op.
 */
export async function setFinaleGrant(input: {
  userIds: string[]
  view: FinaleView
  granted: boolean
  grantedBy?: string | null
}): Promise<void> {
  const userIds = [...new Set(input.userIds)].filter(Boolean)
  if (userIds.length === 0) return

  if (!input.granted) {
    await db
      .delete(finaleGrant)
      .where(and(eq(finaleGrant.view, input.view), inArray(finaleGrant.userId, userIds)))
    return
  }

  await db
    .insert(finaleGrant)
    .values(userIds.map((userId) => ({ userId, view: input.view, grantedBy: input.grantedBy ?? null })))
    .onConflictDoNothing()
}
