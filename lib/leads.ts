// ─────────────────────────────────────────────────────────────────────────
//  Lead registry — the RUNTIME source of truth for the hunt's stops.
//
//  Leads live in the `lead` table and are admin-managed: their sequence can be
//  reordered, leads can be added or removed, and each lead carries its own
//  γραμματόσημο (passport stamp) image. The table is seeded once from the
//  hardcoded defaults in lib/clues.ts.
//
//  IDENTITY vs POSITION
//  Every lead has a STABLE `id` (what a printed QR binds to) and a `position`
//  (its 1-based slot in the sequence). The progression engine (lib/hunt.ts)
//  works in positions ("leadOrder"); a QR resolves token → leadId → the lead's
//  CURRENT position, so a printed code keeps working after any reorder.
// ─────────────────────────────────────────────────────────────────────────

import "server-only"
import { cache } from "react"
import { randomUUID } from "node:crypto"
import { and, asc, eq, isNull, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { lead, clueToken, hint, leadContent, leadDifficulty } from "@/lib/db/schema"
import {
  CLUES,
  FINISH_ORDER,
  COMPASS_ORDER,
  TRAIL_END_ORDER,
  LEGACY_FINISH_ORDER,
  DEFAULT_DIFFICULTY,
  isDifficulty,
  type Clue,
  type Difficulty,
} from "@/lib/clues"
import { huntLinkFor } from "@/lib/site-url"
import { DEFAULT_GEO_RADIUS_M } from "@/lib/geo"

/** The reserved token id for the dedicated finishing QR (no real lead row). */
export const FINISH_LEAD_ID = "__finish__"

/** The reserved token id for the compass QR — the intermediate finale step
 *  scanned after all leads are solved, before the treasure/finish QR. */
export const COMPASS_LEAD_ID = "__compass__"

/** The reserved token id for the trail-end QR — the one hidden at the LAST
 *  lead's own spot. Scanning it closes the paper trail and releases the first
 *  note; it is the step before the compass QR. */
export const TRAIL_END_LEAD_ID = "__trailend__"

/** A fully-resolved lead: the public Clue shape plus its difficulty + geo gate. */
export type LeadDef = Clue & {
  difficulty: Difficulty
  /** QR location gate. Null lat/lng means "not configured" (no gate). */
  lat: number | null
  lng: number | null
  geoRadiusM: number | null
}

// ── Paragraph text helpers (body is stored raw, rendered as paragraphs) ─────

/** Split a raw text block into journal paragraphs (blank line = new para). */
export function splitParagraphs(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter((p) => p.length > 0)
}

/** Join a paragraph array back into editable raw text (blank line between). */
export function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join("\n\n")
}

/** A fresh, URL-safe random token for a printed QR code. */
function freshToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 18)
}

function normalizeDifficulty(value: unknown): Difficulty {
  return isDifficulty(value) ? value : DEFAULT_DIFFICULTY
}

// ── Seeding & one-time backfill ─────────────────────────────────────────────

let seedPromise: Promise<void> | null = null

/**
 * Populate the `lead` table from the hardcoded defaults the first time, and
 * run the one-time backfills that migrate the old position-keyed data to the
 * new stable-id model. Idempotent and safe to call on every request; the real
 * work runs at most once per process via the memoized promise.
 */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) seedPromise = doSeed()
  return seedPromise
}

