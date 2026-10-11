"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_COPY } from "./copy"
import { FlashlightHero } from "./flashlight-hero"
import { ClosingSection, FaqSection, HowSection, MissionsSection, StorySection, WhySection } from "./sections"

export function LandingPage() {
  const { locale, toggle } = useI18n()
  const copy = LANDING_COPY[locale]
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${scrolled ? "border-b border-border/60 bg-background/85 backdrop-blur" : "bg-transparent"}`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 md:px-10" aria-label="Main">
          <a href="#top" className="font-serif text-lg tracking-[0.35em] text-foreground">
            THE HUNT
          </a>
          <div className="flex items-center gap-6 font-sans text-sm">
            <a href="#how" className="hidden text-foreground/75 hover:text-brass md:inline">
              {copy.nav.how}
            </a>
            <a href="#missions" className="hidden text-foreground/75 hover:text-brass md:inline">
              {copy.nav.missions}
            </a>
            <a href="#faq" className="hidden text-foreground/75 hover:text-brass md:inline">
              {copy.nav.faq}
            </a>
            <button
              type="button"
              onClick={toggle}
              aria-label={copy.langLabel}
              className="rounded-full border border-foreground/30 px-3 py-1 text-xs tracking-[0.2em] text-foreground hover:border-brass hover:text-brass"
            >
              {copy.lang}
            </button>
          </div>
        </nav>
      </header>

      <main id="top">
        <FlashlightHero copy={copy.hero} />
        <StorySection copy={copy.story} />
        <HowSection copy={copy.how} />
        <WhySection copy={copy.why} who={copy.who} />
        <MissionsSection copy={copy.missions} />
        <FaqSection copy={copy.faq} />
        <ClosingSection copy={copy.closing} footer={copy.footer} />
      </main>
    </div>
  )
}
