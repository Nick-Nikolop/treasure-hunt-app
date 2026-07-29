// Single source of truth for the legal document version and its effective
// date. Bump `TERMS_VERSION` whenever the Terms / Privacy content materially
// changes: consent is stored with the version the user actually agreed to, so
// we can tell who accepted which revision (a GDPR record-of-consent basic).
export const TERMS_VERSION = "2026-07-09"

// Human-readable effective date shown at the top of the legal page. Keep in
// sync with TERMS_VERSION.
export const TERMS_EFFECTIVE = { el: "9 Ιουλίου 2026", en: "9 July 2026" } as const

// Cookie-policy revision shown in the cookie banner. Bump this whenever the set
// of cookies/trackers changes so we can re-ask for consent and keep an audit
// trail of which policy version each visitor accepted. The value is also stored
// in the consent cookie so a stale decision triggers the banner again.
export const COOKIE_POLICY_VERSION = "2026-07-09"

// Name of the cookie that remembers a visitor's cookie decision (so the banner
// does not reappear on every page) and how long it lasts.
export const COOKIE_CONSENT_COOKIE = "pythea_cookie_consent"
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180 // 180 days

// Allowed decision values, shared by the client banner and the server route.
export type CookieDecision = "accepted" | "rejected"

// The legal entity / organiser behind the hunt and its contact point. Update
// these before going live so the privacy notice names a real controller.
export const LEGAL_ORG = {
  name: "The Hunt Kalamata",
  contactEmail: "thehuntkalamata@gmail.com",
  instagram: "@thehuntkalamata",
  /** Single source of truth for the profile link (contact widget + teaser). */
  instagramUrl: "https://www.instagram.com/thehuntkalamata",
} as const
