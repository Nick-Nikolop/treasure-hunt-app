"use server"

import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { isBootstrapEmail } from "@/lib/admin"
import { SITE_MAINTENANCE } from "@/lib/maintenance"

export type MaintenanceLoginVerdict = "ok" | "admin" | "denied"

/**
 * Pre-check run before the hidden maintenance login attempts a real sign-in, so
 * nobody but the founder ever gets a session while the site is closed. The
 * layout gate still enforces the rule on every request; this only decides which
 * message the form shows.
 */
export async function checkMaintenanceLogin(rawEmail: string): Promise<MaintenanceLoginVerdict> {
  const email = String(rawEmail ?? "").trim().toLowerCase()
  if (!email || email.length > 320) return "denied"
  if (!SITE_MAINTENANCE || isBootstrapEmail(email)) return "ok"

  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email))
    .limit(1)

  return rows[0]?.role === "superadmin" ? "admin" : "denied"
}
