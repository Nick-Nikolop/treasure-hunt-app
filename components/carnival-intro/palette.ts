import type { CSSProperties } from "react"

export const EASE = [0.16, 1, 0.3, 1] as const

/** Poster burgundy for the opening, cream paper for the puzzle itself. */
export const PALETTE = {
  "--ci-night": "#2a0309",
  "--ci-wine": "#6b1024",
  "--ci-cream": "#f5ecdb",
  "--ci-paper": "#fbf6ec",
  "--ci-ink": "#2b0a10",
  "--ci-gold": "#9a6f1e",
  "--ci-gold-soft": "#e0b04a",
} as CSSProperties
