"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Globe, Settings } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Locale } from "@/lib/i18n"

/**
 * Standalone gear dropdown wrapping the theme + language controls. Used on
 * pages that have no account menu (leaderboard, teams) so settings always live
 * inside a dropdown rather than as loose header buttons.
 */
export function SettingsMenu({ className = "" }: { className?: string }) {
  const { t } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.auth.settings}
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-sm border border-border text-muted-foreground outline-none transition-colors hover:border-brass hover:text-brass focus-visible:border-brass data-[state=open]:border-brass ${className}`}
      >
        <Settings className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2 py-1 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
          <Settings className="size-3.5" />
          {t.auth.settings}
        </DropdownMenuLabel>
        <SettingsControls tone="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Theme + language pickers rendered as compact segmented controls. Shared by
 * the account dropdown (desktop) and the mobile menu sheet so settings always
 * live in one calm place instead of standalone header buttons.
 *
 * `tone="menu"` styles for a light dropdown surface; `tone="sheet"` styles for
 * the inline mobile menu. Both stop click propagation so interacting with a
 * control never closes the surrounding menu.
 */
export function SettingsControls({ tone = "menu" }: { tone?: "menu" | "sheet" }) {
  const { t } = useI18n()
  const { locale, setLocale } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"
  const labelClass =
    "px-1 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground"

  return (
    <div
      className="flex flex-col gap-3 px-1 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Appearance */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>{t.auth.appearance}</span>
        <div className="grid grid-cols-2 gap-1 rounded-sm border border-border bg-card/60 p-1">
          <SegmentButton
            active={!isDark}
            onClick={() => setTheme("light")}
            icon={<Sun className="size-3.5" />}
            label={t.auth.themeLight}
          />
          <SegmentButton
            active={isDark}
            onClick={() => setTheme("dark")}
            icon={<Moon className="size-3.5" />}
            label={t.auth.themeDark}
          />
        </div>
      </div>

      {/* Language */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>
          <Globe className="mr-1 inline size-3 align-[-1px]" />
          {t.auth.language}
        </span>
        <div className="grid grid-cols-2 gap-1 rounded-sm border border-border bg-card/60 p-1">
          <SegmentButton
            active={mounted && locale === "el"}
            onClick={() => setLocale("el" as Locale)}
            label="Ελληνικά"
          />
          <SegmentButton
            active={mounted && locale === "en"}
            onClick={() => setLocale("en" as Locale)}
            label="English"
          />
        </div>
      </div>
    </div>
  )
}

function SegmentButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-2 font-sans text-xs font-bold tracking-chip transition-colors ${
        active
          ? "bg-brass text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
