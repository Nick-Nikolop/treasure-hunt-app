import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMyCrew } from "@/app/teams/actions"
import { getLeaderboard, TOTAL_CLUES } from "@/lib/hunt"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteFooter } from "@/components/pythea/site-footer"
import { LeaderboardView } from "@/components/pythea/leaderboard-view"

// Standings change with every scan, so never cache this page.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Κατάταξη — Το Ταξίδι του Πυθέα",
  description: "Δες ποιος προηγείται στο κυνήγι θησαυρού του Πυθέα.",
  robots: { index: false, follow: false },
}

export default async function LeaderboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?redirect=/leaderboard")

  const [entries, myCrew] = await Promise.all([getLeaderboard(), getMyCrew()])

  // My row is my crew (if I'm in one) or my solo entry, keyed by the same id
  // the leaderboard uses, so the view can highlight it.
  const myEntryId = myCrew?.id ?? session.user.id

  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col">
        <LeaderboardView entries={entries} total={TOTAL_CLUES} myEntryId={myEntryId} />
        <SiteFooter />
      </div>
    </>
  )
}
