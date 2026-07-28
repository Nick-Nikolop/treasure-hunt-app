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
import {
  getCrewUserIds,
  getCrewEffectiveProgress,
  getUserScore,
  getStandingsSummary,
  hasReachedTrailEnd,
  hasReachedCompass,
} from "@/lib/hunt"
import { getAdminUser } from "@/lib/admin"
import { getLeadDefs } from "@/lib/leads"
import { getLeadBgWashPct, getCompassOpacityPct } from "@/lib/hunt-config"
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

  // Build the clue state from the LIVE, admin-managed lead list so the journal
  // reflects the current sequence, copy, and stamps.
  const leadDefs = await getLeadDefs()
  const state = buildClueState(unlockedCount, now, leadDefs)

  // Global wash strength applied to every lead page's landmark background.
  const leadBgWashPct = await getLeadBgWashPct()

  // Global visibility of the compass in each lead page's bottom-right corner.
  const compassOpacityPct = await getCompassOpacityPct()

  // The unlocked slice already carries full live content (country, body,
  // stamp), so it is used directly.
  const unlocked = state.unlocked

  // The player's live score (always 0 before they're ranked) and the lead they
  // are currently at (the furthest clue they've unlocked) for the topbar.
  const score = await getUserScore(session.user.id, now)

  // Live standings for the journal widgets: the user's rank, a top-3 preview,
  // and how many other teams / solo players share the user's current lead.
  const standings = await getStandingsSummary(session.user.id, state.total, now)

  // Pytheas's first note is released by the trail-end QR hidden at the LAST
  // lead's own spot, not merely by the last page being revealed. Under the
  // superadmin progress override there is no real scan to read, so the faked
  // progress stands in for it and the preview keeps working.
  const trailEndReached = overrideActive
    ? state.unlockedCount >= state.total
    : await hasReachedTrailEnd(session.user.id)

  // The second note is released by the compass QR. Superadmins see both notes in
  // the journal at all times (marked admin-only while still sealed) so the
  // finale can be proofread without planting fake scans.
  const compassReached = overrideActive
    ? state.unlockedCount >= state.total
    : await hasReachedCompass(session.user.id)
  const isAdmin = (await getAdminUser()) !== null

  // Superadmins can page through leads the crew has not unlocked yet, so the
  // finale can be proofread end to end without faking scans. The full content
  // of sealed leads is attached ONLY for admins: for everyone else this stays an
  // empty array, so locked countries still never reach the browser.
  const adminPreview = isAdmin ? leadDefs.slice(state.unlockedCount) : []

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
          adminPreview={adminPreview}
          unlockedCount={state.unlockedCount}
          trailEndReached={trailEndReached}
          compassReached={compassReached}
          isAdmin={isAdmin}
          total={state.total}
          startMs={state.startMs}
          next={state.next}
          standings={standings}
          washPct={leadBgWashPct}
          compassOpacityPct={compassOpacityPct}
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
