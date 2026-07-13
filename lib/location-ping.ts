import "server-only"

import { db } from "@/lib/db"
import { locationPing, locationQr } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"

export type LocationPing = {
  id: string
  token: string
  lat: number
  lng: number
  accuracy: number | null
  userAgent: string | null
  createdAt: string
}

function newToken(): string {
  // Unguessable, URL-safe token (same shape as the hunt's lead tokens).
  return randomUUID().replace(/-/g, "").slice(0, 18)
}

/** Create a fresh location-ping QR session and return its token. */
export async function createLocationQr(createdBy: string | null): Promise<string> {
  const token = newToken()
  await db.insert(locationQr).values({ token, createdBy })
  return token
}

/** The most recently generated QR token, or null if none exists yet. */
export async function getActiveLocationQr(): Promise<string | null> {
  const rows = await db
    .select({ token: locationQr.token })
    .from(locationQr)
    .orderBy(desc(locationQr.createdAt))
    .limit(1)
  return rows[0]?.token ?? null
}

/** True when a QR token exists, i.e. pings for it should be accepted. */
export async function locationQrExists(token: string): Promise<boolean> {
  if (!token) return false
  const rows = await db
    .select({ token: locationQr.token })
    .from(locationQr)
    .where(eq(locationQr.token, token))
    .limit(1)
  return rows.length > 0
}

/** Store a returned location for a known QR token. Returns false if unknown. */
export async function recordLocationPing(input: {
  token: string
  lat: number
  lng: number
  accuracy: number | null
  userAgent: string | null
}): Promise<boolean> {
  if (!(await locationQrExists(input.token))) return false
  await db.insert(locationPing).values({
    id: randomUUID(),
    token: input.token,
    lat: String(input.lat),
    lng: String(input.lng),
    accuracy: input.accuracy == null ? null : String(input.accuracy),
    userAgent: input.userAgent ?? null,
  })
  return true
}

/** All pings for a QR token, newest first. */
export async function getLocationPings(token: string, limit = 100): Promise<LocationPing[]> {
  if (!token) return []
  const rows = await db
    .select()
    .from(locationPing)
    .where(eq(locationPing.token, token))
    .orderBy(desc(locationPing.createdAt))
    .limit(limit)
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    lat: Number(r.lat),
    lng: Number(r.lng),
    accuracy: r.accuracy == null ? null : Number(r.accuracy),
    userAgent: r.userAgent,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  }))
}