async function doSeed(): Promise<void> {
  const existing = await db.select({ id: lead.id }).from(lead).limit(1)

  if (existing.length === 0) {
    // Merge any admin overrides that were stored under the old model so we
    // don't lose edits made before the migration.
    const overrides = await db.select().from(leadContent)
    const ovById = new Map(overrides.map((o) => [o.leadOrder, o]))
    const diffs = await db.select().from(leadDifficulty)
    const diffById = new Map(diffs.map((d) => [d.leadOrder, d.difficulty]))

    const now = new Date()
    const rows: (typeof lead.$inferInsert)[] = CLUES.map((c) => {
      const o = ovById.get(c.order)
      const cleanStr = (v: string | null | undefined) => {
        const t = (v ?? "").trim()
        return t.length > 0 ? t : null
      }
      return {
        id: c.id,
        position: c.order,
        country: c.country,
        countryEn: c.countryEn,
        subtitle: cleanStr(o?.subtitle) ?? c.subtitle,
        subtitleEn: cleanStr(o?.subtitleEn) ?? c.subtitleEn,
        icon: c.icon,
        body: cleanStr(o?.body) ?? joinParagraphs(c.body),
        bodyEn: cleanStr(o?.bodyEn) ?? joinParagraphs(c.bodyEn),
        stampImageUrl: c.stampImageUrl,
        stampAspect: c.stampAspect,
        backgroundImageUrl: c.backgroundImageUrl,
        difficulty: normalizeDifficulty(diffById.get(c.order)),
        createdAt: now,
        updatedAt: now,
      }
    })
    if (rows.length > 0) await db.insert(lead).values(rows).onConflictDoNothing()
  }

  // Build a position → stable id map from whatever leads now exist.
  const current = await db
    .select({ id: lead.id, position: lead.position })
    .from(lead)
  const idByPosition = new Map(current.map((r) => [r.position, r.id]))

  // Backfill clue_token.leadId (only rows still missing it).
  const tokensToFix = await db
    .select({ leadOrder: clueToken.leadOrder })
    .from(clueToken)
    .where(isNull(clueToken.leadId))
  for (const t of tokensToFix) {
    const leadId =
      t.leadOrder >= LEGACY_FINISH_ORDER ? FINISH_LEAD_ID : idByPosition.get(t.leadOrder)
    if (leadId) {
      await db.update(clueToken).set({ leadId }).where(eq(clueToken.leadOrder, t.leadOrder))
    }
  }

  // Migrate legacy finishing unlock rows to the new stable sentinel.
  //
  // A blind UPDATE crashes once a user holds BOTH rows, which happens as soon as
  // the legacy order (TOTAL_CLUES + 1) becomes a REAL lead position: the row is
  // then genuine lead progress, not a leftover marker, and renaming it collides
  // with the sentinel the user already owns. Skipping those users is the correct
  // outcome twice over: the sentinel already records that they finished, and
  // their lead row stays intact instead of being swallowed by the migration.
  if (FINISH_ORDER !== LEGACY_FINISH_ORDER) {
    await db.execute(
      sql`UPDATE "lead_unlock" SET "leadOrder" = ${FINISH_ORDER}
          WHERE "leadOrder" = ${LEGACY_FINISH_ORDER}
            AND NOT EXISTS (
              SELECT 1 FROM "lead_unlock" existing
              WHERE existing."userId" = "lead_unlock"."userId"
                AND existing."leadOrder" = ${FINISH_ORDER}
            )`,
    )
  }

  // Backfill hint.leadId from its legacy leadOrder association.
  const hintsToFix = await db
    .select({ id: hint.id, leadOrder: hint.leadOrder })
    .from(hint)
    .where(isNull(hint.leadId))
  for (const h of hintsToFix) {
    if (h.leadOrder == null) continue
    const leadId = idByPosition.get(h.leadOrder)
    if (leadId) await db.update(hint).set({ leadId }).where(eq(hint.id, h.id))
  }
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * The live, ordered lead list with fully-resolved content + stamp + difficulty.
 * Memoized per request via React.cache. Seeds the table on first use.
 */
export const getLeadDefs = cache(async (): Promise<LeadDef[]> => {
  await ensureSeeded()
  const rows = await db.select().from(lead).orderBy(asc(lead.position))
  return rows.map((r) => ({
    id: r.id,
    order: r.position,
    country: r.country,
    countryEn: r.countryEn,
    subtitle: r.subtitle,
    subtitleEn: r.subtitleEn,
    icon: r.icon as Clue["icon"],
    body: splitParagraphs(r.body),
    bodyEn: splitParagraphs(r.bodyEn),
    stampImageUrl: r.stampImageUrl,
    stampAspect: r.stampAspect || "2:3",
    backgroundImageUrl: r.backgroundImageUrl,
    difficulty: normalizeDifficulty(r.difficulty),
    lat: r.lat,
    lng: r.lng,
    geoRadiusM: r.geoRadiusM,
  }))
})

/**
 * The QR location gate for a lead, by stable id. `hasCoords` is true only when
 * both lat and lng are set; `radiusM` falls back to the global default.
 */
export async function getLeadGeo(
  leadId: string,
): Promise<{ hasCoords: boolean; lat: number | null; lng: number | null; radiusM: number }> {
  const rows = await db
    .select({ lat: lead.lat, lng: lead.lng, geoRadiusM: lead.geoRadiusM })
    .from(lead)
    .where(eq(lead.id, leadId))
    .limit(1)
  const r = rows[0]
  const hasCoords = !!r && r.lat != null && r.lng != null
  return {
    hasCoords,
    lat: r?.lat ?? null,
    lng: r?.lng ?? null,
    radiusM: r?.geoRadiusM ?? DEFAULT_GEO_RADIUS_M,
  }
}

/** Persist (or clear) a lead's GPS gate. Pass null lat/lng to clear the gate. */
export async function updateLeadGeo(
  leadId: string,
  lat: number | null,
  lng: number | null,
  radiusM: number | null,
): Promise<void> {
  await db
    .update(lead)
    .set({ lat, lng, geoRadiusM: radiusM, updatedAt: new Date() })
    .where(eq(lead.id, leadId))
}

/** The number of leads currently in the hunt. */
export async function getTotalLeads(): Promise<number> {
  return (await getLeadDefs()).length
}

/** Find a lead by its stable id (null when missing / for the finish token). */
export async function getLeadById(id: string): Promise<LeadDef | null> {
  return (await getLeadDefs()).find((l) => l.id === id) ?? null
}

/** Find a lead by its 1-based position, or null. */
export async function getLeadByPosition(position: number): Promise<LeadDef | null> {
  return (await getLeadDefs()).find((l) => l.order === position) ?? null
}

/** Map of position → difficulty for every live lead (for scoring). */
export async function getLeadDifficultyMap(): Promise<Map<number, Difficulty>> {
  const defs = await getLeadDefs()
  const out = new Map<number, Difficulty>()
  for (const d of defs) out.set(d.order, d.difficulty)
  return out
}

// ── QR token binding (keyed by stable leadId) ───────────────────────────────

export type ClueTokenRow = {
  leadId: string
  leadOrder: number
  country: string
  token: string
  link: string
  isFinish: boolean
  isCompass: boolean
  /** The QR hidden at the LAST lead's own spot, which closes the paper trail. */
  isTrailEnd: boolean
}

/** The surrogate leadOrder a reserved (non-lead) token binds to, if any. */
function reservedSurrogate(leadId: string): number | null {
  if (leadId === FINISH_LEAD_ID) return FINISH_ORDER
  if (leadId === COMPASS_LEAD_ID) return COMPASS_ORDER
  if (leadId === TRAIL_END_LEAD_ID) return TRAIL_END_ORDER
  return null
}

/** Next free surrogate leadOrder for a new clue_token row (below the finish
 *  sentinel). The value is meaningless to the app; it only satisfies the PK. */
async function nextTokenSurrogate(): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${clueToken.leadOrder}), 1)` })
    .from(clueToken)
    .where(lt(clueToken.leadOrder, FINISH_ORDER))
  return (rows[0]?.max ?? 1) + 1
}

/** Ensure a token exists for the given leadId. Returns the (existing) token. */
async function ensureTokenForLead(leadId: string): Promise<string> {
  const found = await db
    .select({ token: clueToken.token })
    .from(clueToken)
    .where(eq(clueToken.leadId, leadId))
    .limit(1)
  if (found[0]) return found[0].token
  const token = freshToken()
  const surrogate = reservedSurrogate(leadId) ?? (await nextTokenSurrogate())
  await db
    .insert(clueToken)
    .values({ leadOrder: surrogate, leadId, token })
    .onConflictDoNothing()
  const again = await db
    .select({ token: clueToken.token })
    .from(clueToken)
    .where(eq(clueToken.leadId, leadId))
    .limit(1)
  return again[0]?.token ?? token
}

/**
 * Make sure a stable token exists for every scannable lead (positions 2..N)
 * and for the finishing QR. Position 1 is time-gated and never scanned.
 * Idempotent.
 */
export async function ensureTokens(): Promise<void> {
  const defs = await getLeadDefs()
  for (const l of defs) {
    if (l.order < 2) continue
    await ensureTokenForLead(l.id)
  }
  await ensureTokenForLead(TRAIL_END_LEAD_ID)
  await ensureTokenForLead(COMPASS_LEAD_ID)
  await ensureTokenForLead(FINISH_LEAD_ID)
}

/** All QR tokens with absolute scan links, ordered by position (finish last). */
export async function listTokens(): Promise<ClueTokenRow[]> {
  await ensureTokens()
  const defs = await getLeadDefs()
  const byId = new Map(defs.map((d) => [d.id, d]))
  const rows = await db.select().from(clueToken)
  const out: ClueTokenRow[] = []
  for (const r of rows) {
    if (!r.leadId) continue
    if (r.leadId === TRAIL_END_LEAD_ID) {
      // This IS the last lead's own QR: it is hidden at that lead's real-world
      // spot, so it is named after the place (e.g. "Finland") rather than after
      // the internal sentinel. Every lead now has exactly one QR sitting at its
      // own place; only the internal key stays `__trailend__`, so the token that
      // is already minted keeps working.
      const last = defs[defs.length - 1]
      out.push({
        leadId: TRAIL_END_LEAD_ID,
        leadOrder: TRAIL_END_ORDER,
        country: last?.country ?? "Final lead",
        token: r.token,
        link: huntLinkFor(r.token),
        isFinish: false,
        isCompass: false,
        isTrailEnd: true,
      })
      continue
    }
    if (r.leadId === COMPASS_LEAD_ID) {
      out.push({
        leadId: COMPASS_LEAD_ID,
        leadOrder: COMPASS_ORDER,
        country: "Compass",
        token: r.token,
        link: huntLinkFor(r.token),
        isFinish: false,
        isCompass: true,
        isTrailEnd: false,
      })
      continue
    }
    if (r.leadId === FINISH_LEAD_ID) {
      out.push({
        leadId: FINISH_LEAD_ID,
        leadOrder: FINISH_ORDER,
        country: "Finish",
        token: r.token,
        link: huntLinkFor(r.token),
        isFinish: true,
        isCompass: false,
        isTrailEnd: false,
      })
      continue
    }
    const def = byId.get(r.leadId)
    if (!def || def.order < 2) continue
    out.push({
      leadId: def.id,
      leadOrder: def.order,
      country: def.country,
      token: r.token,
      link: huntLinkFor(r.token),
      isFinish: false,
      isCompass: false,
      isTrailEnd: false,
    })
  }
  return out.sort((a, b) => a.leadOrder - b.leadOrder)
}

/**
 * Shape a hand-typed QR slug into its canonical form. Accepts either a bare
 * slug ("athens-01") or a full pasted scan link, keeping only the last path
 * segment. Always lowercased: `/q/<token>` is matched with an exact,
 * case-sensitive comparison, so allowing mixed case would let two visually
 * identical printed codes resolve differently.
 */
export function normalizeTokenSlug(input: string): string {
  const noQuery = input.trim().split(/[?#]/)[0]
  const last = noQuery.replace(/\/+$/, "").split("/").pop() ?? ""
  return last.toLowerCase()
}

/**
 * A slug must start and end alphanumeric, may contain hyphens/underscores
 * between, and is 4-64 characters long. This keeps links clean, unambiguous to
 * read off a printed card, and safe as a URL path segment.
 */
const TOKEN_SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,62}[a-z0-9]$/

export type SetTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "bad_slug" }
  /** Another QR already resolves to this URL; `takenBy` labels which one. */
  | { ok: false; reason: "duplicate"; takenBy: string }

/** Human label for whichever QR currently owns a token, for clash messages. */
async function tokenOwnerLabel(leadId: string | null): Promise<string> {
  if (leadId === TRAIL_END_LEAD_ID) {
    const defs = await getLeadDefs()
    const last = defs[defs.length - 1]
    return last ? `${last.country} · the final lead's QR` : "the final lead's QR"
  }
  if (leadId === COMPASS_LEAD_ID) return "the Compass QR"
  if (leadId === FINISH_LEAD_ID) return "the Treasure QR"
  if (!leadId) return "another QR"
  const def = (await getLeadDefs()).find((l) => l.id === leadId)
  return def ? `Lead ${String(def.order).padStart(2, "0")} · ${def.country}` : "another QR"
}

