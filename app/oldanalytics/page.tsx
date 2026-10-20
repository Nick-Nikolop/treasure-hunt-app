import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getOldHuntAnalytics } from "@/lib/old-analytics"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { OldHuntView } from "@/components/analytics/old-hunt-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Hunt #1 archive · The Hunt",
  description: "Everything recorded during Hunt #1.",
  robots: { index: false, follow: false },
}

export default async function OldAnalyticsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  const data = await getOldHuntAnalytics()

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <OldHuntView data={data} />
      </div>
    </>
  )
}
