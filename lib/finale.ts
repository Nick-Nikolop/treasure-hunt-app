// ─────────────────────────────────────────────────────────────────────────
//  The finale — Pytheas's hidden compass.
//
//  The compass is NOT a journal lead. It reuses the dedicated finishing QR
//  (lib/hunt.ts, leadOrder = FINISH_ORDER): scanning it at the right spot marks
//  the crew as finished and reveals the winner screen. Everything editable
//  about the finale (the compass GPS gate + the two handwritten notes + the
//  winner message, both languages) lives on the single `score_config` row.
//
//  These columns are added on demand with `ALTER TABLE ... ADD COLUMN IF NOT
//  EXISTS` (this project has no drizzle-kit; tables/columns are provisioned at
//  runtime, exactly like the seed/backfill in lib/leads.ts). They are kept OFF
//  the shared Drizzle `scoreConfig` table object on purpose, so the many
//  select-all reads of that row never reference a column that might not exist
//  yet. All access here goes through the raw `pool`.
// ─────────────────────────────────────────────────────────────────────────

import "server-only"
import { pool } from "@/lib/db"
import { DEFAULT_GEO_RADIUS_M } from "@/lib/geo"

/** Default handwritten note shown in the journal once every lead is solved. */
const DEFAULT_NOTE1 =
  "Αν διαβάζεις αυτές τις γραμμές, ακολούθησες κάθε μου σημάδι ως το τέλος.\n\nΜου απομένει ένα ακόμη μυστικό. Στην καρδιά της Καλαμάτας κρύβεται η πυξίδα μου, εκείνη που με οδήγησε σε όλες τις θάλασσες.\n\nΒρες την πυξίδα μου και το ταξίδι θα ολοκληρωθεί."
const DEFAULT_NOTE1_EN =
  "If you are reading these lines, you followed every mark of mine to the very end.\n\nOne secret remains. In the heart of Kalamata my compass lies hidden, the one that guided me across every sea.\n\nFind my compass, and the voyage will be complete."

/** Default note revealed the moment the compass QR is scanned. */
const DEFAULT_NOTE2 =
  "Την κρατάς πια στα χέρια σου. Η πυξίδα του Πυθέα, ο πιο πιστός μου σύντροφος.\n\nΔεν έδειχνε ποτέ έναν θησαυρό από χρυσό, αλλά τον δρόμο προς το άγνωστο. Τώρα ανήκει σε σένα."
const DEFAULT_NOTE2_EN =
  "You now hold it in your hands. The compass of Pytheas, my most faithful companion.\n\nIt never pointed to a treasure of gold, but to the road toward the unknown. Now it belongs to you."

/** Default message shown on the winner screen (below the placement). */
const DEFAULT_WINNER =
  "Ολοκλήρωσες το ταξίδι του Πυθέα. Η πυξίδα είναι δική σου και το όνομά σου ανήκει πια στους εξερευνητές."
const DEFAULT_WINNER_EN =
  "You have completed the voyage of Pytheas. The compass is yours, and your name now belongs among the explorers."

export type FinaleConfig = {
  /** Compass GPS gate. `hasCoords` is true only when both lat and lng are set. */
  hasCoords: boolean
  lat: number | null
  lng: number | null
  radiusM: number
  /** Journal note (shown once all leads are solved). */
  note1: string
  note1En: string
  /** Compass-scan note (shown on finishing). */
  note2: string
  note2En: string
  /** Winner-screen message. */
  winner: string
  winnerEn: string
}

// Provision the finale columns at most once per process. Mirrors the memoized
// seed promise in lib/leads.ts so the DDL runs a single time under load.
let ensured: Promise<void> | null = null
function ensureFinaleColumns(): Promise<void> {
  if (!ensured) {
    ensured = pool
      .query(
        `ALTER TABLE "score_config"
           ADD COLUMN IF NOT EXISTS "compassLat" double precision,
           ADD COLUMN IF NOT EXISTS "compassLng" double precision,
           ADD COLUMN IF NOT EXISTS "compassRadiusM" integer,
           ADD COLUMN IF NOT EXISTS "finaleNote1" text,
           ADD COLUMN IF NOT EXISTS "finaleNote1En" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2En" text,
           ADD COLUMN IF NOT EXISTS "finaleWinner" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerEn" text`,
      )
      .then(() => undefined)
      .catch((err) => {
        // Reset so a transient failure can retry on the next call.
        ensured = null
        throw err
      })
  }
  return ensured
}