/**
 * Point a lead's QR at an admin-chosen URL slug. Rejects malformed slugs and,
 * critically, any slug already used by a different QR — two QRs resolving to
 * the same URL would silently unlock the wrong step. The DB also has a UNIQUE
 * index on `token`, so a race still fails closed rather than duplicating.
 */
export async function setTokenForLead(leadId: string, desired: string): Promise<SetTokenResult> {
  const slug = normalizeTokenSlug(desired)
  if (!TOKEN_SLUG_RE.test(slug)) return { ok: false, reason: "bad_slug" }

  const clash = await db
    .select({ leadId: clueToken.leadId })
    .from(clueToken)
    .where(eq(clueToken.token, slug))
    .limit(1)
  if (clash[0] && clash[0].leadId !== leadId) {
    return { ok: false, reason: "duplicate", takenBy: await tokenOwnerLabel(clash[0].leadId) }
  }
  // Already pointing here: nothing to write, but report success.
  if (clash[0]) return { ok: true, token: slug }

  const existing = await db
    .select({ leadOrder: clueToken.leadOrder })
    .from(clueToken)
    .where(eq(clueToken.leadId, leadId))
    .limit(1)
  if (existing[0]) {
    await db.update(clueToken).set({ token: slug }).where(eq(clueToken.leadId, leadId))
  } else {
    const surrogate = reservedSurrogate(leadId) ?? (await nextTokenSurrogate())
    await db.insert(clueToken).values({ leadOrder: surrogate, leadId, token: slug })
  }
  return { ok: true, token: slug }
}

