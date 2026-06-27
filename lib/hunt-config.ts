// ─────────────────────────────────────────────────────────────────────────
//  Hunt-wide settings that live on the single `score_config` row but are not
//  part of the scoring tiers. Kept separate from lib/scoring.ts so the
//  ScoreConfig shape stays purely about points.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { scoreConfig } from "@/lib/db/schema"
import { DEFAULT_COOLDOWN_SECONDS } from "@/lib/clues"
import { eq } from "drizzle-orm"

/** Clamp a raw cooldown to a sane non-negative range (0..24h, in seconds). */
function clampCooldown(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COOLDOWN_SECONDS
  return Math.max(0, Math.min(86_400, Math.floor(value)))
}

/**
 * The anti-cheat cooldown (in seconds) enforced between a crew's two
 * consecutive QR solves. Falls back to the default when no settings row exists.
 * A value of 0 disables the gate entirely.
 */
export async function getSolveCooldownSeconds(): Promise<number> {
  const rows = await db
    .select({ seconds: scoreConfig.solveCooldownSeconds })
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"))
    .limit(1)
  const row = rows[0]
  if (!row) return DEFAULT_COOLDOWN_SECONDS
  return clampCooldown(row.seconds)
}

/** Upsert the solve cooldown (seconds) onto the single settings row. */
export async function setSolveCooldownSeconds(seconds: number): Promise<void> {
  const value = clampCooldown(seconds)
  await db
    .insert(scoreConfig)
    .values({ id: "default", solveCooldownSeconds: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { solveCooldownSeconds: value, updatedAt: new Date() },
    })
}
