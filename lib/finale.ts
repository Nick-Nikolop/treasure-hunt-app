// ─────────────────────────────────────────────────────────────────────────
//  The finale — Pytheas's hidden compass.
//
//  The finale is a TWO-QR sequence, neither of which is a journal lead:
//    1. Compass QR  (lib/hunt.ts, leadOrder = COMPASS_ORDER) — scanned at the
//       compass spot once every lead is solved; reveals the compass note.
//    2. Treasure QR (lib/hunt.ts, leadOrder = FINISH_ORDER) — scanned at the
//       treasure spot; marks the crew finished and reveals the winner screen.
//  Everything editable about the finale (both GPS gates + the handwritten notes
//  + the winner message, both languages) lives on the single `score_config` row.
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
  'Κάπου εδώ τελειώνει το ημερολόγιο μου. Θα αναρωτηθείτε λοιπόν "μα καλα, και που είναι αυτός ο θησαυρός του Πυθέα;". Μην ανησυχείτε, ο θησαυρός δεν είναι το ταξίδι αυτή τη φορά, όπως ξέρετε από τα γνωστά κλισέ.\n\nΓια να μπορέσετε, όμως, να βρείτε τον θησαυρό, θα χρειαστείτε την πυξίδα μου. Την έχω κρύψει πολύ καλά.\n\nΗ πυξίδα μου είναι μόνο για όσους ξέρουν να παρατηρούν και όχι απλώς να βλέπουν. Για εκείνους που δεν βιάζονται, αλλά προσέχουν και συνδυάζουν ακόμη και τις πιο μικρές λεπτομέρεια στο ταξίδι τους. Το αφήνω πάνω σας. Πιστεύω πως θα βρείτε την πυξίδα μου· κάπου μέσα στην Καλαμάτα βρίσκεται, άλλωστε.'
const DEFAULT_NOTE1_EN =
  'This is roughly where my journal ends. So you will wonder, "well then, where is this treasure of Pytheas?". Do not worry, the treasure is not the journey this time, as you know from the usual cliches.\n\nTo be able to find the treasure, though, you will need my compass. I have hidden it very well.\n\nMy compass is only for those who know how to observe, and not merely to look. For those who do not rush, but pay attention and piece together even the smallest detail of their journey. I leave it to you. I believe you will find my compass; somewhere inside Kalamata it lies, after all.'

/**
 * Default call-to-action stamped under the first note, above its close button.
 * Short and shouted, so the crew leaves the journal knowing what to hunt next.
 */
const DEFAULT_NOTE1_CTA = "ΤΩΡΑ ΠΡΕΠΕΙ ΝΑ ΒΡΕΙΣ ΤΗΝ ΠΥΞΙΔΑ ΜΟΥ"
const DEFAULT_NOTE1_CTA_EN = "NOW YOU MUST FIND MY COMPASS"

/** Default note revealed the moment the compass QR is scanned. */
const DEFAULT_NOTE2 =
  "Τελικα δεν την είχα κρύψει όσο καλά νόμιζα…\n\nΣυγχαρητήρια λοιπόν εξερευνητές, βρήκατε την πυξίδα μου.\n\nΉταν η πυξιδα ο θησαυρός; Προφανώς και όχι! Πιστέψτε με, υπαρχει θησαυρός, αλλά θα χρειαστεί να ψάξετε λίγο ακόμα. Ξέρω, Ξέρω, σας έχω στείλει από τη Σερβία μέχρι την Τουρκία και από ένα σωρό άλλα μέρη, αλλά αυτή είναι η τελευταία δοκιμασία. Χρησιμοποιήστε την πυξίδα και θα βγάλετε άκρη, είμαι σίγουρος - και αυτή τη φορά θα φτασετε επιτέλους στον θησαυρό, υπόσχομαι."
const DEFAULT_NOTE2_EN =
  "In the end I had not hidden it as well as I thought…\n\nCongratulations then, explorers, you found my compass.\n\nWas the compass the treasure? Of course not! Believe me, there is a treasure, but you will need to search a little more. I know, I know, I have sent you from Serbia all the way to Turkey and to a heap of other places, but this is the final trial. Use the compass and you will figure it out, I am sure - and this time you will finally reach the treasure, I promise."

/**
 * Default call-to-action stamped under the compass note. Same role as the one
 * under note 1, one beat later: the compass is found, so the target is now the
 * treasure itself.
 */
