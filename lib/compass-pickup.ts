/**
 * When the crews learn where to collect the physical compass.
 *
 * 13:00 on 1 August 2026, Athens time. August is EEST (UTC+3), so this is pinned
 * as a fixed UTC instant rather than a local `new Date(...)`: that way every crew
 * counts down to the SAME moment no matter how their phone's clock or time zone
 * is set, and the reveal cannot flip early for one team and late for another.
 *
 * Shared by the note, the site-wide popup and the admin preview so the three can
 * never drift apart.
 */
export const COMPASS_PICKUP_AT_MS = Date.parse("2026-08-01T10:00:00.000Z")

/** The exact map pin, handed out only once the countdown above has ended. */
export const COMPASS_PICKUP_MAP_URL = "https://maps.app.goo.gl/2TU24PKYxMA4qKNX6"
