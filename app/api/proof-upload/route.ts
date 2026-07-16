import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Photo-proof images are uploaded directly from the browser to Blob. This
// bypasses the Server Action / Server Function request-body limit (4.5 MB on
// Vercel), which is why file uploads through the action failed. This route only
// mints a short-lived, constrained upload token; the actual bytes never pass
// through our server.
const MAX_PROOF_BYTES = 10 * 1024 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        // Only signed-in explorers may obtain an upload token.
        const session = await auth.api.getSession({ headers: await headers() })
        if (!session?.user) {
          throw new Error("Unauthorized")
        }
        return {
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: MAX_PROOF_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      // No server-side bookkeeping needed on completion: the submission row is
      // created by the submitLocationProof action once the client has all URLs.
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