/** A non-empty trimmed string, or the fallback when null/blank. */
function textOr(value: unknown, fallback: string): string {
  const s = typeof value === "string" ? value.trim() : ""
  return s.length > 0 ? s : fallback
}

function clampRadius(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_GEO_RADIUS_M
  return Math.max(10, Math.min(5000, Math.round(n)))
}

/**
 * Read the finale configuration (compass GPS gate + the two notes + winner
 * message, both languages), falling back to the themed defaults for any field
 * an admin has not filled in yet.
 */
export async function getFinaleConfig(): Promise<FinaleConfig> {
  await ensureFinaleColumns()
  const res = await pool.query(
    `SELECT "compassLat" AS lat, "compassLng" AS lng, "compassRadiusM" AS radius,
            "finaleNote1" AS n1, "finaleNote1En" AS n1e,
            "finaleNote2" AS n2, "finaleNote2En" AS n2e,
            "finaleWinner" AS w, "finaleWinnerEn" AS we
       FROM "score_config" WHERE id = 'default' LIMIT 1`,
  )
  const row = res.rows[0] as
    | {
        lat: number | null
        lng: number | null
        radius: number | null
        n1: string | null
        n1e: string | null
        n2: string | null
        n2e: string | null
        w: string | null
        we: string | null
      }
    | undefined

  const lat = row?.lat ?? null
  const lng = row?.lng ?? null
  return {
    hasCoords: lat != null && lng != null,
    lat,
    lng,
    radiusM: row?.radius != null ? clampRadius(row.radius) : DEFAULT_GEO_RADIUS_M,
    note1: textOr(row?.n1, DEFAULT_NOTE1),
    note1En: textOr(row?.n1e, DEFAULT_NOTE1_EN),
    note2: textOr(row?.n2, DEFAULT_NOTE2),
    note2En: textOr(row?.n2e, DEFAULT_NOTE2_EN),
    winner: textOr(row?.w, DEFAULT_WINNER),
    winnerEn: textOr(row?.we, DEFAULT_WINNER_EN),
  }
}

export type FinaleConfigInput = {
  /** Pass null lat/lng to clear the compass GPS gate (finish becomes ungated). */
  lat: number | null
  lng: number | null
  radiusM: number | null
  note1: string
  note1En: string
  note2: string
  note2En: string
  winner: string
  winnerEn: string
}

/** Upsert the finale configuration onto the single `score_config` row. */
export async function setFinaleConfig(input: FinaleConfigInput): Promise<void> {
  await ensureFinaleColumns()
  const lat = input.lat != null && Number.isFinite(input.lat) ? input.lat : null
  const lng = input.lng != null && Number.isFinite(input.lng) ? input.lng : null
  const radius = input.radiusM != null ? clampRadius(input.radiusM) : DEFAULT_GEO_RADIUS_M
  const clip = (s: string) => (typeof s === "string" ? s.slice(0, 2000) : "")

  // The row always exists in practice (created by the scoring/phase setters),
  // but guard with an insert-or-update so a fresh DB still works.
  await pool.query(
    `INSERT INTO "score_config" (id, "compassLat", "compassLng", "compassRadiusM",
        "finaleNote1", "finaleNote1En", "finaleNote2", "finaleNote2En",
        "finaleWinner", "finaleWinnerEn", "updatedAt")
     VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (id) DO UPDATE SET
        "compassLat" = EXCLUDED."compassLat",
        "compassLng" = EXCLUDED."compassLng",
        "compassRadiusM" = EXCLUDED."compassRadiusM",
        "finaleNote1" = EXCLUDED."finaleNote1",
        "finaleNote1En" = EXCLUDED."finaleNote1En",
        "finaleNote2" = EXCLUDED."finaleNote2",
        "finaleNote2En" = EXCLUDED."finaleNote2En",
        "finaleWinner" = EXCLUDED."finaleWinner",
        "finaleWinnerEn" = EXCLUDED."finaleWinnerEn",
        "updatedAt" = now()`,
    [
      lat,
      lng,
      radius,
      clip(input.note1),
      clip(input.note1En),
      clip(input.note2),
      clip(input.note2En),
      clip(input.winner),
      clip(input.winnerEn),
    ],
  )
}
