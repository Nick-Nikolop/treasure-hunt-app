"use client"

import { HeroDesk } from "./hero-desk"
import type { HeroCopy } from "./shared"

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  return <HeroDesk key={take} copy={copy} />
}
