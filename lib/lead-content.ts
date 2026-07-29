// ─────────────────────────────────────────────────────────────────────────
//  Lead copy helpers (registry-backed).
//
//  Leads (country, icon, subtitle, body, stamp) now live in the
//  `lead` table and are read through lib/leads.ts. This module is a thin
//  compatibility layer over that registry:
//   - `applyLeadContent` resolves a set of positional clue stubs to the live
//     lead content (used by the journal).
//   - `getEditableLeads` / `EditableLead` shape the admin editor rows.
//   - paragraph helpers are re-exported from the registry.
// ─────────────────────────────────────────────────────────────────────────

import "server-only"
import type { Clue } from "@/lib/clues"
import { getLeadDefs, splitParagraphs, joinParagraphs } from "@/lib/leads"

export { splitParagraphs, joinParagraphs }

/**
 * Resolve a set of clue stubs (as produced by buildClueState, which only
 * carries positions/order) to the live lead content from the registry. Matches
 * by position so the journal renders the admin's current copy + stamp.
 */
export async function applyLeadContent(clues: Clue[]): Promise<Clue[]> {
  if (clues.length === 0) return clues
  const defs = await getLeadDefs()
  const byPos = new Map(defs.map((d) => [d.order, d]))
  return clues.map((clue) => {
    const d = byPos.get(clue.order)
    if (!d) return clue
    return {
      ...clue,
      id: d.id,
      country: d.country,
      countryEn: d.countryEn,
      subtitle: d.subtitle,
      subtitleEn: d.subtitleEn,
      icon: d.icon,
      body: d.body,
      bodyEn: d.bodyEn,
      stampImageUrl: d.stampImageUrl,
      stampAspect: d.stampAspect,
      backgroundImageUrl: d.backgroundImageUrl,
      compassVariant: d.compassVariant,
    }
  })
}

/**
 * The current editable copy for every lead, as raw text, for the admin editor.
 * Includes the stable id, position and stamp image + aspect.
 */
export async function getEditableLeads() {
  const defs = await getLeadDefs()
  return defs.map((d) => ({
    id: d.id,
    order: d.order,
    country: d.country,
    countryEn: d.countryEn,
    icon: d.icon,
    subtitle: d.subtitle,
    subtitleEn: d.subtitleEn,
    body: joinParagraphs(d.body),
    bodyEn: joinParagraphs(d.bodyEn),
    stampImageUrl: d.stampImageUrl,
    stampAspect: d.stampAspect,
    backgroundImageUrl: d.backgroundImageUrl,
    compassVariant: d.compassVariant,
    lat: d.lat,
    lng: d.lng,
    geoRadiusM: d.geoRadiusM,
  }))
}

export type EditableLead = Awaited<ReturnType<typeof getEditableLeads>>[number]
