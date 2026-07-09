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
  clampProgress,
  effectiveUnlockedCount,
  isLeadOneOpen,
  START_MS,
  pointsForPlacement,
  type Difficulty,
} from "@/lib/clues"
import {
  getLeadDefs,
  getTotalLeads,
  listTokens,
  regenerateTokenForLead,
  FINISH_LEAD_ID,
} from "@/lib/leads"
import { getScoreConfig } from "@/lib/scoring"
import { getSolveCooldownSeconds } from "@/lib/hunt-config"
import { logActivity, resolveUserSnapshot } from "@/lib/activity"
import { and, eq, gt, inArray } from "drizzle-orm"
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

/**
 * The signed-in user's current leaderboard score. Derived from the live
 * standings (placements are relative to everyone), matching the user's own
 * solo entry or their crew's team entry. Returns 0 if not yet ranked.
 */
export async function getUserScore(
  userId: string,
  nowMs: number = Date.now(),
): Promise<number> {
  const me = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  const teamId = me[0]?.teamId ?? null
  const board = await getLeaderboard(nowMs)
  const entry = teamId
    ? board.find((e) => e.kind === "team" && e.id === teamId)
    : board.find((e) => e.kind === "solo" && e.id === userId)
  return entry?.score ?? 0
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
async function ensureUpTo(
  userIds: string[],
  targetLead: number,
  source: string,
  at: Date,
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
        values.push({ id: randomUUID(), userId: uid, leadOrder: order, source, unlockedAt: at })
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
 * Set the stored progress for a set of users to exactly `targetLead`
 * (0..TOTAL_CLUES). Used by admin tools. Adds missing leads and trims any
 * above the target. Lead 1 is time-global and never stored, so a target of 0
 * or 1 simply means "no QR leads held".
 */
export async function setProgressForUsers(
  userIds: string[],
  targetLead: number,
  source = "admin",
): Promise<void> {
  const target = clampProgress(targetLead, await getTotalLeads())
  await trimAbove(userIds, target)
  await ensureUpTo(userIds, target, source, new Date())
}

export type UnlockResult =
  | { status: "unlocked"; leadOrder: number; country: string; countryEn: string }
  | { status: "already"; leadOrder: number; country: string; countryEn: string }
  | { status: "out_of_order"; required: number; current: number; leadOrder: number }
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
async function insertFinishRows(userIds: string[], at: Date): Promise<void> {
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
      source: "qr",
      unlockedAt: at,
    }))
  if (values.length > 0) {
    await db.insert(leadUnlock).values(values).onConflictDoNothing()
  }
}

/**
 * Record a lead solve / finish in the activity log. The scanner is the actor;
 * a scan advances the whole crew, so we tag the scanner's team for context.
 */
async function logLeadSolved(
  userId: string,
  leadOrder: number,
  country: string,
  countryEn: string,
  finished: boolean,
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
      ? `${snap.name} scanned the finishing QR (${country})`
      : `${snap.name} solved lead No. ${padded} (${country})`,
    metadata: { source: "qr", country, countryEn, crewScan: true },
  })
}

/**
 * Attempt to unlock a lead from a scanned QR token, for `userId` and their
 * whole crew. Enforces strict order against the crew's furthest progress.
 */
export async function unlockByToken(userId: string, token: string): Promise<UnlockResult> {
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

  // The finishing QR marks the final lead as solved. It carries no real clue
  // and never raises displayed progress; it only lets the last lead be scored.
  if (leadId === FINISH_LEAD_ID) {
    const crew = await getCrewUserIds(userId)
    const now = Date.now()
    const current = await getCrewEffectiveProgress(crew, now)
    const last = defs[defs.length - 1]
    if (!last) return { status: "invalid" }
    if (current < total) {
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
    const finishCooldown = await checkSolveCooldown(crew, FINISH_ORDER, now)
    if (finishCooldown) return finishCooldown
    await insertFinishRows(crew, new Date(now))
    await logLeadSolved(userId, FINISH_ORDER, last.country, last.countryEn, true)
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
  const cooldown = await checkSolveCooldown(crew, leadOrder, now)
  if (cooldown) return cooldown

  await ensureUpTo(crew, leadOrder, "qr", new Date(now))
  await logLeadSolved(userId, leadOrder, clue.country, clue.countryEn, false)
  return { status: "unlocked", leadOrder, country: clue.country, countryEn: clue.countryEn }
}

// ── Tokens (admin) ──────────────────────────────────────────────────────────

export type ClueTokenRow = {
  leadOrder: number
  leadId: string
  country: string
  token: string
  link: string
  isFinish: boolean
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
  }))
}

