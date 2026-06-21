"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, leadUnlock, session, team, teamMember, user } from "@/lib/db/schema"
import { requireAdmin, isBootstrapEmail, superadminCount } from "@/lib/admin"
import { MAX_CREW_SIZE, generateInviteCode } from "@/lib/teams"
import {
  setProgressForUsers,
  getClueTokens,
  regenerateToken,
  type ClueTokenRow,
} from "@/lib/hunt"
import {
  listHints,
  createHint,
  updateHint,
  deleteHint,
  regenerateHintToken,
  normalizeLeadOrder,
  type HintRow,
} from "@/lib/hints"
import { TOTAL_CLUES, effectiveUnlockedCount, CLUES } from "@/lib/clues"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"

export type ActionResult = { ok: true } | { ok: false; error: string }

export type AdminUserRow = {
  id: string
  name: string
  email: string
  firstName: string | null
  lastName: string | null
  yearOfBirth: number | null
  role: string
  createdAt: Date
  teamId: string | null
  teamName: string | null
  teamRole: string | null
  /** Effective unlocked-lead count for this user (stored + lead-1 time gate). */
  progress: number
}

export type AdminTeamRow = {
  id: string
  name: string
  ownerId: string
  inviteCode: string
  createdAt: Date
  /** Furthest lead any member of the team has reached. */
  progress: number
  members: {
    userId: string
    name: string
    email: string
    role: string
  }[]
}

export type AdminData = {
  users: AdminUserRow[]
  teams: AdminTeamRow[]
  superadminCount: number
  /** Total number of leads in the hunt (for progress controls). */
  totalLeads: number
  /** QR scan links, one per lead order (2..9). */
  tokens: ClueTokenRow[]
  /** Admin-authored hints, newest first. */
  hints: HintRow[]
  /** Lead options (order + country names) for the hint association dropdown. */
  leadOptions: { order: number; country: string; countryEn: string }[]
}

/** Load every user and team for the dashboard. Superadmin only. */
export async function getAdminData(): Promise<AdminData> {
  await requireAdmin()

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      yearOfBirth: user.yearOfBirth,
      role: user.role,
      createdAt: user.createdAt,
      teamId: teamMember.teamId,
      teamRole: teamMember.role,
      teamName: team.name,
    })
    .from(user)
    .leftJoin(teamMember, eq(teamMember.userId, user.id))
    .leftJoin(team, eq(team.id, teamMember.teamId))
    .orderBy(desc(user.createdAt))

  const teams = await db.select().from(team).orderBy(asc(team.createdAt))

  const allMembers = await db
    .select({
      teamId: teamMember.teamId,
      userId: teamMember.userId,
      role: teamMember.role,
      name: user.name,
      email: user.email,
    })
    .from(teamMember)
    .leftJoin(user, eq(user.id, teamMember.userId))
    .orderBy(asc(teamMember.joinedAt))

  // Per-user stored progress (highest unlocked lead), folded with the lead-1
  // time gate to get each user's effective progress.
  const now = Date.now()
  const unlocks = await db
    .select({ userId: leadUnlock.userId, leadOrder: leadUnlock.leadOrder })
    .from(leadUnlock)
  const storedByUser = new Map<string, number>()
  for (const row of unlocks) {
    storedByUser.set(row.userId, Math.max(storedByUser.get(row.userId) ?? 0, row.leadOrder))
  }
  const progressOf = (userId: string) =>
    effectiveUnlockedCount(storedByUser.get(userId) ?? 0, now)

  const teamsWithMembers: AdminTeamRow[] = teams.map((tm) => {
    const memberRows = allMembers.filter((m) => m.teamId === tm.id)
    // A team's progress is the furthest any of its members has reached.
    const teamProgress = memberRows.reduce((max, m) => Math.max(max, progressOf(m.userId)), 0)
    return {
      id: tm.id,
      name: tm.name,
      ownerId: tm.ownerId,
      inviteCode: tm.inviteCode,
      createdAt: tm.createdAt,
      progress: teamProgress,
      members: memberRows.map((m) => ({
        userId: m.userId,
        name: m.name ?? "",
        email: m.email ?? "",
        role: m.role,
      })),
    }
  })

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      yearOfBirth: u.yearOfBirth,
      role: u.role,
      createdAt: u.createdAt,
      teamId: u.teamId,
      teamName: u.teamName,
      teamRole: u.teamRole,
      progress: progressOf(u.id),
    })),
    teams: teamsWithMembers,
    superadminCount: await superadminCount(),
    totalLeads: TOTAL_CLUES,
    tokens: await getClueTokens(),
    hints: await listHints(),
    leadOptions: CLUES.map((c) => ({
      order: c.order,
      country: c.country,
      countryEn: c.countryEn,
    })),
  }
}

