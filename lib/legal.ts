// Single source of truth for the legal document version and its effective
// date. Bump `TERMS_VERSION` whenever the Terms / Privacy content materially
// changes: consent is stored with the version the user actually agreed to, so
// we can tell who accepted which revision (a GDPR record-of-consent basic).
export const TERMS_VERSION = "2026-07-09"

// Human-readable effective date shown at the top of the legal page. Keep in
// sync with TERMS_VERSION.
export const TERMS_EFFECTIVE = { el: "9 Ιουλίου 2026", en: "9 July 2026" } as const

// The legal entity / organiser behind the hunt and its contact point. Update
// these before going live so the privacy notice names a real controller.
export const LEGAL_ORG = {
  name: "The Hunt Kalamata",
  contactEmail: "thehuntkalamata@gmail.com",
  instagram: "@thehuntkalamata",
} as const
