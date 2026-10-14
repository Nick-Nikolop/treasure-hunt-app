"use client"

import { useVariant } from "../variants"
import { HeroDeskLine } from "./hero-desk-more"
import { HeroBand, HeroFramed, HeroHalf, HeroTwoThirds } from "./hero-desk-layouts"
import { HeroPythea, HeroPytheaSpotlight } from "./hero-pythea"
import type { HeroCopy } from "./shared"

const HEROES = {
  "desk-line": HeroDeskLine,
  half: HeroHalf,
  "two-thirds": HeroTwoThirds,
  band: HeroBand,
  framed: HeroFramed,
  pythea: HeroPythea,
  "pythea-spot": HeroPytheaSpotlight,
}

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero") as keyof typeof HEROES
  const Chosen = HEROES[variant] ?? HeroDeskLine
  return <Chosen key={`${variant}-${take}`} copy={copy} />
}
