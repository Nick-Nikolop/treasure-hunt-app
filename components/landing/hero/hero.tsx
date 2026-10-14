"use client"

import { useVariant } from "../variants"
import { HeroDesk } from "./hero-desk"
import { HeroDeskBookends, HeroDeskSplit } from "./hero-desk-edges"
import { HeroDeskBand, HeroDeskCenter } from "./hero-desk-layouts"
import type { HeroCopy } from "./shared"

const LAYOUTS = {
  desk: HeroDesk,
  center: HeroDeskCenter,
  split: HeroDeskSplit,
  band: HeroDeskBand,
  bookends: HeroDeskBookends,
}

export function Hero({ copy, take }: { copy: HeroCopy; take: number }) {
  const variant = useVariant("hero") as keyof typeof LAYOUTS
  const Layout = LAYOUTS[variant] ?? HeroDesk
  return <Layout key={`${variant}-${take}`} copy={copy} />
}
