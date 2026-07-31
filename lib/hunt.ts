// ─────────────────────────────────────────────────────────────────────────
//  Hunt progression — the server-side source of truth.
//
//  Progress is stored PER USER as rows in `lead_unlock` (one row per lead a
//  user has unlocked, orders 2..9 — lead 1 is global + time-gated so it never
//  gets a row). A user's progress is the highest lead they hold, combined with
//  the lead-1 time gate. Being in a team means a teammate's scan advances the
//  whole crew; leaving a team keeps whatever you had.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { clueToken, leadUnlock, teamMember, team, user } from "@/lib/db/schema"
import {
  FINISH_ORDER,
  COMPASS_ORDER,
  TRAIL_END_ORDER,
  clampProgress,
  effectiveUnlockedCount,
  isLeadOneOpen,
  isEndgameProgress,
  isEndgameOrder,
  leadsSolvedCount,
  START_MS,
} from "@/lib/clues"
import {
  getLeadDefs,
  getTotalLeads,
  listTokens,
  regenerateTokenForLead,
  getLeadGeo,
  FINISH_LEAD_ID,
  COMPASS_LEAD_ID,
  TRAIL_END_LEAD_ID,
} from "@/lib/leads"
import { haversineMeters } from "@/lib/geo"
import { getFinaleConfig, isTrailEndHeld } from "@/lib/finale"
import { getCrewGrants, setFinaleGrant } from "@/lib/finale-grants"
import { getSolveCooldownSeconds } from "@/lib/hunt-config"
import { logActivity, resolveUserSnapshot } from "@/lib/activity"
import { and, asc, eq, gt, inArray } from "drizzle-orm"
import { randomUUID } from "node:crypto"

// URL helpers now live in lib/site-url.ts (to avoid an import cycle with the
// lead registry). Re-exported here for the modules that import them from
// "@/lib/hunt".
export { siteUrl, huntLinkFor } from "@/lib/site-url"

// ── Progress reads ────────────────────────────────────────────────────────

/** Highest stored lead (0 if none) for a single user, ignoring the time gate. */
export async function getStoredProgress(userId: string): Promise<number> {
  const rows = await db
    .select({ leadOrder: leadUnlock.leadOrder })
    .from(leadUnlock)
    .where(eq(leadUnlock.userId, userId))
  return rows.reduce((max, r) => Math.max(max, r.leadOrder), 0)
}

/** A user's effective unlocked-lead count (stored progress + lead-1 time gate). */
export async function getEffectiveProgress(
  userId: string,
  nowMs: number = Date.now(),
): Promise<number> {
  const stored = await getStoredProgress(userId)
  return effectiveUnlockedCount(stored, nowMs, await getTotalLeads())
}

/** All userIds on the same team as `userId`, including the user themselves. */
export async function getCrewUserIds(userId: string): Promise<string[]> {
  const me = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  const teamId = me[0]?.teamId
  if (!teamId) return [userId]
  const members = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  return members.map((m) => m.userId)
}

export type StandingsSummary = {
  /** The signed-in entity's 1-based rank, or null before they have started. */
  rank: number | null
  /** How many teams/solos have started (progress > 0). */
  totalEntrants: number
  /** The lead order the user is currently on (their effective progress). */
  myProgress: number
  /** Total number of leads in the hunt. */
  total: number
  /** Other teams currently on the same lead as the user. */
  sameLeadTeams: number
  /** Other solo explorers currently on the same lead as the user. */
  sameLeadSolos: number
  /**
   * True once the user is past the endgame threshold, so their own rank is
   * concealed from them too (everyone in the endgame sees the same thing).
   */
  myRankSealed: boolean
  /** How many entrants are in the sealed endgame, without naming any of them. */
  endgameCount: number
  /**
   * How many entrants are ahead of the user but still outside the endgame, so a
   * player can see the gap in front of them without the leaders being revealed.
   */
  aheadVisible: number
}

/**
 * A compact standings read for the journal widgets: the user's rank, the top
 * few entries, and how many other teams / solo players are on the same lead.
 * Reuses the single live leaderboard so it always matches the full board.
 */
export async function getStandingsSummary(
  userId: string,
  total: number,
  nowMs: number = Date.now(),
): Promise<StandingsSummary> {
  const me = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  const teamId = me[0]?.teamId ?? null

  const board = await getLeaderboard(nowMs)
  const isMine = (e: LeaderboardEntry) =>
    teamId ? e.kind === "team" && e.id === teamId : e.kind === "solo" && e.id === userId

  const myIndex = board.findIndex(isMine)
  const myEntry = myIndex >= 0 ? board[myIndex] : null
  const myProgress = myEntry?.progress ?? 0

  let sameLeadTeams = 0
  let sameLeadSolos = 0
  if (myProgress > 0) {
    for (const e of board) {
      if (isMine(e) || e.progress !== myProgress) continue
      if (e.kind === "team") sameLeadTeams++
      else sameLeadSolos++
    }
  }

  // The endgame is concealed, so we never build a "top" list. We only count how
  // many are in there, and how many visible entrants sit ahead of the user.
  const myRankSealed = isEndgameProgress(myProgress)
  const endgameCount = board.filter((e) => isEndgameProgress(e.progress)).length
  const aheadVisible = board.filter(
    (e) => !isMine(e) && !isEndgameProgress(e.progress) && e.progress > myProgress,
  ).length

  return {
    // A sealed player is not told their own position either, so nobody can infer
    // the finishing order by comparing notes with a friend.
    rank: !myRankSealed && myProgress > 0 && myIndex >= 0 ? myIndex + 1 : null,
    totalEntrants: board.filter((e) => e.progress > 0).length,
    myProgress,
    total,
    sameLeadTeams,
    sameLeadSolos,
    myRankSealed,
    endgameCount,
    aheadVisible,
  }
}

/** Cheap membership check: is this user currently in any team? */
export async function getIsInTeam(userId: string): Promise<boolean> {
  const rows = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  return rows.length > 0
}

/** The effective progress for a crew = the furthest any member has reached. */
export async function getCrewEffectiveProgress(
  userIds: string[],
  nowMs: number = Date.now(),
): Promise<number> {
  if (userIds.length === 0) return 0
  const rows = await db
    .select({ leadOrder: leadUnlock.leadOrder })
    .from(leadUnlock)
    .where(inArray(leadUnlock.userId, userIds))
  const storedMax = rows.reduce((max, r) => Math.max(max, r.leadOrder), 0)
  return effectiveUnlockedCount(storedMax, nowMs, await getTotalLeads())
}

// ── Progress writes ─────────────────────────────────────────────────────────

/**
 * Ensure each user in `userIds` holds every lead from 2..targetLead. Existing
 * rows (with their original timestamps) are preserved; only missing leads are
 * inserted, stamped `at`. Idempotent.
 */
