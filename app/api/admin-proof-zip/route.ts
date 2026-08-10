import { type NextRequest, NextResponse } from "next/server"
import { Zip, ZipPassThrough, strToU8 } from "fflate"
import { requireAdmin } from "@/lib/admin"

/**
 * Bulk download for the admin Gallery tab: takes a selection of proof photos and
 * returns them as one zip of the FULL-SIZE originals (never the thumbnails).
 *
 * WHY A FORM POST AND NOT `fetch()`. The client submits a real form at this route
 * (into a hidden iframe) so the browser treats the reply as an ordinary file
 * download and streams it to disk. Fetching it instead would force the entire
 * archive into a Blob in memory before the save dialog appears - and with ~4 MB
 * per photo a selection of fifty is already 200 MB of browser heap. The form also
 * carries the session cookie, so `requireAdmin()` still applies.
 *
 * Memory here is bounded the same way: photos are fetched STRICTLY ONE AT A TIME
 * and pushed straight into the zip stream, so the server holds a single image at
 * any moment no matter how large the selection.
 *
 * Entries are stored, not deflated (`ZipPassThrough`). JPEG is already compressed,
 * so deflating it costs CPU for roughly nothing.
 */

const BLOB_HOST_FRAGMENT = ".public.blob.vercel-storage.com"

/** A generous ceiling that still refuses an absurd or malformed request. */
const MAX_FILES = 500

type Wanted = { url: string; name: string }

function isOwnBlobUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_FRAGMENT)
  } catch {
    return false
  }
}

/**
 * Keep the zip entry name harmless: no directory traversal, no separators, and a
 * length a filesystem will accept. The client sends a descriptive name (explorer,
 * lead, date) and this only sanitises it.
 */
function safeEntryName(raw: string, index: number): string {
  const cleaned = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[\u0000-\u001f<>:"|?*]+/g, "")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 120)
  // The index prefix guarantees uniqueness inside the archive even when two
  // explorers share a name, and keeps the zip in the same order as the gallery.
  return `${String(index + 1).padStart(3, "0")}-${cleaned || "photo.jpg"}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin()
  } catch {
    return new NextResponse("Forbidden", { status: 403 })
  }

  let wanted: Wanted[]
  try {
    const form = await request.formData()
    const parsed = JSON.parse(String(form.get("files") ?? "[]")) as unknown
    if (!Array.isArray(parsed)) throw new Error("not an array")
    wanted = parsed
      .filter(
        (f): f is Wanted =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as Wanted).url === "string" &&
          typeof (f as Wanted).name === "string",
      )
      // Validated BEFORE a single byte is streamed: once the response body has
      // started there is no way to change the status code to an error.
      .filter((f) => isOwnBlobUrl(f.url))
      .slice(0, MAX_FILES)
  } catch {
    return new NextResponse("Bad request", { status: 400 })
  }

  if (wanted.length === 0) return new NextResponse("Nothing to download", { status: 400 })

  const stamp = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Europe/Athens" })
    .replace(/-/g, "")

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const failed: string[] = []
      const zip = new Zip((err, chunk, final) => {
        if (err) {
          try {
            controller.error(err)
          } catch {
            // Already torn down (client cancelled the download); nothing to do.
          }
          return
        }
        if (chunk.length > 0) controller.enqueue(chunk)
        if (final) {
          try {
            controller.close()
          } catch {
            // Same as above.
          }
        }
      })

      void (async () => {
        for (let i = 0; i < wanted.length; i++) {
          const f = wanted[i]
          const entry = new ZipPassThrough(safeEntryName(f.name, i))
          zip.add(entry)
          try {
            const res = await fetch(f.url, { cache: "force-cache" })
            if (!res.ok) throw new Error(String(res.status))
            entry.push(new Uint8Array(await res.arrayBuffer()), true)
          } catch {
            // One dead Blob must not cost the admin the other 400 photos, so the
            // entry is closed empty and the failure is reported inside the zip.
            entry.push(new Uint8Array(0), true)
            failed.push(f.url)
          }
        }

        if (failed.length > 0) {
          const note = new ZipPassThrough("_could-not-download.txt")
          zip.add(note)
          note.push(
            strToU8(
              `${failed.length} photo(s) could not be fetched from storage and are empty in this archive:\n\n${failed.join("\n")}\n`,
            ),
            true,
          )
        }

        zip.end()
      })()
    },
  })

  return new NextResponse(stream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="proof-photos-${stamp}.zip"`,
      // Nothing about a generated archive should be reused.
      "cache-control": "no-store",
    },
  })
}
