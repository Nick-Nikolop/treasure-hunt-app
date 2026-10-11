"use client"

import Image from "next/image"
import { motion, useScroll } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import { ClueProvider, ClueTracker } from "./clues"
import { ColdOpen } from "./cold-open"
import { LANDING_COPY } from "./copy"
import { FilmSequence } from "./film-sequence"
import { FlashlightHero } from "./flashlight-hero"
import { ALT_LOGO, DEFAULT_LOGO, LogoContext } from "./logo-context"
import { ClosingSection, CodeSection, FaqSection, HowSection, MissionsSection, StorySection, WhySection } from "./sections"

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const PRELOAD_IMAGES = [
  "/landing/logo.webp",
  "/landing/logo-alt.webp",
  "/landing/hero-city.webp",
  "/landing/film-street.webp",
  "/landing/film-building.webp",
  "/landing/film-square.webp",
  "/landing/scene-mission.webp",
  "/landing/scene-team.webp",
  "/landing/scene-clue.webp",
  "/landing/scene-finale.webp",
]

export function LandingPage() {
  const { locale, toggle } = useI18n()
  const copy = LANDING_COPY[locale]
  const [heroTake, setHeroTake] = useState(0)
  const [altLogo, setAltLogo] = useState(false)
  const logoClicks = useRef<number[]>([])
  const logoSrc = altLogo ? ALT_LOGO : DEFAULT_LOGO
  const { scrollYProgress } = useScroll()

  useEffect(() => {
    const decoded = PRELOAD_IMAGES.map((src) => {
      const img = new window.Image()
      img.decoding = "async"
      img.src = src
      img.decode().catch(() => {})
      return img
    })
    return () => {
      decoded.length = 0
    }
  }, [])

  const onLogoClick = () => {
    const now = Date.now()
    logoClicks.current = [...logoClicks.current.filter((t) => now - t < 1500), now]
    if (logoClicks.current.length >= 5) {
      logoClicks.current = []
      setAltLogo((value) => !value)
    }
  }

  return (
    <LogoContext.Provider value={logoSrc}>
    <ClueProvider copy={copy.clues}>
    <div className="dark min-h-svh bg-background text-foreground">
      <ColdOpen skipLabel={copy.intro.skip} onFinish={() => setHeroTake((take) => take + 1)} />
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.07]"
        style={{ backgroundImage: GRAIN }}
        aria-hidden="true"
      />

      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur"
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 md:px-10" aria-label="Main">
          <a
            href="#top"
            onClick={onLogoClick}
            className="flex select-none items-center gap-3 font-serif text-base tracking-[0.35em] text-foreground"
          >
            <Image unoptimized key={logoSrc} src={logoSrc} alt="" width={40} height={39} className="h-auto w-10 animate-in fade-in zoom-in-75 duration-500" priority />
            <span>THE HUNT</span>
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
            <ClueTracker />
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
        <motion.div
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-brass"
          style={{ scaleX: scrollYProgress }}
          aria-hidden="true"
        />
      </header>

      <main id="top">
        <FlashlightHero key={heroTake} copy={copy.hero} />
        <FilmSequence copy={copy.film} />
        <StorySection copy={copy.story} />
        <HowSection copy={copy.how} />
        <WhySection copy={copy.why} who={copy.who} />
        <CodeSection copy={copy.code} />
        <MissionsSection copy={copy.missions} />
        <FaqSection copy={copy.faq} />
        <ClosingSection copy={copy.closing} footer={copy.footer} nav={copy.nav} logoSrc={logoSrc} />
      </main>
    </div>
    </ClueProvider>
    </LogoContext.Provider>
  )
}