/**
 * How a lead was passed. Stored on every `lead_unlock` row and mirrored into the
 * activity log, so the admin feed can say whether an explorer scanned the QR
 * themselves or had a photo proof approved.
 */
/**
 * How a lead was actually passed. Scanning the QR is the entry point for BOTH
 * routes, so the QR itself distinguishes nothing; what differs is how presence
 * at the mark was established:
 *
 * - "gps"   the automated location check in `verifyScan` put the explorer inside
 *           the lead's radius.
 * - "proof" the GPS check could not be satisfied, so a photo was submitted and
 *           an admin approved it by hand.
 * - "skip"  a superadmin bypassed a verification step (an unavailable location
 *           gate, or the solve cooldown), so this unlock was not fully verified.
 *           Worth surfacing separately: neither automated nor reviewed.
 * - "nogate" the lead has no coordinates configured, so no location check was
 *           possible. Not a pass or a failure, just nothing to verify against.
 * - "admin" an admin set the crew's progress by hand from the dashboard, so no
 *           scan happened at all.
 * - "time"  the timed opener, which unlocks on a clock rather than a scan.
 *
 * Legacy rows written before this distinction existed store "qr" and cannot be
 * split retroactively into gps-vs-skip, so readers must tolerate that value.
 */
export type UnlockSource =
  | "gps"
  | "proof"
  | "skip"
  | "nogate"
  | "admin"
  | "time"

/**
 * The original `unlockedAt` of every row these users currently hold, keyed
 * `userId:leadOrder`.
 *
 * Taken BEFORE any delete/insert cycle so re-placement can restore the real
 * arrival time instead of stamping "now". Without this, moving a crew between
 * finale rungs (by hand or by the automated pass) rewrote when they got there,
 * which is how the recorded Finland arrival times were lost.
 */
export type StampSnapshot = Map<string, Date>

async function snapshotStamps(userIds: string[]): Promise<StampSnapshot> {
  const out: StampSnapshot = new Map()
  if (userIds.length === 0) return out
  const rows = await db
    .select({
      userId: leadUnlock.userId,
      leadOrder: leadUnlock.leadOrder,
      unlockedAt: leadUnlock.unlockedAt,
    })
    .from(leadUnlock)
    .where(inArray(leadUnlock.userId, userIds))
  for (const r of rows) {
    const key = `${r.userId}:${r.leadOrder}`
    // Keep the EARLIEST stamp per row: crew members scan seconds apart and the
    // first one is what really marks the crew's arrival.
    const seen = out.get(key)
    if (!seen || r.unlockedAt < seen) out.set(key, r.unlockedAt)
  }
  return out
}

/**
 * The timestamp a rebuilt row should carry: its original if we have one in the
 * snapshot, otherwise the fresh `at`. `prior` is keyed by user AND lead order, so
 * a crew that never held the row still gets a truthful "now".
 */
function stampFor(
  prior: StampSnapshot | undefined,
  userId: string,
  leadOrder: number,
  at: Date,
): Date {
  return prior?.get(`${userId}:${leadOrder}`) ?? at
}

async function ensureUpTo(
  userIds: string[],
  targetLead: number,
  source: string,
  at: Date,
  prior?: StampSnapshot,
): Promise<void> {
  const target = clampProgress(targetLead, await getTotalLeads())
  if (target < 2 || userIds.length === 0) return

  // Which (user, lead) rows already exist, so we only insert the gaps.
  const existing = await db
    .select({ userId: leadUnlock.userId, leadOrder: leadUnlock.leadOrder })
    .from(leadUnlock)
    .where(inArray(leadUnlock.userId, userIds))
  const have = new Set(existing.map((r) => `${r.userId}:${r.leadOrder}`))

  const values: (typeof leadUnlock.$inferInsert)[] = []
  for (const uid of userIds) {
    for (let order = 2; order <= target; order++) {
      if (!have.has(`${uid}:${order}`)) {
        values.push({
          id: randomUUID(),
          userId: uid,
          leadOrder: order,
          source,
          // Restore the original arrival time when this row is being rebuilt.
          unlockedAt: stampFor(prior, uid, order, at),
        })
      }
    }
  }
  if (values.length > 0) {
    await db.insert(leadUnlock).values(values).onConflictDoNothing()
  }
}

/** Remove any stored leads beyond `targetLead` for these users. */
async function trimAbove(userIds: string[], targetLead: number): Promise<void> {
  if (userIds.length === 0) return
  await db
    .delete(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), gt(leadUnlock.leadOrder, targetLead)))
}

/**
 * Where in the hunt an admin is placing a crew. "lead" is one of the numbered
 * stops; "hold" is the trail end, where every lead is solved but the compass
 * step has not opened yet; "compass" is the finale step after the hold lifts;
 * "treasure" is the finish itself, which also grants a winner placement by
 * finish order.
 */
export type ProgressStage = "lead" | "hold" | "compass" | "treasure"

/**
 * Set the stored progress for a set of users. Used by admin tools. Adds missing
 * leads and trims any above the target.
 *
 * For stage "lead", `targetLead` is the stop the crew sits on (0..TOTAL_CLUES).
 * Lead 1 is time-global and never stored, so a target of 0 or 1 both simply mean
 * "no QR leads held".
 *
 * For stage "hold", the crew has closed the paper trail but the compass step has
 * not opened for them: every lead is marked solved and the trail-end row is
 * stamped, with NO compass row. This is the same state a real trail-end scan
 * produces while the hold is on, and it is what makes a crew read as "waiting on
 * the hold" rather than as hunting the compass.
 *
 * For stage "compass", the crew is placed at the finale step: every lead is
 * marked solved and the compass row is stamped. The trail-end row is stamped too,
 * since the compass cannot be reached without closing the trail first. `trimAbove`
 * runs first and clears the sentinel rows above the lead range, so this also
 * removes any existing finish row — correct, since the compass comes before the
 * treasure.
 *
 * For stage "treasure", the crew is finished: every lead solved, the trail end and
 * compass stamped (you cannot reach the treasure without them) and the finish row
 * stamped, which is what earns their placement in the winner order. This is the
 * same end state a real treasure scan produces.
 */
