import "server-only"

import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { scanPing } from "@/lib/db/schema"
import { COMPASS_LEAD_ID, FINISH_LEAD_ID, TRAIL_END_LEAD_ID } from "@/lib/leads"

/**
 * Silently record where a hunt scan was attempted from.
 *
 * This is telemetry for the founder's manual proof review, never gameplay, so it
 * is wrapped to be completely inert on failure: a thrown error here (including
 * the table not existing yet on an old deploy) must never change the scan's
 * outcome. Keep it to a single INSERT with no extra reads so it adds no
 * meaningful latency to the live scan path.
 */
export async function recordScanPing(input: {
  userId: string
  token: string
  lat: number
  lng: number
  accuracy?: number | null
  distanceM?: number | null
  radiusM?: number | null
  ok: boolean
}): Promise<void> {
  try {
    await db.insert(scanPing).values({
      id: randomUUID(),
      userId: input.userId,
      token: input.token,
      lat: String(input.lat),
      lng: String(input.lng),
      accuracy: input.accuracy == null ? null : String(input.accuracy),
      distanceM: input.distanceM ?? null,
      radiusM: input.radiusM ?? null,
      ok: input.ok,
    })
  } catch {
    // Best-effort only. Never surface to the scanning explorer.
  }
}

export type ScanSubjectUser = {
  kind: "user"
  id: string
  name: string
  email: string
  teamId: string | null
  teamName: string | null
  pings: number
  lastAt: string | null
}

export type ScanSubjectTeam = {
  kind: "team"
  id: string
  name: string
  members: number
  pings: number
  lastAt: string | null
}

export type ScanSubjects = { users: ScanSubjectUser[]; teams: ScanSubjectTeam[] }

export type ScanPingRow = {
  id: string
  userId: string
  userName: string
  teamId: string | null
  teamName: string | null
  leadLabel: string
  lat: number
  lng: number
  accuracy: number | null
  distanceM: number | null
  radiusM: number | null
  ok: boolean
  createdAt: string
}

function likePattern(query: string): string {
  // Escape LIKE wildcards so a user typing "%" doesn't match everything.
  return `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`
}

function toIso(v: unknown): string | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function leadLabelFrom(row: {
  leadPosition: number | null
  leadCountry: string | null
  leadId: string | null
}): string {
  if (row.leadId === FINISH_LEAD_ID) return "Treasure"
  if (row.leadId === COMPASS_LEAD_ID) return "Compass"
  if (row.leadId === TRAIL_END_LEAD_ID) return "Trail end"
  if (row.leadPosition != null) {
    return row.leadCountry ? `#${row.leadPosition} ${row.leadCountry}` : `Lead #${row.leadPosition}`
  }
  return "Unknown lead"
}

/**
 * Find users (by name or email) and teams (by name) that match a query, each
 * annotated with how many scan pings we have captured for them. Ordered so the
 * subjects with actual scan data float to the top.
 */
