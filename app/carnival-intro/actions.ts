"use server"

import { getAdminUser } from "@/lib/admin"
import { attemptKey, clearKeyAttempts, currentUserId, getKeyQuota, saveNotes, type KeyAttempt } from "@/lib/carnival-intro/account"
import { verifyPhrase, type PhraseVerdict } from "@/lib/carnival-intro/key"
import { NOTES_LIMIT } from "@/lib/carnival-intro/limits"
import { isHeldByMaintenance } from "@/lib/site-maintenance"

// A short pause keeps scripted guessing slow without bothering a person.
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type KeyCheckResult = KeyAttempt | { verdict: "auth" }

export async function checkCarnivalKey(input: unknown): Promise<KeyCheckResult> {
  const userId = await currentUserId()
  if (!userId) return { verdict: "auth" }
  if (await isHeldByMaintenance()) return { verdict: "unset", quota: await getKeyQuota(userId) }
  if (typeof input !== "string" || !input.trim() || input.length > 64) {
    return { verdict: "wrong", quota: await getKeyQuota(userId) }
  }
  return attemptKey(userId, input)
}

export async function checkCarnivalPhrase(key: unknown, phrase: unknown): Promise<{ verdict: PhraseVerdict | "auth"; phrase?: string }> {
  if (!(await currentUserId())) return { verdict: "auth" }
  if (await isHeldByMaintenance()) return { verdict: "unset" }
  if (typeof key !== "string" || key.length > 64) return { verdict: "locked" }
  if (typeof phrase !== "string" || !phrase.trim() || phrase.length > 120) return { verdict: "wrong" }
  await pause(600)
  return verifyPhrase(key, phrase)
}

/** «Ξεκίνα από την αρχή» clears the key cooldown, but only for superadmins (testing). Others get false. */
export async function resetCarnivalCooldown(): Promise<boolean> {
  const admin = await getAdminUser()
  if (!admin) return false
  await clearKeyAttempts(admin.id)
  return true
}

export async function saveCarnivalNotes(notes: unknown): Promise<{ ok: boolean }> {
  const userId = await currentUserId()
  if (!userId || typeof notes !== "string" || notes.length > NOTES_LIMIT) return { ok: false }
  await saveNotes(userId, notes)
  return { ok: true }
}
