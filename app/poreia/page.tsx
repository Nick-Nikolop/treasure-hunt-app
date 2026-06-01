import type { Metadata } from "next"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { PoreiaView } from "@/components/pythea/poreia-view"
import { buildClueState, isOverrideAuthorized } from "@/lib/clues"

// Always compute against the live server clock; never cache.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Η Διαδρομή — Πυθέας ο Μεσσήνιος",
  description: "Τα στοιχεία του κυνηγιού θησαυρού, ένα κάθε φορά.",
  // Keep the clue page out of search engines.
  robots: { index: false, follow: false },
}

export default async function PoreiaPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string; key?: string }>
}) {
  const sp = await searchParams
  // Testing override: ?reveal=N forces N clues open. In production it requires
  // ?key=<PYTHEA_TEST_KEY>; in development it works without a key.
  const preview = sp.reveal !== undefined ? Number(sp.reveal) : undefined
  const allowOverride = isOverrideAuthorized(sp.key)

  const state = buildClueState(Date.now(), preview, allowOverride)

  return (
    <>
      <Atmosphere />
      <PoreiaView
        unlocked={state.unlocked}
        locked={state.locked}
        unlockedCount={state.unlockedCount}
        total={state.total}
        startMs={state.startMs}
        nextUnlockMs={state.nextUnlockMs}
      />
    </>
  )
}
