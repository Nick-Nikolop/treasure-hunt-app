import "server-only"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { headers } from "next/headers"

/**
 * The one account that is always treated as superadmin. On first visit to the
 * admin area this email is auto-promoted in the DB, so the very first
 * superadmin exists without a manual SQL step. Everyone else must be promoted
 * by an existing superadmin from the dashboard.
 */
export const BOOTSTRAP_SUPERADMIN_EMAIL = "nick_nikol@hotmail.gr"

export function isBootstrapEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === BOOTSTRAP_SUPERADMIN_EMAIL
}

export type AdminUser = {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Resolve the current user and confirm they are a superadmin. Returns null when
 * there is no session or the user is not a superadmin. The bootstrap email is
 * auto-promoted on the fly so the first admin can always get in.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const rows = await db
    .select({ id: user.id, email: user.email, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const current = rows[0]
  if (!current) return null

  // Bootstrap: make sure the founding email is always a superadmin.
  if (current.role !== "superadmin" && isBootstrapEmail(current.email)) {
    await db.update(user).set({ role: "superadmin" }).where(eq(user.id, current.id))
    return { ...current, role: "superadmin" }
  }

  if (current.role !== "superadmin") return null
  return current
}

/** Throwing variant for server actions: guarantees the caller is a superadmin. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) throw new Error("Forbidden")
  return admin
}

/**
 * Stricter guard for founder-only tooling: the caller must be a superadmin AND
 * the bootstrap founder email. Other superadmins are rejected. Used to gate the
 * internal location-ping diagnostic so it stays invisible to everyone else.
 */
export async function requireBootstrapAdmin(): Promise<AdminUser> {
  const admin = await requireAdmin()
  if (!isBootstrapEmail(admin.email)) throw new Error("Forbidden")
  return admin
}

/** Count current superadmins, used to prevent removing the last one. */
export async function superadminCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "superadmin"))
  return rows[0]?.count ?? 0
}
