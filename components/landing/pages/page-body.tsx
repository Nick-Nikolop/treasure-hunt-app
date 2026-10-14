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
import { StoryOneLine } from "../blocks/story-oneline"
import { WhyBoard } from "../blocks/why-board"
import type { LandingCopy } from "../copy"
import {
  ClosingSection,
  CodeSection,
  FaqSection,
  HowSection,
  MissionsSection,
  SiteFooter,
  StorySection,
  WhySection,
} from "../sections"
import { useVariant } from "../variants"
import { DossierCode, DossierHow, DossierMissions, DossierStory, DossierWhy } from "./dossier"
import { MapCode, MapHow, MapMissions, MapStory, MapWhy } from "./map"
import { NightCode, NightHow, NightMissions, NightStory, NightWhy } from "./night"

type WhyProps = { copy: LandingCopy["why"]; who: LandingCopy["who"] }

const STORY: Record<string, ComponentType<{ copy: LandingCopy["story"] }>> = {
  dossier: DossierStory,
  night: NightStory,
  oneline: StoryOneLine,
  map: MapStory,
  current: StorySection,
}
const HOW: Record<string, ComponentType<{ copy: LandingCopy["how"] }>> = {
  dossier: DossierHow,
  night: NightHow,
  accordion: HowAccordion,
  map: MapHow,
  current: HowSection,
}
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

/** Everything between the film and the end of the page; each section renders the variant picked for it. */
export function PageBody({ copy }: { copy: LandingCopy }) {
  const Story = STORY[useVariant("story")] ?? DossierStory
  const How = HOW[useVariant("how")] ?? DossierHow
  const Why = WHY[useVariant("why")] ?? DossierWhy
  const Code = CODE[useVariant("code")] ?? DossierCode
  const Missions = MISSIONS[useVariant("missions")] ?? DossierMissions
  const Faq = FAQ[useVariant("faq")] ?? FaqSection
  const Closing = CLOSING[useVariant("closing")] ?? ClosingSection

  return (
    <>
      <Story copy={copy.story} />
      <How copy={copy.how} />
      <Why copy={copy.why} who={copy.who} />
      <Code copy={copy.code} />
      <Missions copy={copy.missions} />
      <Faq copy={copy.faq} />
      <Closing copy={copy.closing} />
      <SiteFooter footer={copy.footer} nav={copy.nav} />
    </>
  )
}
