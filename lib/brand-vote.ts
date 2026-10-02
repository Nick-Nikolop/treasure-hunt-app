import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { pool } from "@/lib/db"
import { isVoteChoice, isVoter, type VoteChoice, type VoteRow, type Voter } from "@/lib/brand-vote-shared"

export const DEVICE_COOKIE = "brand_vote_device"

let tableReady: Promise<void> | null = null

/** The table is created on first use so the vote works on any database without a migration step. */
function ensureTable(): Promise<void> {
  tableReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS brand_vote (
        voter_name text PRIMARY KEY,
        choice text NOT NULL,
        device_hash text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    )
    .then(() => undefined)
    .catch((error) => {
      tableReady = null
      throw error
    })
  return tableReady
}

export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url")
}

function hashDevice(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function listVotes(): Promise<VoteRow[]> {
  await ensureTable()
  const { rows } = await pool.query<{ voter_name: string; choice: string }>(
    "SELECT voter_name, choice FROM brand_vote",
  )
  return rows.flatMap((row) =>
    isVoter(row.voter_name) && isVoteChoice(row.choice) ? [{ name: row.voter_name, choice: row.choice }] : [],
  )
}

export async function getDeviceVoter(token: string | undefined): Promise<Voter | null> {
  if (!token) return null
  await ensureTable()
  const { rows } = await pool.query<{ voter_name: string }>(
    "SELECT voter_name FROM brand_vote WHERE device_hash = $1",
    [hashDevice(token)],
  )
  const name = rows[0]?.voter_name
  return isVoter(name) ? name : null
}

type CastOutcome = "saved" | "name-locked" | "device-taken"

/**
 * Saves or changes a vote in one statement. A name is claimed by the first device
 * that votes with it: the upsert only updates when the stored device matches, and
 * the unique device_hash stops one device from claiming a second name.
 */
export async function saveVote(name: Voter, choice: VoteChoice, token: string): Promise<CastOutcome> {
  await ensureTable()
  try {
    const { rowCount } = await pool.query(
      `INSERT INTO brand_vote (voter_name, choice, device_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (voter_name) DO UPDATE
         SET choice = EXCLUDED.choice, updated_at = now()
         WHERE brand_vote.device_hash = EXCLUDED.device_hash`,
      [name, choice, hashDevice(token)],
    )
    return rowCount === 1 ? "saved" : "name-locked"
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return "device-taken"
    throw error
  }
}
