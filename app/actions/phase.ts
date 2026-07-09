"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { isBootstrapEmail } from "@/lib/admin"
import { addPhaseLead } from "@/lib/hunt-config"
import { TERMS_VERSION } from "@/lib/legal"
import { eq, sql } from "drizzle-orm"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type PhaseEmailResult =
  | { ok: true; kind: "existing" | "new"; isAdmin: boolean }
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
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email))
    .limit(1)

  if (rows.length === 0) return { ok: true, kind: "new", isAdmin: false }

  // Only superadmins can actually sign in during Phase 1. The founding
  // bootstrap email counts even before its role has been persisted.
  const isAdmin = rows[0].role === "superadmin" || isBootstrapEmail(email)
  return { ok: true, kind: "existing", isAdmin }
}

/**
 * Add a brand-new visitor's email to the notify-later waitlist. Consent to the
 * Terms/Privacy is mandatory: the caller must pass the current TERMS_VERSION,
 * which is stored alongside the email as proof of the opt-in.
 */
export async function joinPhaseWaitlist(
  rawEmail: string,
  termsVersion: string,
): Promise<{ ok: boolean }> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false }
  if (termsVersion !== TERMS_VERSION) return { ok: false }
  await addPhaseLead(email, termsVersion)
  return { ok: true }
}