/** Permanently delete a user account and all of its data. */
export async function adminDeleteUser(targetUserId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (targetUserId === admin.id) return { ok: false, error: "cannot_delete_self" }

  // Protect the founding superadmin from deletion.
  const rows = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  const target = rows[0]
  if (!target) return { ok: false, error: "not_found" }
  if (isBootstrapEmail(target.email)) return { ok: false, error: "protected" }

  // If they owned a team, hand it off (or disband) before removing them.
  await handleOwnerDeparture(targetUserId)

  // Remove membership, auth rows, then the user. (sessions/accounts also
  // cascade via FK, but delete explicitly to be safe.)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))
  await db.delete(session).where(eq(session.userId, targetUserId))
  await db.delete(account).where(eq(account.userId, targetUserId))
  await db.delete(user).where(eq(user.id, targetUserId))

  revalidatePath("/admin")
  return { ok: true }
}

/** Promote or demote a user's superadmin status. */
export async function adminSetRole(
  targetUserId: string,
  role: "user" | "superadmin",
): Promise<ActionResult> {
  const admin = await requireAdmin()

  const rows = await db
    .select({ email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  const target = rows[0]
  if (!target) return { ok: false, error: "not_found" }

  // Never let the founding superadmin be demoted.
  if (role === "user" && isBootstrapEmail(target.email)) {
    return { ok: false, error: "protected" }
  }

  // Don't allow removing the last remaining superadmin.
  if (role === "user" && target.role === "superadmin") {
    const count = await superadminCount()
    if (count <= 1) return { ok: false, error: "last_admin" }
  }

  await db.update(user).set({ role }).where(eq(user.id, targetUserId))
  revalidatePath("/admin")
  return { ok: true }
}

/** Set a new password for any user (admin reset). */
export async function adminSetPassword(
  targetUserId: string,
  newPassword: string,
): Promise<ActionResult> {
  await requireAdmin()

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "too_short" }
  }

  const exists = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (exists.length === 0) return { ok: false, error: "not_found" }

  // Hash with Better Auth's own hasher so the new password is login-compatible.
  const hashed = await auth.$context.then((ctx) => ctx.password.hash(newPassword))

  const credentialRows = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")))
    .limit(1)

  if (credentialRows.length === 0) {
    // No credential row yet (e.g. never set a password): create one.
    await db.insert(account).values({
      id: randomUUID(),
      accountId: targetUserId,
      providerId: "credential",
      userId: targetUserId,
      password: hashed,
    })
  } else {
    await db
      .update(account)
      .set({ password: hashed })
      .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")))
  }

  // Invalidate existing sessions so the old password can't keep a session alive.
  await db.delete(session).where(eq(session.userId, targetUserId))

  revalidatePath("/admin")
  return { ok: true }
}

/** Remove a user from whatever team they're in (kick). Handles ownership. */
export async function adminKickFromTeam(targetUserId: string): Promise<ActionResult> {
  await requireAdmin()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  await handleOwnerDeparture(targetUserId)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))

  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Assign a user to a team, or move them from their current team to another.
 * The user always joins as a plain "member". If they currently own a team,
 * ownership is handed off (or the team disbanded) before they move out.
 */