export async function setProgressForUsers(
  userIds: string[],
  targetLead: number,
  source = "admin",
  stage: ProgressStage = "lead",
): Promise<void> {
  const total = await getTotalLeads()
  // Every endgame stage sits past the last lead, so they all pin the target
  // there and let the sentinel rows below carry the distinction.
  const finale = stage === "hold" || stage === "compass" || stage === "treasure"
  const target = finale ? total : clampProgress(targetLead, total)
  const at = new Date()

  // ARRIVAL TIMES MUST SURVIVE RE-PLACEMENT.
  // `trimAbove` DELETES rows and the inserts below re-create them, so stamping
  // `at` on every insert silently rewrote a crew's arrival times to "now" on
  // every automated pass or dashboard nudge. Snapshot what is stored FIRST and
  // hand it down, so any row that already existed keeps its ORIGINAL timestamp
  // and only genuinely new rows are stamped `at`.
  const prior = await snapshotStamps(userIds)

  await trimAbove(userIds, target)
  await ensureUpTo(userIds, target, source, at, prior)
  // Forward the caller's source (default "admin"): these rows are a manual
  // dashboard override, never an automated pass.
  const finaleSource: UnlockSource = source === "time" ? "time" : "admin"
  // The endgame rows are cumulative, mirroring the real scan order: closing the
  // trail comes before the compass, which comes before the treasure. `trimAbove`
  // has already cleared every sentinel, so stopping early is what steps a crew
  // BACK down to an earlier rung.
  if (finale) await insertTrailEndRows(userIds, at, finaleSource, prior)
  if (stage === "compass" || stage === "treasure") {
    await insertCompassRows(userIds, at, finaleSource, prior)
  }
  if (stage === "treasure") await insertFinishRows(userIds, at, finaleSource, prior)
}

export type UnlockResult =
  | { status: "unlocked"; leadOrder: number; country: string; countryEn: string }
  | { status: "already"; leadOrder: number; country: string; countryEn: string }
  | { status: "out_of_order"; required: number; current: number; leadOrder: number }
  // The compass QR was scanned (after every lead is solved). Reveals the
  // compass note; the crew is NOT finished yet — the treasure QR does that.
  | { status: "trail_end_reached" }
  | { status: "compass_reached" }
  // The trail is closed but the hold is still on, so the compass step has not
  // opened yet. Distinct from "out_of_order": the crew did nothing wrong and has
  // nothing left to solve, they are simply waiting on us.
  | { status: "held" }
  | { status: "finished"; country: string; countryEn: string }
  // The scan is valid and in order, but the crew solved their previous lead too
  // recently. `availableAtMs` is the epoch ms the next solve becomes possible.
  | { status: "cooldown"; leadOrder: number; availableAtMs: number; cooldownSeconds: number }
  | { status: "invalid" }

/**
 * The most recent moment ANY crew member unlocked a lead (epoch ms), or null if
 * the crew holds no stored leads yet. Used to enforce the solve cooldown.
 */
async function crewLastUnlockMs(userIds: string[]): Promise<number | null> {
  if (userIds.length === 0) return null
  const rows = await db
    .select({ unlockedAt: leadUnlock.unlockedAt })
    .from(leadUnlock)
    .where(inArray(leadUnlock.userId, userIds))
  let best: number | null = null
  for (const r of rows) {
    const t = r.unlockedAt.getTime()
    if (best === null || t > best) best = t
  }
  return best
}

/**
 * Returns a `cooldown` result if the crew's previous solve was too recent to
 * allow opening `leadOrder` now, or null if the solve is allowed. The first
 * ever solve (no stored leads) is always allowed, and a cooldown of 0 disables
 * the gate.
 */
async function checkSolveCooldown(
  userIds: string[],
  leadOrder: number,
  nowMs: number,
): Promise<Extract<UnlockResult, { status: "cooldown" }> | null> {
  const cooldownSeconds = await getSolveCooldownSeconds()
  if (cooldownSeconds <= 0) return null
  const lastMs = await crewLastUnlockMs(userIds)
  if (lastMs === null) return null
  const availableAtMs = lastMs + cooldownSeconds * 1000
  if (nowMs >= availableAtMs) return null
  return { status: "cooldown", leadOrder, availableAtMs, cooldownSeconds }
}

/** Whether any member of the crew has scanned the finishing QR. */
async function crewHasFinished(userIds: string[]): Promise<boolean> {
  if (userIds.length === 0) return false
  const rows = await db
    .select({ id: leadUnlock.id })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, FINISH_ORDER)))
    .limit(1)
  return rows.length > 0
}

/** Stamp the finishing row for every crew member that doesn't have one yet. */
async function insertFinishRows(
  userIds: string[],
  at: Date,
  source: UnlockSource = "gps",
  prior?: StampSnapshot,
): Promise<void> {
  if (userIds.length === 0) return
  const existing = await db
    .select({ userId: leadUnlock.userId })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, FINISH_ORDER)))
  const have = new Set(existing.map((r) => r.userId))
  const values = userIds
    .filter((uid) => !have.has(uid))
    .map((uid) => ({
      id: randomUUID(),
      userId: uid,
      leadOrder: FINISH_ORDER,
      source,
      unlockedAt: stampFor(prior, uid, FINISH_ORDER, at),
    }))
  if (values.length > 0) {
    await db.insert(leadUnlock).values(values).onConflictDoNothing()
  }
}

/**
 * Whether the signed-in user's crew has closed the paper trail, i.e. scanned the
 * trail-end QR at the last lead's own spot. Server pages use this to decide
 * whether Pytheas's first note has been earned yet.
 */
export async function hasReachedTrailEnd(userId: string): Promise<boolean> {
  const crew = await getCrewUserIds(userId)
  return crewHasReachedTrailEnd(crew)
}

/**
 * Whether the signed-in user's crew has scanned the compass QR, which is what
 * releases Pytheas's second note. Server pages use this to decide whether that
 * note has been earned yet.
 */
export async function hasReachedCompass(userId: string): Promise<boolean> {
  const crew = await getCrewUserIds(userId)
  return crewHasReachedCompass(crew)
}

/**
 * Whether the signed-in user's crew has found the treasure. Powers the journal's
 * re-readable winner pill, so a crew that finished (by QR or by an approved photo
 * proof, which never shows them the live winner screen) can always get back to it.
 */
export async function hasFinished(userId: string): Promise<boolean> {
  const crew = await getCrewUserIds(userId)
  return crewHasFinished(crew)
}

/** Whether any member of the crew has scanned the trail-end QR (the QR at the
 *  last lead's own spot), which is what closes the paper trail. */
async function crewHasReachedTrailEnd(userIds: string[]): Promise<boolean> {
  if (userIds.length === 0) return false
  const rows = await db
    .select({ id: leadUnlock.id })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, TRAIL_END_ORDER)))
    .limit(1)
  return rows.length > 0
}

/**
 * WHEN the crew closed the paper trail, or null if they have not.
 *
 * Used to decide who actually waited through the hold: this is compared against
 * the moment the hold was lifted, so a crew that arrives afterwards is never told
 * "the way just opened" about a wait they never experienced. Takes the EARLIEST
 * row, since crew members scan seconds apart and the first scan is the one that
 * really closed the trail.
 */
export async function getCrewTrailEndAt(userIds: string[]): Promise<Date | null> {
  if (userIds.length === 0) return null
  const rows = await db
    .select({ at: leadUnlock.unlockedAt })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, TRAIL_END_ORDER)))
    .orderBy(asc(leadUnlock.unlockedAt))
    .limit(1)
  return rows[0]?.at ?? null
}

