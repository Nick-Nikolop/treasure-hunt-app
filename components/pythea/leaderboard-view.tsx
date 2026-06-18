"use client"

import { motion } from "framer-motion"
import { Trophy, Users, User as UserIcon, MapPin } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import type { LeaderboardEntry } from "@/lib/hunt"

type Props = {
  entries: LeaderboardEntry[]
  total: number
  myEntryId: string
}

export function LeaderboardView({ entries, total, myEntryId }: Props) {
  const { t, locale } = useI18n()
  const lb = t.leaderboard

  const hasAny = entries.some((e) => e.progress > 0)

  // Locale-aware "reached at" formatter (date + time, no seconds).
  const fmt = (ms: number | null) => {
    if (ms === null) return lb.notStarted
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms))
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-28 md:px-8 md:pt-32">
      <header className="text-center">
        <p className="font-sans text-[11px] font-bold tracking-chip text-brass">{lb.eyebrow}</p>
        <h1 className="mt-3 text-balance font-serif text-4xl font-black text-foreground md:text-5xl">
          {lb.title}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-pretty font-serif text-base italic leading-relaxed text-muted-foreground md:text-lg">
          {lb.lead}
        </p>
      </header>

      {!hasAny ? (
        <p className="mt-16 text-center font-serif text-lg italic text-muted-foreground">
          {lb.empty}
        </p>
      ) : (
        <ol className="mt-12 flex flex-col gap-3">
          {entries.map((entry, i) => {
            const isMe = entry.id === myEntryId
            const rank = i + 1
            const country = locale === "en" ? entry.countryEn : entry.country
            return (
              <motion.li
                key={`${entry.kind}-${entry.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={`flex items-center gap-4 rounded-sm border px-4 py-3.5 md:px-5 ${
                  isMe ? "border-brass bg-brass/5" : "border-border bg-card/40"
                }`}
              >
                {/* Rank */}
                <div className="flex w-8 shrink-0 justify-center">
                  {rank <= 3 && entry.progress > 0 ? (
                    <Trophy
                      className={`size-5 ${
                        rank === 1
                          ? "text-brass"
                          : rank === 2
                            ? "text-muted-foreground"
                            : "text-muted-foreground/70"
                      }`}
                      aria-hidden
                    />
                  ) : (
                    <span className="font-serif text-lg font-black text-muted-foreground">
                      {rank}
                    </span>
                  )}
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-serif text-base font-bold text-foreground md:text-lg">
                      {entry.name}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-muted-foreground">
                      {entry.kind === "team" ? (
                        <Users className="size-3" aria-hidden />
                      ) : (
                        <UserIcon className="size-3" aria-hidden />
                      )}
                      {entry.kind === "team" ? lb.teamTag : lb.soloTag}
                    </span>
                    {isMe && (
                      <span className="shrink-0 rounded-sm bg-brass px-1.5 py-0.5 font-sans text-[9px] font-bold tracking-chip text-background">
                        {lb.you}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground">
                    {entry.progress > 0 ? (
                      <>
                        {country && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden />
                            {country}
                          </span>
                        )}
                        <span className="mx-1.5 text-muted-foreground/50">·</span>
                        {lb.reachedLabel} {fmt(entry.reachedAt)}
                      </>
                    ) : (
                      lb.notStarted
                    )}
                  </p>
                </div>

                {/* Progress */}
                <div className="shrink-0 text-right">
                  <div className="font-serif text-xl font-black text-brass">{entry.progress}</div>
                  <div className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground/70">
                    / {total}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ol>
      )}
    </main>
  )
}
