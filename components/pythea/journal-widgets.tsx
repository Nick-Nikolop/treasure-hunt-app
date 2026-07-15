"use client"

import Link from "next/link"
import { Trophy, Anchor, ChevronRight, Users, User as UserIcon } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import type { StandingsSummary } from "@/lib/hunt"

/**
 * Two journal widgets shown under the book: a mini leaderboard preview that
 * links to the full standings, and a "who is at your port" card counting the
 * other teams / solo explorers currently on the same lead as the player.
 *
 * Only progress marks are shown (never scores), so this stays consistent with
 * the score-hiding rule on the full leaderboard.
 */
export function JournalWidgets({ standings }: { standings: StandingsSummary }) {
  const { t } = useI18n()
  const w = t.journal.widgets
  const { top, rank, totalEntrants, myProgress, total, sameLeadTeams, sameLeadSolos } = standings
  const othersHere = sameLeadTeams + sameLeadSolos

  return (
    <section aria-label={w.label} className="mx-auto mt-12 w-full max-w-2xl md:mt-14">
      <div className="mb-3 flex items-center gap-2.5 md:gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 font-sans text-[11px] font-bold tracking-chip text-brass">
          {w.label}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Leaderboard preview */}
        <div className="flex flex-col rounded-sm border border-border bg-card/60 p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-brass" />
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-foreground">
              {w.lbTitle}
            </h3>
          </div>

          {top.length === 0 ? (
            <p className="flex-1 font-serif text-sm italic leading-relaxed text-muted-foreground">
              {w.lbEmpty}
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {top.map((e) => (
                <li
                  key={`${e.kind}-${e.rank}`}
                  className={`flex items-center gap-2.5 rounded-sm px-2 py-1.5 ${
                    e.isMe ? "bg-brass/10 ring-1 ring-brass/40" : ""
                  }`}
                >
                  <span
                    className={`w-5 shrink-0 text-center font-serif text-sm font-black ${
                      e.rank === 1 ? "text-brass" : "text-muted-foreground"
                    }`}
                  >
                    {e.rank}
                  </span>
                  {e.kind === "team" ? (
                    <Users className="size-3.5 shrink-0 text-muted-foreground/70" />
                  ) : (
                    <UserIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-serif text-sm text-foreground">
                    {e.name}
                    {e.isMe && (
                      <span className="ml-1.5 font-sans text-[9px] font-bold tracking-chip text-brass">
                        {w.you}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-serif text-xs font-bold text-muted-foreground">
                    {e.progress} / {total}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
              {rank ? w.lbRank(rank, totalEntrants) : w.lbNotRanked}
            </span>
            <Link
              href="/leaderboard"
              className="inline-flex shrink-0 items-center gap-1 font-sans text-[10px] font-bold tracking-chip text-brass transition-colors hover:text-foreground"
            >
              {w.lbView}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Who is at your port */}
        <div className="flex flex-col rounded-sm border border-border bg-card/60 p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Anchor className="size-4 text-brass" />
            <h3 className="font-sans text-[11px] font-bold tracking-chip text-foreground">
              {w.portTitle}
            </h3>
          </div>

          {myProgress === 0 ? (
            <p className="flex flex-1 items-center font-serif text-sm italic leading-relaxed text-muted-foreground">
              {w.portNotStarted}
            </p>
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                {w.portMarks(myProgress, total)}
              </span>
              {othersHere === 0 ? (
                <p className="mt-2 text-pretty font-serif text-base leading-relaxed text-foreground">
                  {w.portAlone}
                </p>
              ) : (
                <>
                  <span className="mt-1 font-serif text-3xl font-black text-brass">
                    {othersHere}
                  </span>
                  <p className="mt-1 text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
                    {w.portCount(sameLeadTeams, sameLeadSolos)}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
