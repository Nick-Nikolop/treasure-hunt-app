import { pgTable, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core"

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

// The secret token printed inside each lead's physical QR code. One row per
// lead that is unlocked by scanning (leads 2..9). Stable so printed codes keep
// working; regenerating a token invalidates the old printed QR.
export const clueToken = pgTable("clue_token", {
  leadOrder: integer("leadOrder").primaryKey(),
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
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
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