/** Stamp the trail-end row for every crew member that doesn't have one yet. */
async function insertTrailEndRows(
  userIds: string[],
  at: Date,
  source: UnlockSource = "gps",
  prior?: StampSnapshot,
): Promise<void> {
  if (userIds.length === 0) return
  const existing = await db
    .select({ userId: leadUnlock.userId })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, TRAIL_END_ORDER)))
  const have = new Set(existing.map((r) => r.userId))
  const values = userIds
    .filter((uid) => !have.has(uid))
    .map((uid) => ({
      id: randomUUID(),
      userId: uid,
      leadOrder: TRAIL_END_ORDER,
      source,
      // This row IS the Finland arrival time, so preserving it is the whole point.
      unlockedAt: stampFor(prior, uid, TRAIL_END_ORDER, at),
    }))
  if (values.length > 0) {
    await db.insert(leadUnlock).values(values).onConflictDoNothing()
  }
}

/** Whether any member of the crew has scanned the compass QR. */
async function crewHasReachedCompass(userIds: string[]): Promise<boolean> {
  if (userIds.length === 0) return false
  const rows = await db
    .select({ id: leadUnlock.id })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, COMPASS_ORDER)))
    .limit(1)
  return rows.length > 0
}

/** Stamp the compass row for every crew member that doesn't have one yet. */
async function insertCompassRows(
  userIds: string[],
  at: Date,
  source: UnlockSource = "gps",
  prior?: StampSnapshot,
): Promise<void> {
  if (userIds.length === 0) return
  const existing = await db
    .select({ userId: leadUnlock.userId })
    .from(leadUnlock)
    .where(and(inArray(leadUnlock.userId, userIds), eq(leadUnlock.leadOrder, COMPASS_ORDER)))
  const have = new Set(existing.map((r) => r.userId))
  const values = userIds
    .filter((uid) => !have.has(uid))
    .map((uid) => ({
      id: randomUUID(),
      userId: uid,
      leadOrder: COMPASS_ORDER,
      source,
      unlockedAt: stampFor(prior, uid, COMPASS_ORDER, at),
    }))
  if (values.length > 0) {
    await db.insert(leadUnlock).values(values).onConflictDoNothing()
  }
}

/**
 * Which endgame step an order refers to, for activity summaries. The finale is
 * three separate steps that all count as "finished", so they must be named apart.
 */
function finaleStepName(leadOrder: number): string {
  if (leadOrder === TRAIL_END_ORDER) return "trail-end"
  if (leadOrder === COMPASS_ORDER) return "compass"
  if (leadOrder === FINISH_ORDER) return "treasure"
  return "finishing"
}

/**
 * Record a lead solve / finish in the activity log. The scanner is the actor;
 * a scan advances the whole crew, so we tag the scanner's team for context.
 *
 * `via` records HOW the lead was passed (see UnlockSource).
 * The activity feed shows this, so it must never be assumed: a proof-approved
 * lead read as "scanned" before this was threaded through, and every non-proof
 * unlock read as a plain QR scan even though the QR is common to both routes.
 */
async function logLeadSolved(
  userId: string,
  leadOrder: number,
  country: string,
  countryEn: string,
  finished: boolean,
  via: UnlockSource = "gps",
): Promise<void> {
  const snap = await resolveUserSnapshot(userId)
  const tm = await db
    .select({ teamId: teamMember.teamId, teamName: team.name })
    .from(teamMember)
    .leftJoin(team, eq(team.id, teamMember.teamId))
    .where(eq(teamMember.userId, userId))
    .limit(1)
  const teamId = tm[0]?.teamId ?? null
  const teamName = tm[0]?.teamName ?? null
  const padded = String(leadOrder).padStart(2, "0")
  await logActivity({
    category: "lead",
    action: finished ? "lead.finished" : "lead.solved",
    actorId: userId,
    actorName: snap.name,
    actorRole: snap.role,
    targetUserId: userId,
    targetUserName: snap.name,
    teamId,
    teamName,
    leadOrder: finished ? null : leadOrder,
    summary: finished
      ? // All three finale steps are "finished" events, so name the step or the
        // feed shows three identical rows for one crew's endgame.
        via === "proof"
        ? `${snap.name} passed ${finaleStepName(leadOrder)} via approved photo proof (${country})`
        : `${snap.name} scanned the ${finaleStepName(leadOrder)} QR (${country})`
      : via === "proof"
        ? `${snap.name} passed lead No. ${padded} via approved photo proof (${country})`
        : `${snap.name} solved lead No. ${padded} by scanning the QR (${country})`,
    metadata: { source: via, country, countryEn, crewScan: via !== "proof", step: leadOrder },
  })
}

/**
 * Attempt to unlock a lead from a scanned QR token, for `userId` and their
 * whole crew. Enforces strict order against the crew's furthest progress.
 *
 * `opts.bypassCooldown` skips ONLY the anti-cheat solve cooldown (never the
 * ordering rules). It is reserved for superadmins and must only be set by a
 * server action that has verified the caller is an admin.
 */
