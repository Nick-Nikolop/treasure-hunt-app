import type { Metadata } from "next"
import { locationQrExists } from "@/lib/location-ping"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { LocationPingClient } from "@/components/pythea/location-ping-client"

// Founder-only diagnostic scan target. Must always run fresh (checks the token
// against the DB) and must never be indexed.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Location check",
  robots: { index: false, follow: false },
}

export default async function LocationPingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const valid = await locationQrExists(token)

  return (
    <>
      <Atmosphere />
      <div className="relative">
        <LocationPingClient token={token} valid={valid} />
      </div>
    </>
  )
}
