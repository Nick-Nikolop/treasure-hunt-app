import "server-only"

import { getAdminUser } from "@/lib/admin"
import { getPhaseSettings } from "@/lib/hunt-config"
import {
  areRostersFrozen,
  computeEffectivePhase,
  isJournalLocked,
  type Phase,
  type PhaseSettings,
} from "@/lib/phase"

/**
 * Everything a page/layout needs to decide what a visitor may see. The
 * effective phase is recomputed against the live clock on every request, so
 * phases auto-advance the instant a countdown elapses. Superadmins always
 * bypass the gates.
 */
export type PhaseContext = {
  phase: Phase
  isSuperadmin: boolean
  settings: PhaseSettings
  nowMs: number
  /**
   * True when the journal + leaderboard are sealed for THIS viewer: always
   * during phase 2, then per the manual admin seal once phase 3 arrives.
   */
  journalLocked: boolean
  /** True when the whole site is sealed behind the teaser for THIS viewer. */
  siteLocked: boolean
}

/**
 * The effective phase as the PUBLIC (and crawlers) see it — no superadmin
 * bypass. Used by share metadata + OG images, where what matters is what an
 * unauthenticated visitor / social scraper would be shown.
 *
 * This runs inside `generateMetadata` and the OG image routes, which social
 * scrapers hit directly. It MUST NOT throw: if the phase settings can't be read
 * (e.g. a transient DB hiccup on a cold start) we fall back to phase 1, the
 * sealed teaser. That keeps the link preview rendering AND is the safe default,
 * since phase 1 never reveals the treasure hunt or that teams are involved.
 */
export async function getPublicPhase(nowMs = Date.now()): Promise<Phase> {
  try {
    const settings = await getPhaseSettings()
    return computeEffectivePhase(settings, nowMs)
  } catch {
    return 1
  }
}

/**
 * True when team set-up is frozen for THIS viewer. From phase 3 the hunt is
 * live, so rosters are sealed: no creating, joining, inviting, leaving or
 * removing. Whoever you are with when phase 3 begins is who you finish with,
 * which keeps leaderboard rosters stable and stops anyone being stranded solo
 * mid-hunt with no way back in. Renaming stays open (purely cosmetic).
 *
 * Superadmins bypass it, exactly like every other phase gate, so a crew can
 * still be repaired on the day.
 *
 * The freeze is no longer automatic: it is an admin switch that DEFAULTS ON, so
 * the behaviour above is what happens unless an admin turns it off.
 */
export async function areRostersLocked(): Promise<boolean> {
  const [admin, settings] = await Promise.all([getAdminUser(), getPhaseSettings()])
  if (admin) return false
  return areRostersFrozen(computeEffectivePhase(settings, Date.now()), settings)
}

export async function getPhaseContext(): Promise<PhaseContext> {
  const nowMs = Date.now()
  const [admin, settings] = await Promise.all([getAdminUser(), getPhaseSettings()])
  const phase = computeEffectivePhase(settings, nowMs)
  const isSuperadmin = !!admin
  return {
    phase,
    isSuperadmin,
    settings,
    nowMs,
    // Sealed for the whole of phase 2; from phase 3 the manual admin seal decides.
    journalLocked: !isSuperadmin && isJournalLocked(phase, settings),
    siteLocked: !isSuperadmin && phase === 1,
  }
}
