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
