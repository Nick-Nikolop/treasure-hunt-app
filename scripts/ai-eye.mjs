// AI EYE: the assistant's own superadmin account, used to inspect the site while
// SITE_MAINTENANCE is on without flipping the flag.
//
//   node scripts/ai-eye.mjs provision          create/refresh the account
//   node scripts/ai-eye.mjs login [baseUrl]    sign in, print the session cookie
//
// The password is never stored: it is an HMAC of BETTER_AUTH_SECRET, so anyone
// able to derive it could already forge sessions. Rotating the secret rotates
// this password; re-run `provision` afterwards.

import { createHmac, randomUUID } from "node:crypto"
import { readFileSync, existsSync } from "node:fs"
import pg from "pg"
import { hashPassword } from "better-auth/crypto"

export const AI_EYE_EMAIL = "ai-eye@thehunt.gr"

function loadEnvFile() {
  for (const file of [".env.development.local", ".env.local", ".env"]) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m || process.env[m[1]]) continue
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

function derivePassword() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  return createHmac("sha256", secret).update("ai-eye:v1").digest("base64url")
}

async function provision() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const hash = await hashPassword(derivePassword())
    const existing = await client.query(
      'SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1',
      [AI_EYE_EMAIL],
    )

    let userId = existing.rows[0]?.id
    if (userId) {
      await client.query(
        `UPDATE "user" SET "emailVerified" = true, role = 'superadmin', "updatedAt" = now() WHERE id = $1`,
        [userId],
      )
    } else {
      userId = randomUUID()
      await client.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", role, "firstName", "lastName", "createdAt", "updatedAt")
         VALUES ($1, 'AI EYE', $2, true, 'superadmin', 'AI', 'EYE', now(), now())`,
        [userId, AI_EYE_EMAIL],
      )
    }

    const updated = await client.query(
      `UPDATE account SET password = $2, "updatedAt" = now() WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [userId, hash],
    )
    if (updated.rowCount === 0) {
      await client.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
        [randomUUID(), userId, hash],
      )
    }

    await client.query("COMMIT")
    console.log(`AI EYE ready: ${AI_EYE_EMAIL} (superadmin, verified)`)
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

async function login(baseUrl = "http://localhost:3000") {
  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email: AI_EYE_EMAIL, password: derivePassword() }),
  })
  if (!res.ok) throw new Error(`Sign-in failed: ${res.status} ${await res.text()}`)
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.includes("session_token"))
  if (!cookie) throw new Error("Signed in but no session cookie came back")
  console.log(cookie)
}

loadEnvFile()
const [command, arg] = process.argv.slice(2)
const run = command === "provision" ? provision : command === "login" ? () => login(arg) : null
if (!run) {
  console.error("Usage: node scripts/ai-eye.mjs provision | login [baseUrl]")
  process.exit(1)
}
run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
