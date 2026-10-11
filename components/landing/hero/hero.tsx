"use client"

import { useVariant } from "../variants"
import { HeroDesk } from "./hero-desk"
import { HeroLetters } from "./hero-letters"
import { HeroWidescreen } from "./hero-widescreen"
import type { HeroCopy } from "./shared"

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero")
  const key = `${variant}-${take}`
  if (variant === "desk") return <HeroDesk key={key} copy={copy} />
  if (variant === "letters") return <HeroLetters key={key} copy={copy} />
  return <HeroWidescreen key={key} copy={copy} />
}
