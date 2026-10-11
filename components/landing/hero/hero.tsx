"use client"

import { useVariant } from "../variants"
import { HeroBoard } from "./hero-board"
import { HeroCipher } from "./hero-cipher"
import { HeroDesk } from "./hero-desk"
import { HeroEvidence } from "./hero-evidence"
import { HeroLetters } from "./hero-letters"
import { HeroWidescreen } from "./hero-widescreen"
import type { HeroCopy } from "./shared"

const HEROES = {
  widescreen: HeroWidescreen,
  desk: HeroDesk,
  letters: HeroLetters,
  cipher: HeroCipher,
  board: HeroBoard,
  evidence: HeroEvidence,
} as const

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero") as keyof typeof HEROES
  const Component = HEROES[variant] ?? HeroWidescreen
  return <Component key={`${variant}-${take}`} copy={copy} />
}
