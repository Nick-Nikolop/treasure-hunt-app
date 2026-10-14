"use client"

import { useVariant } from "../variants"
import { HeroDeskLine } from "./hero-desk-more"
import { HeroLit, HeroMarker, HeroRotate, HeroTyped } from "./hero-desk-texts"
import type { HeroCopy } from "./shared"

const HEROES = {
  "desk-line": HeroDeskLine,
  typed: HeroTyped,
  rotate: HeroRotate,
  lit: HeroLit,
  marker: HeroMarker,
}

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero") as keyof typeof HEROES
  const Chosen = HEROES[variant] ?? HeroDeskLine
  return <Chosen key={`${variant}-${take}`} copy={copy} />
}
