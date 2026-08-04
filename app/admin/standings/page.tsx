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

export default async function AdminStandingsPage() {
  // Same guard as /admin: no session, or a plain user, gets bounced to the
  // landing page. getAdminUser() returns null for anyone who is not a
  // superadmin, so there is no separate "simple user" branch to get wrong.
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
