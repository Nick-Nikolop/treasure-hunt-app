import "server-only"
import { randomUUID } from "node:crypto"
import { pool } from "@/lib/db"

// The AR lab keeps its own tables, created at runtime with idempotent
// statements (same pattern as lib/analytics-storage.ts) so the separate
// production database gets them on first use without a manual migration.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "ar_target" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "unlockTitle" text NOT NULL,
    "unlockBody" text NOT NULL,
    "refImage" text NOT NULL,
    "mindData" text NOT NULL,
    "featureCount" integer NOT NULL DEFAULT 0,
    "width" integer NOT NULL DEFAULT 0,
    "height" integer NOT NULL DEFAULT 0,
    "createdBy" text,
    "createdAt" timestamp without time zone NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "ar_check" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL,
    "targetId" text,
    "confidence" real,
    "createdAt" timestamp without time zone NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS ar_check_user_created_idx ON ar_check USING btree ("userId", "createdAt")`,
]

let ready: Promise<void> | null = null

export function ensureArStorage(): Promise<void> {
  ready ??= (async () => {
    for (const statement of STATEMENTS) await pool.query(statement)
  })().catch((error) => {
    ready = null
    throw error
  })
  return ready
}

export const MAX_TARGETS = 12

/** What the scanner needs: tracking data plus the reveal (this is a demo, so the reveal ships to the client). */
export type ArTarget = {
  id: string
  name: string
  unlockTitle: string
  unlockBody: string
  mindData: string
  featureCount: number
  width: number
  height: number
  thumb: string
  createdAt: string
}

export async function listTargets(): Promise<ArTarget[]> {
  await ensureArStorage()
  const { rows } = await pool.query(
    `SELECT id, name, "unlockTitle", "unlockBody", "mindData", "featureCount", width, height, "refImage", "createdAt"
     FROM ar_target ORDER BY "createdAt" DESC LIMIT $1`,
    [MAX_TARGETS],
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unlockTitle: row.unlockTitle,
    unlockBody: row.unlockBody,
    mindData: row.mindData,
    featureCount: row.featureCount,
    width: row.width,
    height: row.height,
    thumb: row.refImage,
    createdAt: new Date(row.createdAt).toISOString(),
  }))
}

export async function countTargets(): Promise<number> {
  await ensureArStorage()
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ar_target`)
  return rows[0]?.n ?? 0
}

export type NewTarget = {
  name: string
  unlockTitle: string
  unlockBody: string
  refImage: string
  mindData: string
  featureCount: number
  width: number
  height: number
  createdBy: string
}

export async function createTarget(input: NewTarget): Promise<string> {
  await ensureArStorage()
  const id = randomUUID()
  await pool.query(
    `INSERT INTO ar_target (id, name, "unlockTitle", "unlockBody", "refImage", "mindData", "featureCount", width, height, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, input.name, input.unlockTitle, input.unlockBody, input.refImage, input.mindData, input.featureCount, input.width, input.height, input.createdBy],
  )
  return id
}

export async function deleteTarget(id: string): Promise<void> {
  await ensureArStorage()
  await pool.query(`DELETE FROM ar_target WHERE id = $1`, [id])
}
