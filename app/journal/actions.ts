"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { PREVIEW_COOKIE } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"

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
