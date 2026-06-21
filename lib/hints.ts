// ─────────────────────────────────────────────────────────────────────────
//  Admin-authored hints.
//
//  A hint is a small piece of content (title + body) that admins create in the
//  dashboard. Each hint gets a stable, unguessable link (/hint/<token>) that an
//  organizer can share. The hint page is only shown to signed-in explorers.
//
//  A hint may optionally be tied to a lead (`leadOrder`). When set, the page
//  shows which lead it belongs to, using the country names from lib/clues.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { hint } from "@/lib/db/schema"
import { siteUrl } from "@/lib/hunt"
import { TOTAL_CLUES, CLUES } from "@/lib/clues"
import { desc, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"

export type HintRow = {
  id: string
  token: string
  title: string
  body: string
  leadOrder: number | null
  createdAt: Date
  updatedAt: Date
  /** Absolute, shareable link to the hint page. */
  link: string
}

/** The public link a hint token resolves to. */
export function hintLinkFor(token: string): string {
  return `${siteUrl()}/hint/${token}`
}

function toRow(r: typeof hint.$inferSelect): HintRow {
  return { ...r, link: hintLinkFor(r.token) }
}

/** Generate a short, URL-safe, unguessable token. */
function freshToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 18)
}

/** All hints, newest first. Admin only (call from a guarded action). */
export async function listHints(): Promise<HintRow[]> {
  const rows = await db.select().from(hint).orderBy(desc(hint.createdAt))
  return rows.map(toRow)
}

/** Look up a single hint by its public token. Returns null when not found. */
export async function getHintByToken(token: string): Promise<HintRow | null> {
  const rows = await db.select().from(hint).where(eq(hint.token, token)).limit(1)
  return rows[0] ? toRow(rows[0]) : null
}

/** Normalize an optional lead association to a valid order or null. */
export function normalizeLeadOrder(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > TOTAL_CLUES) return null
  return Math.floor(n)
}

/** Greek + English country for a lead order, or null when unset/out of range. */
export function hintLeadCountry(leadOrder: number | null): {
  country: string | null
  countryEn: string | null
} {
  if (leadOrder === null) return { country: null, countryEn: null }
  const clue = CLUES.find((c) => c.order === leadOrder)
  return { country: clue?.country ?? null, countryEn: clue?.countryEn ?? null }
}

/** Create a hint. Returns the created row (with its link). */
export async function createHint(input: {
  title: string
  body: string
  leadOrder: number | null
}): Promise<HintRow> {
  const now = new Date()
  const row: typeof hint.$inferInsert = {
    id: randomUUID(),
    token: freshToken(),
    title: input.title,
    body: input.body,
    leadOrder: input.leadOrder,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(hint).values(row)
  return toRow(row as typeof hint.$inferSelect)
}

/** Update a hint's content / lead association. */
export async function updateHint(
  id: string,
  input: { title: string; body: string; leadOrder: number | null },
): Promise<void> {
  await db
    .update(hint)
    .set({
      title: input.title,
      body: input.body,
      leadOrder: input.leadOrder,
      updatedAt: new Date(),
    })
    .where(eq(hint.id, id))
}

/** Delete a hint permanently. Its link stops working immediately. */
export async function deleteHint(id: string): Promise<void> {
  await db.delete(hint).where(eq(hint.id, id))
}

/** Issue a fresh token for a hint, invalidating the old link. */
export async function regenerateHintToken(id: string): Promise<void> {
  await db.update(hint).set({ token: freshToken(), updatedAt: new Date() }).where(eq(hint.id, id))
}
