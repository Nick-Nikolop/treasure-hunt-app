"use client"

import { useEffect, useState } from "react"

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

const UNITS: { key: keyof Omit<TimeLeft, "done">; label: string }[] = [
  { key: "days", label: "ΜΕΡΕΣ" },
  { key: "hours", label: "ΩΡΕΣ" },
  { key: "minutes", label: "ΛΕΠΤΑ" },
  { key: "seconds", label: "ΔΕΥΤ." },
]

export function Countdown({
  targetMs,
  onDone,
  size = "md",
}: {
  targetMs: number
  onDone?: () => void
  size?: "sm" | "md" | "lg"
}) {
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
  const cells = UNITS.map((u) => ({
    label: u.label,
    value: time ? time[u.key] : 0,
  }))

  const box =
    size === "lg"
      ? "min-w-16 px-3 py-2.5 text-3xl md:min-w-20 md:text-5xl"
      : size === "sm"
        ? "min-w-10 px-1.5 py-1 text-base"
        : "min-w-12 px-2 py-1.5 text-xl md:text-2xl"

  return (
    <div className="flex items-stretch gap-2" role="timer" aria-label="Αντίστροφη μέτρηση">
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span
              className={`flex items-center justify-center rounded-sm border border-border bg-card font-serif font-black tabular-nums text-foreground ${box}`}
            >
              {String(c.value).padStart(2, "0")}
            </span>
            <span className="mt-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
              {c.label}
            </span>
          </div>
          {i < cells.length - 1 && (
            <span className="self-start pt-1 font-serif text-xl text-brass/50 md:text-2xl">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
