"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_COPY } from "@/components/landing/copy"
import { PageLoader } from "@/components/landing/page-loader"
import { cn } from "@/lib/utils"
import { LANDING2_COPY } from "./copy"
import { Closing, Faq, Footer } from "./finale"
import { Missions } from "./missions"
import { PhoneClue } from "./phone-clue"
import { RouteSteps } from "./route-steps"
import { Equation, Manifesto } from "./story"
import { TorchHero } from "./torch-hero"

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const PRELOAD = ["/landing/old-map.webp", "/landing/logo.webp", "/landing/scene-clue.webp"]

export function Landing2Page() {
  const { locale, toggle } = useI18n()
  const copy = LANDING_COPY[locale]
  const extra = LANDING2_COPY[locale]
  const [loaded, setLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    PRELOAD.forEach((src) => {
      const img = new window.Image()
      img.src = src
      img.decode().catch(() => {})
    })
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <PageLoader label={copy.intro.loading} onDone={() => setLoaded(true)} />
      <div className="pointer-events-none fixed inset-0 z-30 opacity-[0.06]" style={{ backgroundImage: GRAIN }} aria-hidden="true" />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-500",
          scrolled ? "border-border/60 bg-background/85 backdrop-blur" : "border-transparent bg-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 md:px-10" aria-label="Main">
          <a href="#top" className="flex items-center gap-3 font-serif text-sm tracking-[0.3em] text-foreground md:text-base">
            <Image unoptimized src="/landing/logo.webp" alt="" width={36} height={35} className="h-auto w-9" priority />
            THE HUNT
          </a>
          <div className="flex items-center gap-4 font-sans text-sm md:gap-7">
            <a href="#how" className="hidden text-foreground/75 hover:text-brass md:inline">{copy.nav.how}</a>
            <a href="#missions" className="hidden text-foreground/75 hover:text-brass md:inline">{copy.nav.missions}</a>
            <a href="#faq" className="hidden text-foreground/75 hover:text-brass md:inline">{copy.nav.faq}</a>
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
        {loaded ? <TorchHero copy={copy.hero} extra={extra} /> : <div className="min-h-svh" aria-hidden="true" />}
        <Manifesto story={copy.story} />
        <Equation what={copy.what} />
        <RouteSteps how={copy.how} />
        <PhoneClue what={copy.what} who={copy.who} extra={extra} />
        <Missions missions={copy.missions} />
        <Faq faq={copy.faq} extra={extra} />
        <Closing closing={copy.closing} />
      </main>
      <Footer footer={copy.footer} nav={copy.nav} />
    </div>
  )
}
