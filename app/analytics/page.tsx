import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getSourceAnalytics } from "@/lib/source-hits"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AnalyticsView } from "@/components/analytics/analytics-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Analytics · The Hunt",
  description: "Link sources and arrivals.",
  robots: { index: false, follow: false },
}

export default async function AnalyticsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  const snapshot = await getSourceAnalytics()

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AnalyticsView snapshot={snapshot} />
      </div>
    </>
  )
}
