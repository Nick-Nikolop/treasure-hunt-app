"use server"

import { headers, cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { getAdminUser } from "@/lib/admin"
import { getMyUnacknowledgedDecisions, acknowledgeDecision } from "@/lib/proofs"
import { getLeadDefs } from "@/lib/leads"
import { finaleOrderNames, isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"
import { getFinaleConfig, isTrailEndHeld } from "@/lib/finale"
import { getCrewGrants } from "@/lib/finale-grants"
import { HOLD_RESUME_AT_MS } from "@/lib/hold-resume"
import { getCrewUserIds, getCrewTrailEndAt, hasReachedCompass } from "@/lib/hunt"
import { isHoldBypassedForAny } from "@/lib/maintenance"

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
    // The finale stops (trail end, compass, treasure) carry a sentinel ORDER
    // rather than a position, and no lead def will ever match them. Falling
    // through to the numbered form printed the raw sentinel at the explorer,
    // e.g. "No. 100002 is unlocked", which reads like a broken app. Name them.
    const finale = finaleOrderNames(r.leadOrder)
    const fallback = `No. ${String(r.leadOrder).padStart(2, "0")}`
    return {
      id: r.id,
      status: r.status as "approved" | "rejected",
      leadOrder: r.leadOrder,
      country: def?.country ?? finale?.el ?? fallback,
      countryEn: def?.countryEn ?? finale?.en ?? fallback,
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
 * Whether this explorer is currently WAITING on the hold, and so should be told
 * when the hunt resumes.
 *
 * The exact mirror of `getHoldRelease`: that one fires once the hold is lifted,
 * this one while it is still on. A crew qualifies only if the trail end is held
 * AND they have already closed the trail, so nobody still mid-trail is told to
 * wait for something that does not concern them yet.
 *
 * `resumeAtMs` is sent from the server as a fixed UTC instant, so the countdown
 * cannot drift with a visitor's own clock or time zone.
 */
export async function getHoldWait(): Promise<{ show: boolean; resumeAtMs: number }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { show: false, resumeAtMs: HOLD_RESUME_AT_MS }

  const cfg = await getFinaleConfig()
  // The hold is off (or was never on): there is no wait to explain.
  if (!isTrailEndHeld(cfg)) return { show: false, resumeAtMs: HOLD_RESUME_AT_MS }

  // Crew-wide, like the release alert: one teammate's scan closes the trail for
  // everyone, so the whole crew is waiting together.
  const crew = await getCrewUserIds(session.user.id)
  const reachedAt = await getCrewTrailEndAt(crew)

  // The bypass crew is not queued, so "come back later" would be a lie: their
  // compass step is already open. Suppressed here rather than left to the client.
  if (await isHoldBypassedForAny(crew)) return { show: false, resumeAtMs: HOLD_RESUME_AT_MS }

  return { show: reachedAt !== null, resumeAtMs: HOLD_RESUME_AT_MS }
}

/**
 * Whether this explorer may see the compass-pickup countdown popup.
 *
 * Exactly the same two conditions that open NOTE 2 in `getFinaleNotes`: the crew
 * must have physically found the compass AND an admin must have granted `note2`.
 * The popup carries the same countdown as the note, so anyone who cannot open the
 * note has no business being nagged about a pickup they cannot attend yet.
 *
 * Deliberately does NOT return the pickup location, only permission plus the
 * shared target instant. The address is a separate question, answered by the note
 * once the countdown has run out.
 */
export async function getCompassPickupAccess(): Promise<{ show: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { show: false }

  // Superadmins and the local/preview override see it without a real scan, so the
  // popup stays proofreadable. Same bypass as the note it belongs to.
  const admin = (await getAdminUser()) !== null
  const store = await cookies()
  const overrideActive = isOverrideAuthorized() && store.get(PREVIEW_COOKIE)?.value !== undefined
  if (admin || overrideActive) return { show: true }

  const [compass, grants] = await Promise.all([
    hasReachedCompass(session.user.id),
    getCrewGrants(session.user.id),
  ])

  return { show: compass && grants.note2 }
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
