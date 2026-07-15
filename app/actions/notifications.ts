"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyUnacknowledgedDecisions, acknowledgeDecision } from "@/lib/proofs"
import { getLeadDefs } from "@/lib/leads"

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
