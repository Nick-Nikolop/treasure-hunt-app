import "server-only"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadUnlock, team, teamMember } from "@/lib/db/schema"
import { COMPASS_ORDER, FINISH_ORDER, TRAIL_END_ORDER } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"
import { getCrewUserIds, setProgressForUsers } from "@/lib/hunt"
import { getFinaleConfig, isTrailEndHeld } from "@/lib/finale"
import { getCrewGrants, type FinaleGrants } from "@/lib/finale-grants"
import { logActivity } from "@/lib/activity"

// ─────────────────────────────────────────────────────────────────────────
//  Automated re-placement.
//
//  The finale grants are the SOURCE OF TRUTH for where a crew stands past the
//  end of the trail. On every journal load we compare where the crew actually
//  sits (its sentinel rows) against where its grants say it belongs, and move it
//  if they disagree. That is what stops crews from drifting on their own: a crew
//  can no longer promote itself past the step its grants allow, because the next
//  page load pulls it straight back.
//
//  The ladder, exactly as the grants describe it:
//    note1 only          → hunting the compass (trail-end row only)
//    note1 + note2       → hunting the treasure (compass row too)
//    note1 + note2 + tre.→ the winner screen    (finish row too)
//
//  While the hold is ON nobody moves up: everyone at the end of the trail waits,
//  which is the whole point of the hold.
//
//  Only crews that have ALREADY closed the trail are touched. A crew still
//  working through the leads is never repositioned by this pass.
// ─────────────────────────────────────────────────────────────────────────

/** The three places a crew can stand once the trail is closed. */
export type FinalePlacement = "hold" | "compass" | "treasure"

const PLACEMENT_LABEL: Record<FinalePlacement, string> = {
  hold: "waiting after the trail",
  compass: "hunting the treasure",
  treasure: "the winner screen",
}

/**
 * Where a crew belongs, from its grants alone. Read highest-first so a crew that
 * was granted out of order (treasure but no note2, say) still lands on the rung
 * its top grant implies rather than being stranded below it.
 */
export function placementForGrants(
  grants: FinaleGrants,
  held: boolean,
): FinalePlacement {
  if (held) return "hold"
  if (grants.treasure) return "treasure"
  if (grants.note2) return "compass"
  // note1-only (and no grants at all) both wait at the end of the trail: note 1
  // points at the compass, so the crew has not reached it yet.
  return "hold"
}

/** Where the crew actually stands right now, from its sentinel rows. */
function placementFromRows(orders: Set<number>): FinalePlacement {
  if (orders.has(FINISH_ORDER)) return "treasure"
  if (orders.has(COMPASS_ORDER)) return "compass"
  return "hold"
}

/**
 * Put one crew where its grants say it belongs. Cheap and idempotent: two reads,
 * and a write ONLY when the placement actually changes, so the common case (a
 * crew already in the right spot) costs nothing and never logs.
 *
 * Best-effort by design. This runs on a page render, so a failure here must never
 * take the journal down with it.
 */
export async function reconcileFinalePlacement(userId: string): Promise<void> {
  try {
    const crew = await getCrewUserIds(userId)
    if (crew.length === 0) return

    const rows = await db
      .select({ leadOrder: leadUnlock.leadOrder })
      .from(leadUnlock)
      .where(inArray(leadUnlock.userId, crew))
    const orders = new Set(rows.map((r) => r.leadOrder))

    // Not past the end of the trail yet: leave the crew completely alone.
    if (!orders.has(TRAIL_END_ORDER)) return

    const [finale, grants] = await Promise.all([getFinaleConfig(), getCrewGrants(userId)])
    const held = isTrailEndHeld(finale)

    const from = placementFromRows(orders)
    const to = placementForGrants(grants, held)
    if (from === to) return

    // `setProgressForUsers` writes the endgame rows cumulatively and trims what
    // sits above the target, so it both promotes and demotes in one call.
    await setProgressForUsers(crew, await getTotalLeads(), "admin", to)

    // Name the crew in the log so the entry is readable without cross-checking ids.
    let teamId: string | null = null
    let teamName: string | null = null
    const membership = await db
      .select({ id: team.id, name: team.name })
      .from(teamMember)
      .innerJoin(team, eq(team.id, teamMember.teamId))
      .where(eq(teamMember.userId, userId))
      .limit(1)
    if (membership[0]) {
      teamId = membership[0].id
      teamName = membership[0].name
    }

    await logActivity({
      category: "auto",
      action: "auto.replacement",
      teamId,
      teamName,
      targetUserId: teamId ? null : userId,
      summary: `${teamName ?? "Solo player"} moved from ${PLACEMENT_LABEL[from]} to ${PLACEMENT_LABEL[to]}${
        held ? " (hold is on)" : ""
      }`,
      metadata: {
        from,
        to,
        held,
        grants,
        crewSize: crew.length,
        reason: held ? "hold_active" : "grants",
      },
    })
  } catch (err) {
    console.warn("[v0] reconcileFinalePlacement failed", err)
  }
}