export async function unlockByToken(
  userId: string,
  token: string,
  opts: { bypassCooldown?: boolean } = {},
  /**
   * How presence at the mark was established for THIS unlock. Never "proof":
   * proof-approved leads go through the separate admin path. Defaults to the
   * CONSERVATIVE "nogate" so a caller that forgets to pass one can never be
   * mislabelled as an automated GPS pass that did not happen.
   */
  source: Exclude<UnlockSource, "proof"> = "nogate",
): Promise<UnlockResult> {
  // Resolve the token to the STABLE lead id it was bound to. Progression is
  // then evaluated against that lead's CURRENT position, so a printed QR keeps
  // working no matter where the lead now sits in the sequence.
  const tokenRows = await db
    .select({ leadId: clueToken.leadId })
    .from(clueToken)
    .where(eq(clueToken.token, token))
    .limit(1)
  const leadId = tokenRows[0]?.leadId
  if (!leadId) return { status: "invalid" }

  const defs = await getLeadDefs()
  const total = defs.length

  // The trail-end QR: hidden at the LAST lead's own spot, so it is the scan that
  // actually closes the paper trail. Every lead is already revealed by the time
  // it is found (the previous lead's QR revealed the last page), so it only
  // requires full progress. It releases Pytheas's first note. Idempotent, and no
  // cooldown: like the rest of the finale this is narrative, not a lead grab.
  if (leadId === TRAIL_END_LEAD_ID) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const current = await getCrewEffectiveProgress(crew, now)
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    if (current < total) {
      return { status: "out_of_order", required: total, current, leadOrder: TRAIL_END_ORDER }
    }
    if (!(await crewHasReachedTrailEnd(crew))) {
      await insertTrailEndRows(crew, new Date(now), source)
      await logLeadSolved(userId, TRAIL_END_ORDER, last.country, last.countryEn, true, source)
    }
    return { status: "trail_end_reached" }
  }

  // The compass QR: the first finale step, scanned once every lead is solved.
  // It reveals the compass note but does not finish the hunt. No cooldown — the
  // finale is a narrative two-step, not a competitive lead grab. Re-scanning
  // just shows the note again (idempotent).
  if (leadId === COMPASS_LEAD_ID) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const current = await getCrewEffectiveProgress(crew, now)
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    if (current < total) {
      return { status: "out_of_order", required: total, current, leadOrder: COMPASS_ORDER }
    }
    // Must close the paper trail first: the trail-end QR is the step before.
    if (!(await crewHasReachedTrailEnd(crew))) {
      return { status: "out_of_order", required: total, current, leadOrder: COMPASS_ORDER }
    }
    // While the trail-end hold is on, the compass step has not opened. The hint
    // that names the hiding place is sealed in the journal, so in practice a
    // crew cannot get here anyway; refusing the scan as well means a crew who
    // learns the spot some other way still cannot jump the queue. Crews already
    // holding the compass are unaffected, since the idempotent re-scan below is
    // only reached once this row exists.
    if (!(await crewHasReachedCompass(crew)) && isTrailEndHeld(await getFinaleConfig())) {
      return { status: "held" }
    }
    // The compass step also needs the note-2 grant. Without it the crew has not
    // been let onto this rung, so let the scan bounce here rather than write a row
    // the re-placement pass would silently undo on the next journal load.
    if (!(await crewHasReachedCompass(crew)) && !(await getCrewGrants(userId)).note2) {
      return { status: "held" }
    }
    if (!(await crewHasReachedCompass(crew))) {
      await insertCompassRows(crew, new Date(now), source)
      await logLeadSolved(userId, COMPASS_ORDER, last.country, last.countryEn, true, source)
    }
    return { status: "compass_reached" }
  }

  // The treasure/finish QR: the real finish, scanned AFTER the compass. It
  // marks the final lead as solved (so it can be scored) and records the
  // crew's finish time. Placement is always derived live from finish order;
  // nothing is locked, and crews keep finishing. No cooldown, like the compass.
  if (leadId === FINISH_LEAD_ID) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const current = await getCrewEffectiveProgress(crew, now)
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    if (current < total) {
      return { status: "out_of_order", required: total, current, leadOrder: FINISH_ORDER }
    }
    // Must reach the compass first — it is the step before the treasure.
    if (!(await crewHasReachedCompass(crew))) {
      return { status: "out_of_order", required: total, current, leadOrder: FINISH_ORDER }
    }
    if (await crewHasFinished(crew)) {
      return {
        status: "already",
        leadOrder: total,
        country: last.country,
        countryEn: last.countryEn,
      }
    }
    // Winning also needs the treasure grant, for the same reason as the compass:
    // this is the scan that crowns a winner, so it must not fire on its own.
    if (!(await getCrewGrants(userId)).treasure) {
      return { status: "held" }
    }
    await insertFinishRows(crew, new Date(now), source)
    await logLeadSolved(userId, FINISH_ORDER, last.country, last.countryEn, true, source)
    return { status: "finished", country: last.country, countryEn: last.countryEn }
  }

  const clue = defs.find((c) => c.id === leadId)
  if (!clue) return { status: "invalid" }
  const leadOrder = clue.order

  const crew = await getCrewUserIds(userId)
  const now = Date.now()
  const current = await getCrewEffectiveProgress(crew, now)

  // Already past this lead → nothing to do, but report it kindly.
  if (current >= leadOrder) {
    return { status: "already", leadOrder, country: clue.country, countryEn: clue.countryEn }
  }
  // Strict order: you can only open the immediate next lead.
  if (current !== leadOrder - 1) {
    return { status: "out_of_order", required: leadOrder - 1, current, leadOrder }
  }

  // Anti-cheat: block solves that come too soon after the previous one.
  // Superadmins may bypass this (never the ordering rules above).
  if (!opts.bypassCooldown) {
    const cooldown = await checkSolveCooldown(crew, leadOrder, now)
    if (cooldown) return cooldown
  }

  await ensureUpTo(crew, leadOrder, source, new Date(now))
  await logLeadSolved(userId, leadOrder, clue.country, clue.countryEn, false, source)
  return { status: "unlocked", leadOrder, country: clue.country, countryEn: clue.countryEn }
}

export type ApproveUnlockResult =
  | { status: "unlocked"; leadOrder: number; country: string; countryEn: string }
  | { status: "already"; leadOrder: number; country: string; countryEn: string }
  | { status: "out_of_order"; required: number; current: number; leadOrder: number }
  | { status: "invalid" }

/**
 * Unlock `leadOrder` for `userId`'s whole crew as the result of an APPROVED
 * photo proof (source "proof"). Mirrors the lead branch of `unlockByToken`:
 * ordering is still enforced against the crew's current progress at approval
 * time, but the solve cooldown is intentionally skipped (a human already
 * vetted this). No token is needed; the lead is addressed by its position.
 *
 * `submittedAt` is when the explorer actually sent their photos. When given, the
 * unlock is stamped with THAT moment instead of the approval moment, so a slow
 * manual review never costs anyone time on the journal or the leaderboard. Only
 * the stored timestamp is backdated: every ordering check below still runs
 * against real "now", so a backdated stamp can't unlock anything out of turn.
 */
