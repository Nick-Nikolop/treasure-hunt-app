import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin"
import { MAX_TARGETS, countTargets, createTarget, deleteTarget } from "@/lib/ar-lab/storage"

// A route handler instead of a Server Action: the compiled tracking data can be
// well past the 1 MB Server Action body limit.
const DATA_URL = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  unlockTitle: z.string().trim().min(1).max(80),
  unlockBody: z.string().trim().min(1).max(600),
  refImage: z.string().max(900_000).regex(DATA_URL),
  mindData: z.string().min(16).max(3_500_000).regex(/^[A-Za-z0-9+/=]+$/),
  featureCount: z.number().int().min(0).max(100_000),
  width: z.number().int().min(1).max(10_000),
  height: z.number().int().min(1).max(10_000),
})

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 })

  if ((await countTargets()) >= MAX_TARGETS) {
    return NextResponse.json({ error: "limit" }, { status: 409 })
  }

  const id = await createTarget({ ...parsed.data, createdBy: admin.id })
  return NextResponse.json({ id })
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const id = request.nextUrl.searchParams.get("id")
  if (!id || id.length > 64) return NextResponse.json({ error: "invalid" }, { status: 400 })

  await deleteTarget(id)
  return NextResponse.json({ ok: true })
}
