import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getPeopleSnapshot } from "@/lib/people"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { PeopleView } from "@/components/analytics/people-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "People · Analytics · The Hunt",
  description: "Who visits, where they came from and what they did.",
  robots: { index: false, follow: false },
}

export default async function PeoplePage() {
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  const snapshot = await getPeopleSnapshot()

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <PeopleView snapshot={snapshot} />
      </div>
    </>
  )
}
