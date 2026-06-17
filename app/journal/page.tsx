import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { JournalTopbar } from "@/components/pythea/journal-topbar"
import { PoreiaView } from "@/components/pythea/poreia-view"
import { SiteFooter } from "@/components/pythea/site-footer"
import { ClueControls } from "@/components/pythea/clue-controls"
import { buildClueState, isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"

// Recompute against the live server clock and the per-browser cookie.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Η Διαδρομή του Πυθέα του Μεσσήνιου",
  description: "Τα στοιχεία του κυνηγιού θησαυρού, ένα κάθε φορά.",
  // Keep the clue page out of search engines.
  robots: { index: false, follow: false },
}

export default async function PoreiaPage() {
  // The journal is gated: only registered, signed-in accounts can view it.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?redirect=/journal")

  // Pass the server-resolved user to the topbar for a flash-free first paint.
  const initialUser = {
    firstName: (session.user as { firstName?: string | null }).firstName ?? null,
    name: session.user.name ?? null,
    email: session.user.email,
  }

  // The testing control panel is available only where overrides are allowed
  // (the v0 preview / development). On the live site it stays hidden.
  const showControls = isOverrideAuthorized()

  const store = await cookies()
  const cookieVal = store.get(PREVIEW_COOKIE)?.value
  const overrideActive = showControls && cookieVal !== undefined
  const preview = overrideActive ? Number(cookieVal) : undefined

  const state = buildClueState(Date.now(), preview, showControls)

  return (
    <>
      <Atmosphere />
      <JournalTopbar
        unlockedCount={state.unlockedCount}
        total={state.total}
        initialUser={initialUser}
      />
      <div className="flex min-h-screen flex-col">
        <PoreiaView
          unlocked={state.unlocked}
          locked={state.locked}
          unlockedCount={state.unlockedCount}
          total={state.total}
          startMs={state.startMs}
          nextUnlockMs={state.nextUnlockMs}
        />
        <SiteFooter />
      </div>
      {showControls && (
        <ClueControls
          unlockedCount={state.unlockedCount}
          total={state.total}
          overrideActive={Boolean(overrideActive)}
        />
      )}
    </>
  )
}
