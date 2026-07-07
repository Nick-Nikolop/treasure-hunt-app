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