/** Replace a lead's token with a fresh one. Invalidates any printed QR. */
export async function regenerateTokenForLead(leadId: string): Promise<string> {
  const fresh = freshToken()
  const existing = await db
    .select({ leadOrder: clueToken.leadOrder })
    .from(clueToken)
    .where(eq(clueToken.leadId, leadId))
    .limit(1)
  if (existing[0]) {
    await db.update(clueToken).set({ token: fresh }).where(eq(clueToken.leadId, leadId))
  } else {
    const surrogate = reservedSurrogate(leadId) ?? (await nextTokenSurrogate())
    await db.insert(clueToken).values({ leadOrder: surrogate, leadId, token: fresh })
  }
  return fresh
}

// ── Writes (admin) ───────────────────────────────────────────────────────────

export type LeadContentInput = {
  country: string
  countryEn: string
  subtitle: string
  subtitleEn: string
  icon: Clue["icon"]
  /** Raw body text, paragraphs separated by a blank line. */
  body: string
  bodyEn: string
  difficulty: Difficulty
}

/**
 * Create a new lead at the end of the sequence and issue its QR token. Only the
 * country names are required; everything else defaults to blank/easy and can be
 * filled in afterwards via the edit + stamp actions.
 */
export async function createLead(
  input: Pick<LeadContentInput, "country" | "countryEn"> & Partial<LeadContentInput>,
): Promise<LeadDef> {
  const defs = await getLeadDefs()
  const position = defs.length + 1
  const id = `lead_${randomUUID().replace(/-/g, "").slice(0, 12)}`
  const now = new Date()
  await db.insert(lead).values({
    id,
    position,
    country: input.country,
    countryEn: input.countryEn,
    subtitle: input.subtitle ?? "",
    subtitleEn: input.subtitleEn ?? "",
    icon: input.icon ?? "Landmark",
    body: input.body ?? "",
    bodyEn: input.bodyEn ?? "",
    stampImageUrl: null,
    stampAspect: "2:3",
    backgroundImageUrl: null,
    difficulty: normalizeDifficulty(input.difficulty ?? "easy"),
    createdAt: now,
    updatedAt: now,
  })
  // Scannable leads (position >= 2) get a QR token immediately.
  if (position >= 2) await ensureTokenForLead(id)
  invalidate()
  const created = await db.select().from(lead).where(eq(lead.id, id)).limit(1)
  const r = created[0]
  return {
    id: r.id,
    order: r.position,
    country: r.country,
    countryEn: r.countryEn,
    subtitle: r.subtitle,
    subtitleEn: r.subtitleEn,
    icon: r.icon as Clue["icon"],
    body: splitParagraphs(r.body),
    bodyEn: splitParagraphs(r.bodyEn),
    stampImageUrl: r.stampImageUrl,
    stampAspect: r.stampAspect || "2:3",
    backgroundImageUrl: r.backgroundImageUrl,
    difficulty: normalizeDifficulty(r.difficulty),
    lat: r.lat,
    lng: r.lng,
    geoRadiusM: r.geoRadiusM,
  }
}

