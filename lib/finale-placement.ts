import "server-only"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadUnlock, team, teamMember } from "@/lib/db/schema"
import { COMPASS_ORDER, FINISH_ORDER, TRAIL_END_ORDER } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"
import { getCrewUserIds, setProgressForUsers } from "@/lib/hunt"
import { getFinaleConfig, isTrailEndHeld } from "@/lib/finale"
import { isHoldBypassedForAny } from "@/lib/maintenance"
import { getCrewGrants, getAllGrants, type FinaleGrants } from "@/lib/finale-grants"
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
 * Has this crew closed the trail?
 *
 * Any ONE of the three endgame rows counts, NOT the trail-end row specifically.
 * Crews that finished under the older flow hold the compass/finish row with no
 * trail-end row at all, and requiring trail-end made this pass skip exactly the
 * crews most in need of correction (two teams were sitting on the winner screen,
 * invisible to both the sweep and the admin list).
 */
export function isPastTrailEnd(orders: Set<number>): boolean {
  return (
    orders.has(TRAIL_END_ORDER) || orders.has(COMPASS_ORDER) || orders.has(FINISH_ORDER)
  )
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
    if (!isPastTrailEnd(orders)) return

    const [finale, grants, holdBypassed] = await Promise.all([
      getFinaleConfig(),
      getCrewGrants(userId),
      isHoldBypassedForAny(crew),
    ])
    // The bypass crew is exempt from the hold here too, not just at the scan
    // gates. This pass TRIMS rows above the computed placement, so treating them
    // as held would delete the compass row they were just allowed to earn, on
    // their very next journal render.
    const held = !holdBypassed && isTrailEndHeld(finale)

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

// ─── Global sweep ────────────────────────────────────────────────────────
// Checking only the crew that happened to open the journal is not enough: a crew
// sitting in the wrong place stays wrong until IT loads a page, so a crew that
// drifted overnight and then stopped playing would never be corrected. Any
// journal load therefore sweeps EVERY crew at the end of the trail or beyond.
//
// The sweep is batched (a handful of queries for the whole field, not per crew)
// and throttled, because a busy moment can mean many crews loading at once and
// they would otherwise each kick off a duplicate pass.

/** Minimum gap between sweeps, per server instance. */
const SWEEP_INTERVAL_MS = 15_000
let lastSweepAt = 0
/** Shared in-flight sweep, so concurrent loads join one pass instead of racing. */
let sweepInFlight: Promise<void> | null = null

/**
 * Re-place every crew that has closed the trail. Throttled: returns immediately
 * if a sweep ran recently or is already running, so this is safe to call from
 * every journal render.
 */
export async function sweepFinalePlacements(): Promise<void> {
  if (sweepInFlight) return sweepInFlight
  if (Date.now() - lastSweepAt < SWEEP_INTERVAL_MS) return
  sweepInFlight = runSweep().finally(() => {
    lastSweepAt = Date.now()
    sweepInFlight = null
  })
  return sweepInFlight
}

async function runSweep(): Promise<void> {
  try {
    // One read each for the whole field, rather than per crew.
    const [endRows, members, grantSets, finale, total] = await Promise.all([
      db
        .select({ userId: leadUnlock.userId, leadOrder: leadUnlock.leadOrder })
        .from(leadUnlock)
        .where(
          inArray(leadUnlock.leadOrder, [TRAIL_END_ORDER, COMPASS_ORDER, FINISH_ORDER]),
        ),
      db
        .select({ teamId: teamMember.teamId, userId: teamMember.userId })
        .from(teamMember),
      getAllGrants(),
      getFinaleConfig(),
      getTotalLeads(),
    ])
    if (endRows.length === 0) return

    const held = isTrailEndHeld(finale)

    // userId -> its team, and teamId -> all of its members.
    const teamOf = new Map<string, string>()
    const membersOf = new Map<string, string[]>()
    for (const m of members) {
      teamOf.set(m.userId, m.teamId)
      const list = membersOf.get(m.teamId)
      if (list) list.push(m.userId)
      else membersOf.set(m.teamId, [m.userId])
    }

    // Fold the sentinel rows into crews. A crew shares progress, so any member's
    // row counts for the whole crew, exactly as the per-crew checks treat it.
    const crewOrders = new Map<string, Set<number>>()
    for (const r of endRows) {
      const key = teamOf.get(r.userId) ?? `solo:${r.userId}`
      const set = crewOrders.get(key)
      if (set) set.add(r.leadOrder)
      else crewOrders.set(key, new Set([r.leadOrder]))
    }

    const anyOf = (ids: string[], set: Set<string>) => ids.some((id) => set.has(id))
    const teamNames = new Map<string, string>()

    for (const [key, orders] of crewOrders) {
      // Only crews that closed the trail (any endgame row counts, see above).
      if (!isPastTrailEnd(orders)) continue

      const isSolo = key.startsWith("solo:")
      const crew = isSolo ? [key.slice(5)] : (membersOf.get(key) ?? [])
      if (crew.length === 0) continue

      const grants: FinaleGrants = {
        note1: anyOf(crew, grantSets.note1),
        note2: anyOf(crew, grantSets.note2),
        treasure: anyOf(crew, grantSets.treasure),
      }

      const from = placementFromRows(orders)
      // Per crew, since the bypass account must not be dragged back to the hold
      // by the global sweep either (see the note in `reconcileFinalePlacement`).
      const to = placementForGrants(grants, held && !(await isHoldBypassedForAny(crew)))
      if (from === to) continue

      await setProgressForUsers(crew, total, "admin", to)

      let teamName: string | null = null
      if (!isSolo) {
        if (!teamNames.has(key)) {
          const t = await db
            .select({ name: team.name })
            .from(team)
            .where(eq(team.id, key))
            .limit(1)
          teamNames.set(key, t[0]?.name ?? "Team")
        }
        teamName = teamNames.get(key) ?? null
      }

      await logActivity({
        category: "auto",
        action: "auto.replacement",
        teamId: isSolo ? null : key,
        teamName,
        targetUserId: isSolo ? crew[0] : null,
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
          sweep: true,
        },
      })
    }
  } catch (err) {
    console.warn("[v0] sweepFinalePlacements failed", err)
  }
}
