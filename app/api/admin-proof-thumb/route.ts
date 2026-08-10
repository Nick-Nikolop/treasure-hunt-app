import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { requireAdmin } from "@/lib/admin"

/**
 * Thumbnails for the admin Gallery tab.
 *
 * WHY THIS EXISTS. The archive holds ~400 photo proofs and they are phone
 * originals: a single one measured 4.05 MB. The gallery used to point every grid
 * tile straight at the Blob original, so opening the tab asked the browser for
 * well over a gigabyte of JPEG to paint 150 px squares. A browser only opens a
 * handful of connections per host, so the rest queue behind those multi-megabyte
 * transfers and some simply time out - which is exactly the reported "it bugs
 * ugly and sometimes it won't even open the images".
 *
 * `next/image` cannot help here: the project sets `images.unoptimized`, so it
 * would emit the original URL untouched. Rather than flip that globally (it
 * changes behaviour and cost for every image on the site) this route does the one
 * resize the gallery needs. The same 4.05 MB photo comes back as ~17 KB, a 99.6%
 * reduction, which is the difference between a stalling grid and an instant one.
 *
 * `.rotate()` is not cosmetic. Resizing drops the EXIF block, so without it a
 * portrait phone photo whose orientation lives only in EXIF would come back
 * lying on its side while the original displayed upright.
 */

/** Only our own Blob storage may be fetched, so this cannot be used as an SSRF proxy. */
const BLOB_HOST_FRAGMENT = ".public.blob.vercel-storage.com"

/**
 * Widths are an allowlist rather than a free number: an attacker (or a careless
 * loop) could otherwise mint unlimited distinct cache entries and make us resize
 * the same photo forever. 160 serves the row strip, 480 the grid, 960 the
 * lightbox preview.
 */
const ALLOWED_WIDTHS = new Set([160, 480, 960])

function isOwnBlobUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_FRAGMENT)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Same gate as the rest of the admin surface. The proofs are people's photos,
  // so this must not become an open resizing endpoint even though the underlying
  // Blob URLs are unguessable.
  try {
    await requireAdmin()
  } catch {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const raw = request.nextUrl.searchParams.get("u")
  const wParam = Number(request.nextUrl.searchParams.get("w") ?? 480)
  const width = ALLOWED_WIDTHS.has(wParam) ? wParam : 480

  if (!raw || !isOwnBlobUrl(raw)) {
    return new NextResponse("Bad request", { status: 400 })
  }

  try {
    const upstream = await fetch(raw, { cache: "force-cache" })
    if (!upstream.ok) {
      // Surfaced as a status rather than a placeholder image so the client can
      // tell "this photo is gone" from "the resize failed" and offer a retry.
      return new NextResponse("Upstream unavailable", { status: 502 })
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    const out = await sharp(input)
      .rotate()
      .resize(width, width, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer()

    return new NextResponse(new Uint8Array(out), {
      headers: {
        "content-type": "image/jpeg",
        // `private` because the response is admin-only: it must sit in the
        // admin's own browser cache, never in a shared CDN. Immutable is safe
        // since a Blob URL's contents never change once written.
        "cache-control": "private, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Resize failed", { status: 500 })
  }
}
