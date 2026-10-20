"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin"
import { deleteSourceLabel, normalizeSource, upsertSourceLabel } from "@/lib/source-hits"

export type LabelResult = { ok: true; source: string } | { ok: false; error: string }

function cleanPath(v: unknown): string {
  const raw = typeof v === "string" ? v.trim() : ""
  if (!raw) return "/carnival"
  const p = raw.startsWith("/") ? raw : `/${raw}`
  return p.split(/[?#]/)[0].slice(0, 120) || "/carnival"
}

/** Give a source id a title. Blank id = generate a random 16-char one (like the rollover link). */
export async function saveSourceLabel(input: {
  source?: string
  title: string
  path?: string
  note?: string
}): Promise<LabelResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: "Not allowed." }

  const title = input.title?.trim().slice(0, 80)
  if (!title) return { ok: false, error: "Add a title." }

  const source = input.source?.trim() ? normalizeSource(input.source) : randomBytes(8).toString("hex")
  if (!source) return { ok: false, error: "The id can use letters, numbers, - _ and . only." }

  try {
    await upsertSourceLabel({
      source,
      title,
      path: cleanPath(input.path),
      note: input.note?.trim().slice(0, 280) || null,
      updatedBy: admin.email,
    })
  } catch (err) {
    console.log("[v0] save source label failed:", (err as Error)?.message)
    return { ok: false, error: "Could not save. Try again." }
  }
  revalidatePath("/analytics")
  return { ok: true, source }
}

/** Remove only the title; recorded visits stay. */
export async function removeSourceLabel(source: string): Promise<LabelResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: "Not allowed." }
  const id = normalizeSource(source)
  if (!id) return { ok: false, error: "Unknown source." }
  await deleteSourceLabel(id)
  revalidatePath("/analytics")
  return { ok: true, source: id }
}
