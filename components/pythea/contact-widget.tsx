"use client"

import { useEffect, useRef, useState } from "react"
import { Instagram, LifeBuoy, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { LEGAL_ORG } from "@/lib/legal"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/**
 * Floating "need help?" widget, rendered on every page from the root layout.
 *
 * There is no support inbox to build here: every question goes to the hunt's
 * Instagram DMs, so the panel is deliberately tiny (one line of copy + one
 * outbound link) rather than a contact form.
 *
 * POSITION: bottom-LEFT on purpose. The bottom-right corner is already taken
 * on two pages - the register `FloatingCta` (`md:right-8 bottom-8`, z-40) on
 * the landing page and `ClueControls` (`bottom-4 right-4`, z-50) in the
 * journal - so anchoring right would overlap both. z-30 keeps it under the
 * cookie banner and notification modals (z-70), which must stay clickable.
 */
export function ContactWidget() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Escape closes, and focus returns to the trigger so keyboard users are not
  // dropped back at the top of the document.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    // A click anywhere outside dismisses it, matching the site's other popovers.
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  return (
    /* Sits higher on MOBILE: the landing page's register CTA is full-width
       (`inset-x-5 bottom-5`) below `md`, so `bottom-5` here would be buried
       underneath it. From `md` up that CTA collapses to the right corner and
       the normal bottom-left spot is free. */
    <div className="fixed bottom-24 left-5 z-30 flex flex-col items-start gap-2 md:bottom-5 print:hidden">
      {open && (
        <div
          ref={panelRef}
          id="contact-widget-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="contact-widget-title"
          className="w-[min(80vw,17.5rem)] rounded-sm border border-brass/45 bg-card/95 p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id="contact-widget-title"
              className="font-sans text-xs font-bold tracking-chip text-brass"
            >
              {t.contact.title}
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              aria-label={t.contact.close}
              className="-m-1 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <p className="mt-2 font-serif text-[13px] leading-relaxed text-muted-foreground">
            {t.contact.lede}
          </p>

          <a
            href={LEGAL_ORG.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track(
                EV.ctaClick,
                { id: "contact_instagram", location: "contact_widget" },
                { category: "cta" },
              )
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-3 py-2.5 font-sans text-[11px] font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Instagram className="size-3.5 shrink-0" />
            {t.contact.cta}
          </a>

          <p className="mt-2 text-center font-sans text-[11px] text-muted-foreground">
            {t.contact.handle}
          </p>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="contact-widget-panel"
        // The label is icon-only below `sm` so it cannot crowd a phone screen.
        className="inline-flex items-center gap-2 rounded-full border border-brass/50 bg-card/95 px-3 py-2.5 font-sans text-[11px] font-bold tracking-chip text-brass shadow-xl backdrop-blur-md transition-colors hover:border-brass hover:bg-card sm:px-4"
      >
        {open ? <X className="size-4 shrink-0" /> : <LifeBuoy className="size-4 shrink-0" />}
        <span className="hidden sm:inline">{t.contact.open}</span>
        <span className="sr-only sm:hidden">{t.contact.open}</span>
      </button>
    </div>
  )
}
