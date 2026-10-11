"use client"

import { Check, SlidersHorizontal } from "lucide-react"
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react"
import type { Locale } from "@/lib/i18n"

const STORAGE_KEY = "thehunt:landing-variants"

type Option = { id: string; label: Record<Locale, string> }
type SectionDef = { id: string; label: Record<Locale, string>; options: Option[] }

/** Every landing section, in page order. Sections with one option are listed but not switchable yet. */
export const SECTIONS: SectionDef[] = [
  {
    id: "hero",
    label: { el: "Hero", en: "Hero" },
    options: [
      { id: "widescreen", label: { el: "Κινηματογραφικό κάδρο", en: "Widescreen frame" } },
      { id: "desk", label: { el: "Το γραφείο", en: "The desk" } },
      { id: "letters", label: { el: "Μέσα από τα γράμματα", en: "Through the letters" } },
    ],
  },
  { id: "film", label: { el: "Πλάνα", en: "Film" }, options: [] },
  { id: "story", label: { el: "Η ιδέα", en: "The idea" }, options: [] },
  { id: "how", label: { el: "Πώς παίζεται", en: "How it works" }, options: [] },
  { id: "why", label: { el: "Γιατί", en: "Why" }, options: [] },
  { id: "code", label: { el: "Ο κώδικας", en: "The code" }, options: [] },
  { id: "missions", label: { el: "Αποστολές", en: "Hunts" }, options: [] },
  { id: "faq", label: { el: "Ερωτήσεις", en: "FAQ" }, options: [] },
  { id: "closing", label: { el: "Κλείσιμο", en: "Closing" }, options: [] },
]

type Choices = Record<string, string>

const DEFAULTS: Choices = Object.fromEntries(SECTIONS.filter((s) => s.options.length).map((s) => [s.id, s.options[0].id]))

const VariantContext = createContext<{ choices: Choices; choose: (section: string, option: string) => void }>({
  choices: DEFAULTS,
  choose: () => {},
})

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

  const choose = (section: string, option: string) => {
    setChoices((current) => {
      const next = { ...current, [section]: option }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return <VariantContext.Provider value={{ choices, choose }}>{children}</VariantContext.Provider>
}

export function useVariant(section: string) {
  return useContext(VariantContext).choices[section]
}

const LABELS = {
  el: { button: "Παραλλαγές", title: "Παραλλαγές ενοτήτων", soon: "Μία εκδοχή" },
  en: { button: "Variants", title: "Section variants", soon: "One version" },
}

export function VariantMenu({ locale }: { locale: Locale }) {
  const { choices, choose } = useContext(VariantContext)
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
        <div className="absolute right-0 top-full mt-3 w-72 max-w-[calc(100vw-2rem)] border border-border bg-background/95 p-2 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="px-3 pb-2 pt-1 font-sans text-[11px] uppercase tracking-[0.3em] text-brass">{t.title}</p>
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
