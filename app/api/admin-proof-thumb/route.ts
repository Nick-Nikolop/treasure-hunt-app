import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { requireAdmin } from "@/lib/admin"
import { isOwnBlobUrl, isThumbWidth, proofThumbKey, proofThumbUrl } from "@/lib/proof-thumb"

/**
 * Builds (and permanently stores) one thumbnail for the admin Gallery tab.
 *
 * WHY THIS EXISTS. The archive holds ~400 phone originals averaging 2.75 MB, and
 * the gallery used to point every grid tile at the original, so opening the tab
 * asked the browser for roughly a gigabyte of JPEG to paint 228 px squares. A
 * browser opens only a handful of connections per host, so the rest queued behind
 * those transfers and some never arrived - the reported "it bugs ugly and
 * sometimes it won't even open the images".
 *
 * `next/image` cannot help: the project sets `images.unoptimized`, so it emits
 * the original URL untouched. Flipping that globally would change behaviour and
 * cost for every image on the site, so this route does the one resize the gallery
 * needs. The same 4.05 MB photo comes back as ~16 KB.
 *
 * WHY IT REDIRECTS INSTEAD OF RETURNING PIXELS. Resizing on every request was
 * still slow: measured ~405 ms per tile once six ran at once, and because nothing
 * was persisted that whole bill came due again on every page load. Now the result
 * is written back to Blob under a deterministic key and the caller is sent there.
 * The second request for a photo never resizes anything, and the client can even
 * skip this route entirely by addressing the stored copy directly - a warm
 * thumbnail measured ~50 ms straight from the CDN.
 *
 * `.rotate()` is not cosmetic. Resizing drops the EXIF block, so without it a
 * portrait phone photo whose orientation lives only in EXIF would come back
 * lying on its side while the original displayed upright.
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Same gate as the rest of the admin surface. These are people's photos, so
  // this must not become an open resizing endpoint even though the underlying
  // Blob URLs are unguessable.
  try {
    await requireAdmin()
  } catch {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const raw = request.nextUrl.searchParams.get("u")
  const requested = Number(request.nextUrl.searchParams.get("w") ?? 480)
  const width = isThumbWidth(requested) ? requested : 480

  if (!raw || !isOwnBlobUrl(raw)) {
    return new NextResponse("Bad request", { status: 400 })
  }

  const key = proofThumbKey(raw, width)
  const target = proofThumbUrl(raw, width)
  if (!key || !target) {
    return new NextResponse("Bad request", { status: 400 })
  }

  try {
    // Cheap existence probe. The client normally addresses the stored copy itself
    // and only falls back to this route when that 404s, but a second tab, a retry
    // or the row strip asking for a width the grid already built all land here
    // with the work already done - and re-downloading a 4 MB original to rebuild
    // an identical 16 KB file would defeat the point.
    const existing = await fetch(target, { method: "HEAD", cache: "no-store" })
    if (existing.ok) {
      return NextResponse.redirect(target, 302)
    }

    // `no-store` is DELIBERATE. `force-cache` sends this through the Next.js data
    // cache, which refuses anything over 2 MB, so every proof photo (2.5-5.6 MB
    // here) logged a "Failed to set fetch cache" error on EVERY request while
    // caching nothing at all. Persistence is handled by the `put` below instead.
    const upstream = await fetch(raw, { cache: "no-store" })
    if (!upstream.ok) {
      // A status rather than a placeholder image, so the client can tell "this
      // photo is gone" from "the resize failed" and offer a retry.
      return new NextResponse("Upstream unavailable", { status: 502 })
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    const out = await sharp(input)
      .rotate()
      .resize(width, width, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer()

    // `addRandomSuffix: false` is what makes the URL predictable, and predictable
    // is the whole point - it is how the browser reaches this file without asking
    // us first. `allowOverwrite` keeps two tabs racing on the same cold thumbnail
    // harmless: both produce identical bytes for the same key.
    await put(key, out, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
      cacheControlMaxAge: 31536000,
    })

    return NextResponse.redirect(target, 302)
  } catch {
    return new NextResponse("Resize failed", { status: 500 })
  }
}
