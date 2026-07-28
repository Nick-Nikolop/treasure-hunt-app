import { pgTable, text, timestamp, boolean, integer, jsonb, index, doublePrecision } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // Custom profile fields collected at sign-up
  firstName: text("firstName"),
  lastName: text("lastName"),
  yearOfBirth: integer("yearOfBirth"),
  // Access level: "user" (default) or "superadmin". Drives the admin dashboard.
  role: text("role").notNull().default("user"),
  // Record of consent to the Terms of Service + Privacy Policy captured at
  // sign-up. `termsVersion` is the document revision (see lib/legal.ts) and
  // `acceptedTermsAt` is stamped server-side. A basic GDPR proof-of-consent.
  termsVersion: text("termsVersion"),
  acceptedTermsAt: timestamp("acceptedTermsAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// A crew. One row per team. `ownerId` is the user who created it and can be
// transferred when the owner leaves. `inviteCode` is the shareable, reusable
// join token (regenerable by the owner).
export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("ownerId").notNull(),
  inviteCode: text("inviteCode").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Membership join row. `userId` is UNIQUE, which is what enforces the
// one-team-per-user rule at the database level. `role` is "owner" | "member".
export const teamMember = pgTable("team_member", {
  id: text("id").primaryKey(),
  teamId: text("teamId").notNull(),
  userId: text("userId").notNull().unique(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
})

// One row per (user, lead) the user has unlocked. This is the history that
// powers both progression and the leaderboard ("reached lead N at time T").
// `source` records how it was unlocked: "qr" | "time" | "admin".
export const leadUnlock = pgTable("lead_unlock", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  leadOrder: integer("leadOrder").notNull(),
  unlockedAt: timestamp("unlockedAt").notNull().defaultNow(),
  source: text("source").notNull().default("qr"),
})

// The admin-managed leads of the hunt. This is the runtime source of truth for
// the set of stops, their order, their journal copy, difficulty and stamp
// image. Seeded once from the hardcoded defaults in lib/clues.ts.
//
//  - `id`        STABLE identity. A printed QR code binds to this id, so a lead
//                keeps its QR no matter how it is reordered. Never changes.
//  - `position`  1-based slot in the sequence. This is what the progression
//                engine uses as "leadOrder". Reordering rewrites positions;
//                identity (`id`) stays put.
//  - `stampImageUrl` the γραμματόσημο (passport stamp) image shown in the
//                journal. Uploaded to Blob by an admin; falls back to the
//                bundled art when null.
//  - `stampAspect` suggested/authored aspect ratio for the stamp, e.g. "2:3".
export const lead = pgTable(
  "lead",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull(),
    country: text("country").notNull(),
    countryEn: text("countryEn").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    subtitleEn: text("subtitleEn").notNull().default(""),
    // lucide icon name used on the clue card (kept for the card + as a
    // fallback visual). One of the names in lib/clues.ts `Clue["icon"]`.
    icon: text("icon").notNull().default("Landmark"),
    // Journal narrative, stored raw with a blank line between paragraphs.
    body: text("body").notNull().default(""),
    bodyEn: text("bodyEn").notNull().default(""),
    stampImageUrl: text("stampImageUrl"),
    stampAspect: text("stampAspect").notNull().default("2:3"),
    // Full-bleed background art shown behind this lead's journal page. Uploaded
    // to Blob by an admin; falls back to a bundled landmark image when null.
    backgroundImageUrl: text("backgroundImageUrl"),
    // Which bundled compass watermark sits behind the journal text.
    // One of the keys in lib/compass.ts `COMPASS_VARIANTS`.
    compassVariant: text("compassVariant").notNull().default("s-to-n"),
    difficulty: text("difficulty").notNull().default("easy"),
    // GPS gate for scans: the physical spot the QR lives at. When both lat and
    // lng are set, a scan requires the explorer to be within `geoRadiusM`
    // metres (falling back to a global default when null). Left null for leads
    // whose real-world location has not been configured yet.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geoRadiusM: integer("geoRadiusM"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    positionIdx: index("lead_position_idx").on(t.position),
  }),
)

