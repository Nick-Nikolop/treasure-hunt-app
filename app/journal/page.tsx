import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { PoreiaView } from "@/components/pythea/poreia-view"
import { SiteFooter } from "@/components/pythea/site-footer"
import { ClueControls } from "@/components/pythea/clue-controls"
import { buildClueState, isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"
import { getCrewUserIds, getCrewEffectiveProgress, getUserScore } from "@/lib/hunt"
import { applyLeadContent } from "@/lib/lead-content"
import { getPhaseContext } from "@/lib/phase-guard"

// Recompute against the live server clock, the player's stored progress, and
// the per-browser testing cookie.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Η Διαδρομή του Πυθέα του Μεσσήνιου",
  description: "Τα στοιχεία του κυνηγιού θησαυρού, ένα κάθε φορά.",
  // Keep the clue page out of search engines.
  robots: { index: false, follow: false },
}

export default async function PoreiaPage() {
  // Phase gate: in phase 1 the site is sealed, in phase 2 the journal is
  // locked. Superadmins bypass both. A locked visitor who reaches this URL
  // directly is bounced to the home page, flagged so the countdown modal opens.
  const phaseCtx = await getPhaseContext()
  if (phaseCtx.siteLocked) redirect("/")
  if (phaseCtx.journalLocked) redirect("/?locked=journal")

  // The journal is gated: only registered, signed-in accounts can view it.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?redirect=/journal")

  // Pass the server-resolved user to the topbar for a flash-free first paint.
  const initialUser = {
    firstName: (session.user as { firstName?: string | null }).firstName ?? null,
    name: session.user.name ?? null,
    email: session.user.email,
    role: (session.user as { role?: string | null }).role ?? null,
  }

  // A player's progress is the furthest any member of their crew has reached,
  // combined with the global lead-1 time gate.
  const now = Date.now()
  const crew = await getCrewUserIds(session.user.id)
  const realCount = await getCrewEffectiveProgress(crew, now)

  // The testing control panel is available only where overrides are allowed
  // (the v0 preview / development). On the live site it stays hidden, and the
  // real stored progress is always used.
  const showControls = isOverrideAuthorized()

  const store = await cookies()
  const cookieVal = store.get(PREVIEW_COOKIE)?.value
  const overrideActive = showControls && cookieVal !== undefined
  const unlockedCount = overrideActive ? Number(cookieVal) : realCount

  const state = buildClueState(unlockedCount, now)

  // Merge any admin-edited subtitle/body over the defaults for the unlocked
  // leads (locked leads carry no content, so there is nothing to override).
  const unlocked = await applyLeadContent(state.unlocked)

  // The player's live score (always 0 before they're ranked) and the lead they
  // are currently at (the furthest clue they've unlocked) for the topbar.
  const score = await getUserScore(session.user.id, now)
  const currentClue = unlocked[unlocked.length - 1] ?? null
  const current = currentClue
    ? { order: currentClue.order, country: currentClue.country, countryEn: currentClue.countryEn }
    : null

  return (
    <>
      <Atmosphere />
      <SiteHeader
        initialUser={initialUser}
        progress={{ unlocked: state.unlockedCount, total: state.total, score, current }}
      />
      <div className="flex min-h-screen flex-col">
        <PoreiaView
          unlocked={unlocked}
          locked={state.locked}
          unlockedCount={state.unlockedCount}
          total={state.total}
          startMs={state.startMs}
          next={state.next}
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