/**
 * Replace a lead's token with a fresh one, addressed by its CURRENT position
 * (the finish QR uses FINISH_ORDER). Resolves to the stable leadId first so the
 * right lead's token is rotated. Invalidates any printed QR for that lead.
 */
export async function regenerateToken(leadOrder: number): Promise<string> {
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
  /** Total leaderboard score: sum of placement points earned across all leads. */
  score: number
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
 * Build the full leaderboard: every team and every team-less user, ranked by
 * total score (highest first), then furthest lead, then who got there first.
 *
 * Scoring: a lead is "completed" the moment a crew leaves it for the next stop
 * (i.e. reaches lead N+1; the very last lead is completed by scanning the
 * finishing QR). For each lead we rank everyone who completed it by how early
 * they did, and award placement points (1st/2nd/3rd/rest) plus the lead's
 * difficulty bonus. A score is the sum of those points across all leads, and is
 * always recomputed live from the current settings.
 */
export async function getLeaderboard(nowMs: number = Date.now()): Promise<LeaderboardEntry[]> {
  const [users, members, teams, unlocks, config, leadDefs] = await Promise.all([
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
    getScoreConfig(),
    getLeadDefs(),
  ])

  const total = leadDefs.length
  const difficultyByPos = new Map(leadDefs.map((d) => [d.order, d.difficulty]))
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
    // Ignore the virtual finishing order when computing displayed progress.
    const storedMax = rows.reduce((m, r) => (r.order <= total ? Math.max(m, r.order) : m), 0)
    const progress = effectiveUnlockedCount(storedMax, nowMs, total)
    if (progress === 0) return { progress: 0, reachedAt: null }
    if (progress === 1) return { progress: 1, reachedAt: lead1Open ? START_MS : null }
    const at = rows.find((r) => r.order === storedMax)?.at ?? null
    return { progress, reachedAt: at }
  }

  // Earliest moment any member of a crew reached a given lead order (or null).
  function crewReachedAt(memberIds: string[], order: number): number | null {
    let best: number | null = null
    for (const uid of memberIds) {
      for (const r of byUser.get(uid) ?? []) {
        if (r.order === order && (best === null || r.at < best)) best = r.at
      }
    }
    return best
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

  // Build every entity (team + solo) with its member ids retained for scoring.
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
        kind: "team", id: tm.id, name: tm.name, progress, score: 0, reachedAt,
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
        kind: "solo", id: u.id, name: displayName(u), progress, score: 0, reachedAt,
        members: [], ...countryFor(progress),
      },
      memberIds: [u.id],
    })
  }

  // Score each lead: rank everyone who completed it (reached the next stop) by
  // completion time, then award placement points + the lead's difficulty bonus.
  for (let lead = 1; lead <= total; lead++) {
    const difficulty: Difficulty = difficultyByPos.get(lead) ?? "easy"
    const finishers = entities
      .map((e) => ({ e, at: crewReachedAt(e.memberIds, lead + 1) }))
      .filter((x): x is { e: (typeof entities)[number]; at: number } => x.at !== null)
      .sort((a, b) => a.at - b.at || a.e.entry.id.localeCompare(b.e.entry.id))
    finishers.forEach((f, idx) => {
      f.e.entry.score += pointsForPlacement(config, difficulty, idx)
    })
  }

  const entries = entities.map((e) => e.entry)

  // Rank: highest score first, then furthest lead, then earliest to get there,
  // then name. Zero-score / zero-progress entries sink to the bottom.
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.progress !== a.progress) return b.progress - a.progress
    const aAt = a.reachedAt ?? Number.POSITIVE_INFINITY
    const bAt = b.reachedAt ?? Number.POSITIVE_INFINITY
    if (aAt !== bAt) return aAt - bAt
    return a.name.localeCompare(b.name)
  })

  return entries
}

// Back-compat re-export of the STATIC seed count. Prefer getTotalLeads() for
// the live count; this is only kept for legacy importers.
export { TOTAL_CLUES } from "@/lib/clues"