export async function adminAssignToTeam(
  targetUserId: string,
  teamId: string,
): Promise<ActionResult> {
  await requireAdmin()

  // Target must exist.
  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (targetRows.length === 0) return { ok: false, error: "not_found" }

  // Destination team must exist.
  const teamRows = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId)).limit(1)
  if (teamRows.length === 0) return { ok: false, error: "not_found" }

  // No-op if they're already on that team.
  const current = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (current[0]?.teamId === teamId) return { ok: false, error: "already_in_team" }

  // Respect the crew size cap on the destination.
  const destMembers = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  if (destMembers.length >= MAX_CREW_SIZE) return { ok: false, error: "team_full" }

  // Detach from their current team (handing off ownership first if needed),
  // then attach to the destination as a member.
  await handleOwnerDeparture(targetUserId)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))
  await db.insert(teamMember).values({
    id: randomUUID(),
    teamId,
    userId: targetUserId,
    role: "member",
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Disband a team entirely: remove all members and delete the team. */
export async function adminDisbandTeam(teamId: string): Promise<ActionResult> {
  await requireAdmin()

  const rows = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  await db.delete(teamMember).where(eq(teamMember.teamId, teamId))
  await db.delete(team).where(eq(team.id, teamId))

  revalidatePath("/admin")
  return { ok: true }
}

/** Rename any team. */
export async function adminRenameTeam(teamId: string, name: string): Promise<ActionResult> {
  await requireAdmin()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const rows = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  await db.update(team).set({ name: trimmed }).where(eq(team.id, teamId))
  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Create a new, empty team. The admin is recorded as the owner so the
 * `ownerId` column is satisfied, but no membership row is created, leaving all
 * 8 seats open for users to be assigned into via adminAssignToTeam.
 */
export async function adminCreateTeam(name: string): Promise<ActionResult> {
  await requireAdmin()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const admin = await requireAdmin()
  const code = await uniqueInviteCode()

  await db.insert(team).values({
    id: randomUUID(),
    name: trimmed,
    ownerId: admin.id,
    inviteCode: code,
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Generate an invite code not already in use. Mirrors the teams feature. */
async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateInviteCode()
    const existing = await db
      .select({ id: team.id })
      .from(team)
      .where(eq(team.inviteCode, code))
      .limit(1)
    if (existing.length === 0) return code
  }
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
}

/**
 * Set a single user's progress to an exact lead (0..TOTAL_CLUES). This only
 * affects that user; teammates are not touched. Use the team action to move a
 * whole crew together.
 */
export async function adminSetUserProgress(
  targetUserId: string,
  targetLead: number,
): Promise<ActionResult> {
  await requireAdmin()

  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }
  const exists = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (exists.length === 0) return { ok: false, error: "not_found" }

  await setProgressForUsers([targetUserId], Math.floor(targetLead))
  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Set an entire team's progress to an exact lead. Every current member is
 * brought to the same point (added or trimmed). Mirrors how a real scan
 * advances the whole crew.
 */
export async function adminSetTeamProgress(
  teamId: string,
  targetLead: number,
): Promise<ActionResult> {
  await requireAdmin()

  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }
  const memberRows = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  if (memberRows.length === 0) return { ok: false, error: "empty_team" }

  await setProgressForUsers(
    memberRows.map((m) => m.userId),
    Math.floor(targetLead),
  )
  revalidatePath("/admin")
  return { ok: true }
}

/** Reset a single user's progress back to the start (no QR leads held). */
export async function adminResetUserProgress(targetUserId: string): Promise<ActionResult> {
  return adminSetUserProgress(targetUserId, 0)
}

/** Reset an entire team's progress back to the start. */
export async function adminResetTeamProgress(teamId: string): Promise<ActionResult> {
  return adminSetTeamProgress(teamId, 0)
}

/** Issue a fresh QR token for a lead, invalidating the old printed code. */
export async function adminRegenerateToken(leadOrder: number): Promise<ActionResult> {
  await requireAdmin()
  if (!Number.isFinite(leadOrder) || leadOrder < 2 || leadOrder > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }
  await regenerateToken(Math.floor(leadOrder))
  revalidatePath("/admin")
  return { ok: true }
}

// ── Hints (admin) ───────────────────────────────────────────────────────────

/**
 * Create a hint. `leadOrder` is optional: pass a number (1..TOTAL_CLUES) to tie
 * the hint to a lead, or null/empty to leave it unassociated.
 */
export async function adminCreateHint(input: {
  title: string
  body: string
  leadOrder: number | null
}): Promise<ActionResult> {
  await requireAdmin()
  const title = input.title?.trim() ?? ""
  const body = input.body?.trim() ?? ""
  if (title.length < 2) return { ok: false, error: "too_short" }
  if (title.length > 120) return { ok: false, error: "too_long" }
  if (body.length < 1) return { ok: false, error: "too_short" }

  await createHint({ title, body, leadOrder: normalizeLeadOrder(input.leadOrder) })
  revalidatePath("/admin")
  return { ok: true }
}

/** Update a hint's title, body, and optional lead association. */
export async function adminUpdateHint(
  id: string,
  input: { title: string; body: string; leadOrder: number | null },
): Promise<ActionResult> {
  await requireAdmin()
  const title = input.title?.trim() ?? ""
  const body = input.body?.trim() ?? ""
  if (title.length < 2) return { ok: false, error: "too_short" }
  if (title.length > 120) return { ok: false, error: "too_long" }
  if (body.length < 1) return { ok: false, error: "too_short" }

  await updateHint(id, { title, body, leadOrder: normalizeLeadOrder(input.leadOrder) })
  revalidatePath("/admin")
  return { ok: true }
}

/** Delete a hint. Its shareable link stops working immediately. */
export async function adminDeleteHint(id: string): Promise<ActionResult> {
  await requireAdmin()
  await deleteHint(id)
  revalidatePath("/admin")
  return { ok: true }
}

/** Issue a fresh link for a hint, invalidating the old one. */
export async function adminRegenerateHintToken(id: string): Promise<ActionResult> {
  await requireAdmin()
  await regenerateHintToken(id)
  revalidatePath("/admin")
  return { ok: true }
}

/**
 * When a team owner is about to leave/be removed, transfer ownership to the
 * next-oldest member, or delete the team if they were the only member. Not
 * exported (helper) so the "use server" file only surfaces server actions.
 */
async function handleOwnerDeparture(targetUserId: string): Promise<void> {
  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (membership.length === 0) return

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  const t = rows[0]
  if (!t || t.ownerId !== targetUserId) return

  const remaining = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
    .orderBy(asc(teamMember.joinedAt))

  const heir = remaining.find((m) => m.userId !== targetUserId)
  if (!heir) {
    // They were the only member: delete the team.
    await db.delete(team).where(eq(team.id, teamId))
    return
  }

  await db.update(team).set({ ownerId: heir.userId }).where(eq(team.id, teamId))
  await db.update(teamMember).set({ role: "owner" }).where(eq(teamMember.userId, heir.userId))
}
