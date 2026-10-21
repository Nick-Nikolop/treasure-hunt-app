/**
 * Everything printed (visibly or in UV ink) on the carnival rollup poster.
 * Client-safe: none of this is secret, it's all on the physical poster anyway.
 * The decryption key itself lives only in the server env (`CARNIVAL_INTRO_KEY`).
 */

export const CIPHERTEXT = "Ω ΝΙΙΥΜΥΩ ΗΩΒ ΒΣΣΕΔΡ"

export const MONUMENT = {
  name: "Μνημείο του Φωτός",
  place: "Κεντρική πλατεία Καλαμάτας",
  coordinates: "37°02'24.126\"N · 22°06'41.249\"E",
  lat: 37.040035,
  lng: 22.111458,
}

export const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${MONUMENT.lat},${MONUMENT.lng}`

/**
 * UV ink codes scattered on the poster. Format: row letter, word number, (letter number).
 * x / y are fractions of the poster box, rot in degrees, size in % of the poster width.
 * PLACEHOLDERS: replace the codes with the ones that spell the key from the monument's east face.
 */
export const UV_MARKS: { code: string; x: number; y: number; rot: number; size: number; ink: number }[] = [
  { code: "Α3(2)", x: 0.17, y: 0.09, rot: -9, size: 7.2, ink: 0.95 },
  { code: "Γ1(4)", x: 0.8, y: 0.3, rot: 7, size: 6.6, ink: 0.85 },
  { code: "Β5(1)", x: 0.21, y: 0.4, rot: 4, size: 6.9, ink: 1 },
  { code: "Δ2(3)", x: 0.74, y: 0.47, rot: -12, size: 7, ink: 0.9 },
  { code: "Α7(5)", x: 0.3, y: 0.565, rot: -3, size: 6.4, ink: 0.8 },
  { code: "Ε4(2)", x: 0.78, y: 0.64, rot: 10, size: 6.8, ink: 0.95 },
  { code: "Γ6(1)", x: 0.16, y: 0.7, rot: -14, size: 7.1, ink: 0.88 },
  { code: "Β2(6)", x: 0.66, y: 0.9, rot: 5, size: 6.6, ink: 0.92 },
]

/** The NE compass drawn in UV ink: tells players which face of the monument to read. */
export const UV_COMPASS = { x: 0.84, y: 0.115, size: 15, rot: -6 }

export const UV_TOTAL = UV_MARKS.length + 1
