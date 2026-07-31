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
 * The four hints that close NOTE 2, handed out in strict rotation (see
 * lib/compass-variant.ts). Each crew reads exactly one, and always the same one,
 * so these must stay four entries: the assignment stored per crew is an index
 * into this list.
 *
 * They rode on note 1 until 07-31. The wording below is still the original
 * compass wording, kept verbatim on purpose: only the position moved.
 */
const DEFAULT_COMPASS_HINTS: { el: string; en: string }[] = [
  {
    el: "Την πυξίδα μου θα τη βρείτε αν κοιτάξετε καλά γύρω σας, ακόμα και στις ρωγμές του μόλου κοντά στον φάρο.",
    en: "You will find my compass if you look carefully around you, even in the cracks of the pier near the lighthouse.",
  },
  {
    el: "Την πυξίδα μου θα τη βρείτε αν κοιτάξετε καλά γύρω σας, ακόμα και κάτω από τις πέτρες του γύρω χώρου.",
    en: "You will find my compass if you look carefully around you, even under the stones of the surrounding ground.",
  },
  {
    el: "Την πυξίδα μου θα τη βρείτε αν κοιτάξετε καλά γύρω σας, ειδικά προς την πόρτα που οδηγεί στο άπειρο.",
    en: "You will find my compass if you look carefully around you, especially towards the door that leads to infinity.",
  },
  {
    el: "Την πυξίδα μου θα τη βρείτε αν κοιτάξετε καλά γύρω σας, ειδικά εκεί που τρέχει άφθονο νερό.",
    en: "You will find my compass if you look carefully around you, especially where water runs in abundance.",
  },
]

/**
 * Courtesy line asking the crew to put the compass back so later explorers can
 * still find it. One shared sentence, edited once, rather than a copy per note.
 *
 * Stamped under NOTE 2, not note 1: note 1 only sends them hunting, so the crew
 * does not physically have the compass until note 2 is revealed.
 */
const DEFAULT_COMPASS_RETURN =
  "Καλό θα ήταν να επιστραφεί η πυξίδα στην αρχική της τοποθεσία, εκεί όπου τη βρήκατε, ώστε να την αξιοποιήσουν και οι υπόλοιποι εξερευνητές."
const DEFAULT_COMPASS_RETURN_EN =
  "Please put the compass back where you found it, so the explorers coming after you can use it too."

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
 * The temporary hold that sits between the LAST lead and the compass hunt.
 *
 * Finland (the tenth and final lead) used to release note 1 the instant its QR
 * was scanned. When the hold is on the scan still succeeds and the trail-end is
 * still recorded, but note 1 is withheld and this paper is shown instead, so a
 * crew that closes the trail early cannot start hunting the compass before the
 * rest of the game is ready for them.
 *
 * Reassurance without numbers is deliberate: it promises their head start is
 * safe WITHOUT naming their position, because the finishing order stays hidden
 * until the closing ceremony.
 */
