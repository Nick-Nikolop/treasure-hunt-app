import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getHintByToken, hintLeadCountry } from "@/lib/hints"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { HintView, HintNotFound } from "@/components/pythea/hint-view"

// Hints can change at any time and are gated per session, so never cache.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Μια βοήθεια — Το Ταξίδι του Πυθέα",
  robots: { index: false, follow: false },
}

export default async function HintPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Hints are only shown to signed-in explorers. Send guests to sign-in and
  // bounce them back to this hint once they are in.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect(`/sign-in?redirect=/hint/${encodeURIComponent(token)}`)
  }

  const hint = await getHintByToken(token)
  const leadCountry = hint
    ? await hintLeadCountry(hint.leadOrder)
    : { country: null, countryEn: null }

  return (
    <>
      <Atmosphere />
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        {hint ? (
          <HintView
            hint={{
              title: hint.title,
              body: hint.body,
              leadOrder: hint.leadOrder,
              ...leadCountry,
            }}
          />
        ) : (
          <HintNotFound />
        )}
      </div>
    </>
  )
}
