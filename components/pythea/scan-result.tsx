"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BadgeCheck, Info, Lock, XCircle, BookOpen, Trophy, Hourglass, RotateCw } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import type { UnlockResult } from "@/lib/hunt"
import { track } from "@/lib/analytics-client"
import { EV } from "@/lib/analytics-events"

/**
 * The outcome card shown after scanning a QR code at /q/[token]. The unlock
 * decision is made entirely on the server; this component only renders the
 * already-computed result in the player's language.
 */
export function ScanResult({ result }: { result: UnlockResult }) {
  const { t, locale } = useI18n()
  const s = t.scan

  // The cooldown card ticks down live, so it gets its own stateful renderer.
  if (result.status === "cooldown") {
    return <CooldownCard availableAtMs={result.availableAtMs} />
  }

  // Resolve the headline, body and tone for the given status. Country names
  // are only present (and only safe to show) for leads that are now open.
  const view = (() => {
    switch (result.status) {
      case "unlocked": {
        const country = locale === "en" ? result.countryEn : result.country
        return {
          tone: "brass" as const,
          icon: <BadgeCheck className="size-9 text-brass" aria-hidden />,
          label: s.unlockedLabel,
          title: s.unlockedTitle(String(result.leadOrder).padStart(2, "0")),
          body: s.unlockedBody(country),
          showLeaderboard: true,
        }
      }
      case "finished": {
        const country = locale === "en" ? result.countryEn : result.country
        return {
          tone: "brass" as const,
          icon: <Trophy className="size-9 text-brass" aria-hidden />,
          label: s.finishedLabel,
          title: s.finishedTitle,
          body: s.finishedBody(country),
          showLeaderboard: true,
        }
      }
      case "already": {
        const country = locale === "en" ? result.countryEn : result.country
        return {
          tone: "muted" as const,
          icon: <Info className="size-9 text-muted-foreground" aria-hidden />,
          label: s.alreadyLabel,
          title: s.alreadyTitle,
          body: `${s.alreadyBody} ${country ? `(${country})` : ""}`.trim(),
          showLeaderboard: true,
        }
      }
      case "out_of_order":
        return {
          tone: "muted" as const,
          icon: <Lock className="size-9 text-muted-foreground" aria-hidden />,
          label: s.outOfOrderLabel,
          title: s.outOfOrderTitle,
          // Point players to the lead they should actually be finding next
          // (one past where their crew currently is), not the scanned link's lead.
          body: s.outOfOrderBody(result.current + 1),
          showLeaderboard: false,
        }
      case "invalid":
      default:
        return {
          tone: "muted" as const,
          icon: <XCircle className="size-9 text-muted-foreground" aria-hidden />,
          label: s.invalidLabel,
          title: s.invalidTitle,
          body: s.invalidBody,
          showLeaderboard: false,
        }
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-md rounded-sm border bg-card/60 px-6 py-9 text-center md:px-8 md:py-11 ${
        view.tone === "brass" ? "border-brass" : "border-border"
      }`}
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
        {view.icon}
      </div>

      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">{view.label}</p>
      <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
        {view.title}
      </h1>
      <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:text-lg">
        {view.body}
      </p>

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/journal"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
        >
          <BookOpen className="size-4" />
          {s.openJournal}
        </Link>
        {view.showLeaderboard && (
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <Trophy className="size-4" />
            {s.viewLeaderboard}
          </Link>
        )}
      </div>
    </motion.div>
  )
}

/** Format a millisecond remaining-duration as MM:SS (or HH:MM:SS past an hour). */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/**
 * The anti-cheat cooldown card: a live countdown to the moment the next solve
 * becomes possible. When it hits zero, it invites the player to scan/try again.
 */
function CooldownCard({ availableAtMs }: { availableAtMs: number }) {
  const { t } = useI18n()
  const s = t.scan
  const [remaining, setRemaining] = useState(() => availableAtMs - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(availableAtMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [availableAtMs])

  const ready = remaining <= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-sm border border-border bg-card/60 px-6 py-9 text-center md:px-8 md:py-11"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-background">
        <Hourglass className="size-9 text-muted-foreground" aria-hidden />
      </div>

      <p className="mt-6 font-sans text-[11px] font-bold tracking-chip text-brass">
        {s.cooldownLabel}
      </p>
      <h1 className="mt-3 text-balance font-serif text-3xl font-black text-foreground md:text-4xl">
        {s.cooldownTitle}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:text-lg">
        {ready ? s.cooldownReady : s.cooldownBody}
      </p>

      {!ready && (
        <p
          className="mt-6 font-mono text-5xl font-black tabular-nums tracking-tight text-foreground md:text-6xl"
          role="timer"
          aria-live="off"
        >
          {formatRemaining(remaining)}
        </p>
      )}

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {ready ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RotateCw className="size-4" />
            {s.cooldownRetry}
          </button>
        ) : (
          <Link
            href="/journal"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-5 py-3 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <BookOpen className="size-4" />
            {s.openJournal}
          </Link>
        )}
      </div>
    </motion.div>
  )
}
