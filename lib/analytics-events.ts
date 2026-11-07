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
  pageScroll: "page.scroll", // props: { depth: 25 | 50 | 75 | 100, path }
  uiClick: "ui.click", // props: { label, el, href? } (auto-captured, never field values)
  appError: "app.error", // props: { message, file? }
  langToggle: "settings.language_toggle",
  themeToggle: "settings.theme_toggle",
  liteToggle: "settings.lite_toggle",
  // Landing / CTA
  ctaClick: "cta.click", // props: { id, location }
  landingLoaded: "landing.loaded", // durationMs; props: { path, assets, loaded, timedOut }
  // "Τι είναι αυτό;" interactive video on /landing2
  explainerStart: "explainer.start", // props: { trigger: "auto" | "play" | "jump" | "replay" }
  explainerInteract: "explainer.interact", // props: { step: "riddle" | "scan", option?, correct, auto }
  explainerJump: "explainer.jump", // props: { chapter }
  explainerComplete: "explainer.complete", // durationMs; props: { interactions }
  // /landing6 hub + /landing6/hunts chooser
  landing6Cta: "landing6.cta", // props: { where: "hero" | "topbar" | "join" | "menu", target }
  landing6Hunt: "landing6.hunt", // props: { hunt: "carnival" | "pythea" | "next", where: "banner" | "chooser", action: "open" | "standings" | "locked" }
  landing6Social: "landing6.social", // props: { network: "instagram" | "tiktok" | "facebook" | "email" }
  landing6Menu: "landing6.menu", // mobile menu; props: { action: "open" | "close" }
  // /themissingcrown carnival hunt home
  crownCta: "crown.cta", // props: { where: "hero" | "steps" | "story" | "band" | "teams", target }
  crownFaq: "crown.faq", // props: { question, action: "open" | "close" } (never the search text)
  crownFont: "crown.font", // design-review font picker; props: { font }
  crownSocial: "crown.social", // props: { network: "instagram" | "tiktok" | "facebook" | "email" }
  // /carnival-intro poster puzzle (never the typed key, only outcomes)
  carnivalOpening: "carnival.opening", // durationMs; props: { action: "finished" | "skipped" }
  // landing office walk-in opening (phone hero)
  officeIntro: "office.intro", // durationMs; props: { action: "finished" | "skipped", device }
  carnivalUv: "carnival.uv_toggle", // props: { on }
  carnivalMarks: "carnival.marks_found", // props: { mark, total } (once per mark per poster view)
  carnivalPosterOpen: "carnival.poster_open", // props: { fullscreen }
  carnivalPosterClose: "carnival.poster_close", // durationMs; props: { uv, zoomed }
  carnivalNotesOpen: "carnival.notes_open", // props: { where: "poster" | "page" }
  carnivalWorksheet: "carnival.worksheet", // props: { filled, total } (never the letters)
  carnivalKeyCheck: "carnival.key_check", // props: { result: "correct" | "close" | "wrong" | "unset" | "cooldown", attempt, remaining }
  carnivalResetPrompt: "carnival.reset_prompt", // "start over" confirm popup; props: { action: "shown" | "cancel" }
  carnivalKeyGate: "carnival.key_gate", // signed-out sign-in popup; props: { action: "shown" | "sign_up" | "sign_in" | "dismiss", step: "key" | "phrase" }
  carnivalPhraseCheck: "carnival.phrase_check", // props: { result: "correct" | "wrong" | "locked" | "unset" | "auth", attempt, filled }
  carnivalReset: "carnival.reset",
  carnivalScroll: "carnival.scroll", // guards scroll after the key; props: { action: "open" | "close" | "zoom" | "narrate_play" | "narrate_pause" | "narrate_end", from?, at? }
  carnivalTip: "carnival.tip", // poster viewer tip box; props: { action: "open" | "close", uv }
  carnivalDock: "carnival.dock", // mobile action bar; props: { action: "poster" | "key" | "decrypt" | "notes", step }
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