export async function approveLeadUnlock(
  userId: string,
  leadOrder: number,
  submittedAt?: Date | null,
): Promise<ApproveUnlockResult> {
  const defs = await getLeadDefs()

  /**
   * The timestamp to stamp rows with: the submission moment, clamped into a sane
   * window. It is never allowed past real "now" (a clock skew shouldn't create a
   * future solve) nor before the crew's latest existing unlock (which would make
   * this lead appear to be solved before the one preceding it).
   */
  async function stampAt(crew: string[], nowMs: number): Promise<Date> {
    const submitted = submittedAt?.getTime()
    if (submitted === undefined || !Number.isFinite(submitted)) return new Date(nowMs)
    const floor = (await crewLastUnlockMs(crew)) ?? 0
    return new Date(Math.min(Math.max(submitted, floor), nowMs))
  }

  // Approving a proof filed against the trail-end QR stamps the trail-end row.
  if (leadOrder === TRAIL_END_ORDER) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const total = defs.length
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    const current = await getCrewEffectiveProgress(crew, now)
    if (current < total) {
      return { status: "out_of_order", required: total, current, leadOrder: TRAIL_END_ORDER }
    }
    if (await crewHasReachedTrailEnd(crew)) {
      return { status: "already", leadOrder: total, country: last.country, countryEn: last.countryEn }
    }
    await insertTrailEndRows(crew, await stampAt(crew, now), "proof")
    await logLeadSolved(userId, TRAIL_END_ORDER, last.country, last.countryEn, true, "proof")
    return { status: "unlocked", leadOrder: total, country: last.country, countryEn: last.countryEn }
  }

  // Approving a proof filed against the compass QR stamps the compass row.
  if (leadOrder === COMPASS_ORDER) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const total = defs.length
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    const current = await getCrewEffectiveProgress(crew, now)
    if (current < total || !(await crewHasReachedTrailEnd(crew))) {
      return { status: "out_of_order", required: total, current, leadOrder: COMPASS_ORDER }
    }
    if (await crewHasReachedCompass(crew)) {
      return { status: "already", leadOrder: total, country: last.country, countryEn: last.countryEn }
    }
    // An admin approving the photo IS the decision to let this crew onto the
    // compass rung, so record the matching grant. Without it the re-placement pass
    // would read the crew as ungranted and pull it straight back down, undoing the
    // approval on the crew's next journal load.
    await setFinaleGrant({ userIds: crew, view: "note2", granted: true })
    await insertCompassRows(crew, await stampAt(crew, now), "proof")
    await logLeadSolved(userId, COMPASS_ORDER, last.country, last.countryEn, true, "proof")
    return { status: "unlocked", leadOrder: total, country: last.country, countryEn: last.countryEn }
  }

  // Approving a proof filed against the treasure/finish QR stamps the finish
  // rows for the crew, mirroring the finish branch of unlockByToken. Requires
  // the crew to have reached the compass first.
  if (leadOrder === FINISH_ORDER) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const total = defs.length
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    const current = await getCrewEffectiveProgress(crew, now)
    if (current < total || !(await crewHasReachedCompass(crew))) {
      return { status: "out_of_order", required: total, current, leadOrder: FINISH_ORDER }
    }
    if (await crewHasFinished(crew)) {
      return { status: "already", leadOrder: total, country: last.country, countryEn: last.countryEn }
    }
    // Same as the compass: approving the winning photo is the admin granting the
    // treasure screen, so write the grant alongside the row.
    await setFinaleGrant({ userIds: crew, view: "treasure", granted: true })
    await insertFinishRows(crew, await stampAt(crew, now), "proof")
    await logLeadSolved(userId, FINISH_ORDER, last.country, last.countryEn, true, "proof")
    return { status: "unlocked", leadOrder: total, country: last.country, countryEn: last.countryEn }
  }

  const clue = defs.find((c) => c.order === leadOrder)
  if (!clue) return { status: "invalid" }

  const crew = await getCrewUserIds(userId)
  const now = Date.now()
  const current = await getCrewEffectiveProgress(crew, now)

  if (current >= leadOrder) {
    return { status: "already", leadOrder, country: clue.country, countryEn: clue.countryEn }
  }
  if (current !== leadOrder - 1) {
    return { status: "out_of_order", required: leadOrder - 1, current, leadOrder }
  }

  await ensureUpTo(crew, leadOrder, "proof", await stampAt(crew, now))
  await logLeadSolved(userId, leadOrder, clue.country, clue.countryEn, false, "proof")
  return { status: "unlocked", leadOrder, country: clue.country, countryEn: clue.countryEn }
}

// ── Scan location gate ───────────────────────────────────────────────────────

export type ScanContext =
  // Unlock straight away, no location needed (finish QR, out-of-order/already
  // scans, invalid tokens, or a lead with no coordinates configured).
  | { mode: "direct" }
  // A valid in-order scan for a lead that has a location gate: the explorer
  // must prove they are near the mark before it is unlocked.
  //
  // `proofOnly` marks the two finale marks (compass, treasure) where GPS is not
  // offered at all and a photo is the ONLY way through. Those two decide the
  // winner, so a self-serve location check is too weak a gate: a crew could pass
  // it without ever being seen at the mark. A human approves them instead.
  | { mode: "verify"; leadOrder: number; proofOnly?: boolean }

/**
 * Decide, WITHOUT mutating anything, whether a scan needs a location check.
 * Only a genuine in-order next unlock of a lead that has coordinates is gated;
 * everything else falls through to `direct` so the existing scan result (kind
 * message, cooldown, etc.) renders exactly as before.
 */
export async function resolveScanContext(
  userId: string,
  token: string,
  nowMs: number = Date.now(),
): Promise<ScanContext> {
  const tokenRows = await db
    .select({ leadId: clueToken.leadId })
    .from(clueToken)
    .where(eq(clueToken.token, token))
    .limit(1)
  const leadId = tokenRows[0]?.leadId
  if (!leadId) return { mode: "direct" }

  // The trail-end QR carries its own GPS gate: crews must actually stand at the
  // last lead's spot. Only a genuine closing scan is gated (every lead revealed,
  // trail not yet closed); anything else falls through to a direct unlock.
  if (leadId === TRAIL_END_LEAD_ID) {
    const finale = await getFinaleConfig()
    if (!finale.trailEndHasCoords) return { mode: "direct" }
    const crew = await getCrewUserIds(userId)
    const [current, total] = await Promise.all([
      getCrewEffectiveProgress(crew, nowMs),
      getTotalLeads(),
    ])
    if (current < total) return { mode: "direct" }
    if (await crewHasReachedTrailEnd(crew)) return { mode: "direct" }
    return { mode: "verify", leadOrder: TRAIL_END_ORDER }
  }

  // The compass QR can carry its own GPS gate. Only a genuine compass scan is
  // gated: the crew must have solved every lead and not yet reached the
  // compass. Everything else falls through to a direct unlock (which just
  // re-shows the note or a not-ready message).
  // Photo only: no coords check, since GPS is never offered here. Gating on
  // `hasCoords` would hand out a free direct unlock whenever the compass
  // location happened to be unset, which is the opposite of a stricter gate.
  if (leadId === COMPASS_LEAD_ID) {
    const finale = await getFinaleConfig()
    const crew = await getCrewUserIds(userId)
    const [current, total] = await Promise.all([
      getCrewEffectiveProgress(crew, nowMs),
      getTotalLeads(),
    ])
    if (current < total) return { mode: "direct" }
    if (await crewHasReachedCompass(crew)) return { mode: "direct" }
    // These two MUST mirror the compass branch of unlockByToken: a photo is only
    // worth collecting if approving it can actually grant the row. Without them a
    // crew that has solved every lead but has not closed the trail (or is still
    // held) is asked for a photo, and the later approval is refused as
    // out_of_order, leaving an unapprovable proof and a crew that never moves.
    // Falling through to "direct" is correct: it answers with the proper
    // out_of_order or held message instead of collecting a dead photo.
    if (!(await crewHasReachedTrailEnd(crew))) return { mode: "direct" }
    if (isTrailEndHeld(finale)) return { mode: "direct" }
    return { mode: "verify", leadOrder: COMPASS_ORDER, proofOnly: true }
  }

  // The treasure/finish QR is photo only, for the same reason as the compass:
  // this scan decides the winner, so it needs a human to confirm the crew was
  // really there. Only a genuine finishing scan is gated: the crew must have
  // reached the compass and not yet finished.
  if (leadId === FINISH_LEAD_ID) {
    const crew = await getCrewUserIds(userId)
    if (!(await crewHasReachedCompass(crew))) return { mode: "direct" }
    if (await crewHasFinished(crew)) return { mode: "direct" }
    return { mode: "verify", leadOrder: FINISH_ORDER, proofOnly: true }
  }

  const defs = await getLeadDefs()
  const clue = defs.find((c) => c.id === leadId)
  if (!clue) return { mode: "direct" }

  const geo = await getLeadGeo(leadId)
  if (!geo.hasCoords) return { mode: "direct" }

  const crew = await getCrewUserIds(userId)
  const current = await getCrewEffectiveProgress(crew, nowMs)
  // Only the immediate next lead is a real unlock; anything else just renders
  // its status without asking for location.
  if (current !== clue.order - 1) return { mode: "direct" }

  return { mode: "verify", leadOrder: clue.order }
}

