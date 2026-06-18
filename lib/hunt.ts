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
  TOTAL_CLUES,
  clampProgress,
  effectiveUnlockedCount,
  isLeadOneOpen,
  START_MS,
  CLUES,
} from "@/lib/clues"
import { and, eq, gt, inArray } from "drizzle-orm"
import { randomUUID } from "node:crypto"

/** Absolute base URL of the site, mirroring lib/auth.ts's cascade. */
export function siteUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL || "http://localhost:3000")
  ).replace(/\/$/, "")
}

/** The scan URL a QR code should encode for a given token. */
export function huntLinkFor(token: string): string {
  return `${siteUrl()}/q/${token}`
}

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
  return effectiveUnlockedCount(stored, nowMs)
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
  return effectiveUnlockedCount(storedMax, nowMs)
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
  const target = clampProgress(targetLead)
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
  const target = clampProgress(targetLead)
  await trimAbove(userIds, target)
  await ensureUpTo(userIds, target, source, new Date())
}

export type UnlockResult =
  | { status: "unlocked"; leadOrder: number; country: string; countryEn: string }
  | { status: "already"; leadOrder: number; country: string; countryEn: string }
  | { status: "out_of_order"; required: number; current: number; leadOrder: number }
  | { status: "invalid" }

/**
 * Attempt to unlock a lead from a scanned QR token, for `userId` and their
 * whole crew. Enforces strict order against the crew's furthest progress.
 */
export async function unlockByToken(userId: string, token: string): Promise<UnlockResult> {
  const tokenRows = await db
    .select({ leadOrder: clueToken.leadOrder })
    .from(clueToken)
    .where(eq(clueToken.token, token))
    .limit(1)
  const leadOrder = tokenRows[0]?.leadOrder
  if (!leadOrder) return { status: "invalid" }

  const clue = CLUES.find((c) => c.order === leadOrder)
  if (!clue) return { status: "invalid" }

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

  await ensureUpTo(crew, leadOrder, "qr", new Date(now))
  return { status: "unlocked", leadOrder, country: clue.country, countryEn: clue.countryEn }
}

// ── Tokens (admin) ──────────────────────────────────────────────────────────

export type ClueTokenRow = { leadOrder: number; token: string; link: string }

/** All QR tokens with their absolute scan links, ordered by lead. */
export async function getClueTokens(): Promise<ClueTokenRow[]> {
  const rows = await db
    .select({ leadOrder: clueToken.leadOrder, token: clueToken.token })
    .from(clueToken)
  return rows
    .sort((a, b) => a.leadOrder - b.leadOrder)
    .map((r) => ({ ...r, link: huntLinkFor(r.token) }))
}

/** Replace a lead's token with a fresh one. Invalidates any printed QR. */
export async function regenerateToken(leadOrder: number): Promise<string> {
  const fresh = randomUUID().replace(/-/g, "").slice(0, 18)
  await db
    .insert(clueToken)
    .values({ leadOrder, token: fresh })
    .onConflictDoUpdate({ target: clueToken.leadOrder, set: { token: fresh } })
  return fresh
}

// ── Leaderboard ───────────────────────────────────────────────────────────

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

function countryFor(progress: number): { country: string | null; countryEn: string | null } {
  const clue = CLUES.find((c) => c.order === progress)
  return { country: clue?.country ?? null, countryEn: clue?.countryEn ?? null }
}

/**
 * Build the full leaderboard: every team and every team-less user, ranked by
 * furthest lead reached, then by who got there first.
 */
export async function getLeaderboard(nowMs: number = Date.now()): Promise<LeaderboardEntry[]> {
  const [users, members, teams, unlocks] = await Promise.all([
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
  ])

  const lead1Open = isLeadOneOpen(nowMs)
  const userById = new Map(users.map((u) => [u.id, u]))

  // Per-user: highest lead + when they reached it.
  const byUser = new Map<string, { order: number; at: number }[]>()
  for (const row of unlocks) {
    const list = byUser.get(row.userId) ?? []
    list.push({ order: row.leadOrder, at: row.unlockedAt.getTime() })
    byUser.set(row.userId, list)
  }
  function userProgress(userId: string): { progress: number; reachedAt: number | null } {
    const rows = byUser.get(userId) ?? []
    const storedMax = rows.reduce((m, r) => Math.max(m, r.order), 0)
    const progress = effectiveUnlockedCount(storedMax, nowMs)
    if (progress === 0) return { progress: 0, reachedAt: null }
    if (progress === 1) return { progress: 1, reachedAt: lead1Open ? START_MS : null }
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

  const entries: LeaderboardEntry[] = []

  for (const tm of teams) {
    const memberIds = teamMembersOf.get(tm.id) ?? []
    if (memberIds.length === 0) {
      entries.push({
        kind: "team", id: tm.id, name: tm.name, progress: 0, reachedAt: null,
        members: [], country: null, countryEn: null,
      })
      continue
    }
    const perMember = memberIds.map((id) => userProgress(id))
    const progress = perMember.reduce((m, p) => Math.max(m, p.progress), 0)
    // Earliest moment any member reached the crew's furthest lead.
    const times = perMember
      .filter((p) => p.progress === progress && p.reachedAt !== null)
      .map((p) => p.reachedAt as number)
    const reachedAt = progress === 0 ? null : times.length ? Math.min(...times) : null
    const memberNames = memberIds
      .map((id) => userById.get(id))
      .filter(Boolean)
      .map((u) => displayName(u as { firstName: string | null; name: string; email: string }))
    entries.push({
      kind: "team", id: tm.id, name: tm.name, progress, reachedAt,
      members: memberNames, ...countryFor(progress),
    })
  }

  // Team-less users.
  for (const u of users) {
    if (memberTeamId.has(u.id)) continue
    const { progress, reachedAt } = userProgress(u.id)
    entries.push({
      kind: "solo", id: u.id, name: displayName(u), progress, reachedAt,
      members: [], ...countryFor(progress),
    })
  }

  // Rank: furthest first, then earliest to get there, then name. Zero-progress
  // and not-yet-reached entries sink to the bottom.
  entries.sort((a, b) => {
    if (b.progress !== a.progress) return b.progress - a.progress
    const aAt = a.reachedAt ?? Number.POSITIVE_INFINITY
    const bAt = b.reachedAt ?? Number.POSITIVE_INFINITY
    if (aAt !== bAt) return aAt - bAt
    return a.name.localeCompare(b.name)
  })

  return entries
}

export { TOTAL_CLUES }
