import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { pool } from "@/lib/db"
import { verifyKey, type KeyVerdict } from "./key"
import { KEY_LIMIT, KEY_WINDOW_MS, NOTES_LIMIT, type KeyQuota } from "./limits"

// Created at runtime so production (its own database) gets the tables on first use.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "carnival_key_attempt" (
    "id" bigserial PRIMARY KEY,
    "userId" text NOT NULL,
    "result" text NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS carnival_key_attempt_user_idx ON carnival_key_attempt ("userId", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "carnival_notes" (
    "userId" text PRIMARY KEY,
    "notes" text NOT NULL DEFAULT '',
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
]

let ready: Promise<void> | null = null
function ensureStorage() {
  ready ??= (async () => {
    for (const sql of STATEMENTS) await pool.query(sql)
  })().catch((err) => {
    ready = null
    throw err
  })
  return ready
}

export async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

type Queryable = Pick<typeof pool, "query">

async function quotaFor(db: Queryable, userId: string): Promise<KeyQuota> {
  const { rows } = await db.query<{ createdAt: Date }>(
    `SELECT "createdAt" FROM carnival_key_attempt
     WHERE "userId" = $1 AND "createdAt" > now() - ($2::bigint * interval '1 millisecond')
     ORDER BY "createdAt" ASC`,
    [userId, KEY_WINDOW_MS],
  )
  const used = rows.length
  const remaining = Math.max(0, KEY_LIMIT - used)
  // Rolling window: a slot comes back when the attempt that filled it turns four hours old.
  const freeing = remaining === 0 ? rows[used - KEY_LIMIT] : rows[0]
  return {
    remaining,
    nextAt: freeing ? new Date(new Date(freeing.createdAt).getTime() + KEY_WINDOW_MS).toISOString() : null,
  }
}

export async function getKeyQuota(userId: string): Promise<KeyQuota> {
  await ensureStorage()
  return quotaFor(pool, userId)
}

export type KeyAttempt = { verdict: KeyVerdict | "cooldown"; quota: KeyQuota }

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Checks a key against the account's allowance. The per-user lock stops parallel requests from slipping past the limit. */
export async function attemptKey(userId: string, input: string): Promise<KeyAttempt> {
  await ensureStorage()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`carnival-key:${userId}`])
    const before = await quotaFor(client, userId)
    if (before.remaining === 0) {
      await client.query("ROLLBACK")
      return { verdict: "cooldown", quota: before }
    }
    await pause(450)
    const verdict = verifyKey(input)
    if (verdict !== "unset") {
      await client.query(`INSERT INTO carnival_key_attempt ("userId", "result") VALUES ($1, $2)`, [userId, verdict])
    }
    const quota = await quotaFor(client, userId)
    await client.query("COMMIT")
    return { verdict, quota }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function clearKeyAttempts(userId: string): Promise<void> {
  await ensureStorage()
  await pool.query(`DELETE FROM carnival_key_attempt WHERE "userId" = $1`, [userId])
}

export async function getNotes(userId: string): Promise<string> {
  await ensureStorage()
  const { rows } = await pool.query<{ notes: string }>(`SELECT notes FROM carnival_notes WHERE "userId" = $1`, [userId])
  return rows[0]?.notes ?? ""
}

export async function saveNotes(userId: string, notes: string): Promise<void> {
  await ensureStorage()
  await pool.query(
    `INSERT INTO carnival_notes ("userId", notes, "updatedAt") VALUES ($1, $2, now())
     ON CONFLICT ("userId") DO UPDATE SET notes = EXCLUDED.notes, "updatedAt" = now()`,
    [userId, notes.slice(0, NOTES_LIMIT)],
  )
}
