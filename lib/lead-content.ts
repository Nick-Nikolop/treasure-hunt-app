// ─────────────────────────────────────────────────────────────────────────
//  Admin-editable lead copy.
//
//  The canonical leads (country, stamp icon, default subtitle/body) live in
//  lib/clues.ts. Admins can override the *subtitle* and *body* text per lead
//  and per language from the control room; those overrides are stored in the
//  `lead_content` table and merged over the defaults here.
//
//  Body text is stored raw, with a blank line between paragraphs. It is split
//  back into the journal's paragraph array (string[]) so the journal renders
//  exactly as before, just with the admin's words.
// ─────────────────────────────────────────────────────────────────────────

import "server-only"
import { db } from "@/lib/db"
import { leadContent } from "@/lib/db/schema"
import { CLUES, type Clue } from "@/lib/clues"

export type LeadOverride = {
  leadOrder: number
  subtitle: string | null
  subtitleEn: string | null
  body: string | null
  bodyEn: string | null
}

/**
 * Split a raw text block into journal paragraphs. Paragraphs are separated by
 * one or more blank lines; any single newlines inside a paragraph collapse to
 * a space so the journal's <p> blocks read cleanly.
 */
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

/** Treat whitespace-only overrides as "not set" so they fall back to defaults. */
function clean(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Fetch all stored overrides, keyed by lead order. */
export async function getLeadOverrides(): Promise<Map<number, LeadOverride>> {
  const rows = await db.select().from(leadContent)
  const map = new Map<number, LeadOverride>()
  for (const r of rows) {
    map.set(r.leadOrder, {
      leadOrder: r.leadOrder,
      subtitle: clean(r.subtitle),
      subtitleEn: clean(r.subtitleEn),
      body: clean(r.body),
      bodyEn: clean(r.bodyEn),
    })
  }
  return map
}

/**
 * Merge stored overrides over a set of default clues. Only subtitle and body
 * (in each language) can be overridden; country and icon always come from the
 * defaults. Returns new Clue objects, leaving the originals untouched.
 */
export async function applyLeadContent(clues: Clue[]): Promise<Clue[]> {
  if (clues.length === 0) return clues
  const overrides = await getLeadOverrides()
  return clues.map((clue) => {
    const o = overrides.get(clue.order)
    if (!o) return clue
    return {
      ...clue,
      subtitle: o.subtitle ?? clue.subtitle,
      subtitleEn: o.subtitleEn ?? clue.subtitleEn,
      body: o.body ? splitParagraphs(o.body) : clue.body,
      bodyEn: o.bodyEn ? splitParagraphs(o.bodyEn) : clue.bodyEn,
    }
  })
}

/**
 * The current effective copy for every lead, as editable raw text. Used to
 * prefill the admin editor: shows the override where present, otherwise the
 * hardcoded default. Country/countryEn are read-only context.
 */
export async function getEditableLeads() {
  const overrides = await getLeadOverrides()
  return CLUES.map((clue) => {
    const o = overrides.get(clue.order)
    return {
      order: clue.order,
      country: clue.country,
      countryEn: clue.countryEn,
      subtitle: o?.subtitle ?? clue.subtitle,
      subtitleEn: o?.subtitleEn ?? clue.subtitleEn,
      body: o?.body ?? joinParagraphs(clue.body),
      bodyEn: o?.bodyEn ?? joinParagraphs(clue.bodyEn),
      /** Whether this lead currently differs from the hardcoded default. */
      customized: Boolean(o && (o.subtitle || o.subtitleEn || o.body || o.bodyEn)),
    }
  })
}

export type EditableLead = Awaited<ReturnType<typeof getEditableLeads>>[number]
