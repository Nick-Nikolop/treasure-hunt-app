const PATTERNS = {
  tap: 8,
  found: [14, 40, 22],
  wrong: [30, 50, 30],
  success: [20, 60, 20, 60, 90],
} as const

/** Short vibration on phones that support it (Android). Silent everywhere else and for reduced-motion users. */
export function buzz(kind: keyof typeof PATTERNS) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[])
  } catch {
    // Some browsers throw when vibration is blocked by the user; it's only a nicety.
  }
}
