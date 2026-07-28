/**
 * The compass watermark shown behind each lead's journal narrative.
 *
 * Two bundled variants differ only in where the needle points, so the same
 * artwork can be varied per lead without an upload. Both are square PNGs with
 * transparent padding trimmed off, which lets the renderer size them with a
 * single number and keep them perfectly centred at any viewport.
 */

export const COMPASS_VARIANTS = ["s-to-n", "e-to-w"] as const

export type CompassVariant = (typeof COMPASS_VARIANTS)[number]

export const DEFAULT_COMPASS_VARIANT: CompassVariant = "s-to-n"

/** Bundled square (1024x1024) artwork, trimmed to the compass itself. */
export const COMPASS_SRC: Record<CompassVariant, string> = {
  "s-to-n": "/compass/s-to-n.png",
  "e-to-w": "/compass/e-to-w.png",
}

/** Short labels for the admin picker. */
export const COMPASS_LABELS: Record<CompassVariant, string> = {
  "s-to-n": "S to N",
  "e-to-w": "E to W",
}

/**
 * Narrow an arbitrary stored value to a known variant, so a stale or hand-edited
 * database row can never blank out the watermark.
 */
export function normalizeCompassVariant(value: unknown): CompassVariant {
  return COMPASS_VARIANTS.includes(value as CompassVariant)
    ? (value as CompassVariant)
    : DEFAULT_COMPASS_VARIANT
}
