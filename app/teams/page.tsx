import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getMyCrew } from "@/app/teams/actions"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
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

  // Server-resolved user for a flash-free header on first paint.
  const initialUser = {
    firstName: (session.user as { firstName?: string | null }).firstName ?? null,
    name: session.user.name ?? null,
    email: session.user.email,
    role: (session.user as { role?: string | null }).role ?? null,
  }

  // Public origin for building the shareable invite link on the client.
  return (
    <>
      <Atmosphere />
      <SiteHeader initialUser={initialUser} />
      <div className="flex min-h-screen flex-col">
        <TeamsView crew={crew} maxSize={MAX_CREW_SIZE} />
        <SiteFooter />
      </div>
    </>
  )
}
