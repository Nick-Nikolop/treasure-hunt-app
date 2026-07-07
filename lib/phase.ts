// ─────────────────────────────────────────────────────────────────────────
//  Phased rollout — pure logic (safe to import from client OR server).
//
//  The hunt opens in three phases:
//    Phase 1  Teaser landing only. Non-superadmins see a countdown + email
//             capture; the rest of the site is sealed.
//    Phase 2  Site is live, but the Journal and Leaderboard stay locked behind
//             a second countdown.
//    Phase 3  Everything is open.
//
//  The EFFECTIVE phase is computed on every request from an admin override plus
//  two unlock instants, so phases auto-advance the moment a clock elapses — no
//  cron, no background job. Superadmins always bypass the gates (handled by the
//  guard, not here).
//
//  Times are stored as UTC instants but authored by admins in Athens wall-clock
//  time (Greek time), matching the rest of the app. The helpers at the bottom
//  convert between the two using the real Europe/Athens offset (DST-correct).
// ─────────────────────────────────────────────────────────────────────────

export type Phase = 1 | 2 | 3

/** "auto" follows the two countdowns; "1"|"2"|"3" pins the phase. */
export type PhaseOverride = "auto" | "1" | "2" | "3"

/** Default Athens wall-clock unlock instants, stored as UTC ms. */
export const DEFAULT_PHASE2_UNLOCK_MS = Date.parse("2026-07-30T00:01:00+03:00")
export const DEFAULT_JOURNAL_UNLOCK_MS = Date.parse("2026-08-05T00:01:00+03:00")

export type PhaseInput = {
  override: PhaseOverride
  /** When phase 1 → 2 (site opens). */
  phase2UnlockMs: number
  /** When phase 2 → 3 (journal + leaderboard open). */
  journalUnlockMs: number
}

/**
 * The journal unlock can never be earlier than the site unlock, even if an
 * admin fat-fingers the dates. This keeps auto-advance strictly monotonic.
 */
export function normalizedJournalUnlockMs(input: PhaseInput): number {
  return Math.max(input.journalUnlockMs, input.phase2UnlockMs)
}

/** The single source of truth for "what phase are we in right now?". */
export function computeEffectivePhase(input: PhaseInput, nowMs: number): Phase {
  if (input.override === "1") return 1
  if (input.override === "2") return 2
  if (input.override === "3") return 3
  const journal = normalizedJournalUnlockMs(input)
  if (nowMs >= journal) return 3
  if (nowMs >= input.phase2UnlockMs) return 2
  return 1
}

/**
 * The next moment (UTC ms) at which the effective phase will change on its own,
 * or null when nothing is scheduled (already phase 3, or a forced override). An
 * open browser tab uses this to schedule a refresh the instant a clock hits 0.
 */
export function nextAutoAdvanceMs(input: PhaseInput, nowMs: number): number | null {
  if (input.override !== "auto") return null
  const phase = computeEffectivePhase(input, nowMs)
  if (phase === 1) return input.phase2UnlockMs
  if (phase === 2) return normalizedJournalUnlockMs(input)
  return null
}

/** Whether the journal + leaderboard are locked for a normal explorer. */
export function isJournalLocked(phase: Phase): boolean {
  return phase < 3
}

// ── Athens (Greek) time helpers ────────────────────────────────────────────

const ATHENS_TZ = "Europe/Athens"

/**
 * The offset (in minutes, positive = ahead of UTC) that Europe/Athens is at a
 * given UTC instant. Uses Intl so it is correct across the EET/EEST switch.
 */
function athensOffsetMinutesAt(atMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ATHENS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = dtf.formatToParts(new Date(atMs))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  )
  return Math.round((asUtc - atMs) / 60000)
}

/** Two-digit zero-pad. */
function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * Render a UTC instant as the value for an `<input type="datetime-local">`,
 * expressed in Athens wall-clock time: "YYYY-MM-DDTHH:mm".
 */
export function utcMsToAthensLocalInput(ms: number): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: ATHENS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  const parts = dtf.formatToParts(new Date(ms))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

/**
 * Parse a datetime-local string (authored in Athens wall-clock time) back into
 * a UTC instant. Returns NaN for an unparseable string.
 */
export function athensLocalInputToUtcMs(value: string): number {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return Number.NaN
  const [, y, mo, d, h, mi] = m
  // First guess: treat the wall-clock as if it were UTC, then correct by the
  // Athens offset that actually applies at that instant.
  const guess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
  const offset = athensOffsetMinutesAt(guess)
  return guess - offset * 60000
}

/** Human label for a phase, used in the admin panel. */
export function phaseLabel(phase: Phase): string {
  if (phase === 1) return "Phase 1 · Teaser"
  if (phase === 2) return "Phase 2 · Hunt live (journal locked)"
  return "Phase 3 · Fully open"
}
