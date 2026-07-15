// ─────────────────────────────────────────────────────────────────────────
//  Analytics event taxonomy (shared, dependency-free).
//
//  Pure constants so BOTH the client tracker (lib/analytics-client.ts) and the
//  server module (lib/analytics.ts) can import the same names without dragging
//  server-only DB code into the client bundle. Keep names dotted and stable;
//  renaming one orphans its history.
// ─────────────────────────────────────────────────────────────────────────

export const EV = {
  // Navigation / engagement
  pageView: "page.view",
  pageLeave: "page.leave", // carries durationMs (time on page)
  sessionStart: "session.start",
  langToggle: "settings.language_toggle",
  themeToggle: "settings.theme_toggle",
  liteToggle: "settings.lite_toggle",
  // Landing / CTA
  ctaClick: "cta.click", // props: { id, location }
  // Auth funnel (durationMs on the success events where relevant)
  authView: "auth.view", // props: { mode: "sign_in" | "sign_up" | "reset" }
  authFieldFocus: "auth.field_focus",
  registerSubmit: "auth.register.submit",
  registerSuccess: "auth.register.success", // durationMs = form fill time
  registerError: "auth.register.error", // props: { reason }
  loginSubmit: "auth.login.submit",
  loginSuccess: "auth.login.success", // durationMs = form fill time
  loginError: "auth.login.error", // props: { reason }
  verifyOpen: "auth.verify.open",
  verifyResent: "auth.verify.resent",
  resetRequest: "auth.reset.request",
  resetComplete: "auth.reset.complete",
  logout: "auth.logout",
  // Hunt
  scanResult: "hunt.scan_result", // props: { status, leadOrder }
  leadUnlocked: "hunt.lead_unlocked", // props: { leadOrder, source }
  cooldownShown: "hunt.cooldown_shown", // props: { leadOrder }
  cooldownRetry: "hunt.cooldown_retry",
  proofOpen: "hunt.proof_open", // props: { context } "denied" | "too_far"
  proofSubmitted: "hunt.proof_submitted", // props: { context, photoCount }
  proofDecision: "hunt.proof_decision", // props: { decision } seen by explorer
  journalOpen: "hunt.journal_open",
  journalLeadView: "hunt.journal_lead_view", // props: { leadOrder }
  huntFinished: "hunt.finished",
  // Hints
  hintOpen: "hint.open", // props: { leadOrder }
  // Teams
  teamCreate: "team.create",
  teamJoin: "team.join",
  teamLeave: "team.leave",
  inviteCopy: "team.invite_copy",
  // Leaderboard
  leaderboardView: "leaderboard.view",
} as const

/** Coarse category buckets for filtering in the dashboard. */
export type AnalyticsCategory =
  | "page"
  | "auth"
  | "hunt"
  | "hint"
  | "team"
  | "leaderboard"
  | "nav"
  | "cta"
  | "settings"
  | "engagement"
  | "general"

export type EventName = (typeof EV)[keyof typeof EV] | string
