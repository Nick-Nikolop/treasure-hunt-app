"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { PREVIEW_COOKIE } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"
import { getFinaleConfig } from "@/lib/finale"

/**
 * The journal's closing handwritten note ("find my compass"), both languages.
 * Read on demand by the final journal page once every lead is solved. Requires
 * a signed-in explorer (the journal itself is already gated to accounts).
 */
export async function getFinaleNote1(): Promise<{ note1: string; note1En: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const finale = await getFinaleConfig()
  return { note1: finale.note1, note1En: finale.note1En }
}

/**
 * Force a specific number of clues open for the current browser only.
 * Stored in a cookie, so it never affects other visitors. The server still
 * gates content, so this is the single source of truth for the override.
 */
export async function setPreviewCount(count: number) {
  const total = await getTotalLeads()
  const clamped = Math.max(0, Math.min(total, Math.floor(count)))
  const store = await cookies()
  store.set(PREVIEW_COOKIE, String(clamped), {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  })
  revalidatePath("/journal")
  revalidatePath("/")
}

/** Remove the override and go back to the real time-locked schedule. */
export async function clearPreview() {
  const store = await cookies()
  store.delete(PREVIEW_COOKIE)
  revalidatePath("/journal")
  revalidatePath("/")
}
