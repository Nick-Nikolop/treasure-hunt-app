"use client"

import { Check, RotateCcw, Shuffle, SlidersHorizontal } from "lucide-react"
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react"
import type { Locale } from "@/lib/i18n"

const STORAGE_KEY = "thehunt:landing-variants"

type Option = { id: string; label: Record<Locale, string> }
type SectionDef = { id: string; label: Record<Locale, string>; options: Option[] }

const o = (id: string, el: string, en: string): Option => ({ id, label: { el, en } })

/** Every landing section, in page order. Each one is chosen independently so they can be mixed and matched. */
export const SECTIONS: SectionDef[] = [
  {
    id: "hero",
    label: { el: "Hero", en: "Hero" },
    options: [
      o("desk-line", "Γραφείο · τίτλος κάτω", "Desk · title at the bottom"),
      o("half", "Μισό-μισό · εικόνα δεξιά", "Half and half · image right"),
      o("two-thirds", "Εικόνα 2/3 · κείμενο στο πλάι", "Image 2/3 · text column"),
      o("band", "Εικόνα πάνω · κείμενο κάτω", "Image band · text below"),
      o("framed", "Κάδρο · τίτλος πάνω στην εικόνα", "Framed · title over the edge"),
      o("pythea", "Κεντραρισμένο · όπως το Πυθέα", "Centred · Pythea style"),
      o("pythea-spot", "Κεντραρισμένο · με προβολέα", "Centred · with spotlight"),
    ],
  },
  {
    id: "what",
    label: { el: "Τι είναι", en: "What it is" },
    options: [],
  },
  {
    id: "why",
    label: { el: "Γιατί", en: "Why" },
    options: [
      o("dossier", "Πλέγμα σε χαρτί", "Grid on paper"),
      o("night", "Μεγάλες γραμμές", "Oversized lines"),
      o("board", "Πίνακας με σημειώσεις", "Evidence board"),
      o("map", "Με εικονίδια σε χαρτί", "Icons on paper"),
      o("current", "Δύο στήλες", "Two columns"),
    ],
  },
  {
    id: "code",
    label: { el: "Ο κώδικας", en: "The code" },
    options: [
      o("dossier", "Μανιφέστο", "Manifesto"),
      o("night", "Χρυσή λωρίδα", "Brass band"),
      o("pledge", "Όρκος με σφραγίδα", "Sealed pledge"),
      o("map", "Μελάνι σε χαρτί", "Ink plate on paper"),
      o("current", "Κάρτα", "Card"),
    ],
  },
  {
    id: "faq",
    label: { el: "Ερωτήσεις", en: "FAQ" },
    options: [
      o("current", "Λίστα που ανοίγει", "Accordion list"),
      o("chat", "Ανάκριση · συνομιλία", "Interrogation · chat"),
      o("cards", "Κάρτες που γυρίζουν", "Flip cards"),
      o("index", "Ευρετήριο", "Index"),
      o("open", "Όλα ανοιχτά σε χαρτί", "All open on paper"),
    ],
  },
  {
    id: "closing",
    label: { el: "Κλείσιμο", en: "Closing" },
    options: [
      o("current", "Φωτογραφία & λογότυπο", "Photo & logo"),
      o("envelope", "Γράμμα από φάκελο", "Letter from an envelope"),
      o("route", "Διαδρομή στον χάρτη", "Route on the map"),
      o("marquee", "Χρυσή λωρίδα που κυλά", "Scrolling brass band"),
      o("minimal", "Μόνο τυπογραφία", "Type only"),
    ],
  },
]

type Choices = Record<string, string>

const DEFAULTS: Choices = Object.fromEntries(SECTIONS.filter((s) => s.options.length).map((s) => [s.id, s.options[0].id]))

const VariantContext = createContext<{
  choices: Choices
  choose: (section: string, option: string) => void
  shuffle: () => void
  reset: () => void
}>({ choices: DEFAULTS, choose: () => {}, shuffle: () => {}, reset: () => {} })

export function VariantProvider({ children }: { children: ReactNode }) {
  const [choices, setChoices] = useState<Choices>(DEFAULTS)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Choices
      const valid = Object.fromEntries(
        Object.entries(saved).filter(([section, option]) =>
          SECTIONS.find((s) => s.id === section)?.options.some((o) => o.id === option),
        ),
      )
      setChoices({ ...DEFAULTS, ...valid })
    } catch {}
  }, [])

  const save = (next: Choices) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }
  const choose = (section: string, option: string) => setChoices((current) => save({ ...current, [section]: option }))
  const shuffle = () =>
    setChoices(() =>
      save(Object.fromEntries(SECTIONS.map((s) => [s.id, s.options[Math.floor(Math.random() * s.options.length)].id]))),
    )
  const reset = () => setChoices(() => save(DEFAULTS))

  return <VariantContext.Provider value={{ choices, choose, shuffle, reset }}>{children}</VariantContext.Provider>
}

export function useVariant(section: string) {
  return useContext(VariantContext).choices[section]
}

const LABELS = {
  el: { button: "Παραλλαγές", title: "Ενότητες", soon: "Μία εκδοχή", shuffle: "Τυχαίο", reset: "Επαναφορά" },
  en: { button: "Variants", title: "Sections", soon: "One version", shuffle: "Shuffle", reset: "Reset" },
}

export function VariantMenu({ locale }: { locale: Locale }) {
  const { choices, choose, shuffle, reset } = useContext(VariantContext)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const t = LABELS[locale]

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full border border-foreground/30 px-3 py-1 font-sans text-xs text-foreground hover:border-brass hover:text-brass"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t.button}</span>
        <span className="sr-only sm:hidden">{t.button}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] border border-border bg-background/95 p-2 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
            <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-brass">{t.title}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={shuffle}
                className="flex items-center gap-1.5 rounded-full border border-foreground/20 px-2.5 py-1 font-sans text-xs text-foreground/80 hover:border-brass hover:text-brass"
              >
                <Shuffle className="size-3" aria-hidden="true" />
                {t.shuffle}
              </button>
              <button
                type="button"
                onClick={reset}
                aria-label={t.reset}
                title={t.reset}
                className="flex size-7 items-center justify-center rounded-full border border-foreground/20 text-foreground/80 hover:border-brass hover:text-brass"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex max-h-[70svh] flex-col overflow-y-auto">
            {SECTIONS.map((section) => (
              <div key={section.id} className="flex flex-col border-t border-border/60 py-2 first:border-t-0">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="font-sans text-sm text-foreground">{section.label[locale]}</span>
                  {!section.options.length && <span className="font-sans text-xs text-muted-foreground">{t.soon}</span>}
                </div>
                {section.options.map((option, index) => {
                  const active = choices[section.id] === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => choose(section.id, option.id)}
                      className={`flex items-center gap-3 px-3 py-2 text-left font-sans text-sm transition-colors ${active ? "bg-brass/10 text-brass" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"}`}
                    >
                      <span className="w-4 font-serif text-xs italic text-muted-foreground">{String.fromCharCode(65 + index)}</span>
                      <span className="flex-1">{option.label[locale]}</span>
                      {active && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
