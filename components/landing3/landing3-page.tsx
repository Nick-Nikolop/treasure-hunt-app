"use client"

import { useCallback, useRef, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"
import { LANDING_CONTACT } from "@/components/landing/copy"
import { TRAIL_COPY } from "./copy"
import { Deck } from "./deck"
import { Closing, Faq } from "./finale"
import { Header } from "./header"
import { Hero } from "./hero"
import { InkTrail } from "./ink-trail"
import { Keepers } from "./keepers"
import { Loader } from "./loader"
import { FirstStatement, SecondStatement } from "./story"

export function Landing3Page() {
  const { locale, toggle } = useI18n()
  const copy = TRAIL_COPY[locale]
  const [ready, setReady] = useState(false)
  const trailRef = useRef<HTMLDivElement>(null)
  const finish = useCallback(() => setReady(true), [])
  const notifyHref = `mailto:${LANDING_CONTACT.email}?subject=${encodeURIComponent(copy.closing.subject)}`

  return (
    <>
      {!ready && <Loader copy={copy.loader} onDone={finish} />}
      <Header copy={copy} onToggleLocale={toggle} />
      <main>
        <Hero copy={copy.hero} ready={ready} />
        <div ref={trailRef} className="relative">
          <InkTrail target={trailRef} />
          <FirstStatement copy={copy} />
          <SecondStatement copy={copy} />
          <Keepers copy={copy.keepers} notifyHref={notifyHref} />
          <Deck copy={copy.deck} />
          <Faq copy={copy.faq} />
        </div>
      </main>
      <Closing copy={copy.closing} nav={copy.nav} lat={copy.lat} lng={copy.lng} />
    </>
  )
}