const DEFAULT_NOTE2_CTA = "ΤΩΡΑ ΠΡΕΠΕΙ ΝΑ ΒΡΕΙΣ ΤΟΝ ΘΗΣΑΥΡΟ ΜΟΥ"
const DEFAULT_NOTE2_CTA_EN = "NOW YOU MUST FIND MY TREASURE"

/** Default message shown on the winner screen (below the placement). */
const DEFAULT_WINNER =
  "Συγχαρητήρια, τα καταφέρατε! Ο θησαυρός βέβαια δεν είναι εδώ, αλλά θα σας πούμε πως θα τον παραλάβετε. Ελάτε στην εκδήλωσή μας όπου θα ανακοινωθούν οι νικητές (διαφορετικά θα σας ενημερώσουμε, να κοιτάτε το εμαιλ σας)."
const DEFAULT_WINNER_EN =
  "Congratulations, you made it! The treasure is not here, of course, but we will tell you how to collect it. Come to our event where the winners will be announced (otherwise we will let you know, so keep an eye on your email)."

/** Fine-print shown under the winner message about the top-3 prize. */
const DEFAULT_WINNER_NOTE =
  "Προσέξτε, μπορεί να φτάσατε ως εδώ αλλά, κάποιος άλλος να έφτασε πριν από εσάς. Αν είστε στους πρώτους 3 βαθμολογικά, σας περιμένει ένα ωραίο ποσό…"
const DEFAULT_WINNER_NOTE_EN =
  "Careful: you may have reached this point, but someone else may have arrived before you. If you are in the top 3 on the scoreboard, a nice sum awaits you…"

/**
 * Default clock time the hunt closes, as a bare "HH:MM" string. Only the TIME
 * is configurable: the date is part of the localized copy, because the closing
 * party is a fixed calendar event while the hour has already moved once.
 * Rendered into step 7 of the "how to play" walkthrough.
 */
export const DEFAULT_HUNT_ENDS_AT = "19:00"

/** Accept only a 24h "H:MM"/"HH:MM" clock time, else fall back to the default. */
export function normalizeHuntEndsAt(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : ""
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return DEFAULT_HUNT_ENDS_AT
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return DEFAULT_HUNT_ENDS_AT
  return `${String(h).padStart(2, "0")}:${m[2]}`
}

