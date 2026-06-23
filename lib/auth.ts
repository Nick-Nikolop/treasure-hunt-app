import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { logActivity } from "@/lib/activity"

// Resolve the base URL across production, Vercel previews, and the v0 preview iframe.
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL || "http://localhost:3000")

// Accumulate every origin Better Auth should trust. Dropping any of these
// breaks auth in that environment because the session cookie gets rejected.
const trustedOrigins = Array.from(
  new Set(
    [
      process.env.V0_RUNTIME_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
      process.env.BETTER_AUTH_URL,
      "http://localhost:3000",
    ].filter(Boolean) as string[],
  ),
)

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    // Block sign-in until the account's email has been verified. Better Auth
    // automatically fires sendVerificationEmail on sign-up (and on a blocked
    // sign-in) so the user always has a fresh link to click.
    requireEmailVerification: true,
  },
  emailVerification: {
    // Clicking the link signs the user in and lands them home.
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    // Better Auth builds `url` (a one-time verify link to /api/auth/verify-email).
    // We relay it to the Google Apps Script web app, which logs the request to
    // the "Registration Logs" sheet and sends the actual email via MailApp.
    sendVerificationEmail: async ({ user, url }) => {
      const webhook = process.env.APPS_SCRIPT_WEBHOOK_URL
      const secret = process.env.APPS_SCRIPT_SECRET
      if (!webhook || !secret) {
        console.log("[v0] Skipping verification email: webhook env vars not set")
        return
      }
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret, email: user.email, link: url }),
        })
        const text = await res.text()
        console.log("[v0] Verification webhook responded:", res.status, text)
      } catch (err) {
        console.log("[v0] Verification webhook failed:", (err as Error).message)
      }
    },
  },
  databaseHooks: {
    // Log every new account and every login. These run after the row is
    // written, so a failure here must never block auth: swallow errors.
    user: {
      create: {
        after: async (createdUser) => {
          try {
            const u = createdUser as {
              id: string
              name?: string | null
              email?: string | null
              firstName?: string | null
              lastName?: string | null
            }
            const name =
              [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
              u.name ||
              u.email ||
              "Someone"
            await logActivity({
              category: "auth",
              action: "auth.signup",
              actorId: u.id,
              actorName: name,
              targetUserId: u.id,
              targetUserName: name,
              summary: `${name} created an account${u.email ? ` (${u.email})` : ""}`,
            })
          } catch {
            // Never let logging break sign-up.
          }
        },
      },
    },
    session: {
      create: {
        after: async (createdSession) => {
          try {
            const s = createdSession as { userId: string }
            // Resolve the user's display name lazily to avoid a stale snapshot.
            const { resolveUserSnapshot } = await import("@/lib/activity")
            const snap = await resolveUserSnapshot(s.userId)
            await logActivity({
              category: "auth",
              action: "auth.login",
              actorId: s.userId,
              actorName: snap.name,
              actorRole: snap.role,
              targetUserId: s.userId,
              targetUserName: snap.name,
              summary: `${snap.name} signed in`,
            })
          } catch {
            // Never let logging break sign-in.
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
      yearOfBirth: {
        type: "number",
        required: false,
        input: true,
      },
      // Access level. Read-only from the client (input: false) so users can
      // never set their own role; only the admin actions / DB change it.
      role: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
