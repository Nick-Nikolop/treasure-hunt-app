"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_CONTACT, LANDING_COPY } from "@/components/landing/copy"
import { cn } from "@/lib/utils"
import { Billboard } from "./billboard"
import { REEL_COPY, type ModalId } from "./copy"
import { DetailModal } from "./detail-modal"
import { HowSection } from "./episodes"
import { Faq, Footer } from "./finale"
import { Intro } from "./intro"
import { HuntsRow, TopThree, WhyRow } from "./rows"
import { ClosingBanner, CodeSection, WhatSection } from "./spotlights"

export function Landing2Page() {
  const { locale, toggle } = useI18n()
  const copy = LANDING_COPY[locale]
  const reel = REEL_COPY[locale]
  const [ready, setReady] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [modal, setModal] = useState<ModalId | null>(null)

  const notifyHref = `mailto:${LANDING_CONTACT.email}?subject=${encodeURIComponent(reel.signup.subject)}`

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeModal = useCallback(() => setModal(null), [])
  const explore = useCallback(() => {
    setModal(null)
    requestAnimationFrame(() => document.getElementById("hunts")?.scrollIntoView({ behavior: "smooth" }))
  }, [])

  const navLinks = [
    { href: "#top", label: reel.nav.home },
    { href: "#hunts", label: reel.nav.hunts },
    { href: "#how", label: reel.nav.how },
    { href: "#faq", label: reel.nav.faq },
  ]

  return (
    <div className="min-h-svh overflow-x-clip bg-reel font-sans text-reel-white">
      <Intro onDone={() => setReady(true)} skipLabel={reel.intro.skip} />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-500",
          scrolled ? "bg-reel" : "bg-linear-to-b from-reel/80 to-transparent",
        )}
      >
        <nav aria-label={reel.nav.label} className="flex h-16 items-center gap-6 px-5 md:h-[4.5rem] md:gap-10 md:px-14">
          <a href="#top" className="flex shrink-0 items-center gap-2.5">
            <Image unoptimized src="/landing/logo.webp" alt="" width={34} height={33} className="h-auto w-8 md:w-9" priority />
            <span className="font-serif text-xl font-black tracking-[0.12em] text-brass md:text-2xl">THE HUNT</span>
          </a>
          <ul className="hidden items-center gap-5 text-base lg:flex">
            {navLinks.map((link, index) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={cn("transition hover:text-reel-mute", index === 0 ? "font-bold text-reel-white" : "text-reel-white/85")}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={toggle}
              aria-label={copy.langLabel}
              className="rounded-sm border border-reel-white/40 px-2.5 py-1 text-sm font-bold tracking-wider text-reel-white hover:border-reel-white"
            >
              {copy.lang}
            </button>
            <a href={notifyHref} className="rounded-sm bg-reel-red px-3 py-1.5 text-sm font-bold text-reel-white hover:bg-reel-red/85 md:px-4">
              {reel.nav.cta}
            </a>
          </div>
        </nav>
      </header>

      <main>
        <Billboard
          ready={ready}
          hero={copy.hero}
          film={copy.film}
          reel={reel.billboard}
          onExplore={explore}
          onMore={() => setModal("show")}
        />
        <div className="flex flex-col gap-24 py-20 md:gap-32 md:py-28">
          <WhatSection what={copy.what} reel={reel} />
          <HuntsRow missions={copy.missions} reel={reel} notifyHref={notifyHref} onOpen={setModal} />
        </div>
        <TopThree missions={copy.missions} reel={reel} />
        <div className="flex flex-col gap-24 py-20 md:gap-32 md:py-28">
          <HowSection how={copy.how} reel={reel} />
          <WhyRow why={copy.why} reel={reel} />
          <CodeSection who={copy.who} code={copy.code} />
        </div>
        <Faq faq={copy.faq} reel={reel} />
        <ClosingBanner
          closing={copy.closing}
          line={reel.signup.line}
          cta={reel.signup.cta}
          notifyHref={notifyHref}
          onExplore={explore}
        />
      </main>

      <Footer copy={copy} reel={reel} onToggleLocale={toggle} />

      <DetailModal open={modal} onClose={closeModal} onExplore={explore} copy={copy} reel={reel} notifyHref={notifyHref} />
    </div>
  )
}
