import { betterAuth } from "better-auth"
import { Pool } from "pg"

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
