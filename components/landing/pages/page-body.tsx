"use client"

import type { ComponentType } from "react"
import { ClosingEnvelope } from "../blocks/closing-envelope"
import { ClosingMarquee } from "../blocks/closing-marquee"
import { ClosingMinimal } from "../blocks/closing-minimal"
import { ClosingRoute } from "../blocks/closing-route"
import { CodePledge } from "../blocks/code-pledge"
import { FaqCards } from "../blocks/faq-cards"
import { FaqChat } from "../blocks/faq-chat"
import { FaqIndex } from "../blocks/faq-index"
import { FaqOpen } from "../blocks/faq-open"
import { HowAccordion } from "../blocks/how-accordion"
import { MissionsBoard } from "../blocks/missions-board"
import { WhatIs } from "../blocks/what-is"
import { WhyBoard } from "../blocks/why-board"
import type { LandingCopy } from "../copy"
import {
  ClosingSection,
  CodeSection,
  FaqSection,
  MissionsSection,
  SiteFooter,
  WhySection,
} from "../sections"
import { useVariant } from "../variants"
import { DossierCode, DossierMissions, DossierWhy } from "./dossier"
import { MapCode, MapMissions, MapWhy } from "./map"
import { NightCode, NightMissions, NightWhy } from "./night"

type WhyProps = { copy: LandingCopy["why"]; who: LandingCopy["who"] }

const WHY: Record<string, ComponentType<WhyProps>> = {
  dossier: DossierWhy,
  night: NightWhy,
  board: WhyBoard,
  map: MapWhy,
  current: WhySection,
}
const CODE: Record<string, ComponentType<{ copy: LandingCopy["code"] }>> = {
  dossier: DossierCode,
  night: NightCode,
  pledge: CodePledge,
  map: MapCode,
  current: CodeSection,
}
const MISSIONS: Record<string, ComponentType<{ copy: LandingCopy["missions"] }>> = {
  dossier: DossierMissions,
  night: NightMissions,
  board: MissionsBoard,
  map: MapMissions,
  current: MissionsSection,
}
const FAQ: Record<string, ComponentType<{ copy: LandingCopy["faq"] }>> = {
  current: FaqSection,
  chat: FaqChat,
  cards: FaqCards,
  index: FaqIndex,
  open: FaqOpen,
}
const CLOSING: Record<string, ComponentType<{ copy: LandingCopy["closing"] }>> = {
  current: ClosingSection,
  envelope: ClosingEnvelope,
  route: ClosingRoute,
  marquee: ClosingMarquee,
  minimal: ClosingMinimal,
}

/** Everything below the hero; each section renders the variant picked for it. */
export function PageBody({ copy }: { copy: LandingCopy }) {
  const whatVariant = useVariant("what")
  const Why = WHY[useVariant("why")] ?? DossierWhy
  const Code = CODE[useVariant("code")] ?? DossierCode
  const Missions = MISSIONS[useVariant("missions")] ?? DossierMissions
  const Faq = FAQ[useVariant("faq")] ?? FaqSection
  const Closing = CLOSING[useVariant("closing")] ?? ClosingSection

  return (
    <>
      <WhatIs copy={copy.what} variant={whatVariant} />
      <HowAccordion copy={copy.how} />
      <Why copy={copy.why} who={copy.who} />
      <Code copy={copy.code} />
      <Missions copy={copy.missions} />
      <Faq copy={copy.faq} />
      <Closing copy={copy.closing} />
      <SiteFooter footer={copy.footer} nav={copy.nav} />
    </>
  )
}
