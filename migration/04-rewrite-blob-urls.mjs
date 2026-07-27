/**
 * STEP 4 - Repoint the restored rows at the NEW blob store.
 *
 *   TARGET_DATABASE_URL="postgres://..." node migration/04-rewrite-blob-urls.mjs
 *   TARGET_DATABASE_URL="postgres://..." node migration/04-rewrite-blob-urls.mjs --dry-run
 *
 * This is the step that quietly ruins an otherwise clean migration. The database
 * stores ABSOLUTE blob URLs, and the new store has a different hostname, so every
 * stored URL points at the old account until it is rewritten.
 *
 * Columns are discovered from the catalog rather than hardcoded, so a column added
 * later is still caught. At the time of writing the matches are lead.stampImageUrl,
 * lead.backgroundImageUrl and proof_submission.photoUrls (jsonb).
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import pg from "pg"

const OUT = path.join(import.meta.dirname, "out")
const SCHEMA = "public"
const dryRun = process.argv.includes("--dry-run")

const url = process.env.TARGET_DATABASE_URL
if (!url) {
  console.error("Set TARGET_DATABASE_URL (the NEW project's DATABASE_URL).")
  process.exit(1)
}

const map = JSON.parse(await readFile(path.join(OUT, "blob-url-map.json"), "utf8"))
const pairs = Object.entries(map)
if (pairs.length === 0) {
  console.log("blob-url-map.json is empty - nothing to rewrite.")
  process.exit(0)
}

const client = new pg.Client({ connectionString: url })
await client.connect()

// Text-ish columns that could hold a URL. jsonb is included because photo lists are
// stored as a jsonb array of strings.
const { rows: columns } = await client.query(
  `SELECT c.relname AS table, a.attname AS column, format_type(a.atttypid, a.atttypmod) AS type
     FROM pg_attribute a
     JOIN pg_class c     ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) IN ('text', 'jsonb', 'json', 'character varying')
    ORDER BY c.relname, a.attname`,
  [SCHEMA],
)

// Any *.public.blob.vercel-storage.com host in the old data.
const oldHosts = [...new Set(pairs.map(([old]) => new URL(old).host))]
const hostPattern = `%${oldHosts.length === 1 ? oldHosts[0] : "blob.vercel-storage.com"}%`

let touched = 0
for (const col of columns) {
  const isJson = col.type === "jsonb" || col.type === "json"
  const asText = isJson ? `"${col.column}"::text` : `"${col.column}"`

  const { rows: hits } = await client.query(
    `SELECT count(*)::int AS n FROM "${SCHEMA}"."${col.table}" WHERE ${asText} LIKE $1`,
    [hostPattern],
  )
  if (hits[0].n === 0) continue

  console.log(`${col.table}.${col.column} (${col.type}): ${hits[0].n} row(s) reference the old store`)
  if (dryRun) continue

  // Chain a replace() per mapped URL so each row is updated in a single pass.
  let expr = asText
  const params = []
  for (const [oldUrl, newUrl] of pairs) {
    params.push(oldUrl, newUrl)
    expr = `replace(${expr}, $${params.length - 1}, $${params.length})`
  }
  const cast = isJson ? `(${expr})::${col.type}` : expr

  const res = await client.query(
    `UPDATE "${SCHEMA}"."${col.table}" SET "${col.column}" = ${cast}
      WHERE ${asText} LIKE $${params.length + 1}`,
    [...params, hostPattern],
  )
  touched += res.rowCount
  console.log(`  rewrote ${res.rowCount} row(s)`)
}

// Anything still pointing at the old store means a blob was missed in step 3.
if (!dryRun) {
  let leftovers = 0
  for (const col of columns) {
    const isJson = col.type === "jsonb" || col.type === "json"
    const asText = isJson ? `"${col.column}"::text` : `"${col.column}"`
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM "${SCHEMA}"."${col.table}" WHERE ${asText} LIKE $1`,
      [hostPattern],
    )
    if (rows[0].n > 0) {
      console.error(`  STILL STALE: ${col.table}.${col.column} has ${rows[0].n} row(s) on the old store`)
      leftovers += rows[0].n
    }
  }
  if (leftovers > 0) {
    console.error("\nSome URLs were not in blob-url-map.json. Re-run step 3, then this step.")
    await client.end()
    process.exit(1)
  }
}

await client.end()
console.log(dryRun ? "\nDry run only - nothing written." : `\nRewrote ${touched} row(s). No stale URLs remain.`)
console.log("Next: 05-verify.mjs")
