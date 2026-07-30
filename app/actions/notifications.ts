"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyUnacknowledgedDecisions, acknowledgeDecision } from "@/lib/proofs"
import { getLeadDefs } from "@/lib/leads"
import { getFinaleConfig, isTrailEndHeld } from "@/lib/finale"
import { getCrewUserIds, getCrewTrailEndAt } from "@/lib/hunt"

/**
 * A decided photo-proof the explorer hasn't acknowledged yet, shaped for the
 * notification popup. `country`/`countryEn` are resolved from the lead's current
 * position so the message reads naturally in either language.
 */
export type DecisionNotification = {
  id: string
  status: "approved" | "rejected"
  leadOrder: number
  country: string
  countryEn: string
  reason: string | null
  decidedAtMs: number | null
}

/**
 * The current user's decided-but-unacknowledged proof decisions. Polled by the
 * notification provider (live) and read on mount (covers rejoining later).
 * Returns an empty array when signed out.
 */
export async function getMyDecisionNotifications(): Promise<DecisionNotification[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return []

  const rows = await getMyUnacknowledgedDecisions(session.user.id)
  if (rows.length === 0) return []

  const defs = await getLeadDefs()
  return rows.map((r) => {
    const def = defs.find((d) => d.order === r.leadOrder)
    return {
      id: r.id,
      status: r.status as "approved" | "rejected",
      leadOrder: r.leadOrder,
      country: def?.country ?? `No. ${String(r.leadOrder).padStart(2, "0")}`,
      countryEn: def?.countryEn ?? `No. ${String(r.leadOrder).padStart(2, "0")}`,
      reason: r.reason,
      decidedAtMs: r.decidedAt ? r.decidedAt.getTime() : null,
    }
  })
}

/** Acknowledge one decision so it stops re-appearing (scoped to this user). */
export async function acknowledgeMyDecision(id: string): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false }
  await acknowledgeDecision(id, session.user.id)
  return { ok: true }
}

/**
 * Whether this explorer should be shown the "the way is open" alert.
 *
 * True only for a crew that BOTH closed the trail and did so BEFORE the hold was
 * lifted. That second condition is the whole point of storing `holdLiftedAt`: a
 * crew who reaches the trail end after the hold is already off never waited on
 * anything, so telling them "the way is open" would be noise about a wait they
 * never experienced.
 *
 * Dismissal is client-side (localStorage), so this stays a pure read: no write,
 * no row, nothing to clean up after the hunt. The trade-off is that a crew using
 * two devices can see it on each; a nudge to go read a note they already have is
 * harmless, whereas a schema change for a one-shot alert is not worth it.
 */
export async function getHoldRelease(): Promise<{ show: boolean; liftedAtMs: number | null }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { show: false, liftedAtMs: null }

  const cfg = await getFinaleConfig()
  // Still held, or never held at all: nothing to announce.
  if (isTrailEndHeld(cfg) || cfg.holdLiftedAt === null) return { show: false, liftedAtMs: null }

  // The whole CREW's trail-end, not just this user's: a teammate's scan closes
  // the trail for everyone, so the wait (and the release) is shared.
  const crew = await getCrewUserIds(session.user.id)
  const reachedAt = await getCrewTrailEndAt(crew)
  if (reachedAt === null) return { show: false, liftedAtMs: null }

  return {
    show: reachedAt.getTime() < cfg.holdLiftedAt.getTime(),
    liftedAtMs: cfg.holdLiftedAt.getTime(),
  }
}
