"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggle, t } = useI18n()
  const [mounted, setMounted] = useState(false)

  // Avoid any hydration mismatch on the active-state styling.
  useEffect(() => setMounted(true), [])

  const label = locale === "el" ? t.lang.toggleToEn : t.lang.toggleToEl

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center gap-1 rounded-sm border border-border px-2 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass ${className}`}
    >
      <span
        className={
          mounted && locale === "el" ? "text-brass" : "text-muted-foreground"
        }
      >
        EL
      </span>
      <span aria-hidden className="text-border">
        /
      </span>
      <span
        className={
          mounted && locale === "en" ? "text-brass" : "text-muted-foreground"
        }
      >
        EN
      </span>
    </button>
  )
}