// The secret token printed inside each lead's physical QR code. One row per
// scannable lead plus the dedicated finishing QR (leadId = "__finish__").
// Keyed by the STABLE lead id so a printed code keeps unlocking its lead even
// after the sequence is reordered. Regenerating a token invalidates the old
// printed QR. `leadOrder` is a legacy surrogate kept only to satisfy the
// original primary key; the app keys off `leadId`.
export const clueToken = pgTable("clue_token", {
  leadOrder: integer("leadOrder").primaryKey(),
  leadId: text("leadId").unique(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// An admin-authored hint. Reached via a shareable link (/hint/<token>) and
// shown only to signed-in explorers. `leadOrder` is optional: when set, the
// hint page shows which lead it belongs to (number + country).
export const hint = pgTable("hint", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // Optional association to a lead by its STABLE id (survives reordering).
  // `leadOrder` is legacy and no longer written; kept for backward reads.
  leadId: text("leadId"),
  leadOrder: integer("leadOrder"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Global leaderboard scoring tiers. A single row (id = "default"). Placement
// points are the base awarded to the 1st/2nd/3rd finisher of each lead, with
// everyone else getting `restPoints`. Medium/Hard leads add a flat bonus to
// every tier (so the difficulty just shifts the whole reward up).
export const scoreConfig = pgTable("score_config", {
  id: text("id").primaryKey().default("default"),
  firstPoints: integer("firstPoints").notNull().default(100),
  secondPoints: integer("secondPoints").notNull().default(70),
  thirdPoints: integer("thirdPoints").notNull().default(50),
  restPoints: integer("restPoints").notNull().default(30),
  mediumBonus: integer("mediumBonus").notNull().default(50),
  hardBonus: integer("hardBonus").notNull().default(150),
  // Minimum seconds that must pass between a crew's consecutive QR solves. An
  // anti-cheat gate so leads can't be scanned suspiciously fast back-to-back.
  solveCooldownSeconds: integer("solveCooldownSeconds").notNull().default(900),
  // ── Phased rollout control (all live on this single settings row) ──────────
  // "auto" (follow the two countdowns) or a forced phase "1" | "2" | "3".
  phaseOverride: text("phaseOverride").notNull().default("auto"),
  // When phase 1 → 2 auto-advances (site opens). NULL falls back to the code
  // default in lib/phase.ts.
  phase2UnlockAt: timestamp("phase2UnlockAt"),
  // When phase 2 → 3 auto-advances (journal + leaderboard open). NULL falls
  // back to the code default in lib/phase.ts.
  journalUnlockAt: timestamp("journalUnlockAt"),
  // How strongly the parchment wash covers the landmark art behind every
  // journal lead page (0 = art fully visible, 100 = art fully hidden). One
  // global knob for all leads.
  leadBgWashPct: integer("leadBgWashPct").notNull().default(72),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Notify-later waitlist. In phase 1, a brand-new visitor can drop just their
// email (instead of creating an account) so we can email them when the next
// phase unlocks. Email only, deduped by the UNIQUE constraint.
export const phaseLead = pgTable("phase_lead", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Consent captured when the visitor joined the waitlist: the Terms/Privacy
  // revision they accepted and when. Stored as proof of the opt-in.
  termsVersion: text("termsVersion"),
  acceptedTermsAt: timestamp("acceptedTermsAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Per-lead difficulty set by admins. One row per lead order; missing rows mean
// the lead defaults to "easy". Difficulty selects which bonus (if any) is added
// to that lead's placement points.
export const leadDifficulty = pgTable("lead_difficulty", {
  leadOrder: integer("leadOrder").primaryKey(),
  difficulty: text("difficulty").notNull().default("easy"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Admin-authored overrides for a lead's editable copy. One row per lead order;
// any NULL/empty field falls back to the hardcoded default in lib/clues.ts.
// `body`/`bodyEn` are raw text where paragraphs are separated by a blank line;
// they are split back into the journal's paragraph array at render time so the
// journal formatting stays identical. Country name and stamp icon are NOT
// editable and always come from the defaults.
export const leadContent = pgTable("lead_content", {
  leadOrder: integer("leadOrder").primaryKey(),
  subtitle: text("subtitle"),
  subtitleEn: text("subtitleEn"),
  body: text("body"),
  bodyEn: text("bodyEn"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Append-only audit log of everything that happens in the hunt: lead solves,
// the team lifecycle (create/join/leave/disband/rename), admin actions, and
// auth events (signup/login). Actor and target identities are SNAPSHOTTED as
// plain text (no FKs) so a log entry stays meaningful even after the user or
// team it references is deleted. `metadata` carries event-specific extras.
export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    // Coarse grouping for filtering: "lead" | "team" | "admin" | "auth".
    category: text("category").notNull(),
    // Specific dotted event name, e.g. "lead.solved", "team.created".
    action: text("action").notNull(),
    // Who performed it (null for system/time-based events).
    actorId: text("actorId"),
    actorName: text("actorName"),
    actorRole: text("actorRole"),
    // The user this event is about, if any (may equal the actor).
    targetUserId: text("targetUserId"),
    targetUserName: text("targetUserName"),
    // The team this event is about, if any.
    teamId: text("teamId"),
    teamName: text("teamName"),
    // The lead this event is about, if any (1..TOTAL_CLUES).
    leadOrder: integer("leadOrder"),
    // Human-readable one-line description, composed at write time.
    summary: text("summary").notNull(),
    // Structured event-specific extras (old/new values, source, etc.).
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => ({
    createdAtIdx: index("activity_log_createdAt_idx").on(t.createdAt),
    categoryIdx: index("activity_log_category_idx").on(t.category),
    targetUserIdx: index("activity_log_targetUser_idx").on(t.targetUserId),
    teamIdx: index("activity_log_team_idx").on(t.teamId),
  }),
)

// Trackable marketing links. Each physical thing we print (flyer, poster,
// t-shirt, sticker batch, ...) gets one of these. Its token resolves at
// /c/<token>, which logs the visit and 302-redirects to the landing page.
// `name` is what we call the campaign; `label` is an optional free note
// (e.g. "Handed out at the square", "T-shirts").
export const campaignLink = pgTable("campaign_link", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  label: text("label"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// One row per visit to a campaign link. `visitorId` is an anonymous cookie id
// so repeat visits from the same device can be collapsed into a single unique
// visitor; `isUnique` is set true the first time a visitorId is seen for a link.
export const campaignVisit = pgTable(
  "campaign_visit",
  {
    id: text("id").primaryKey(),
    linkId: text("linkId").notNull(),
    visitorId: text("visitorId"),
    isUnique: boolean("isUnique").notNull().default(false),
    userAgent: text("userAgent"),
    referrer: text("referrer"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    linkIdIdx: index("campaign_visit_linkId_idx").on(t.linkId),
    createdAtIdx: index("campaign_visit_createdAt_idx").on(t.createdAt),
  }),
)

// High-volume behavioural analytics. One row per tracked client event: page
// views, button/CTA clicks, funnel steps, and timing events (e.g. how long a
// login took). Unlike `activity_log` (a curated audit trail of business
// events), this captures anonymous + signed-in front-end behaviour.
//
//  - `name`      dotted event name, e.g. "page.view", "auth.login.submit".
//  - `category`  coarse bucket for filtering ("page" | "auth" | "hunt" | ...).
//  - `userId`    signed-in user (resolved server-side from the session), or null.
//  - `anonId`    client-minted anonymous id (localStorage) so anonymous sessions
//                can be stitched together without identifying anyone.
//  - `sessionId` per browsing-session id (resets when the tab session ends).
//  - `durationMs` optional timing payload (time-on-page, form fill duration).
//  - `props`     event-specific structured extras.
export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull().default("general"),
    userId: text("userId"),
    anonId: text("anonId"),
    sessionId: text("sessionId"),
    path: text("path"),
    referrer: text("referrer"),
    device: text("device"),
    browser: text("browser"),
    os: text("os"),
    durationMs: integer("durationMs"),
    props: jsonb("props").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index("analytics_event_name_idx").on(t.name),
    createdAtIdx: index("analytics_event_createdAt_idx").on(t.createdAt),
    categoryIdx: index("analytics_event_category_idx").on(t.category),
    userIdIdx: index("analytics_event_userId_idx").on(t.userId),
  }),
)

// Cookie/consent decisions. One row per decision a visitor makes in the cookie
// banner, so we keep an auditable GDPR record of who consented to what and when.
//
//  - `decision`  "accepted" (all), "rejected" (necessary only), or "necessary".
//  - `analytics` whether the visitor allowed non-essential analytics cookies.
//  - `anonId`    client-minted anonymous id (localStorage), lets us tie repeat
//                decisions from the same device together without identifying it.
//  - `userId`    signed-in user resolved server-side from the session, or null.
//  - `policyVersion` the cookie-policy revision shown at decision time.
export const cookieConsent = pgTable(
  "cookie_consent",
  {
    id: text("id").primaryKey(),
    anonId: text("anonId"),
    userId: text("userId"),
    decision: text("decision").notNull(),
    analytics: boolean("analytics").notNull().default(false),
    policyVersion: text("policyVersion"),
    locale: text("locale"),
    path: text("path"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    anonIdIdx: index("cookie_consent_anonId_idx").on(t.anonId),
    userIdIdx: index("cookie_consent_userId_idx").on(t.userId),
    createdAtIdx: index("cookie_consent_createdAt_idx").on(t.createdAt),
  }),
)

// Diagnostic "ping me your location" QR codes. This is an internal, bootstrap
// admin only tool: the founder generates a QR whose scan page asks the visitor
// for their location and reports it back. Each QR is one `location_qr` row and
// every scan that returns coordinates is one `location_ping` row.
export const locationQr = pgTable(
  "location_qr",
  {
    token: text("token").primaryKey(),
    label: text("label"),
    createdBy: text("createdBy"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("location_qr_createdAt_idx").on(t.createdAt),
  }),
)

// Manual photo-proof of presence, submitted when an explorer can't/won't pass
// the GPS scan gate (permission denied, or GPS says they're too far). Holds
// 1-3 image URLs (Vercel Blob) and its review lifecycle. A superadmin approves
// (which unlocks the lead for the submitter's crew) or rejects (with a reason).
// The explorer is notified of the decision; `acknowledgedAt` records when they
// have seen the decision popup so it stops re-appearing.
//
//  - `context`        why the fallback was offered: "denied" | "too_far".
//  - `photoUrls`      JSON string[] of Blob URLs (unguessable random suffixes).
//  - `status`         "pending" | "approved" | "rejected".
//  - `userName`       snapshot of the submitter's display name at submit time.
//  - raw coordinates are intentionally NOT stored (only the context label).
export const proofSubmission = pgTable(
  "proof_submission",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    userName: text("userName").notNull(),
    leadOrder: integer("leadOrder").notNull(),
    leadId: text("leadId"),
    token: text("token").notNull(),
    context: text("context").notNull(),
    photoUrls: jsonb("photoUrls").$type<string[]>().notNull(),
    note: text("note"),
    status: text("status").notNull().default("pending"),
    reason: text("reason"),
    reviewerId: text("reviewerId"),
    reviewerName: text("reviewerName"),
    decidedAt: timestamp("decidedAt"),
    acknowledgedAt: timestamp("acknowledgedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("proof_submission_userId_idx").on(t.userId),
    statusIdx: index("proof_submission_status_idx").on(t.status),
    createdAtIdx: index("proof_submission_createdAt_idx").on(t.createdAt),
  }),
)

// One row per returned location. lat/lng/accuracy are stored as text to avoid
// float precision surprises; they are parsed back to numbers in the UI.
export const locationPing = pgTable(
  "location_ping",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    lat: text("lat").notNull(),
    lng: text("lng").notNull(),
    accuracy: text("accuracy"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    tokenIdx: index("location_ping_token_idx").on(t.token),
    tokenCreatedIdx: index("location_ping_token_createdAt_idx").on(t.token, t.createdAt),
  }),
)
