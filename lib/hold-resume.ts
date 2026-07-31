/**
 * When the hunt picks up again after the hold.
 *
 * Stored as a fixed UTC instant so it means the same moment on every device
 * regardless of the visitor's own clock or time zone. 2026-07-31 18:00 in Athens
 * is EEST (UTC+3), hence 15:00Z.
 *
 * This drives the waiting notice and its countdown ONLY. Lifting the hold is
 * still a manual admin action, so letting this moment pass changes nothing on
 * its own: it is a promise to the crews, not a scheduler.
 */
export const HOLD_RESUME_AT_MS = Date.parse("2026-07-31T15:00:00.000Z")
