import type { CSSProperties } from "react"
import type { Spot } from "./cases"

export const EASE = [0.22, 1, 0.36, 1] as const

/** Text sizes are in board units so every paper keeps its proportions at any size. */
export const fs = (n: number): CSSProperties => ({ fontSize: `calc(${n} * var(--u))` })

export function place(spot: Spot, shape: number): CSSProperties {
  return {
    left: `${spot.x}%`,
    top: `${spot.y}%`,
    width: `${spot.w}%`,
    aspectRatio: `1 / ${shape}`,
    transform: "translate(-50%, -50%)",
  }
}

/** A paper being pinned onto the cork: it lands from slightly above and settles at its angle. */
export function drop(spot: Spot, lit: boolean, reduce: boolean, delay: number) {
  return {
    initial: reduce ? { opacity: 0, rotate: spot.r } : { opacity: 0, scale: 1.14, rotate: spot.r + 7, y: "-6%" },
    animate: lit ? { opacity: 1, scale: 1, rotate: spot.r, y: "0%" } : undefined,
    transition: { duration: reduce ? 0.3 : 0.6, delay: reduce ? 0 : delay, ease: EASE },
  }
}