export async function searchScanSubjects(query: string, limit = 8): Promise<ScanSubjects> {
  const q = query.trim()
  if (q.length < 2) return { users: [], teams: [] }
  const like = likePattern(q)

  const usersRes = await db.execute(sql`
    SELECT u.id, u.name, u.email,
           t.id   AS "teamId",
           t.name AS "teamName",
           count(sp.id)::int    AS pings,
           max(sp."createdAt")  AS "lastAt"
      FROM "user" u
      LEFT JOIN team_member tm ON tm."userId" = u.id
      LEFT JOIN team t         ON t.id = tm."teamId"
      LEFT JOIN scan_ping sp   ON sp."userId" = u.id
     WHERE u.name ILIKE ${like} OR u.email ILIKE ${like}
     GROUP BY u.id, u.name, u.email, t.id, t.name
     ORDER BY pings DESC, u.name ASC
     LIMIT ${limit}`)

  const teamsRes = await db.execute(sql`
    SELECT t.id, t.name,
           count(DISTINCT tm."userId")::int AS members,
           count(sp.id)::int                AS pings,
           max(sp."createdAt")              AS "lastAt"
      FROM team t
      LEFT JOIN team_member tm ON tm."teamId" = t.id
      LEFT JOIN scan_ping sp   ON sp."userId" = tm."userId"
     WHERE t.name ILIKE ${like}
     GROUP BY t.id, t.name
     ORDER BY pings DESC, t.name ASC
     LIMIT ${limit}`)

  const users: ScanSubjectUser[] = (usersRes.rows as Record<string, unknown>[]).map((r) => ({
    kind: "user",
    id: String(r.id),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    teamId: r.teamId ? String(r.teamId) : null,
    teamName: r.teamName ? String(r.teamName) : null,
    pings: Number(r.pings ?? 0),
    lastAt: toIso(r.lastAt),
  }))
  const teams: ScanSubjectTeam[] = (teamsRes.rows as Record<string, unknown>[]).map((r) => ({
    kind: "team",
    id: String(r.id),
    name: String(r.name ?? ""),
    members: Number(r.members ?? 0),
    pings: Number(r.pings ?? 0),
    lastAt: toIso(r.lastAt),
  }))
  return { users, teams }
}

function mapPingRows(rows: Record<string, unknown>[]): ScanPingRow[] {
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.userId),
    userName: String(r.userName ?? ""),
    teamId: r.teamId ? String(r.teamId) : null,
    teamName: r.teamName ? String(r.teamName) : null,
    leadLabel: leadLabelFrom({
      leadPosition: r.leadPosition == null ? null : Number(r.leadPosition),
      leadCountry: r.leadCountry == null ? null : String(r.leadCountry),
      leadId: r.leadId == null ? null : String(r.leadId),
    }),
    lat: Number(r.lat),
    lng: Number(r.lng),
    accuracy: r.accuracy == null ? null : Number(r.accuracy),
    distanceM: r.distanceM == null ? null : Number(r.distanceM),
    radiusM: r.radiusM == null ? null : Number(r.radiusM),
    ok: Boolean(r.ok),
    createdAt: toIso(r.createdAt) ?? new Date(0).toISOString(),
  }))
}

const PING_SELECT = sql`
  SELECT sp.id, sp."userId", sp.lat, sp.lng, sp.accuracy,
         sp."distanceM", sp."radiusM", sp.ok, sp."createdAt",
         u.name AS "userName",
         t.id   AS "teamId",
         t.name AS "teamName",
         ct."leadId"   AS "leadId",
         l.position    AS "leadPosition",
         l."countryEn" AS "leadCountry"
    FROM scan_ping sp
    JOIN "user" u          ON u.id = sp."userId"
    LEFT JOIN team_member tm ON tm."userId" = sp."userId"
    LEFT JOIN team t         ON t.id = tm."teamId"
    LEFT JOIN clue_token ct  ON ct.token = sp.token
    LEFT JOIN lead l         ON l.id = ct."leadId"`

/** Every captured scan position for one explorer, newest first. */
export async function getScanPingsForUser(userId: string, limit = 300): Promise<ScanPingRow[]> {
  if (!userId) return []
  const res = await db.execute(sql`
    ${PING_SELECT}
   WHERE sp."userId" = ${userId}
   ORDER BY sp."createdAt" DESC
   LIMIT ${limit}`)
  return mapPingRows(res.rows as Record<string, unknown>[])
}

/** Every captured scan position for all members of one crew, newest first. */
export async function getScanPingsForTeam(teamId: string, limit = 600): Promise<ScanPingRow[]> {
  if (!teamId) return []
  const res = await db.execute(sql`
    ${PING_SELECT}
   WHERE sp."userId" IN (SELECT "userId" FROM team_member WHERE "teamId" = ${teamId})
   ORDER BY sp."createdAt" DESC
   LIMIT ${limit}`)
  return mapPingRows(res.rows as Record<string, unknown>[])
}
