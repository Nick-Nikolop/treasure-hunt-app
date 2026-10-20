import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getJourney } from "@/lib/people"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { JourneyView } from "@/components/analytics/journey-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Journey · Analytics · The Hunt",
  robots: { index: false, follow: false },
}

export default async function JourneyPage({ params }: { params: Promise<{ key: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  const { key } = await params
  const journey = await getJourney(decodeURIComponent(key))
  if (!journey) notFound()

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <JourneyView journey={journey} />
      </div>
    </>
  )
}
