"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"
import { getFinaleConfig } from "@/lib/finale"
import { getAdminUser } from "@/lib/admin"
import { hasReachedCompass, hasReachedTrailEnd } from "@/lib/hunt"

/** One handwritten note plus the shouted call-to-action stamped under it. */
export type FinaleNote = { body: string; bodyEn: string; cta: string; ctaEn: string }

/**
 * Both of Pytheas's handwritten notes for the journal, each returned ONLY once
 * it has actually been earned: note 1 by scanning the final lead's QR (which
 * closes the paper trail), note 2 by scanning the compass QR.
 *
 * The gating is deliberately done here on the server rather than only in the
 * UI. These notes name real hiding places in Kalamata, so if they were always
 * sent down, a curious player could read the compass and treasure locations
 * straight out of the network response without leaving their chair.
 *
 * Superadmins always receive both, so the finale can be proofread from the
 * journal without planting fake scans. The preview override counts too, so the
 * testing panel keeps working.
 */
export async function getFinaleNotes(): Promise<{
  note1: FinaleNote | null
  note2: FinaleNote | null
} | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  // Superadmins and the local/preview override both see everything.
  const admin = (await getAdminUser()) !== null
  const store = await cookies()
  const overrideActive = isOverrideAuthorized() && store.get(PREVIEW_COOKIE)?.value !== undefined
  const bypass = admin || overrideActive

  const [finale, trailEnd, compass] = await Promise.all([
    getFinaleConfig(),
    bypass ? Promise.resolve(true) : hasReachedTrailEnd(session.user.id),
    bypass ? Promise.resolve(true) : hasReachedCompass(session.user.id),
  ])

  return {
    note1: trailEnd
      ? {
          body: finale.note1,
          bodyEn: finale.note1En,
          cta: finale.note1Cta,
          ctaEn: finale.note1CtaEn,
        }
      : null,
    note2: compass
      ? {
          body: finale.note2,
          bodyEn: finale.note2En,
          cta: finale.note2Cta,
          ctaEn: finale.note2CtaEn,
        }
      : null,
  }
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
