"use client"

import Link from "next/link"
import { Trophy, Anchor, ChevronRight, Lock } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import type { StandingsSummary } from "@/lib/hunt"

/**
 * Two journal widgets shown under the book: a mini leaderboard preview that
 * links to the full standings, and a "who is at your port" card counting the
 * other teams / solo explorers currently on the same lead as the player.
 *
 * There are no points anywhere: a standing is just how far you have come and how
 * early you got there. Crucially this widget never names anyone who is ahead,
 * because the entrants in front are the ones the endgame seal is meant to hide.
 */
export function JournalWidgets({ standings }: { standings: StandingsSummary }) {
  const { t } = useI18n()
  const w = t.journal.widgets
  const {
    rank,
    totalEntrants,
    myProgress,
    total,
    sameLeadTeams,
    sameLeadSolos,
    myRankSealed,
    endgameCount,
    aheadVisible,
  } = standings
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

          {totalEntrants === 0 ? (
            <p className="flex-1 font-serif text-sm italic leading-relaxed text-muted-foreground">
              {w.lbEmpty}
            </p>
          ) : myRankSealed ? (
            /* The player is in the endgame, so even their own rank is withheld. */
            <div className="flex flex-1 flex-col justify-center">
              <span className="font-serif text-base font-black text-brass">{w.lbSealed}</span>
              <p className="mt-1 text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
                {w.lbSealedNote}
              </p>
            </div>
          ) : (
            /* Outside the endgame a player sees their own standing and the gap in
               front, but never who the leaders are. */
            <div className="flex flex-1 flex-col justify-center">
              <span className="font-serif text-3xl font-black text-brass">
                {rank ?? "\u2014"}
              </span>
              <p className="mt-1 font-serif text-sm leading-relaxed text-muted-foreground">
                {w.lbAhead(aheadVisible)}
              </p>
              {endgameCount > 0 && (
                <p className="mt-2 flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground/80">
                  <Lock className="size-3 shrink-0" />
                  {w.lbEndgame(endgameCount)}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
              {myRankSealed ? w.lbEndgame(endgameCount) : rank ? w.lbRank(rank, totalEntrants) : w.lbNotRanked}
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
