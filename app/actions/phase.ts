"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { addPhaseLead } from "@/lib/hunt-config"
import { eq, sql } from "drizzle-orm"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type PhaseEmailResult =
  | { ok: true; kind: "existing" | "new" }
  | { ok: false; error: "email" }

/**
 * Phase-1 email capture. Decides whether the address already belongs to an
 * account (route them to sign-in) or is brand new (offer create-now vs
 * notify-later). No account is created here: inline sign-up runs through the
 * Better Auth client, exactly like the normal sign-up form.
 */
export async function checkPhaseEmail(rawEmail: string): Promise<PhaseEmailResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email" }

  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email))
    .limit(1)

  return { ok: true, kind: rows.length > 0 ? "existing" : "new" }
}

/** Add a brand-new visitor's email to the notify-later waitlist. */
export async function joinPhaseWaitlist(rawEmail: string): Promise<{ ok: boolean }> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false }
  await addPhaseLead(email)
  return { ok: true }
}
