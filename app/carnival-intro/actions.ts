"use server"

import { verifyKey, type KeyVerdict } from "@/lib/carnival-intro/key"
import { isHeldByMaintenance } from "@/lib/site-maintenance"

export async function checkCarnivalKey(input: unknown): Promise<KeyVerdict> {
  if (await isHeldByMaintenance()) return "unset"
  if (typeof input !== "string" || !input.trim() || input.length > 64) return "wrong"
  // A short pause keeps scripted guessing slow without bothering a person.
  await new Promise((r) => setTimeout(r, 450))
  return verifyKey(input)
}
