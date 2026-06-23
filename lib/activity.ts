// ─────────────────────────────────────────────────────────────────────────
//  Activity log — the append-only audit trail for the whole hunt.
//
//  Every meaningful event (a lead solved, a team created/joined/left/disbanded,
//  an admin action, a signup/login) writes one row here via `logActivity`.
//  Identities are snapshotted as plain text so entries survive the deletion of
//  the user or team they reference.
//
//  Writes are best-effort: logging must NEVER break the action it records, so
//  every insert is wrapped in try/catch and failures are only console-warned.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { activityLog, user } from "@/lib/db/schema"
import { and, desc, eq, ilike, inArray, lt, or, type SQL } from "drizzle-orm"
import { randomUUID } from "node:crypto"

export type ActivityCategory = "lead" | "team" | "admin" | "auth"

/** A single event to record. Only `category`, `action` and `summary` are required. */
export type ActivityInput = {
  category: ActivityCategory
  action: string
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  targetUserId?: string | null
  targetUserName?: string | null
  teamId?: string | null
  teamName?: string | null
  leadOrder?: number | null
  summary: string
  metadata?: Record<string, unknown> | null
}

export type ActivityRow = {
  id: string
  createdAt: Date
  category: string
  action: string
  actorId: string | null
  actorName: string | null
  actorRole: string | null
  targetUserId: string | null
  targetUserName: string | null
  teamId: string | null
  teamName: string | null
  leadOrder: number | null
  summary: string
  metadata: Record<string, unknown> | null
}

/**
 * Record one event. Best-effort: never throws, so a logging failure can't
 * roll back or break the user/admin action that triggered it.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await db.insert(activityLog).values({
      id: randomUUID(),
      category: input.category,
      action: input.action,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      actorRole: input.actorRole ?? null,
      targetUserId: input.targetUserId ?? null,
      targetUserName: input.targetUserName ?? null,
      teamId: input.teamId ?? null,
      teamName: input.teamName ?? null,
      leadOrder: input.leadOrder ?? null,
      summary: input.summary,
      metadata: input.metadata ?? null,
    })
  } catch (err) {
    console.log("[v0] activity log write failed:", (err as Error)?.message)
  }
}

/** A compact, display-friendly label for a user (firstName > name > email local part). */
export function actorLabel(u: {
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  email?: string | null
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
  if (full) return full
  if (u.name?.trim()) return u.name.trim()
  if (u.email) return u.email.split("@")[0]
  return "Unknown"
}

/**
 * Look up a user's snapshot identity (label + role) for logging. Returns
 * sensible fallbacks if the user can't be found.
 */
export async function resolveUserSnapshot(
  userId: string,
): Promise<{ name: string; role: string }> {
  try {
    const rows = await db
      .select({
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    const u = rows[0]
    if (!u) return { name: "Unknown", role: "user" }
    return { name: actorLabel(u), role: u.role ?? "user" }
  } catch {
    return { name: "Unknown", role: "user" }
  }
}

export type ActivityFilters = {
  /** Restrict to a single category. */
  category?: ActivityCategory | null
  /** Restrict to events about a single user (as target OR actor). */
  userId?: string | null
  /** Restrict to events about a single team. */
  teamId?: string | null
  /** Free-text match against actor/target/team names and the summary. */
  search?: string | null
  /** Page size (default 50). */
  limit?: number
  /** Keyset cursor: only rows strictly older than this timestamp. */
  before?: Date | null
}

export type ActivityPage = {
  rows: ActivityRow[]
  /** True if more rows exist past this page. */
  hasMore: boolean
  /** Cursor to pass as `before` for the next page (oldest row's createdAt). */
  nextCursor: string | null
}

/**
 * Read a page of the log, newest first, with optional filtering. Uses keyset
 * pagination on `createdAt` so deep pages stay fast.
 */
export async function listActivity(filters: ActivityFilters = {}): Promise<ActivityPage> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)

  const conds: SQL[] = []
  if (filters.category) conds.push(eq(activityLog.category, filters.category))
  if (filters.userId) {
    conds.push(
      or(
        eq(activityLog.targetUserId, filters.userId),
        eq(activityLog.actorId, filters.userId),
      ) as SQL,
    )
  }
  if (filters.teamId) conds.push(eq(activityLog.teamId, filters.teamId))
  if (filters.search?.trim()) {
    const term = filters.search.trim()
    const q = `%${term}%`

    // Emails (and current names) aren't snapshotted into the log, so resolve the
    // search term against the user table and match the resulting ids against the
    // event's actor/target. This makes "search by email" work, and also catches
    // users whose current name differs from the label stored at write time.
    const matchedUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(
        or(
          ilike(user.email, q),
          ilike(user.name, q),
          ilike(user.firstName, q),
          ilike(user.lastName, q),
        ),
      )
      .limit(500)
    const matchedIds = matchedUsers.map((u) => u.id)

    const searchClauses: SQL[] = [
      ilike(activityLog.actorName, q),
      ilike(activityLog.targetUserName, q),
      ilike(activityLog.teamName, q),
      ilike(activityLog.summary, q),
      ilike(activityLog.action, q),
    ]
    if (matchedIds.length) {
      searchClauses.push(inArray(activityLog.actorId, matchedIds))
      searchClauses.push(inArray(activityLog.targetUserId, matchedIds))
    }
    conds.push(or(...searchClauses) as SQL)
  }
  if (filters.before) conds.push(lt(activityLog.createdAt, filters.before))

  const where = conds.length ? and(...conds) : undefined

  // Fetch one extra row to determine whether another page exists.
  const rows = await db
    .select()
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null

  return { rows: page as ActivityRow[], hasMore, nextCursor }
}
