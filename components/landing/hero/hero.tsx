"use client"

import { useVariant } from "../variants"
import { HeroDeskCenter } from "./hero-desk-center"
import { HeroDeskLine } from "./hero-desk-more"
import { HeroMap } from "./hero-map"
import { HeroPhoto } from "./hero-photo"
import { HeroSplit } from "./hero-split"
import type { HeroCopy } from "./shared"

const HEROES = {
  "desk-line": HeroDeskLine,
  "desk-center": HeroDeskCenter,
  photo: HeroPhoto,
  map: HeroMap,
  split: HeroSplit,
}

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero") as keyof typeof HEROES
  const Chosen = HEROES[variant] ?? HeroDeskLine
  return <Chosen key={`${variant}-${take}`} copy={copy} />
}