export type FinaleConfig = {
  /** Compass QR GPS gate. `hasCoords` is true only when both lat and lng set. */
  hasCoords: boolean
  lat: number | null
  lng: number | null
  radiusM: number
  /** Trail-end QR GPS gate (the QR at the LAST lead's own spot). */
  trailEndHasCoords: boolean
  trailEndLat: number | null
  trailEndLng: number | null
  trailEndRadiusM: number
  /** Treasure/finish QR GPS gate. `treasureHasCoords` true only when both set. */
  treasureHasCoords: boolean
  treasureLat: number | null
  treasureLng: number | null
  treasureRadiusM: number
  /** Journal note (shown once all leads are solved). */
  note1: string
  note1En: string
  /** Call-to-action stamped under that note, above its close button. */
  note1Cta: string
  note1CtaEn: string
  /** Compass-scan note (shown when the compass QR is scanned). */
  note2: string
  note2En: string
  /** Call-to-action stamped under the compass note ("now find the treasure"). */
  note2Cta: string
  note2CtaEn: string
  /** Winner-screen message. */
  winner: string
  winnerEn: string
  /** Winner-screen prize fine-print. */
  winnerNote: string
  winnerNoteEn: string
  /** Bare "HH:MM" clock time the hunt closes (see DEFAULT_HUNT_ENDS_AT). */
  huntEndsAt: string
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
           ADD COLUMN IF NOT EXISTS "trailEndLat" double precision,
           ADD COLUMN IF NOT EXISTS "trailEndLng" double precision,
           ADD COLUMN IF NOT EXISTS "trailEndRadiusM" integer,
           ADD COLUMN IF NOT EXISTS "treasureLat" double precision,
           ADD COLUMN IF NOT EXISTS "treasureLng" double precision,
           ADD COLUMN IF NOT EXISTS "treasureRadiusM" integer,
           ADD COLUMN IF NOT EXISTS "finaleNote1" text,
           ADD COLUMN IF NOT EXISTS "finaleNote1En" text,
           ADD COLUMN IF NOT EXISTS "finaleNote1Cta" text,
           ADD COLUMN IF NOT EXISTS "finaleNote1CtaEn" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2En" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2Cta" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2CtaEn" text,
           ADD COLUMN IF NOT EXISTS "finaleWinner" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerEn" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerNote" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerNoteEn" text,
           ADD COLUMN IF NOT EXISTS "huntEndsAt" text`,
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
            "trailEndLat" AS elat, "trailEndLng" AS elng, "trailEndRadiusM" AS eradius,
            "treasureLat" AS tlat, "treasureLng" AS tlng, "treasureRadiusM" AS tradius,
            "finaleNote1" AS n1, "finaleNote1En" AS n1e,
            "finaleNote1Cta" AS n1c, "finaleNote1CtaEn" AS n1ce,
            "finaleNote2" AS n2, "finaleNote2En" AS n2e,
            "finaleNote2Cta" AS n2c, "finaleNote2CtaEn" AS n2ce,
            "finaleWinner" AS w, "finaleWinnerEn" AS we,
            "finaleWinnerNote" AS wn, "finaleWinnerNoteEn" AS wne,
            "huntEndsAt" AS ends
       FROM "score_config" WHERE id = 'default' LIMIT 1`,
  )
  const row = res.rows[0] as
    | {
        lat: number | null
        lng: number | null
        radius: number | null
        elat: number | null
        elng: number | null
        eradius: number | null
        tlat: number | null
        tlng: number | null
        tradius: number | null
        n1: string | null
        n1e: string | null
        n1c: string | null
        n1ce: string | null
        n2: string | null
        n2e: string | null
        n2c: string | null
        n2ce: string | null
        w: string | null
        we: string | null
        wn: string | null
        wne: string | null
        ends: string | null
      }
    | undefined

  const lat = row?.lat ?? null
  const lng = row?.lng ?? null
  const tlat = row?.tlat ?? null
  const tlng = row?.tlng ?? null
  const elat = row?.elat ?? null
  const elng = row?.elng ?? null
  return {
    hasCoords: lat != null && lng != null,
    lat,
    lng,
    radiusM: row?.radius != null ? clampRadius(row.radius) : DEFAULT_GEO_RADIUS_M,
    trailEndHasCoords: elat != null && elng != null,
    trailEndLat: elat,
    trailEndLng: elng,
    trailEndRadiusM: row?.eradius != null ? clampRadius(row.eradius) : DEFAULT_GEO_RADIUS_M,
    treasureHasCoords: tlat != null && tlng != null,
    treasureLat: tlat,
    treasureLng: tlng,
    treasureRadiusM: row?.tradius != null ? clampRadius(row.tradius) : DEFAULT_GEO_RADIUS_M,
    note1: textOr(row?.n1, DEFAULT_NOTE1),
    note1En: textOr(row?.n1e, DEFAULT_NOTE1_EN),
    note1Cta: textOr(row?.n1c, DEFAULT_NOTE1_CTA),
    note1CtaEn: textOr(row?.n1ce, DEFAULT_NOTE1_CTA_EN),
    note2: textOr(row?.n2, DEFAULT_NOTE2),
    note2En: textOr(row?.n2e, DEFAULT_NOTE2_EN),
    note2Cta: textOr(row?.n2c, DEFAULT_NOTE2_CTA),
    note2CtaEn: textOr(row?.n2ce, DEFAULT_NOTE2_CTA_EN),
    winner: textOr(row?.w, DEFAULT_WINNER),
    winnerEn: textOr(row?.we, DEFAULT_WINNER_EN),
    winnerNote: textOr(row?.wn, DEFAULT_WINNER_NOTE),
    winnerNoteEn: textOr(row?.wne, DEFAULT_WINNER_NOTE_EN),
    huntEndsAt: normalizeHuntEndsAt(row?.ends),
  }
}

export type FinaleConfigInput = {
  /** Pass null lat/lng to clear the compass GPS gate (compass becomes ungated). */
  lat: number | null
  lng: number | null
  radiusM: number | null
  /** Pass null to clear the trail-end GPS gate. */
  trailEndLat: number | null
  trailEndLng: number | null
  trailEndRadiusM: number | null
  /** Pass null to clear the treasure/finish GPS gate. */
  treasureLat: number | null
  treasureLng: number | null
  treasureRadiusM: number | null
  note1: string
  note1En: string
  note1Cta: string
  note1CtaEn: string
  note2: string
  note2En: string
  note2Cta: string
  note2CtaEn: string
  winner: string
  winnerEn: string
  winnerNote: string
  winnerNoteEn: string
  /** "HH:MM" clock time the hunt closes. Invalid input falls back to default. */
  huntEndsAt: string
}