const DEFAULT_HOLD_TITLE = "\u03a4\u03bf \u03c4\u03b1\u03be\u03af\u03b4\u03b9 \u03c3\u03c7\u03b5\u03b4\u03cc\u03bd \u03c4\u03b5\u03bb\u03b5\u03af\u03c9\u03c3\u03b5"
const DEFAULT_HOLD_TITLE_EN = "The journey is almost over"
const DEFAULT_HOLD_BODY =
  "\u0388\u03ba\u03bb\u03b5\u03b9\u03c3\u03b5\u03c2 \u03c4\u03bf \u03af\u03c7\u03bd\u03bf\u03c2. \u0394\u03ad\u03ba\u03b1 \u03c3\u03b7\u03bc\u03b5\u03af\u03b1, \u03b4\u03ad\u03ba\u03b1 \u03c7\u03ce\u03c1\u03b5\u03c2, \u03ba\u03b1\u03b9 \u03c4\u03bf \u03b7\u03bc\u03b5\u03c1\u03bf\u03bb\u03cc\u03b3\u03b9\u03bf \u03c4\u03bf\u03c5 \u03a0\u03c5\u03b8\u03ad\u03b1 \u03ad\u03c6\u03c4\u03b1\u03c3\u03b5 \u03c3\u03c4\u03bf \u03c4\u03ad\u03bb\u03bf\u03c2 \u03c4\u03bf\u03c5.\n\n\u038c\u03bc\u03c9\u03c2 \u03c4\u03bf \u03c4\u03b1\u03be\u03af\u03b4\u03b9 \u03b4\u03b5\u03bd \u03c4\u03b5\u03bb\u03b5\u03af\u03c9\u03c3\u03b5 \u03b1\u03ba\u03cc\u03bc\u03b7. \u039c\u03ad\u03bd\u03bf\u03c5\u03bd \u03ba\u03b9 \u03ac\u03bb\u03bb\u03b1 \u03b2\u03ae\u03bc\u03b1\u03c4\u03b1 \u03c0\u03c1\u03b9\u03bd \u03c6\u03c4\u03ac\u03c3\u03b5\u03b9\u03c2 \u03c3\u03c4\u03bf\u03bd \u03b8\u03b7\u03c3\u03b1\u03c5\u03c1\u03cc, \u03ba\u03b1\u03b9 \u03b4\u03b5\u03bd \u03ad\u03c7\u03bf\u03c5\u03bd \u03b1\u03bd\u03bf\u03af\u03be\u03b5\u03b9 \u03cc\u03bb\u03b1 \u03b1\u03ba\u03cc\u03bc\u03b7.\n\n\u039c\u03b7\u03bd \u03b1\u03bd\u03b7\u03c3\u03c5\u03c7\u03b5\u03af\u03c2: \u03ba\u03c1\u03b1\u03c4\u03ac\u03bc\u03b5 \u03c5\u03c0\u03cc\u03c8\u03b9\u03bd \u03c4\u03bf \u03c0\u03c1\u03bf\u03b2\u03ac\u03b4\u03b9\u03c3\u03bc\u03b1 \u03c0\u03bf\u03c5 \u03ad\u03c7\u03b5\u03b9\u03c2. \u038c,\u03c4\u03b9 \u03ba\u03ad\u03c1\u03b4\u03b9\u03c3\u03b5\u03c2 \u03bc\u03ad\u03c7\u03c1\u03b9 \u03b5\u03b4\u03ce \u03bc\u03ad\u03bd\u03b5\u03b9 \u03b4\u03b9\u03ba\u03cc \u03c3\u03bf\u03c5 \u03ba\u03b1\u03b9 \u03b4\u03b5\u03bd \u03c7\u03ac\u03bd\u03b5\u03c4\u03b1\u03b9 \u03cc\u03c3\u03bf \u03c0\u03b5\u03c1\u03b9\u03bc\u03ad\u03bd\u03b5\u03b9\u03c2.\n\n\u0398\u03b1 \u03c3\u03bf\u03c5 \u03c0\u03bf\u03cd\u03bc\u03b5 \u03b5\u03bc\u03b5\u03af\u03c2 \u03bc\u03cc\u03bb\u03b9\u03c2 \u03b1\u03bd\u03bf\u03af\u03be\u03b5\u03b9 \u03bf \u03b4\u03c1\u03cc\u03bc\u03bf\u03c2."
const DEFAULT_HOLD_BODY_EN =
  "You closed the trail. Ten marks, ten countries, and Pytheas's journal has reached its end.\n\nThe journey is not over yet, though. There are more steps before you reach the treasure, and not all of them have opened.\n\nDo not worry: your head start is safely on record. Everything you have earned so far stays yours and is not lost while you wait.\n\nWe will tell you the moment the way opens."

/**
 * Default clock time the hunt closes, as a bare "HH:MM" string. Only the TIME
 * is configurable: the date is part of the localized copy, because the closing
 * party is a fixed calendar event while the hour has already moved once.
 * Rendered into the hero chip and the "how to play" walkthrough.
 */
