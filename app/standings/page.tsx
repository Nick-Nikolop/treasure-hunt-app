import type { Metadata } from "next"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
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
 * THIS PAGE IS DELIBERATELY PUBLIC. The hunt is over, so the final board is open
 * to everyone: no session, no superadmin check, no redirect. It used to be gated
 * by `getAdminUser()`, and since there is no middleware and no admin layout in
 * this app that guard was the entire protection, so removing it is the whole
 * change.
 *
 * What still protects the data is `toStandingsBoard()` below, NOT the route: it
 * narrows the full standings down to the board's own shape before anything is
 * serialised. Keep that call. `getFinalStandings()` carries every explorer's
 * display name and full rosters, and handing it straight to the client component
 * would ship all of it into the page payload even though nothing renders it.
 *
 * Kept out of search engines on purpose (noindex here, plus a /standings entry in
 * robots.ts): the board names individual players, so it is open to anyone with the
 * link without also being crawled into search results.
 */
export default async function StandingsPage() {
  // Narrowed before it crosses into the client component: the full standings
  // carry every explorer's display name, and this board must not ship rosters.
  const data = toStandingsBoard(await getFinalStandings())

  // No visible sign-in control on this board by design: it is a ceremony screen
  // meant to be projected, and non-admins are redirected here from "/", so a login
  // button would sit on the page most visitors land on. It is hidden behind a
  // deliberate gesture on the title instead (see AdminStandingsView). Resolved
  // server-side so the gesture stays inert for anyone already signed in.
  const session = await auth.api.getSession({ headers: await headers() })
  const signedOut = !session?.user
  const admin = await getAdminUser()
  const isAdmin = admin !== null

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AdminStandingsView data={data} signedOut={signedOut} isAdmin={isAdmin} />
      </div>
    </>
  )
}
