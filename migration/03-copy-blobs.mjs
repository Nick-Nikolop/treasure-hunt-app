/**
 * STEP 3 - Copy every blob from the source store to the target store.
 *
 *   SOURCE_BLOB_TOKEN="vercel_blob_rw_..." \
 *   TARGET_BLOB_TOKEN="vercel_blob_rw_..." \
 *   node migration/03-copy-blobs.mjs
 *
 * Writes out/blob-url-map.json (old URL -> new URL) for step 4.
 *
 * Blob stores cannot be transferred between accounts, so the files are re-uploaded
 * and necessarily get a NEW hostname. Every uploaded pathname is preserved exactly
 * (addRandomSuffix: false) so the mapping stays one-to-one and this script can be
 * re-run without piling up duplicates.
 */
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { list, put } from "@vercel/blob"

const OUT = path.join(import.meta.dirname, "out")

const sourceToken = process.env.SOURCE_BLOB_TOKEN
const targetToken = process.env.TARGET_BLOB_TOKEN
if (!sourceToken || !targetToken) {
  console.error("Set SOURCE_BLOB_TOKEN and TARGET_BLOB_TOKEN (each project's BLOB_READ_WRITE_TOKEN).")
  process.exit(1)
}
if (sourceToken === targetToken) {
  console.error("Both tokens are identical - that would copy the store onto itself. Check the target token.")
  process.exit(1)
}

// Collect the whole source listing first (paginated).
const blobs = []
let cursor
do {
  const page = await list({ token: sourceToken, cursor, limit: 1000 })
  blobs.push(...page.blobs)
  cursor = page.cursor
} while (cursor)

console.log(`Found ${blobs.length} blobs in the source store`)

const map = {}
let copied = 0
let bytes = 0

for (const blob of blobs) {
  const res = await fetch(blob.url)
  if (!res.ok) {
    console.error(`  FAILED download ${blob.pathname} (HTTP ${res.status}) - skipped`)
    continue
  }
  const body = Buffer.from(await res.arrayBuffer())

  const uploaded = await put(blob.pathname, body, {
    token: targetToken,
    access: "public",
    addRandomSuffix: false,
    contentType: blob.contentType,
  })

  map[blob.url] = uploaded.url
  copied++
  bytes += body.byteLength
  console.log(`  ${blob.pathname} -> ${uploaded.url}`)
}

await writeFile(path.join(OUT, "blob-url-map.json"), JSON.stringify(map, null, 2))

console.log(`\nCopied ${copied}/${blobs.length} blobs (${(bytes / 1048576).toFixed(2)} MB)`)
if (copied !== blobs.length) {
  console.error("Some blobs did not copy. Fix those before running step 4.")
  process.exit(1)
}
console.log("Wrote out/blob-url-map.json")
console.log("Next: 04-rewrite-blob-urls.mjs")
