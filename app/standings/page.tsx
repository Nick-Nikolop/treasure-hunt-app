import type { Metadata } from "next"
import { headers } from "next/headers"
import { LogIn } from "lucide-react"
import { auth } from "@/lib/auth"
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

  // This page has no site header, and non-admins are now redirected here from "/",
  // so without this there is no way to reach the sign-in form from the page most
  // visitors land on. Only shown when signed out: a logged-in player has nothing
  // to do with it, and it would read as a dead control.
  const session = await auth.api.getSession({ headers: await headers() })
  const signedOut = !session?.user

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        {signedOut && (
          /* In normal flow, not floated: the board's own header is a
             self-contained screen to project, so the button sits above it and
             pushes it down instead of overlapping its top border. */
          <div className="relative z-20 mx-auto flex w-full max-w-5xl justify-end px-4 pt-4 sm:px-6">
            <a
              /* Comes back here after signing in. Without the param the form
                 defaults to "/", which sends a regular player straight back to
                 this page anyway but through an extra redirect. */
              href="/sign-in?redirect=%2Fstandings"
              className="inline-flex items-center gap-2 rounded-sm border border-brass/60 bg-background/70 px-4 py-2 font-sans text-xs font-bold tracking-chip text-brass backdrop-blur-sm transition-colors hover:bg-brass hover:text-primary-foreground"
            >
              <LogIn className="size-3.5" aria-hidden />
              ΣΥΝΔΕΣΗ
            </a>
          </div>
        )}
        <AdminStandingsView data={data} />
      </div>
    </>
  )
}
