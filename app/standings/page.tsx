import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getFinalStandings, toStandingsBoard } from "@/lib/standings"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AdminStandingsView } from "@/components/pythea/admin-standings-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Τελική κατάταξη · Pythea",
  description: "Closing-ceremony standings.",
  robots: { index: false, follow: false },
}

/**
 * Lives at /standings rather than under /admin so the closing ceremony can be
 * opened without the URL announcing itself as an admin screen.
 *
 * THE PATH GRANTS NOTHING. There is no middleware and no admin layout in this
 * app, so `getAdminUser()` below was always the entire protection, both here and
 * under /admin. Moving the file therefore removed no layer, but it does mean the
 * guard can never be inferred from the location: delete it and the board becomes
 * public. `/standings` is also added to robots.ts, since it no longer falls under
 * the `/admin` disallow rule.
 */
export default async function StandingsPage() {
  // No session, or a plain user, gets bounced to the landing page.
  // getAdminUser() returns null for anyone who is not a superadmin, so there is
  // no separate "simple user" branch to get wrong.
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  // Narrowed before it crosses into the client component: the full standings
  // carry every explorer's display name, and this board must not ship rosters.
  const data = toStandingsBoard(await getFinalStandings())

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AdminStandingsView data={data} />
      </div>
    </>
  )
}
