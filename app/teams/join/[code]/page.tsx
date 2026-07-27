import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCrewPreviewByCode, getMyCrew } from "@/app/teams/actions"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { JoinView } from "@/components/pythea/join-view"
import { areRostersLocked } from "@/lib/phase-guard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Πρόσκληση σε ομάδα",
  robots: { index: false, follow: false },
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  // Logged-out visitors are routed to sign-in, then bounced back to this invite.
  if (!session?.user) {
    redirect(`/sign-in?redirect=/teams/join/${encodeURIComponent(code)}`)
  }

  const [preview, myCrew, rostersLocked] = await Promise.all([
    getCrewPreviewByCode(code),
    getMyCrew(),
    areRostersLocked(),
  ])

  // Already in this exact crew? Send them to the crew page.
  if (preview && myCrew && myCrew.id === preview.id) redirect("/teams")

  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <JoinView
          code={code}
          crewName={preview?.name ?? null}
          isFull={preview?.isFull ?? false}
          alreadyInOtherCrew={Boolean(myCrew)}
          rostersLocked={rostersLocked}
        />
      </div>
    </>
  )
}
