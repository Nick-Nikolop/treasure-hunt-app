import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { unlockByToken, resolveScanContext } from "@/lib/hunt"
import { getAdminUser } from "@/lib/admin"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { ScanResult } from "@/components/pythea/scan-result"
import { ScanGate } from "@/components/pythea/scan-gate"

// Every scan must hit the server fresh: it mutates progress and reads the
// crew's live state.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Σάρωση σημαδιού — Το Ταξίδι του Πυθέα",
  robots: { index: false, follow: false },
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // The hunt is account-bound: a scan only counts for a signed-in explorer.
  // Logged-out visitors are sent to sign-in and bounced back to this scan.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect(`/sign-in?redirect=/q/${encodeURIComponent(token)}`)
  }

  // A valid in-order scan of a lead that has a GPS gate must first prove the
  // explorer is at the mark. Everything else (finish, out-of-order, already,
  // invalid, or leads with no coordinates) unlocks directly as before.
  const ctx = await resolveScanContext(session.user.id, token)
  const isSuperAdmin = !!(await getAdminUser())

  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        {ctx.mode === "verify" ? (
          <ScanGate
            token={token}
            isSuperAdmin={isSuperAdmin}
            proofOnly={ctx.proofOnly === true}
          />
        ) : (
          <ScanResult
            result={await unlockByToken(session.user.id, token, {}, "nogate")}
            token={token}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </div>
    </>
  )
}
