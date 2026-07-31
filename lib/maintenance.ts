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
export const JOURNAL_MAINTENANCE = true

/**
 * Accounts that keep normal access while maintenance is on, on top of every
 * superadmin. This is for the founder's own non-admin alt, so the journal can
 * be checked exactly as an ordinary player sees it.
 *
 * Compared lowercased, since email casing is not guaranteed to be normalised.
 */
export const MAINTENANCE_BYPASS_EMAILS = ["webmasteerrass@gmail.com"]

export function isMaintenanceBypassEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const needle = email.toLowerCase()
  return MAINTENANCE_BYPASS_EMAILS.some((allowed) => allowed.toLowerCase() === needle)
}
