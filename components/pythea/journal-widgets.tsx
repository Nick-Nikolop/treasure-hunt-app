"use client"

import { Anchor } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import type { StandingsSummary } from "@/lib/hunt"

/**
 * The journal widget shown under the book: a "who is at your port" card counting
 * the other teams / solo explorers currently on the same lead as the player.
 *
 * This used to sit beside a mini standings preview, which is hidden along with
 * the rest of the leaderboard. The full `StandingsSummary` is still passed in
 * (rank, entrants ahead, endgame count) and still computed on the server, so
 * restoring that card is purely a UI change.
 *
 * There are no points anywhere: a standing is just how far you have come and how
 * early you got there. Crucially this widget never names anyone who is ahead,
 * because the entrants in front are the ones the endgame seal is meant to hide.
 */
export function JournalWidgets({ standings }: { standings: StandingsSummary }) {
  const { t } = useI18n()
  const w = t.journal.widgets
  const { myProgress, total, sameLeadTeams, sameLeadSolos } = standings
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

      {/* The standings preview card that used to sit to the left of this one is
          hidden along with the rest of the leaderboard: it showed the player's
          rank, the number of entrants ahead and a link through to the board.
          The "who is at your port" card below is untouched and now runs the full
          width, so the grid drops to a single column. */}
      <div className="grid gap-4">
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
