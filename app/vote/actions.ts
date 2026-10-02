"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { DEVICE_COOKIE, getDeviceVoter, newDeviceToken, saveVote } from "@/lib/brand-vote"
import { isVoteChoice, isVoter, type CastVoteResult } from "@/lib/brand-vote-shared"

export async function castBrandVote(name: unknown, choice: unknown): Promise<CastVoteResult> {
  if (!isVoter(name) || !isVoteChoice(choice)) {
    return { ok: false, error: "Μη έγκυρη ψήφος." }
  }

  const store = await cookies()
  let token = store.get(DEVICE_COOKIE)?.value
  if (!token) {
    token = newDeviceToken()
    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  const outcome = await saveVote(name, choice, token)

  if (outcome === "name-locked") {
    return { ok: false, error: `Το όνομα «${name}» έχει ήδη κλειδώσει σε άλλη συσκευή.` }
  }
  if (outcome === "device-taken") {
    const owner = await getDeviceVoter(token)
    return {
      ok: false,
      error: owner
        ? `Αυτή η συσκευή έχει ήδη ψηφίσει ως «${owner}».`
        : "Αυτή η συσκευή έχει ήδη ψηφίσει με άλλο όνομα.",
    }
  }

  revalidatePath("/vote")
  return { ok: true }
}
