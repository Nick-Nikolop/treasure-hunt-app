import { inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

/**
 * Journal maintenance switch.
 *
 * Flip `JOURNAL_MAINTENANCE` to `false` to reopen the journal for everyone. It
 * is a single flag on purpose: the whole point of a maintenance window is that
 * closing and reopening are one edit each, with no partial state in between.
 *
 * The gate is applied SERVER-SIDE in `app/journal/page.tsx`, which returns the
 * maintenance screen instead of the journal. That matters for two reasons:
 *
 *  1. No journal data is sent to the browser at all, so this cannot be bypassed
 *     by deleting an overlay node in devtools.
 *  2. It returns before `reconcileFinalePlacement` / `sweepFinalePlacements`
 *     run, so a blocked visit cannot rewrite anyone's placement rows while the
 *     trail is being repaired. Admins and the bypass account DO still trigger
 *     those sweeps, so keep admin visits to a minimum during the window.
 */
export const JOURNAL_MAINTENANCE = false

/**
 * These two allow-lists were ONE list until 07-31, which made the two very
 * different concessions inseparable. They are now split, because the founder's
 * alt needs exactly one of them and not the other:
 *
 *  - opening the sealed journal is a HARMLESS viewing concession,
 *  - skipping the trail-end hold CHANGES THE RACE, and the alt is meant to
 *    queue like every real crew.
 *
 * Both are compared lowercased, since email casing is not normalised.
 */

/**
 * Accounts that can still open the journal while maintenance is on, on top of
 * every superadmin. This is the founder's own non-admin alt, so the journal can
 * be proofread exactly as an ordinary player sees it.
 *
 * NOTE these visits DO trigger the placement sweeps (see the flag comment
 * above), so keep them purposeful while the window is open.
 */
export const MAINTENANCE_BYPASS_EMAILS: string[] = ["webmasteerrass@gmail.com"]

/**
 * Accounts for which the trail-end HOLD is lifted.
 *
 * Holds the founder's alt (07-31) as a REHEARSAL of the post-lift flow: it sees
 * exactly what every crew will see the moment the real hold is released, without
 * releasing it for anyone else. Everything downstream stays real, so this only
 * rehearses the sealed-note step, not the finale gates behind it.
 *
 * This is NOT the real switch. That is `holdEnabled` in `score_config`, flipped
 * by the admin Lift-hold button, which also stamps `holdLiftedAt` and promotes
 * every held crew at once. Empty this list again once testing is done.
 */
export const HOLD_BYPASS_EMAILS: string[] = ["webmasteerrass@gmail.com"]

export function isMaintenanceBypassEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const needle = email.toLowerCase()
  return MAINTENANCE_BYPASS_EMAILS.some((allowed) => allowed.toLowerCase() === needle)
}

function isHoldBypassEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const needle = email.toLowerCase()
  return HOLD_BYPASS_EMAILS.some((allowed) => allowed.toLowerCase() === needle)
}

/**
 * Is the trail-end HOLD lifted for this one account?
 *
 * Reads `HOLD_BYPASS_EMAILS`, resolved from a user id so the finale gates can
 * call it without already holding an email.
 *
 * This is deliberately NOT the admin `bypass` used in `getFinaleNotes`. That one
 * FAKES progress (it forces `trailEnd`/`compass` true and skips the grants) so
 * the finale stays proofreadable, which is the opposite of what a test account
 * needs: this bypass lifts ONLY the hold and leaves every real gate standing, so
 * the account still has to close the trail, hold a note-2 grant, and scan the
 * real QRs in order. It sees the ordinary player flow, just not the queue.
 *
 * It must be honoured in `finale-placement.ts` as well as the scan gates. That
 * pass recomputes placement from grants on every journal render and TRIMS rows
 * that sit above it, so a hold that still reads "on" there would quietly delete
 * the compass row this bypass just allowed, on the very next page load.
 */
export async function isHoldBypassedForUser(userId: string): Promise<boolean> {
  return isHoldBypassedForAny([userId])
}

/**
 * Crew-aware form. Progress is shared across a crew, so one bypass member lifts
 * the hold for the whole crew, exactly as every other per-crew check behaves.
 */
export async function isHoldBypassedForAny(userIds: string[]): Promise<boolean> {
  if (HOLD_BYPASS_EMAILS.length === 0 || userIds.length === 0) return false
  const rows = await db
    .select({ email: user.email })
    .from(user)
    .where(inArray(user.id, userIds))
  return rows.some((r) => isHoldBypassEmail(r.email))
}
