import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"

/**
 * Lead artwork (stamps and full-page backgrounds) is uploaded straight from the
 * browser to Blob. Routing the bytes through a Server Action instead caps the
 * file at 4.5 MB on Vercel - a hard platform limit that `bodySizeLimit` cannot
 * lift - so a background anywhere near the UI's stated 15 MB allowance was
 * rejected with a 413 before it ever reached `put()`.
 *
 * This route only mints a short-lived, constrained upload token. The image
 * itself never passes through our server, so the size ceiling is ours to set.
 * Mirrors app/api/proof-upload/route.ts, which solves the same problem for
 * explorer photo proofs.
 */
const MAX_STAMP_BYTES = 5 * 1024 * 1024
const MAX_BACKGROUND_BYTES = 15 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"]

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Only superadmins may obtain an upload token. requireAdmin throws,
        // which handleUpload surfaces as a 400 rather than a silent success.
        await requireAdmin()

        // The client tells us which slot it is filling so the cap matches the
        // one the action used to enforce. Anything unrecognised gets the
        // smaller of the two ceilings.
        const kind = clientPayload === "background" ? "background" : "stamp"

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: kind === "background" ? MAX_BACKGROUND_BYTES : MAX_STAMP_BYTES,
          addRandomSuffix: true,
        }
      },
      // Nothing to record here: the lead row is updated by the
      // adminAttachLeadStamp / adminAttachLeadBackground action once the
      // client has the final URL.
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    )
  }
}
