/**
 * Shared thumbnail addressing for proof photos.
 *
 * WHY THIS FILE EXISTS. Generating a thumbnail costs a multi-megabyte download
 * from Blob plus a sharp resize, measured at ~405 ms per tile once six of them
 * compete for the dev server. With ~400 photos in the archive that made the
 * Gallery tab feel broken, and because nothing was persisted the cost was paid
 * again on every single page load.
 *
 * The fix is to store each resized thumbnail back into Blob under a key that is
 * a pure function of the original photo and the requested width. That makes the
 * final URL predictable, which is the important part: the browser can point an
 * <img> straight at the CDN copy without asking our server anything at all.
 * Measured, a warm thumbnail arrives in ~50 ms from the CDN against ~405 ms
 * through the resize route, and our origin sees no traffic for it.
 *
 * Both the client component and the resize route import from here so the two can
 * never disagree about where a thumbnail lives. Keep this module free of Node
 * built-ins and of `sharp`: it is bundled into the browser.
 */

/** Only our own Blob storage is ever addressed, so this cannot point elsewhere. */
const BLOB_HOST_FRAGMENT = ".public.blob.vercel-storage.com"

/**
 * Widths are a closed set, not a free number. Each distinct width is a distinct
 * stored object, so accepting arbitrary values would let a careless loop (or
 * someone poking the endpoint) fill the store with near-identical images and pay
 * for a resize every time. 160 serves the compact row strip, 480 the grid at
 * retina density, 960 the lightbox preview.
 */
export const THUMB_WIDTHS = [160, 480, 960] as const
export type ThumbWidth = (typeof THUMB_WIDTHS)[number]

export function isThumbWidth(value: number): value is ThumbWidth {
  return (THUMB_WIDTHS as readonly number[]).includes(value)
}

export function isOwnBlobUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_FRAGMENT)
  } catch {
    return false
  }
}

/**
 * The Blob key a thumbnail is stored under.
 *
 * Only the original's final path segment is reused. That segment already carries
 * the random suffix Blob appended on upload, so it is unique on its own, and
 * taking just the basename keeps the key flat and free of any inherited path
 * structure. Returns null for anything that is not one of our own photos, so a
 * caller cannot coax a write outside the thumbnail prefix.
 */
export function proofThumbKey(originalUrl: string, width: ThumbWidth): string | null {
  if (!isOwnBlobUrl(originalUrl)) return null

  let basename: string
  try {
    basename = new URL(originalUrl).pathname.split("/").filter(Boolean).pop() ?? ""
  } catch {
    return null
  }

  // Defensive: a basename cannot contain a slash by construction, but stripping
  // separators and dot segments anyway means a surprising upload name can never
  // escape the prefix below.
  const safe = basename.replace(/[/\\]+/g, "-").replace(/\.{2,}/g, ".")
  if (!safe) return null

  return `proof-thumbs/${width}/${safe}`
}

/**
 * Where the thumbnail will be readable once it exists.
 *
 * Derived from the original's own origin because the thumbnail is written to the
 * same store, which is what lets the client construct this synchronously with no
 * round trip and no shared secret. A URL is returned whether or not the object
 * has been generated yet; callers treat a 404 as "not built yet" and fall back to
 * the resize route, which builds it and then serves this same address forever.
 */
export function proofThumbUrl(originalUrl: string, width: ThumbWidth): string | null {
  const key = proofThumbKey(originalUrl, width)
  if (!key) return null
  try {
    return `${new URL(originalUrl).origin}/${key}`
  } catch {
    return null
  }
}
