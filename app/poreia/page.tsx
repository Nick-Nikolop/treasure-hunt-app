import type { Metadata } from "next"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { PoreiaView } from "@/components/pythea/poreia-view"
import { buildClueState } from "@/lib/clues"

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
  searchParams: Promise<{ reveal?: string }>
}) {
  const sp = await searchParams
  // Dev-only preview override (ignored in production by buildClueState).
  const preview = sp.reveal !== undefined ? Number(sp.reveal) : undefined

  const state = buildClueState(Date.now(), preview)

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