/** Update a lead's editable content + difficulty (not its stamp or position). */
export async function updateLeadContent(id: string, input: LeadContentInput): Promise<void> {
  await db
    .update(lead)
    .set({
      country: input.country,
      countryEn: input.countryEn,
      subtitle: input.subtitle,
      subtitleEn: input.subtitleEn,
      icon: input.icon,
      body: input.body,
      bodyEn: input.bodyEn,
      difficulty: normalizeDifficulty(input.difficulty),
      updatedAt: new Date(),
    })
    .where(eq(lead.id, id))
  invalidate()
}

/** Update just a lead's stamp image + aspect ratio. */
export async function updateLeadStamp(
  id: string,
  stampImageUrl: string | null,
  stampAspect: string,
): Promise<void> {
  await db
    .update(lead)
    .set({ stampImageUrl, stampAspect, updatedAt: new Date() })
    .where(eq(lead.id, id))
  invalidate()
}

/** Update just a lead's full-bleed background image (null clears it). */
export async function updateLeadBackground(
  id: string,
  backgroundImageUrl: string | null,
): Promise<void> {
  await db
    .update(lead)
    .set({ backgroundImageUrl, updatedAt: new Date() })
    .where(eq(lead.id, id))
  invalidate()
}

/** Update just per-lead difficulty (used by the scoring panel). */
export async function setLeadDifficultyById(id: string, difficulty: Difficulty): Promise<void> {
  await db
    .update(lead)
    .set({ difficulty: normalizeDifficulty(difficulty), updatedAt: new Date() })
    .where(eq(lead.id, id))
  invalidate()
}

