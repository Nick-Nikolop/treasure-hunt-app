// ─────────────────────────────────────────────────────────────────────────
//  Scoring configuration — admin-tunable placement points + per-lead difficulty.
//
//  Scores are NEVER stored per entity; the leaderboard recomputes them live
//  from the unlock history (lib/hunt.ts) and the settings read here. That means
//  saving new settings instantly "recalculates" every score on the next read.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { scoreConfig, leadDifficulty } from "@/lib/db/schema"
import {
  TOTAL_CLUES,
  DEFAULT_SCORE_CONFIG,
  DEFAULT_DIFFICULTY,
  isDifficulty,
  type Difficulty,
  type ScoreConfig,
} from "@/lib/clues"
import { eq } from "drizzle-orm"

/** Read the global scoring tiers, falling back to defaults when unset. */
export async function getScoreConfig(): Promise<ScoreConfig> {
  const rows = await db.select().from(scoreConfig).where(eq(scoreConfig.id, "default")).limit(1)
  const row = rows[0]
  if (!row) return { ...DEFAULT_SCORE_CONFIG }
  return {
    firstPoints: row.firstPoints,
    secondPoints: row.secondPoints,
    thirdPoints: row.thirdPoints,
    restPoints: row.restPoints,
    mediumBonus: row.mediumBonus,
    hardBonus: row.hardBonus,
  }
}

/** A map of leadOrder → difficulty for every lead (1..TOTAL_CLUES). */
export async function getLeadDifficulties(): Promise<Map<number, Difficulty>> {
  const rows = await db.select().from(leadDifficulty)
  const stored = new Map<number, Difficulty>()
  for (const r of rows) {
    if (isDifficulty(r.difficulty)) stored.set(r.leadOrder, r.difficulty)
  }
  // Fill defaults so callers always get a value for every lead.
  const out = new Map<number, Difficulty>()
  for (let order = 1; order <= TOTAL_CLUES; order++) {
    out.set(order, stored.get(order) ?? DEFAULT_DIFFICULTY)
  }
  return out
}

/** Clamp a raw number to a non-negative integer (points can't be negative). */
function clampPoints(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100000, Math.floor(value)))
}

/** Upsert the global scoring tiers. */
export async function setScoreConfig(input: ScoreConfig): Promise<void> {
  const values = {
    firstPoints: clampPoints(input.firstPoints),
    secondPoints: clampPoints(input.secondPoints),
    thirdPoints: clampPoints(input.thirdPoints),
    restPoints: clampPoints(input.restPoints),
    mediumBonus: clampPoints(input.mediumBonus),
    hardBonus: clampPoints(input.hardBonus),
  }
  await db
    .insert(scoreConfig)
    .values({ id: "default", ...values, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { ...values, updatedAt: new Date() },
    })
}

/** Upsert the difficulty for a batch of leads. Invalid orders are ignored. */
export async function setLeadDifficulties(
  entries: { leadOrder: number; difficulty: Difficulty }[],
): Promise<void> {
  for (const e of entries) {
    if (e.leadOrder < 1 || e.leadOrder > TOTAL_CLUES || !isDifficulty(e.difficulty)) continue
    await db
      .insert(leadDifficulty)
      .values({ leadOrder: e.leadOrder, difficulty: e.difficulty, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: leadDifficulty.leadOrder,
        set: { difficulty: e.difficulty, updatedAt: new Date() },
      })
  }
}
