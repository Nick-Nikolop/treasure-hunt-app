/**
 * When the office openings (desktop room title card, simple-view hero film) may play again.
 * Shared by both, so seeing one in a mode counts for the other too.
 * Stores only "an intro was seen at <time>", nothing about the visitor, so it doesn't need analytics consent.
 */

/** how long after an intro has played it stays skipped on this device */
export const INTRO_REPLAY_MS = 24 * 60 * 60 * 1000

const TAB_KEY = "office:intro-tab"
const AT_KEY = "office:intro-at"

/** true when an intro already played in this tab, or anywhere on this device within INTRO_REPLAY_MS */
export function introSeen(): boolean {
  try {
    if (sessionStorage.getItem(TAB_KEY) === "1") return true
    const at = Number(localStorage.getItem(AT_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < INTRO_REPLAY_MS
  } catch {
    return false
  }
}

/** call only when an intro actually starts playing */
export function markIntroSeen() {
  try {
    sessionStorage.setItem(TAB_KEY, "1")
    localStorage.setItem(AT_KEY, String(Date.now()))
  } catch {}
}
