/**
 * Default journal page art, keyed by a lead's STABLE identity (its `id`) and
 * never by its position in the hunt.
 *
 * This mapping used to be an array indexed by `order - 1`, which meant the art
 * belonged to the slot rather than the lead: reordering leads in the admin
 * panel left every background behind. Keying by id guarantees that when a lead
 * moves from position 1 to position 2, its landmark travels with it.
 *
 * Leads created later by an admin (ids like `lead_ab12…`) are intentionally
 * absent here: they resolve to `null` so the page falls back to plain parchment
 * instead of borrowing some other country's landmark. Admins can then upload a
 * background for them from the Leads panel.
 */
export const LEAD_BG_DEFAULTS: Record<string, string> = {
  china: "/lead-bg/great-wall.jpg",
  thailand: "/lead-bg/temple.jpg",
  france: "/lead-bg/eiffel-tower.jpg",
  switzerland: "/lead-bg/watch.jpg",
  serbia: "/lead-bg/st-sava.jpg",
  spain: "/lead-bg/sagrada-familia.jpg",
  egypt: "/lead-bg/pyramids.jpg",
  turkey: "/lead-bg/blue-mosque.jpg",
  england: "/lead-bg/big-ben.jpg",
  finland: "/lead-bg/library.jpg",
}

/**
 * Resolve the background to render for a lead. An explicitly stored URL (an
 * admin upload) always wins; otherwise we fall back to the bundled landmark for
 * that lead's identity. Returns `null` when neither exists, so callers render
 * parchment alone rather than a mismatched landmark.
 */
export function resolveLeadBackground(
  leadId: string,
  storedUrl?: string | null,
): string | null {
  if (storedUrl) return storedUrl
  return LEAD_BG_DEFAULTS[leadId] ?? null
}
