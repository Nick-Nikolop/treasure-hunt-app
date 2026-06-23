"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, leadContent, leadUnlock, session, team, teamMember, user } from "@/lib/db/schema"
import { requireAdmin, isBootstrapEmail, superadminCount, type AdminUser } from "@/lib/admin"
import {
  logActivity,
  resolveUserSnapshot,
  actorLabel,
  listActivity,
  type ActivityCategory,
  type ActivityPage,
} from "@/lib/activity"
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
import {
  getScoreConfig,
  getLeadDifficulties,
  setScoreConfig,
  setLeadDifficulties,
} from "@/lib/scoring"
import { getEditableLeads, type EditableLead } from "@/lib/lead-content"
import {
  TOTAL_CLUES,
  FINISH_ORDER,
  effectiveUnlockedCount,
  CLUES,
  isDifficulty,
  type Difficulty,
  type ScoreConfig,
} from "@/lib/clues"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Build the actor fields for an activity log entry from the acting admin. */
function adminActor(admin: AdminUser) {
  return {
    actorId: admin.id,
    actorName: actorLabel(admin),
    actorRole: admin.role,
  }
}

/**
 * Read a filtered, paginated page of the activity log for the admin dashboard.
 * Superadmin only. `before` is an ISO timestamp cursor for "load more".
 */
export async function getActivityLog(input: {
  category?: ActivityCategory | null
  userId?: string | null
  teamId?: string | null
  search?: string | null
  before?: string | null
}): Promise<ActivityPage> {
  await requireAdmin()
  return listActivity({
    category: input.category ?? null,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    search: input.search ?? null,
    before: input.before ? new Date(input.before) : null,
    limit: 50,
  })
}

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
  /** Global scoring tiers (placement points + difficulty bonuses). */
  scoreConfig: ScoreConfig
  /** Difficulty per lead order (1..TOTAL_CLUES). */
  leadDifficulties: { order: number; difficulty: Difficulty }[]
  /** Editable lead copy (subtitle + body, per language) with defaults merged. */
  leads: EditableLead[]
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

  const difficultyMap = await getLeadDifficulties()

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
    scoreConfig: await getScoreConfig(),
    leadDifficulties: CLUES.map((c) => ({
      order: c.order,
      difficulty: difficultyMap.get(c.order) ?? "easy",
    })),
    leads: await getEditableLeads(),
  }
}

/**
 * Save the editable copy for a single lead. Stores the subtitle and body in
 * both languages; the journal merges these over the hardcoded defaults on its
 * next render. Country name and stamp icon are not editable. Passing an empty
 * field clears that override so the lead reverts to its default text.
 */
