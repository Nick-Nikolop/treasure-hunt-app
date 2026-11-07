/**
 * Everything printed (visibly or in UV ink) on the carnival rollup poster.
 * Client-safe: it's all on the physical poster anyway. The decryption key lives only in the
 * server env (`CARNIVAL_INTRO_KEY`). Never add solving guidance here or in the UI.
 */

export const CIPHERTEXT = "Ω ΝΙΙΥΜΥΩ ΗΩΒ ΒΣΣΕΔΡ"

/** Cipher letters only (no spaces), the length of the worksheet. */
export const CIPHER_LETTERS = CIPHERTEXT.replace(/\s+/g, "").length

/**
 * UV ink codes scattered on the poster.
 * x / y are fractions of the poster box, rot in degrees, size in % of the poster width.
 * Real codes in the order given: B1₍₄₎ – E2₍₂₎ – A3₍₂₎ – D1₍₃₎ – C3₍₁₎ – F1₍₈₎ – K3₍₁₎ (Latin letters).
 * `sub` is the subscript count, rendered with <sub> because the poster font has no ₍₀₎ glyphs.
 */
export const UV_MARKS: { code: string; sub: string; x: number; y: number; rot: number; size: number; ink: number }[] = [
  { code: "B1", sub: "4", x: 0.17, y: 0.09, rot: -9, size: 6.2, ink: 0.95 },
  { code: "E2", sub: "2", x: 0.8, y: 0.3, rot: 7, size: 5.6, ink: 0.85 },
  { code: "A3", sub: "2", x: 0.21, y: 0.4, rot: 4, size: 5.9, ink: 1 },
  { code: "D1", sub: "3", x: 0.74, y: 0.47, rot: -12, size: 6, ink: 0.9 },
  { code: "C3", sub: "1", x: 0.78, y: 0.64, rot: 10, size: 5.8, ink: 0.95 },
  { code: "F1", sub: "8", x: 0.16, y: 0.7, rot: -14, size: 6.1, ink: 0.88 },
  { code: "K3", sub: "1", x: 0.66, y: 0.9, rot: 5, size: 5.6, ink: 0.92 },
]


export const UV_TOTAL = UV_MARKS.length
