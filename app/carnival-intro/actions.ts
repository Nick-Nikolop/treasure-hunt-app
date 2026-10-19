"use server"

import { CODE_LENGTH } from "@/lib/carnival-intro/cipher"
import { CARNIVAL_INTRO_SOLUTION, matchesSolution } from "@/lib/carnival-intro/solution"
import { isHeldByMaintenance } from "@/lib/site-maintenance"

export type AnswerResult = { ok: true; phrase: string } | { ok: false }

export async function checkCarnivalAnswer(letters: unknown): Promise<AnswerResult> {
  if (await isHeldByMaintenance()) return { ok: false }
  if (!Array.isArray(letters) || letters.length !== CODE_LENGTH) return { ok: false }
  if (!letters.every((l) => typeof l === "string" && l.length <= 4)) return { ok: false }
  return matchesSolution(letters as string[]) ? { ok: true, phrase: CARNIVAL_INTRO_SOLUTION } : { ok: false }
}
