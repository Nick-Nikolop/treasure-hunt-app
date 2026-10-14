"use client"

import { HeroDeskLine } from "./hero-desk-more"
import type { HeroCopy } from "./shared"

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  return <HeroDeskLine key={take} copy={copy} />
}
