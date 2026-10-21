import type { CSSProperties } from "react"

export const EASE = [0.16, 1, 0.3, 1] as const

/** Taken from the rollup itself: carnival burgundy at night, gold foil, cream paper, plus UV violet for the torch. */
export const PALETTE = {
  "--ci-night": "#16020a",
  "--ci-wine": "#6b1024",
  "--ci-cream": "#f5ecdb",
  "--ci-gold": "#e0b04a",
  "--ci-uv": "#8b5cff",
} as CSSProperties