export type LocationCheck =
  | { ok: true }
  | { ok: false; distanceM: number; radiusM: number }
  | { ok: false; distanceM: null; radiusM: number } // no coords for the lead

/**
 * Compare a scanned explorer's reported position to a lead's mark. The reported
 * coordinates are used only for this comparison and are never stored. Returns
 * whether they are within the lead's radius. A lead with no coordinates always
 * passes (nothing to check against).
 */
export async function checkScanLocation(
  token: string,
  lat: number,
  lng: number,
): Promise<LocationCheck> {
  const tokenRows = await db
    .select({ leadId: clueToken.leadId })
    .from(clueToken)
    .where(eq(clueToken.token, token))
    .limit(1)
  const leadId = tokenRows[0]?.leadId
  if (!leadId) return { ok: true }

  // The trail-end QR checks against the last lead's own configured coordinates.
  if (leadId === TRAIL_END_LEAD_ID) {
    const finale = await getFinaleConfig()
    if (!finale.trailEndHasCoords || finale.trailEndLat == null || finale.trailEndLng == null)
      return { ok: true }
    const distanceM = Math.round(haversineMeters(lat, lng, finale.trailEndLat, finale.trailEndLng))
    if (distanceM <= finale.trailEndRadiusM) return { ok: true }
    return { ok: false, distanceM, radiusM: finale.trailEndRadiusM }
  }

  // The compass QR checks against its own configured coordinates.
  if (leadId === COMPASS_LEAD_ID) {
    const finale = await getFinaleConfig()
    if (!finale.hasCoords || finale.lat == null || finale.lng == null) return { ok: true }
    const distanceM = Math.round(haversineMeters(lat, lng, finale.lat, finale.lng))
    if (distanceM <= finale.radiusM) return { ok: true }
    return { ok: false, distanceM, radiusM: finale.radiusM }
  }

  // The treasure/finish QR checks against the treasure coordinates.
  if (leadId === FINISH_LEAD_ID) {
    const finale = await getFinaleConfig()
    if (!finale.treasureHasCoords || finale.treasureLat == null || finale.treasureLng == null)
      return { ok: true }
    const distanceM = Math.round(
      haversineMeters(lat, lng, finale.treasureLat, finale.treasureLng),
    )
    if (distanceM <= finale.treasureRadiusM) return { ok: true }
    return { ok: false, distanceM, radiusM: finale.treasureRadiusM }
  }

  const geo = await getLeadGeo(leadId)
  if (!geo.hasCoords || geo.lat == null || geo.lng == null) return { ok: true }

  const distanceM = Math.round(haversineMeters(lat, lng, geo.lat, geo.lng))
  if (distanceM <= geo.radiusM) return { ok: true }
  return { ok: false, distanceM, radiusM: geo.radiusM }
}

// ── Tokens (admin) ──────────────────────────────────────────────────────────

export type ClueTokenRow = {
  leadOrder: number
  leadId: string
  country: string
  token: string
  link: string
  isFinish: boolean
  isCompass: boolean
  /** The QR hidden at the LAST lead's own spot, which closes the paper trail. */
  isTrailEnd: boolean
}

/**
 * Make sure a stable token exists for every scannable lead (2..TOTAL_CLUES) and
 * for the finishing QR (FINISH_ORDER). Idempotent: existing tokens (and their
 * printed QR codes) are left untouched; only missing ones are created.
 */
/**
 * All QR tokens with their absolute scan links, ordered by position (finish
 * last). Delegates to the lead registry, which keys tokens by stable leadId.
 */
export async function getClueTokens(): Promise<ClueTokenRow[]> {
  const rows = await listTokens()
  return rows.map((r) => ({
    leadOrder: r.leadOrder,
    leadId: r.leadId,
    country: r.country,
    token: r.token,
    link: r.link,
    isFinish: r.isFinish,
    isCompass: r.isCompass,
    isTrailEnd: r.isTrailEnd,
  }))
}

/**
 * Replace a lead's token with a fresh one, addressed by its CURRENT position
 * (the finish QR uses FINISH_ORDER). Resolves to the stable leadId first so the
 * right lead's token is rotated. Invalidates any printed QR for that lead.
 */
export async function regenerateToken(leadOrder: number): Promise<string> {
  if (leadOrder === TRAIL_END_ORDER) return regenerateTokenForLead(TRAIL_END_LEAD_ID)
  if (leadOrder === COMPASS_ORDER) return regenerateTokenForLead(COMPASS_LEAD_ID)
  if (leadOrder === FINISH_ORDER) return regenerateTokenForLead(FINISH_LEAD_ID)
  const def = (await getLeadDefs()).find((d) => d.order === leadOrder)
  if (!def) throw new Error(`No lead at position ${leadOrder}`)
  return regenerateTokenForLead(def.id)
}

// ── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  kind: "team" | "solo"
  id: string
  name: string
  progress: number
  /** Epoch ms the entity reached its current progress, or null at 0. */
  reachedAt: number | null
  /** Member display names, for teams. */
  members: string[]
  /** Country reached (Greek + English), for display. */
  country: string | null
  countryEn: string | null
}

function displayName(u: { firstName: string | null; name: string; email: string }): string {
  return u.firstName?.trim() || u.name?.trim() || u.email.split("@")[0]
}

/**
 * Build the full leaderboard: every team and every team-less user, ranked purely
 * by how far along the trail they are, and then by who got there first.
 *
 * There are no points. Position is decided by exactly two things, in order:
 *   1. progress  - the furthest lead the entity currently holds.
 *   2. reachedAt - the moment they arrived at that lead, earliest wins.
 * So if five teams and three solos are all sitting on lead 6, the one who
 * scanned into lead 6 first is ahead of the rest of them.
 *
 * For a team, progress is its furthest member and reachedAt is the EARLIEST
 * arrival among the members who are on that furthest lead, so a crew is credited
 * with the moment it first got there rather than when its last member caught up.
 */