export const DEFAULT_HUNT_ENDS_AT = "17:00"

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
  /**
   * The four rotating hiding hints, always length 4, index-aligned with the
   * per-crew assignment in lib/compass-variant.ts.
   */
  compassHints: { el: string; en: string }[]
  /** Shared "put it back" line appended under whichever hint a crew received. */
  compassReturn: string
  compassReturnEn: string
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
  /**
   * Whether the trail-end hold is active. ON by default, so a fresh config row
   * seals note 1 rather than accidentally releasing the compass hint early.
   */
  holdEnabled: boolean
  /** Hold paper copy, shown instead of note 1 while held. */
  holdTitle: string
  holdTitleEn: string
  holdBody: string
  holdBodyEn: string
  /**
   * When the hold last went from on to off. This is what makes the release
   * alert targetable: a bare boolean cannot distinguish a crew that sat through
   * the hold from one that arrived after it was lifted and never saw it.
   */
  holdLiftedAt: Date | null
}

/**
 * Whether note 1 must stay sealed. The single source of truth for the rule, so
 * the journal, the scan screen and the compass QR cannot drift apart.
 */
export function isTrailEndHeld(cfg: Pick<FinaleConfig, "holdEnabled">): boolean {
  return cfg.holdEnabled
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
           ADD COLUMN IF NOT EXISTS "compassHint1" text,
           ADD COLUMN IF NOT EXISTS "compassHint1En" text,
           ADD COLUMN IF NOT EXISTS "compassHint2" text,
           ADD COLUMN IF NOT EXISTS "compassHint2En" text,
           ADD COLUMN IF NOT EXISTS "compassHint3" text,
           ADD COLUMN IF NOT EXISTS "compassHint3En" text,
           ADD COLUMN IF NOT EXISTS "compassHint4" text,
           ADD COLUMN IF NOT EXISTS "compassHint4En" text,
           ADD COLUMN IF NOT EXISTS "compassReturn" text,
           ADD COLUMN IF NOT EXISTS "compassReturnEn" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2En" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2Cta" text,
           ADD COLUMN IF NOT EXISTS "finaleNote2CtaEn" text,
           ADD COLUMN IF NOT EXISTS "finaleWinner" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerEn" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerNote" text,
           ADD COLUMN IF NOT EXISTS "finaleWinnerNoteEn" text,
           ADD COLUMN IF NOT EXISTS "huntEndsAt" text,
           ADD COLUMN IF NOT EXISTS "holdEnabled" boolean,
           ADD COLUMN IF NOT EXISTS "holdTitle" text,
           ADD COLUMN IF NOT EXISTS "holdTitleEn" text,
           ADD COLUMN IF NOT EXISTS "holdBody" text,
           ADD COLUMN IF NOT EXISTS "holdBodyEn" text,
           ADD COLUMN IF NOT EXISTS "holdLiftedAt" timestamptz`,
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
            "compassHint1" AS h1, "compassHint1En" AS h1e,
            "compassHint2" AS h2, "compassHint2En" AS h2e,
            "compassHint3" AS h3, "compassHint3En" AS h3e,
            "compassHint4" AS h4, "compassHint4En" AS h4e,
            "compassReturn" AS cr, "compassReturnEn" AS cre,
            "finaleNote2" AS n2, "finaleNote2En" AS n2e,
            "finaleNote2Cta" AS n2c, "finaleNote2CtaEn" AS n2ce,
            "finaleWinner" AS w, "finaleWinnerEn" AS we,
            "finaleWinnerNote" AS wn, "finaleWinnerNoteEn" AS wne,
            "huntEndsAt" AS ends,
            "holdEnabled" AS hen, "holdTitle" AS ht, "holdTitleEn" AS hte,
            "holdBody" AS hb, "holdBodyEn" AS hbe, "holdLiftedAt" AS hla
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
        h1: string | null
        h1e: string | null
        h2: string | null
        h2e: string | null
        h3: string | null
        h3e: string | null
        h4: string | null
        h4e: string | null
        cr: string | null
        cre: string | null
        n2: string | null
        n2e: string | null
        n2c: string | null
        n2ce: string | null
        w: string | null
        we: string | null
        wn: string | null
        wne: string | null
        ends: string | null
        hen: boolean | null
        ht: string | null
        hte: string | null
        hb: string | null
        hbe: string | null
        hla: Date | null
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
    compassHints: [
      {
        el: textOr(row?.h1, DEFAULT_COMPASS_HINTS[0].el),
        en: textOr(row?.h1e, DEFAULT_COMPASS_HINTS[0].en),
      },
      {
        el: textOr(row?.h2, DEFAULT_COMPASS_HINTS[1].el),
        en: textOr(row?.h2e, DEFAULT_COMPASS_HINTS[1].en),
      },
      {
        el: textOr(row?.h3, DEFAULT_COMPASS_HINTS[2].el),
        en: textOr(row?.h3e, DEFAULT_COMPASS_HINTS[2].en),
      },
      {
        el: textOr(row?.h4, DEFAULT_COMPASS_HINTS[3].el),
        en: textOr(row?.h4e, DEFAULT_COMPASS_HINTS[3].en),
      },
    ],
    compassReturn: textOr(row?.cr, DEFAULT_COMPASS_RETURN),
    compassReturnEn: textOr(row?.cre, DEFAULT_COMPASS_RETURN_EN),
    note2: textOr(row?.n2, DEFAULT_NOTE2),
    note2En: textOr(row?.n2e, DEFAULT_NOTE2_EN),
    note2Cta: textOr(row?.n2c, DEFAULT_NOTE2_CTA),
    note2CtaEn: textOr(row?.n2ce, DEFAULT_NOTE2_CTA_EN),
    winner: textOr(row?.w, DEFAULT_WINNER),
    winnerEn: textOr(row?.we, DEFAULT_WINNER_EN),
    winnerNote: textOr(row?.wn, DEFAULT_WINNER_NOTE),
    winnerNoteEn: textOr(row?.wne, DEFAULT_WINNER_NOTE_EN),
    huntEndsAt: normalizeHuntEndsAt(row?.ends),
    // Defaults to TRUE: a null column means an admin has never touched the
    // toggle, and the safe reading of that is "still held", never "wide open".
    holdEnabled: row?.hen ?? true,
    holdTitle: textOr(row?.ht, DEFAULT_HOLD_TITLE),
    holdTitleEn: textOr(row?.hte, DEFAULT_HOLD_TITLE_EN),
    holdBody: textOr(row?.hb, DEFAULT_HOLD_BODY),
    holdBodyEn: textOr(row?.hbe, DEFAULT_HOLD_BODY_EN),
    holdLiftedAt: row?.hla ?? null,
  }
}

/**
 * NOTE 2 as a specific crew must read it: the shared body, then the ONE rotating
 * hint that crew was assigned, as a closing paragraph.
 *
 * MOVED OFF NOTE 1 on 07-31, while the hold had never been lifted, so no crew had
 * yet read a hint in the old position and the rotation could be reset clean. The
 * rotation mechanism is untouched; only the note it rides on changed. Two
 * consequences follow from that and are relied on by the callers:
 *
 *   - note 1 now has no rotating text at all, so it is used verbatim,
 *   - a crew is assigned its variant when NOTE 2 opens, not at the trail end, so
 *     the rotation order follows who reaches note 2 first.
 *
 * The courtesy "put it back" line is deliberately NOT folded in here. It is
 * returned separately (see `compassReturn`) because it is rendered as a
 * highlighted aside rather than another paragraph of Pytheas's handwriting.
 */
export function composeNote2WithHint(
  cfg: FinaleConfig,
  variantIndex: number,
): { body: string; bodyEn: string } {
  const i =
    Number.isFinite(variantIndex) && cfg.compassHints.length > 0
      ? ((Math.trunc(variantIndex) % cfg.compassHints.length) + cfg.compassHints.length) %
        cfg.compassHints.length
      : 0
  const hint = cfg.compassHints[i]
  if (!hint) return { body: cfg.note2, bodyEn: cfg.note2En }
  const join = (base: string, tail: string) => {
    const b = base.trimEnd()
    const s = tail.trim()
    return s.length > 0 ? `${b}\n\n${s}` : b
  }
  return {
    body: join(cfg.note2, hint.el),
    bodyEn: join(cfg.note2En, hint.en),
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
  /** Exactly four hints; shorter/longer input is padded/trimmed on save. */
  compassHints: { el: string; en: string }[]
  compassReturn: string
  compassReturnEn: string
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
  /** Trail-end hold. Turning this off releases every held crew at once. */
  holdEnabled: boolean
  holdTitle: string
  holdTitleEn: string
  holdBody: string
  holdBodyEn: string
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

  // Always persist exactly COMPASS_VARIANT_COUNT hints in a fixed order, since a
  // crew's stored assignment is an index into this list. A short array from an
  // older client falls back to that slot's default rather than blanking it.
  const hintParams: string[] = []
  for (let i = 0; i < DEFAULT_COMPASS_HINTS.length; i++) {
    const h = input.compassHints?.[i]
    hintParams.push(clip(textOr(h?.el, DEFAULT_COMPASS_HINTS[i].el)))
    hintParams.push(clip(textOr(h?.en, DEFAULT_COMPASS_HINTS[i].en)))
  }
  hintParams.push(clip(textOr(input.compassReturn, DEFAULT_COMPASS_RETURN)))
  hintParams.push(clip(textOr(input.compassReturnEn, DEFAULT_COMPASS_RETURN_EN)))

  // The row always exists in practice (created by the scoring/phase setters),
  // but guard with an insert-or-update so a fresh DB still works.
  //
  // `holdLiftedAt` is stamped by a CASE in the UPDATE, i.e. the moment the hold
  // is RELEASED (on -> off), rather than by reading the old value in JS first,
  // so two admins saving at once cannot race and lose the timestamp.
  // `IS DISTINCT FROM false` treats a never-touched NULL column as held, which
  // matches the `?? true` read default. Re-sealing deliberately KEEPS the
  // previous stamp: it is only ever read while the hold is off, and clearing it
  // on the way back up would make an earlier release un-targetable.
  await pool.query(
    `INSERT INTO "score_config" (id, "compassLat", "compassLng", "compassRadiusM",
        "treasureLat", "treasureLng", "treasureRadiusM",
        "finaleNote1", "finaleNote1En", "finaleNote1Cta", "finaleNote1CtaEn",
        "finaleNote2", "finaleNote2En", "finaleNote2Cta", "finaleNote2CtaEn",
        "finaleWinner", "finaleWinnerEn", "finaleWinnerNote", "finaleWinnerNoteEn",
        "trailEndLat", "trailEndLng", "trailEndRadiusM", "huntEndsAt",
        "compassHint1", "compassHint1En", "compassHint2", "compassHint2En",
        "compassHint3", "compassHint3En", "compassHint4", "compassHint4En",
        "compassReturn", "compassReturnEn",
        "holdEnabled", "holdTitle", "holdTitleEn", "holdBody", "holdBodyEn", "updatedAt")
     VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, now())
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
        "compassHint1" = EXCLUDED."compassHint1",
        "compassHint1En" = EXCLUDED."compassHint1En",
        "compassHint2" = EXCLUDED."compassHint2",
        "compassHint2En" = EXCLUDED."compassHint2En",
        "compassHint3" = EXCLUDED."compassHint3",
        "compassHint3En" = EXCLUDED."compassHint3En",
        "compassHint4" = EXCLUDED."compassHint4",
        "compassHint4En" = EXCLUDED."compassHint4En",
        "compassReturn" = EXCLUDED."compassReturn",
        "compassReturnEn" = EXCLUDED."compassReturnEn",
        "holdEnabled" = EXCLUDED."holdEnabled",
        "holdTitle" = EXCLUDED."holdTitle",
        "holdTitleEn" = EXCLUDED."holdTitleEn",
        "holdBody" = EXCLUDED."holdBody",
        "holdBodyEn" = EXCLUDED."holdBodyEn",
        "holdLiftedAt" = CASE
          WHEN "score_config"."holdEnabled" IS DISTINCT FROM false
               AND EXCLUDED."holdEnabled" = false
            THEN now()
          ELSE "score_config"."holdLiftedAt"
        END,
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
      ...hintParams,
      input.holdEnabled === true,
      clip(textOr(input.holdTitle, DEFAULT_HOLD_TITLE)),
      clip(textOr(input.holdTitleEn, DEFAULT_HOLD_TITLE_EN)),
      clip(textOr(input.holdBody, DEFAULT_HOLD_BODY)),
      clip(textOr(input.holdBodyEn, DEFAULT_HOLD_BODY_EN)),
    ],
  )
}
