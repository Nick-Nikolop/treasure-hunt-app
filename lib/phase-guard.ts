import "server-only"

import { getAdminUser } from "@/lib/admin"
import { getPhaseSettings } from "@/lib/hunt-config"
import { computeEffectivePhase, isJournalLocked, type Phase, type PhaseInput } from "@/lib/phase"

/**
 * Everything a page/layout needs to decide what a visitor may see. The
 * effective phase is recomputed against the live clock on every request, so
 * phases auto-advance the instant a countdown elapses. Superadmins always
 * bypass the gates.
 */
export type PhaseContext = {
  phase: Phase
  isSuperadmin: boolean
  settings: PhaseInput
  nowMs: number
  /** True when the journal + leaderboard are sealed for THIS viewer. */
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
    journalLocked: !isSuperadmin && isJournalLocked(phase),
    siteLocked: !isSuperadmin && phase === 1,
  }
}