export async function getLeaderboard(nowMs: number = Date.now()): Promise<LeaderboardEntry[]> {
  const [users, members, teams, unlocks, leadDefs] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, firstName: user.firstName, email: user.email })
      .from(user),
    db
      .select({ userId: teamMember.userId, teamId: teamMember.teamId })
      .from(teamMember),
    db.select({ id: team.id, name: team.name }).from(team),
    db
      .select({ userId: leadUnlock.userId, leadOrder: leadUnlock.leadOrder, unlockedAt: leadUnlock.unlockedAt })
      .from(leadUnlock),
    getLeadDefs(),
  ])

  const total = leadDefs.length
  const countryByPos = new Map(leadDefs.map((d) => [d.order, { country: d.country, countryEn: d.countryEn }]))
  const countryFor = (progress: number) =>
    countryByPos.get(progress) ?? { country: null, countryEn: null }
  const lead1Open = isLeadOneOpen(nowMs)
  const userById = new Map(users.map((u) => [u.id, u]))

  // Per-user unlock rows (every lead they hold, including the finishing row).
  const byUser = new Map<string, { order: number; at: number }[]>()
  for (const row of unlocks) {
    const list = byUser.get(row.userId) ?? []
    list.push({ order: row.leadOrder, at: row.unlockedAt.getTime() })
    byUser.set(row.userId, list)
  }
  function userProgress(userId: string): { progress: number; reachedAt: number | null } {
    const rows = byUser.get(userId) ?? []
    // Real trail positions only; the endgame sentinels are handled separately
    // below because they stand in for the last lead rather than being one.
    const storedMax = rows.reduce((m, r) => (isEndgameOrder(r.order) ? m : Math.max(m, r.order)), 0)
    // Any endgame scan means the final lead is behind them, so the count reads
    // full even though that lead never writes a real unlock row of its own.
    const inEndgame = rows.some((r) => isEndgameOrder(r.order))
    const progress = leadsSolvedCount(storedMax, inEndgame, nowMs, total)
    if (progress === 0) return { progress: 0, reachedAt: null }
    if (progress === 1 && !inEndgame) {
      return { progress: 1, reachedAt: lead1Open ? START_MS : null }
    }
    // Still timed by the last REAL lead they scanned into, so the arrival-time
    // tiebreak keeps comparing like with like.
    const at = rows.find((r) => r.order === storedMax)?.at ?? null
    return { progress, reachedAt: at }
  }

  // Teams.
  const teamMembersOf = new Map<string, string[]>()
  const memberTeamId = new Map<string, string>()
  for (const m of members) {
    memberTeamId.set(m.userId, m.teamId)
    const list = teamMembersOf.get(m.teamId) ?? []
    list.push(m.userId)
    teamMembersOf.set(m.teamId, list)
  }

  // Build every entity: each team, plus every user who is not on a team.
  const entities: { entry: LeaderboardEntry; memberIds: string[] }[] = []

  for (const tm of teams) {
    const memberIds = teamMembersOf.get(tm.id) ?? []
    const perMember = memberIds.map((id) => userProgress(id))
    const progress = perMember.reduce((m, p) => Math.max(m, p.progress), 0)
    const times = perMember
      .filter((p) => p.progress === progress && p.reachedAt !== null)
      .map((p) => p.reachedAt as number)
    const reachedAt = progress === 0 ? null : times.length ? Math.min(...times) : null
    const memberNames = memberIds
      .map((id) => userById.get(id))
      .filter(Boolean)
      .map((u) => displayName(u as { firstName: string | null; name: string; email: string }))
    entities.push({
      entry: {
        kind: "team", id: tm.id, name: tm.name, progress, reachedAt,
        members: memberNames, ...countryFor(progress),
      },
      memberIds,
    })
  }

  for (const u of users) {
    if (memberTeamId.has(u.id)) continue
    const { progress, reachedAt } = userProgress(u.id)
    entities.push({
      entry: {
        kind: "solo", id: u.id, name: displayName(u), progress, reachedAt,
        members: [], ...countryFor(progress),
      },
      memberIds: [u.id],
    })
  }

  const entries = entities.map((e) => e.entry)

  // Rank: furthest lead first, then whoever reached it earliest, then name as a
  // stable final tiebreak. Entries still at 0 sink to the bottom, and a null
  // reachedAt sorts last within its lead so a known arrival always beats an
  // unknown one.
  entries.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress
    const aAt = a.reachedAt ?? Number.POSITIVE_INFINITY
    const bAt = b.reachedAt ?? Number.POSITIVE_INFINITY
    if (aAt !== bAt) return aAt - bAt
    return a.name.localeCompare(b.name)
  })

  return entries
}

// ── Finish placement (the compass winner screen) ────────────────────────────

export type FinishPlacement = {
  /** Whether the signed-in explorer's crew has scanned the compass. */
  finished: boolean
  /** 1-based finishing position among all crews/solos, or null if not finished. */
  place: number | null
  /** How many crews/solos have finished so far. */
  totalFinishers: number
  /** Epoch ms the crew finished, or null. */
  finishedAtMs: number | null
}

/**
 * The signed-in explorer's finishing position, ranked by when each crew/solo
 * scanned the compass (earliest = 1st). A team shares one finish, so all its
 * members resolve to the same entity. Used by the winner screen after a finish.
 */
export async function getFinishPlacement(userId: string): Promise<FinishPlacement> {
  const [finishRows, members] = await Promise.all([
    db
      .select({ userId: leadUnlock.userId, unlockedAt: leadUnlock.unlockedAt })
      .from(leadUnlock)
      .where(eq(leadUnlock.leadOrder, FINISH_ORDER)),
    db.select({ userId: teamMember.userId, teamId: teamMember.teamId }).from(teamMember),
  ])

  const teamByUser = new Map(members.map((m) => [m.userId, m.teamId]))
  const keyFor = (uid: string) => {
    const teamId = teamByUser.get(uid)
    return teamId ? `team:${teamId}` : `solo:${uid}`
  }

  // Earliest finish time per entity (team or solo).
  const entityAt = new Map<string, number>()
  for (const r of finishRows) {
    const key = keyFor(r.userId)
    const t = r.unlockedAt.getTime()
    const prev = entityAt.get(key)
    if (prev === undefined || t < prev) entityAt.set(key, t)
  }

  const ranked = [...entityAt.entries()].sort((a, b) => a[1] - b[1])
  const myKey = keyFor(userId)
  const idx = ranked.findIndex(([k]) => k === myKey)
  return {
    finished: idx >= 0,
    place: idx >= 0 ? idx + 1 : null,
    totalFinishers: ranked.length,
    finishedAtMs: idx >= 0 ? ranked[idx][1] : null,
  }
}

// Back-compat re-export of the STATIC seed count. Prefer getTotalLeads() for
// the live count; this is only kept for legacy importers.
export { TOTAL_CLUES } from "@/lib/clues"
