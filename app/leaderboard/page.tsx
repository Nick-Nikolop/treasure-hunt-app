import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMyCrew } from "@/app/teams/actions"
import { getLeaderboard, TOTAL_CLUES } from "@/lib/hunt"
import { CLUES } from "@/lib/clues"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
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

  // Server-resolved user for a flash-free header on first paint.
  const initialUser = {
    firstName: (session.user as { firstName?: string | null }).firstName ?? null,
    name: session.user.name ?? null,
    email: session.user.email,
    role: (session.user as { role?: string | null }).role ?? null,
  }

  const [entries, myCrew] = await Promise.all([getLeaderboard(), getMyCrew()])

  // My row is my crew (if I'm in one) or my solo entry, keyed by the same id
  // the leaderboard uses, so the view can highlight it.
  const myEntryId = myCrew?.id ?? session.user.id

  // The map reveals ports only up to MY own furthest lead, so the leaderboard
  // can never spoil a location I have not reached yet, no matter how far ahead
  // someone else is.
  const viewerProgress = entries.find((e) => e.id === myEntryId)?.progress ?? 1

  // Only the ports I have personally reached are named for the client; the
  // rest never leave the server, exactly like the journal map.
  const revealedPorts = CLUES.slice(0, viewerProgress).map((c) => ({
    order: c.order,
    country: c.country,
    countryEn: c.countryEn,
  }))

  // Strip the country off anyone who is further along than me so their current
  // location is never shipped to my browser, only the fact that they are ahead.
  const safeEntries = entries.map((e) =>
    e.progress > viewerProgress ? { ...e, country: null, countryEn: null } : e,
  )

  return (
    <>
      <Atmosphere />
      <SiteHeader initialUser={initialUser} />
      <div className="flex min-h-screen flex-col">
        <LeaderboardView
          entries={safeEntries}
          total={TOTAL_CLUES}
          myEntryId={myEntryId}
          viewerProgress={viewerProgress}
          revealedPorts={revealedPorts}
        />
        <SiteFooter />
      </div>
    </>
  )
}
