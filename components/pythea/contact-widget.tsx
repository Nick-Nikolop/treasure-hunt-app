"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Instagram, LifeBuoy, X } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { LEGAL_ORG } from "@/lib/legal"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/**
 * Floating "need help?" widget, rendered on every page from the root layout.
 *
 * There is no support inbox to build here: every question goes to the hunt's
 * Instagram DMs, so the panel is deliberately small (one line of copy + one
 * outbound row) rather than a contact form.
 *
 * POSITION: bottom-LEFT on purpose. The bottom-right corner is already taken
 * on two pages - the register `FloatingCta` (`md:right-8 bottom-8`, z-40) on
 * the landing page and `ClueControls` (`bottom-4 right-4`, z-50) in the
 * journal - so anchoring right would overlap both.
 *
 * z-35 is deliberate: `Atmosphere` paints a full-screen vignette at z-30, so
 * z-30 here would depend on DOM order to stay visible. It stays UNDER the
 * grain film (z-40) so it gets the same texture as the rest of the page, and
 * well under the cookie banner and notification modals (z-70).
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
    <div className="fixed bottom-24 left-5 z-[35] flex flex-col items-start gap-2.5 md:bottom-5 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id="contact-widget-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="contact-widget-title"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "bottom left" }}
            className="relative w-[min(84vw,19rem)] overflow-hidden rounded-md border border-brass/35 bg-card shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
          >
            <div className="grain-layer pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

            {/* Header band, same vocabulary as the how-to-play modal. */}
            <div className="relative flex items-center gap-2.5 border-b border-brass/20 bg-brass/[0.07] px-3.5 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-brass/45 bg-brass/10">
                <LifeBuoy className="size-3.5 text-brass" />
              </span>
              <h2
                id="contact-widget-title"
                className="flex-1 font-sans text-[10px] font-bold tracking-chip text-brass"
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
                className="-mr-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-brass/10 hover:text-brass"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="relative p-3.5">
              <p className="font-serif text-[13.5px] leading-relaxed text-muted-foreground">
                {t.contact.lede}
              </p>

              {/* Outbound row rather than a flat button: the icon square + handle
                  matches the site's existing list-row treatment. */}
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
                className="group mt-3 flex items-center gap-3 rounded-sm border border-brass/30 bg-brass/[0.06] p-2.5 transition-colors hover:border-brass/70 hover:bg-brass/[0.12]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-brass/45 bg-brass/10 transition-transform duration-500 group-hover:-rotate-6">
                  <Instagram className="size-4 text-brass" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[11px] font-bold tracking-chip text-brass">
                    {t.contact.cta}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-[12.5px] text-muted-foreground">
                    {t.contact.handle}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-brass/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brass" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="contact-widget-panel"
        className="group inline-flex items-center gap-2 rounded-full border border-brass/45 bg-card/95 py-2 pl-2 pr-2 font-sans text-[11px] font-bold tracking-chip text-brass shadow-[0_12px_30px_-8px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-brass hover:bg-card sm:pr-4"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10">
          {open ? (
            <X className="size-3.5" />
          ) : (
            <LifeBuoy className="size-3.5 transition-transform duration-700 group-hover:rotate-180" />
          )}
        </span>
        {/* Label is icon-only below `sm` so it cannot crowd a phone screen. */}
        <span className="hidden sm:inline">{t.contact.open}</span>
        <span className="sr-only sm:hidden">{t.contact.open}</span>
      </button>
    </div>
  )
}
