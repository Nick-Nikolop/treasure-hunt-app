import { generateText, Output } from "ai"
import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { DAILY_AI_CHECKS, checksToday, listReferences, logCheck } from "@/lib/ar-lab/storage"

export const maxDuration = 30

const bodySchema = z.object({
  image: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
})

const verdictSchema = z.object({
  match: z.number().int().describe("Number of the matching reference (1-based), or 0 when none match"),
  confidence: z.number().min(0).max(1),
  screen: z.boolean().describe("True when the photo shows a screen, monitor or printed copy of a reference photo instead of the real thing"),
  reason: z.string().describe("One short sentence in Greek explaining the decision"),
})

const MIN_CONFIDENCE = 0.7

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "signin" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 })

  const used = await checksToday(session.user.id)
  if (used >= DAILY_AI_CHECKS) return NextResponse.json({ error: "limit" }, { status: 429 })

  const refs = await listReferences()
  if (refs.length === 0) return NextResponse.json({ error: "empty" }, { status: 409 })

  const content: Array<
    { type: "text"; text: string } | { type: "file"; mediaType: string; data: string; providerOptions?: { openai: { imageDetail: "low" } } }
  > = [
    {
      type: "text",
      text: [
        "You verify a treasure-hunt clue. Below are numbered REFERENCE photos of specific real-world objects or places, then one PLAYER photo from a phone camera.",
        "Decide if the player photo shows the SAME specific object or place as one reference (it may be from another angle, distance or light). A different object of the same kind (another statue, another door) is NOT a match.",
        "Set screen=true when the player is clearly pointing the camera at a monitor, phone screen or print of a reference photo.",
        "Answer with match = reference number, or 0 for none.",
      ].join(" "),
    },
  ]
  refs.forEach((ref, index) => {
    content.push({ type: "text", text: `REFERENCE ${index + 1}: ${ref.name}` })
    content.push({ type: "file", mediaType: "image/jpeg", data: ref.refImage, providerOptions: { openai: { imageDetail: "low" } } })
  })
  content.push({ type: "text", text: "PLAYER photo:" })
  content.push({ type: "file", mediaType: "image/jpeg", data: parsed.data.image })

  try {
    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: verdictSchema }),
      messages: [{ role: "user", content }],
    })

    const ref = output.match >= 1 ? refs[output.match - 1] : undefined
    const accepted = !!ref && !output.screen && output.confidence >= MIN_CONFIDENCE
    await logCheck(session.user.id, accepted ? ref.id : null, output.confidence)

    return NextResponse.json({
      targetId: accepted ? ref.id : null,
      confidence: output.confidence,
      screen: output.screen,
      reason: output.reason,
      remaining: DAILY_AI_CHECKS - used - 1,
    })
  } catch {
    return NextResponse.json({ error: "ai" }, { status: 502 })
  }
}
