"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { team, teamMember, user } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { MAX_CREW_SIZE, generateInviteCode, type Crew } from "@/lib/teams"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

/** Generate an invite code that is not already taken. Collisions are extremely
 *  unlikely, but loop a few times to be safe before giving up. */
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
  // Fall back to a UUID slice if we somehow keep colliding.
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
}

/** Load the full crew (with roster) for the current user, or null if they are
 *  not in a team yet. */
export async function getMyCrew(): Promise<Crew | null> {
  const userId = await getUserId()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)

  if (membership.length === 0) return null

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0) return null
  const t = rows[0]

  // Join members to user profiles for display names.
  const members = await db
    .select({
      userId: teamMember.userId,
      role: teamMember.role,
      joinedAt: teamMember.joinedAt,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(teamMember)
    .leftJoin(user, eq(user.id, teamMember.userId))
    .where(eq(teamMember.teamId, teamId))
    .orderBy(asc(teamMember.joinedAt))

  return {
    id: t.id,
    name: t.name,
    ownerId: t.ownerId,
    inviteCode: t.inviteCode,
    createdAt: t.createdAt,
    isOwner: t.ownerId === userId,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.name ?? "",
      firstName: m.firstName,
      lastName: m.lastName,
      role: (m.role as "owner" | "member") ?? "member",
      joinedAt: m.joinedAt,
      isYou: m.userId === userId,
    })),
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Create a new crew with the current user as owner. Fails if the user is
 *  already in a team (one-team-per-user). */
export async function createCrew(name: string): Promise<ActionResult> {
  const userId = await getUserId()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const existing = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (existing.length > 0) return { ok: false, error: "already_in_team" }

  const teamId = randomUUID()
  const code = await uniqueInviteCode()

  await db.insert(team).values({
    id: teamId,
    name: trimmed,
    ownerId: userId,
    inviteCode: code,
  })
  await db.insert(teamMember).values({
    id: randomUUID(),
    teamId,
    userId,
    role: "owner",
  })

  revalidatePath("/teams")
  return { ok: true }
}

/** Join an existing crew by invite code. Enforces capacity and the
 *  one-team-per-user rule. */
export async function joinCrewByCode(code: string): Promise<ActionResult> {
  const userId = await getUserId()
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { ok: false, error: "not_found" }

  const rows = await db
    .select()
    .from(team)
    .where(eq(team.inviteCode, normalized))
    .limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }
  const t = rows[0]

  // Already in a team?
  const existing = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (existing.length > 0) {
    return existing[0].teamId === t.id
      ? { ok: false, error: "already_member" }
      : { ok: false, error: "already_in_team" }
  }

  // Capacity check.
  const current = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(eq(teamMember.teamId, t.id))
  if (current.length >= MAX_CREW_SIZE) return { ok: false, error: "full" }

  await db.insert(teamMember).values({
    id: randomUUID(),
    teamId: t.id,
    userId,
    role: "member",
  })

  revalidatePath("/teams")
  return { ok: true }
}

/** Leave the current crew. If the owner leaves, ownership transfers to the
 *  next-oldest member; if they were the last member, the team is deleted. */
export async function leaveCrew(): Promise<ActionResult> {
  const userId = await getUserId()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  const t = rows[0]

  // Remove this member first.
  await db.delete(teamMember).where(eq(teamMember.userId, userId))

  if (t && t.ownerId === userId) {
    // Find the next-oldest remaining member to inherit the crew.
    const remaining = await db
      .select()
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId))
      .orderBy(asc(teamMember.joinedAt))
      .limit(1)

    if (remaining.length === 0) {
      // Last one out: delete the empty crew.
      await db.delete(team).where(eq(team.id, teamId))
    } else {
      const heir = remaining[0]
      await db.update(team).set({ ownerId: heir.userId }).where(eq(team.id, teamId))
      await db
        .update(teamMember)
        .set({ role: "owner" })
        .where(eq(teamMember.userId, heir.userId))
    }
  }

  revalidatePath("/teams")
  return { ok: true }
}

/** Owner removes another member from the crew. */
export async function removeMember(targetUserId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (targetUserId === userId) return { ok: false, error: "cannot_remove_self" }

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0 || rows[0].ownerId !== userId) {
    return { ok: false, error: "not_owner" }
  }

  // Only delete a member who actually belongs to this crew.
  await db
    .delete(teamMember)
    .where(and(eq(teamMember.userId, targetUserId), eq(teamMember.teamId, teamId)))

  revalidatePath("/teams")
  return { ok: true }
}

/** Owner renames the crew. */
export async function renameCrew(name: string): Promise<ActionResult> {
  const userId = await getUserId()
  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0 || rows[0].ownerId !== userId) {
    return { ok: false, error: "not_owner" }
  }

  await db.update(team).set({ name: trimmed }).where(eq(team.id, teamId))
  revalidatePath("/teams")
  return { ok: true }
}

/** Owner regenerates the invite code, invalidating the old link. */
export async function regenerateInvite(): Promise<ActionResult> {
  const userId = await getUserId()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, userId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (rows.length === 0 || rows[0].ownerId !== userId) {
    return { ok: false, error: "not_owner" }
  }

  const code = await uniqueInviteCode()
  await db.update(team).set({ inviteCode: code }).where(eq(team.id, teamId))
  revalidatePath("/teams")
  return { ok: true }
}

/** Lightweight lookup used by the public join page to preview a crew before
 *  the visitor commits to joining. Returns null when the code is invalid. */
export async function getCrewPreviewByCode(code: string) {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const rows = await db
    .select()
    .from(team)
    .where(eq(team.inviteCode, normalized))
    .limit(1)
  if (rows.length === 0) return null
  const t = rows[0]

  const members = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(eq(teamMember.teamId, t.id))

  return {
    id: t.id,
    name: t.name,
    memberCount: members.length,
    isFull: members.length >= MAX_CREW_SIZE,
  }
}
