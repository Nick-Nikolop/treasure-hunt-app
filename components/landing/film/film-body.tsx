"use client"

import type { LandingCopy } from "../copy"
import { FilmSequence } from "../film-sequence"
import { useVariant } from "../variants"
import { FilmPostcards } from "./film-postcards"
import { FilmSpotlight } from "./film-spotlight"
import { FilmTriptych } from "./film-triptych"

export function FilmBody({ copy }: { copy: LandingCopy["film"] }) {
  const variant = useVariant("film")
  if (variant === "spotlight") return <FilmSpotlight copy={copy} />
  if (variant === "triptych") return <FilmTriptych copy={copy} />
  if (variant === "current") return <FilmSequence copy={copy} />
  return <FilmPostcards copy={copy} />
}