/**
 * Delete a lead. Removes its QR token, detaches any hints, and re-packs the
 * remaining leads into a contiguous 1..N sequence. Progress rows (position
 * based) are intentionally left untouched — reordering/removing is a setup
 * action; doing it after players have progress can shift standings.
 */
export async function deleteLead(id: string): Promise<void> {
  await db.delete(clueToken).where(eq(clueToken.leadId, id))
  await db.update(hint).set({ leadId: null }).where(eq(hint.leadId, id))
  await db.delete(lead).where(eq(lead.id, id))
  // Re-pack positions to stay contiguous.
  const remaining = await db
    .select({ id: lead.id })
    .from(lead)
    .orderBy(asc(lead.position))
  let pos = 1
  for (const r of remaining) {
    await db.update(lead).set({ position: pos, updatedAt: new Date() }).where(eq(lead.id, r.id))
    pos += 1
  }
  invalidate()
}

/**
 * Reorder the whole sequence. `orderedIds` is the full list of lead ids in the
 * new order; positions are rewritten to 1..N. Ids not present are ignored;
 * any missing existing leads are appended in their current order.
 */
export async function reorderLeads(orderedIds: string[]): Promise<void> {
  const defs = await getLeadDefs()
  const known = new Set(defs.map((d) => d.id))
  const seen = new Set<string>()
  const finalOrder: string[] = []
  for (const id of orderedIds) {
    if (known.has(id) && !seen.has(id)) {
      finalOrder.push(id)
      seen.add(id)
    }
  }
  // Append any leads the caller left out, preserving their current order.
  for (const d of defs) if (!seen.has(d.id)) finalOrder.push(d.id)

  let pos = 1
  for (const id of finalOrder) {
    await db.update(lead).set({ position: pos, updatedAt: new Date() }).where(eq(lead.id, id))
    pos += 1
  }
  // A lead moving into/out of position 1 changes whether it is scannable, so
  // make sure every position >= 2 has a token.
  invalidate()
  await ensureTokens()
}

// The React.cache memo lives for one request; server actions run in their own
// request, so a fresh read after a write already sees new data. This is a
// no-op hook kept for clarity / future in-process caching.
function invalidate(): void {}
