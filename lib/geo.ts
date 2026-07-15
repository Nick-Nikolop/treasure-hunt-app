// Small geo utilities for the scan location gate. No dependencies, no state.

/**
 * Default proximity radius (metres) an explorer must be within to unlock a
 * lead by scanning its QR, when a lead does not set its own `geoRadiusM`.
 * Chosen to comfortably absorb typical phone GPS error (often 20-60 m, worse
 * near tall buildings) while still requiring the scanner to actually be at the
 * spot. Superadmins can override per lead.
 */
export const DEFAULT_GEO_RADIUS_M = 300

/**
 * Great-circle distance between two lat/lng points in metres (haversine).
 * Accurate to well within a metre at city scale, which is all we need.
 */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000 // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