/** Upsert the finale configuration onto the single `score_config` row. */
export async function setFinaleConfig(input: FinaleConfigInput): Promise<void> {
  await ensureFinaleColumns()
  const lat = input.lat != null && Number.isFinite(input.lat) ? input.lat : null
  const lng = input.lng != null && Number.isFinite(input.lng) ? input.lng : null
  const radius = input.radiusM != null ? clampRadius(input.radiusM) : DEFAULT_GEO_RADIUS_M
  const tlat =
    input.treasureLat != null && Number.isFinite(input.treasureLat) ? input.treasureLat : null
  const tlng =
    input.treasureLng != null && Number.isFinite(input.treasureLng) ? input.treasureLng : null
  const tradius =
    input.treasureRadiusM != null ? clampRadius(input.treasureRadiusM) : DEFAULT_GEO_RADIUS_M
  const elat =
    input.trailEndLat != null && Number.isFinite(input.trailEndLat) ? input.trailEndLat : null
  const elng =
    input.trailEndLng != null && Number.isFinite(input.trailEndLng) ? input.trailEndLng : null
  const eradius =
    input.trailEndRadiusM != null ? clampRadius(input.trailEndRadiusM) : DEFAULT_GEO_RADIUS_M
  const clip = (s: string) => (typeof s === "string" ? s.slice(0, 2000) : "")

  // The row always exists in practice (created by the scoring/phase setters),
  // but guard with an insert-or-update so a fresh DB still works.
  await pool.query(
    `INSERT INTO "score_config" (id, "compassLat", "compassLng", "compassRadiusM",
        "treasureLat", "treasureLng", "treasureRadiusM",
        "finaleNote1", "finaleNote1En", "finaleNote1Cta", "finaleNote1CtaEn",
        "finaleNote2", "finaleNote2En", "finaleNote2Cta", "finaleNote2CtaEn",
        "finaleWinner", "finaleWinnerEn", "finaleWinnerNote", "finaleWinnerNoteEn",
        "trailEndLat", "trailEndLng", "trailEndRadiusM", "huntEndsAt", "updatedAt")
     VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, now())
     ON CONFLICT (id) DO UPDATE SET
        "compassLat" = EXCLUDED."compassLat",
        "compassLng" = EXCLUDED."compassLng",
        "compassRadiusM" = EXCLUDED."compassRadiusM",
        "treasureLat" = EXCLUDED."treasureLat",
        "treasureLng" = EXCLUDED."treasureLng",
        "treasureRadiusM" = EXCLUDED."treasureRadiusM",
        "finaleNote1" = EXCLUDED."finaleNote1",
        "finaleNote1En" = EXCLUDED."finaleNote1En",
        "finaleNote1Cta" = EXCLUDED."finaleNote1Cta",
        "finaleNote1CtaEn" = EXCLUDED."finaleNote1CtaEn",
        "finaleNote2" = EXCLUDED."finaleNote2",
        "finaleNote2En" = EXCLUDED."finaleNote2En",
        "finaleNote2Cta" = EXCLUDED."finaleNote2Cta",
        "finaleNote2CtaEn" = EXCLUDED."finaleNote2CtaEn",
        "finaleWinner" = EXCLUDED."finaleWinner",
        "finaleWinnerEn" = EXCLUDED."finaleWinnerEn",
        "finaleWinnerNote" = EXCLUDED."finaleWinnerNote",
        "finaleWinnerNoteEn" = EXCLUDED."finaleWinnerNoteEn",
        "trailEndLat" = EXCLUDED."trailEndLat",
        "trailEndLng" = EXCLUDED."trailEndLng",
        "trailEndRadiusM" = EXCLUDED."trailEndRadiusM",
        "huntEndsAt" = EXCLUDED."huntEndsAt",
        "updatedAt" = now()`,
    [
      lat,
      lng,
      radius,
      tlat,
      tlng,
      tradius,
      clip(input.note1),
      clip(input.note1En),
      clip(input.note1Cta),
      clip(input.note1CtaEn),
      clip(input.note2),
      clip(input.note2En),
      clip(input.note2Cta),
      clip(input.note2CtaEn),
      clip(input.winner),
      clip(input.winnerEn),
      clip(input.winnerNote),
      clip(input.winnerNoteEn),
      elat,
      elng,
      eradius,
      normalizeHuntEndsAt(input.huntEndsAt),
    ],
  )
}
