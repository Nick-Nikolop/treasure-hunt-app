import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMyCrew } from "@/app/teams/actions"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteFooter } from "@/components/pythea/site-footer"
import { TeamsView } from "@/components/pythea/teams-view"
import { MAX_CREW_SIZE } from "@/lib/teams"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Το Πλήρωμά σου",
  description: "Φτιάξε ή διαχειρίσου την ομάδα σου για το Ταξίδι του Πυθέα.",
  robots: { index: false, follow: false },
}

export default async function TeamsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?redirect=/teams")

  const crew = await getMyCrew()

  // Public origin for building the shareable invite link on the client.
  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col">
        <TeamsView crew={crew} maxSize={MAX_CREW_SIZE} />
        <SiteFooter />
      </div>
    </>
  )
}
