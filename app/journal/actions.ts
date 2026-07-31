"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"
import { getTotalLeads } from "@/lib/leads"
import { getFinaleConfig, composeNote2WithHint, isTrailEndHeld } from "@/lib/finale"
import {
  getOrAssignCompassVariant,
  peekCompassVariant,
  COMPASS_VARIANT_COUNT,
  resolveCrewKey,
} from "@/lib/compass-variant"
import { getAdminUser } from "@/lib/admin"
import { hasReachedCompass, hasReachedTrailEnd } from "@/lib/hunt"
import { getCrewGrants } from "@/lib/finale-grants"
import { isHoldBypassedForUser } from "@/lib/maintenance"

/** One handwritten note plus the shouted call-to-action stamped under it. */
export type FinaleNote = {
  body: string
  bodyEn: string
  cta: string
  ctaEn: string
  /**
   * Optional highlighted aside under the note. Used by NOTE 2 for the "put it
   * back where you found it" request, which is a message from us to the crew
   * rather than part of Pytheas's handwriting. It belongs on note 2 because that
   * is the note handed over once the compass is actually in their hands.
   */
  notice?: string
  noticeEn?: string
}

/**
 * The "please wait" paper shown INSTEAD of note 1 while the trail-end hold is on.
 * Not secret (it deliberately reveals nothing about where anything is hidden), so
 * it is sent to everyone and the `held` flag decides whether it is rendered.
 */
export type HoldPaper = {
  title: string
  titleEn: string
  body: string
  bodyEn: string
}

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
export async function getFinaleNotes(previewVariant?: number): Promise<{
  note1: FinaleNote | null
  note2: FinaleNote | null
  /**
   * Admin-only preview controls for note 2's rotating hint. Null for ordinary
   * explorers, who must never learn that other versions exist, let alone read
   * them: the four hints name four different hiding places.
   */
  variants: { active: number; count: number; assigned: number | null } | null
  /**
   * True when this viewer has closed the trail but the hold is still on, so
   * `note1` is null for a reason that is NOT "unearned". The UI needs the two
   * cases separated: one shows the hold paper, the other shows nothing at all.
   */
  held: boolean
  /** Hold paper copy. Always sent, so admins can preview it on demand. */
  hold: HoldPaper
} | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  // Superadmins and the local/preview override both see everything.
  const admin = (await getAdminUser()) !== null
  const store = await cookies()
  const overrideActive = isOverrideAuthorized() && store.get(PREVIEW_COOKIE)?.value !== undefined
  const bypass = admin || overrideActive

  const [finale, trailEnd, compass, grants] = await Promise.all([
    getFinaleConfig(),
    bypass ? Promise.resolve(true) : hasReachedTrailEnd(session.user.id),
    bypass ? Promise.resolve(true) : hasReachedCompass(session.user.id),
    getCrewGrants(session.user.id),
  ])

  // A reveal needs BOTH: the crew reached the step AND an admin granted it in the
  // finale tab. Admins/preview bypass the grant so the finale stays proofreadable.
  // Sealing here on the SERVER (not just hiding a button) is what guarantees the
  // note text never reaches an ungranted crew's browser.
  const mayNote1 = bypass || grants.note1
  const mayNote2 = bypass || grants.note2

  // Admins and the preview override are never held, so the finale stays fully
  // proofreadable from the journal while real crews are parked at lead 10.
  // The hold-bypass account is exempt from the QUEUE ONLY, never from the grants.
  // `bypass` above fakes progress and skips grants so admins can proofread, which
  // is the opposite of what a test account needs; this one leaves every real gate
  // standing, so it is folded in here and NOT into `mayNote1`/`mayNote2`.
  const holdBypassed = await isHoldBypassedForUser(session.user.id)
  const held = !bypass && !holdBypassed && trailEnd && isTrailEndHeld(finale)
  const note1Open = trailEnd && !held && mayNote1
  // Note 2 carries the rotating hint since 07-31. It needs the compass to have
  // been physically found, which already implies the trail end and the hold, so
  // there is no `held` term here: a held crew cannot have scanned the compass.
  const note2Open = compass && mayNote2

  // Which of the four rotating hints this crew reads. A real crew is assigned one
  // on first read and keeps it forever; an admin/preview only PEEKS, so
  // proofreading the note never consumes a slot and never shifts what the next
  // real crew is handed. With nothing assigned yet, they preview the first hint.
  //
  // Deliberately gated on `note2Open`, the note the hint actually rides on, so a
  // crew is never assigned a slot for text they cannot read yet: that would shift
  // which hint the next real crew receives. Same reasoning that previously gated
  // this on note 1 rather than on `trailEnd`.
  let variantIndex = 0
  let assigned: number | null = null
  if (note2Open) {
    const crewKey = await resolveCrewKey(session.user.id)
    if (bypass) {
      assigned = await peekCompassVariant(crewKey)
      // An explicit pick wins, so all four versions can be proofread from one
      // account. Validated here rather than trusted: this is a server action a
      // player could call directly, and an out-of-range index would silently
      // read as version 1 instead of being refused.
      const picked =
        typeof previewVariant === "number" &&
        Number.isInteger(previewVariant) &&
        previewVariant >= 0 &&
        previewVariant < COMPASS_VARIANT_COUNT
          ? previewVariant
          : null
      variantIndex = picked ?? assigned ?? 0
    } else {
      // Ordinary explorers are ASSIGNED one and keep it forever, and any
      // previewVariant they send is ignored: the note names a real hiding place,
      // so letting a player choose would hand them all four.
      variantIndex = await getOrAssignCompassVariant(crewKey)
    }
  }
  // Built only when note 2 is actually open. Composing it unconditionally would
  // leave the hiding place sitting in a local for every caller, one careless edit
  // away from being spread into the response.
  const composed = note2Open ? composeNote2WithHint(finale, variantIndex) : null

  return {
    // Sealed on the SERVER, not merely hidden in the UI, so the text never
    // reaches an unearned crew's browser where devtools would read it straight
    // out of the network response.
    note1: note1Open
      ? {
          body: finale.note1,
          bodyEn: finale.note1En,
          cta: finale.note1Cta,
          ctaEn: finale.note1CtaEn,
        }
      : null,
    note2: note2Open && composed
      ? {
          // Carries the rotating hint, so this body is the one that names a real
          // hiding place. `composed` is null unless note 2 is open, so the hint
          // cannot reach a viewer who has not earned it.
          body: composed.body,
          bodyEn: composed.bodyEn,
          cta: finale.note2Cta,
          ctaEn: finale.note2CtaEn,
          // Rides on note 2, not note 1: the crew only HAS the compass once
          // they have found it, so asking for it back any earlier is premature.
          notice: finale.compassReturn,
          noticeEn: finale.compassReturnEn,
        }
      : null,
    variants:
      bypass && compass
        ? { active: variantIndex, count: COMPASS_VARIANT_COUNT, assigned }
        : null,
    held,
    hold: {
      title: finale.holdTitle,
      titleEn: finale.holdTitleEn,
      body: finale.holdBody,
      bodyEn: finale.holdBodyEn,
    },
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