export async function adminSaveLead(input: {
  leadOrder: number
  subtitle: string
  subtitleEn: string
  body: string
  bodyEn: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const order = Math.floor(input.leadOrder)
  if (!Number.isFinite(order) || order < 1 || order > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }

  // Normalize: empty/whitespace becomes NULL so the lead falls back to default.
  const norm = (v: string) => {
    const t = (v ?? "").trim()
    return t.length > 0 ? t : null
  }
  const row = {
    leadOrder: order,
    subtitle: norm(input.subtitle),
    subtitleEn: norm(input.subtitleEn),
    body: norm(input.body),
    bodyEn: norm(input.bodyEn),
    updatedAt: new Date(),
  }

  await db
    .insert(leadContent)
    .values(row)
    .onConflictDoUpdate({
      target: leadContent.leadOrder,
      set: {
        subtitle: row.subtitle,
        subtitleEn: row.subtitleEn,
        body: row.body,
        bodyEn: row.bodyEn,
        updatedAt: row.updatedAt,
      },
    })

  const clue = CLUES.find((c) => c.order === order)
  await logActivity({
    category: "admin",
    action: "admin.lead_edited",
    ...adminActor(admin),
    leadOrder: order,
    summary: `${adminActor(admin).actorName} edited the copy for lead No. ${String(order).padStart(2, "0")}${clue ? ` (${clue.country})` : ""}`,
  })

  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Save the scoring settings: the global placement tiers and each lead's
 * difficulty. Scores are computed live from these on every leaderboard read,
 * so saving here instantly recalculates every standing.
 */
export async function adminSaveScoring(input: {
  config: ScoreConfig
  difficulties: { leadOrder: number; difficulty: Difficulty }[]
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const c = input.config
  const nums = [
    c.firstPoints,
    c.secondPoints,
    c.thirdPoints,
    c.restPoints,
    c.mediumBonus,
    c.hardBonus,
  ]
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    return { ok: false, error: "bad_value" }
  }
  if (
    !Array.isArray(input.difficulties) ||
    input.difficulties.some((d) => !isDifficulty(d.difficulty))
  ) {
    return { ok: false, error: "bad_value" }
  }

  await setScoreConfig(c)
  await setLeadDifficulties(input.difficulties)

  await logActivity({
    category: "admin",
    action: "admin.scoring_updated",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} updated scoring settings and lead difficulties`,
    metadata: { config: c },
  })

  // Standings are derived live, but revalidate both surfaces so the new numbers
  // show immediately.
  revalidatePath("/admin")
  revalidatePath("/leaderboard")
  return { ok: true }
}

/** Permanently delete a user account and all of its data. */
export async function adminDeleteUser(targetUserId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (targetUserId === admin.id) return { ok: false, error: "cannot_delete_self" }

  // Protect the founding superadmin from deletion.
  const rows = await db
    .select({
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  const target = rows[0]
  if (!target) return { ok: false, error: "not_found" }
  if (isBootstrapEmail(target.email)) return { ok: false, error: "protected" }
  const targetName = actorLabel(target)

  // If they owned a team, hand it off (or disband) before removing them.
  await handleOwnerDeparture(targetUserId)

  // Remove membership, auth rows, then the user. (sessions/accounts also
  // cascade via FK, but delete explicitly to be safe.)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))
  await db.delete(session).where(eq(session.userId, targetUserId))
  await db.delete(account).where(eq(account.userId, targetUserId))
  await db.delete(user).where(eq(user.id, targetUserId))

  await logActivity({
    category: "admin",
    action: "admin.user_deleted",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary: `${adminActor(admin).actorName} permanently deleted the account of ${targetName} (${target.email})`,
    metadata: { email: target.email, role: target.role },
  })

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
    .select({
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
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

  const targetName = actorLabel(target)
  await logActivity({
    category: "admin",
    action: role === "superadmin" ? "admin.role_granted" : "admin.role_revoked",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary:
      role === "superadmin"
        ? `${adminActor(admin).actorName} promoted ${targetName} to superadmin`
        : `${adminActor(admin).actorName} revoked superadmin from ${targetName}`,
    metadata: { from: target.role, to: role },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Set a new password for any user (admin reset). */
export async function adminSetPassword(
  targetUserId: string,
  newPassword: string,
): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "too_short" }
  }

  const exists = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
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

  const targetName = actorLabel(exists[0])
  await logActivity({
    category: "admin",
    action: "admin.password_reset",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary: `${adminActor(admin).actorName} reset the password for ${targetName} (${exists[0].email})`,
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Remove a user from whatever team they're in (kick). Handles ownership. */
export async function adminKickFromTeam(targetUserId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const kickedTeamId = membership[0].teamId
  const teamRows = await db
    .select({ name: team.name })
    .from(team)
    .where(eq(team.id, kickedTeamId))
    .limit(1)
  const target = await resolveUserSnapshot(targetUserId)

  await handleOwnerDeparture(targetUserId)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))

  await logActivity({
    category: "admin",
    action: "admin.member_kicked",
    ...adminActor(admin),
    targetUserId,
    targetUserName: target.name,
    teamId: kickedTeamId,
    teamName: teamRows[0]?.name ?? null,
    summary: `${adminActor(admin).actorName} kicked ${target.name} from "${teamRows[0]?.name ?? "?"}"`,
  })

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
  const admin = await requireAdmin()

  // Target must exist.
  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (targetRows.length === 0) return { ok: false, error: "not_found" }

  // Destination team must exist.
  const teamRows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (teamRows.length === 0) return { ok: false, error: "not_found" }

  // No-op if they're already on that team.
  const current = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (current[0]?.teamId === teamId) return { ok: false, error: "already_in_team" }
  const cameFromTeam = current[0]?.teamId ?? null

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

  const target = await resolveUserSnapshot(targetUserId)
  await logActivity({
    category: "admin",
    action: cameFromTeam ? "admin.member_moved" : "admin.member_assigned",
    ...adminActor(admin),
    targetUserId,
    targetUserName: target.name,
    teamId,
    teamName: teamRows[0].name,
    summary: cameFromTeam
      ? `${adminActor(admin).actorName} moved ${target.name} to team "${teamRows[0].name}"`
      : `${adminActor(admin).actorName} assigned ${target.name} to team "${teamRows[0].name}"`,
    metadata: { fromTeamId: cameFromTeam },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Disband a team entirely: remove all members and delete the team. */
export async function adminDisbandTeam(teamId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const rows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  const memberCount = (
    await db.select({ id: teamMember.id }).from(teamMember).where(eq(teamMember.teamId, teamId))
  ).length

  await db.delete(teamMember).where(eq(teamMember.teamId, teamId))
  await db.delete(team).where(eq(team.id, teamId))

  await logActivity({
    category: "admin",
    action: "admin.team_disbanded",
    ...adminActor(admin),
    teamId,
    teamName: rows[0].name,
    summary: `${adminActor(admin).actorName} disbanded team "${rows[0].name}" (${memberCount} member(s) removed)`,
    metadata: { memberCount },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Rename any team. */
export async function adminRenameTeam(teamId: string, name: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const rows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  const oldName = rows[0].name
  await db.update(team).set({ name: trimmed }).where(eq(team.id, teamId))

  await logActivity({
    category: "admin",
    action: "admin.team_renamed",
    ...adminActor(admin),
    teamId,
    teamName: trimmed,
    summary: `${adminActor(admin).actorName} renamed team "${oldName}" to "${trimmed}"`,
    metadata: { oldName, newName: trimmed },
  })

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
  const newTeamId = randomUUID()

  await db.insert(team).values({
    id: newTeamId,
    name: trimmed,
    ownerId: admin.id,
    inviteCode: code,
  })

  await logActivity({
    category: "admin",
    action: "admin.team_created",
    ...adminActor(admin),
    teamId: newTeamId,
    teamName: trimmed,
    summary: `${adminActor(admin).actorName} created an empty team "${trimmed}"`,
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
  const admin = await requireAdmin()

  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }
  const exists = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (exists.length === 0) return { ok: false, error: "not_found" }

  const lead = Math.floor(targetLead)
  await setProgressForUsers([targetUserId], lead)

  const targetName = actorLabel(exists[0])
  await logActivity({
    category: "admin",
    action: lead === 0 ? "admin.progress_reset" : "admin.progress_set",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    leadOrder: lead || null,
    summary:
      lead === 0
        ? `${adminActor(admin).actorName} reset ${targetName}'s progress to the start`
        : `${adminActor(admin).actorName} set ${targetName}'s progress to lead No. ${String(lead).padStart(2, "0")}`,
    metadata: { lead },
  })

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
  const admin = await requireAdmin()

  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > TOTAL_CLUES) {
    return { ok: false, error: "bad_value" }
  }
  const memberRows = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  if (memberRows.length === 0) return { ok: false, error: "empty_team" }

  const teamRows = await db
    .select({ name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  const lead = Math.floor(targetLead)
  await setProgressForUsers(
    memberRows.map((m) => m.userId),
    lead,
  )

  const teamName = teamRows[0]?.name ?? "?"
  await logActivity({
    category: "admin",
    action: lead === 0 ? "admin.team_progress_reset" : "admin.team_progress_set",
    ...adminActor(admin),
    teamId,
    teamName: teamRows[0]?.name ?? null,
    leadOrder: lead || null,
    summary:
      lead === 0
        ? `${adminActor(admin).actorName} reset team "${teamName}" to the start`
        : `${adminActor(admin).actorName} set team "${teamName}" to lead No. ${String(lead).padStart(2, "0")}`,
    metadata: { lead, memberCount: memberRows.length },
  })

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
  const order = Math.floor(leadOrder)
  const valid = (order >= 2 && order <= TOTAL_CLUES) || order === FINISH_ORDER
  if (!Number.isFinite(leadOrder) || !valid) {
    return { ok: false, error: "bad_value" }
  }
  await regenerateToken(order)
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
