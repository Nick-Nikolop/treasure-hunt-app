"use server"

import { verifyKey, verifyPhrase, type KeyVerdict, type PhraseVerdict } from "@/lib/carnival-intro/key"
import { isHeldByMaintenance } from "@/lib/site-maintenance"

// A short pause keeps scripted guessing slow without bothering a person.
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function checkCarnivalKey(input: unknown): Promise<KeyVerdict> {
  if (await isHeldByMaintenance()) return "unset"
  if (typeof input !== "string" || !input.trim() || input.length > 64) return "wrong"
  await pause(450)
  return verifyKey(input)
}

export async function checkCarnivalPhrase(key: unknown, phrase: unknown): Promise<{ verdict: PhraseVerdict; phrase?: string }> {
  if (await isHeldByMaintenance()) return { verdict: "unset" }
  if (typeof key !== "string" || key.length > 64) return { verdict: "locked" }
  if (typeof phrase !== "string" || !phrase.trim() || phrase.length > 120) return { verdict: "wrong" }
  await pause(600)
  return verifyPhrase(key, phrase)
}
