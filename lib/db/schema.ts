import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"

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
