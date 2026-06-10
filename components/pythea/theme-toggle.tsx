"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // The theme is only known on the client, so gate every theme-dependent
      // attribute on `mounted` and silence the unavoidable first-paint diff.
      aria-label={
        mounted && isDark ? "Εναλλαγή σε φωτεινό θέμα" : "Εναλλαγή σε σκούρο θέμα"
      }
      suppressHydrationWarning
      className={`inline-flex size-10 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:border-brass hover:text-brass ${className}`}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[18px]" />
        ) : (
          <Moon className="size-[18px]" />
        )
      ) : (
        <span className="size-[18px]" />
      )}
    </button>
  )
}
