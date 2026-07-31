/**
 * Whether new accounts can still be created.
 *
 * The hunt has started, so registration is closed: anyone reaching /sign-up now
 * gets the "the hunt has begun" notice instead of the form, and the server hook
 * in `lib/auth.ts` rejects account creation outright. Flip this back to `true`
 * to reopen sign-ups; nothing else needs changing.
 *
 * Kept as a plain constant rather than a DB setting on purpose: this is a
 * one-way door for this run of the hunt, and a constant cannot be flipped by a
 * stray admin click or a bad row.
 */
export const REGISTRATION_OPEN = false
