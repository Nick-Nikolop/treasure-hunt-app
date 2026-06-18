import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { unlockByToken } from "@/lib/hunt"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { ScanResult } from "@/components/pythea/scan-result"

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

  // Try to unlock the scanned lead for this user and their whole crew. The
  // result is fully resolved server-side; the client only renders it.
  const result = await unlockByToken(session.user.id, token)

  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <ScanResult result={result} />
      </div>
    </>
  )
}
