"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/components/pythea/language-provider"

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

function diff(targetMs: number): TimeLeft {
  const total = targetMs - Date.now()
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  }
  const s = Math.floor(total / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  }
}

const UNIT_KEYS: (keyof Omit<TimeLeft, "done">)[] = [
  "days",
  "hours",
  "minutes",
  "seconds",
]

export function Countdown({
  targetMs,
  onDone,
  size = "md",
  tone = "dark",
}: {
  targetMs: number
  onDone?: () => void
  size?: "sm" | "md" | "lg"
  /** "dark" for the dark site background, "ink" for light parchment pages. */
  tone?: "dark" | "ink"
}) {
  const { t } = useI18n()
  const [time, setTime] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTime(diff(targetMs))
    const id = setInterval(() => {
      const next = diff(targetMs)
      setTime(next)
      if (next.done) {
        clearInterval(id)
        onDone?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [targetMs, onDone])

  // Avoid hydration mismatch: render a stable skeleton until mounted.
  const cells = UNIT_KEYS.map((key) => ({
    label: t.countdown[key],
    value: time ? time[key] : 0,
  }))

  const box =
    size === "lg"
      ? "min-w-11 px-2 py-2 text-2xl sm:min-w-16 sm:px-3 sm:py-2.5 sm:text-3xl md:min-w-20 md:text-5xl"
      : size === "sm"
        ? "min-w-10 px-1.5 py-1 text-base"
        : "min-w-12 px-2 py-1.5 text-xl md:text-2xl"

  const cellTone =
    tone === "ink"
      ? "border-ink/25 bg-[oklch(0.88_0.04_82)] text-ink"
      : "border-border bg-card text-foreground"
  const labelTone = tone === "ink" ? "text-ink/55" : "text-muted-foreground"
  const colonTone = tone === "ink" ? "text-[oklch(0.5_0.1_40)]" : "text-brass/50"

  return (
    <div className="flex items-stretch gap-1 sm:gap-2" role="timer" aria-label={t.countdown.aria}>
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-center gap-1 sm:gap-2">
          <div className="flex flex-col items-center">
            <span
              className={`flex items-center justify-center rounded-sm border font-serif font-black tabular-nums ${cellTone} ${box}`}
            >
              {String(c.value).padStart(2, "0")}
            </span>
            <span className={`mt-1.5 font-sans text-[10px] font-bold tracking-chip ${labelTone}`}>
              {c.label}
            </span>
          </div>
          {i < cells.length - 1 && (
            <span className={`self-start pt-1 font-serif text-xl md:text-2xl ${colonTone}`}>
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
