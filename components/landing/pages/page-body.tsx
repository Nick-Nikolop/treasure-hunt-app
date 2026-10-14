"use client"

import type { LandingCopy } from "../copy"
import { ClosingSection, CodeSection, FaqSection, HowSection, MissionsSection, StorySection, WhySection } from "../sections"
import { useVariant } from "../variants"
import { DossierBody } from "./dossier"
import { MapBody } from "./map"
import { NightBody } from "./night"

/** Everything between the film and the footer, chosen by the "Whole page" variant. */
export function PageBody({ copy, logoSrc }: { copy: LandingCopy; logoSrc: string }) {
  const page = useVariant("page")
  const closing = <ClosingSection copy={copy.closing} footer={copy.footer} nav={copy.nav} logoSrc={logoSrc} />

  if (page === "night") {
    return (
      <>
        <NightBody copy={copy} />
        <FaqSection copy={copy.faq} />
        {closing}
      </>
    )
  }

  if (page === "map") {
    return (
      <>
        <MapBody copy={copy} />
        {closing}
      </>
    )
  }

  if (page === "current") {
    return (
      <>
        <StorySection copy={copy.story} />
        <HowSection copy={copy.how} />
        <WhySection copy={copy.why} who={copy.who} />
        <CodeSection copy={copy.code} />
        <MissionsSection copy={copy.missions} />
        <FaqSection copy={copy.faq} />
        {closing}
      </>
    )
  }

  return (
    <>
      <DossierBody copy={copy} />
      <FaqSection copy={copy.faq} />
      {closing}
    </>
  )
}
