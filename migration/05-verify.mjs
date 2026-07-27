/**
 * STEP 5 - Prove the migration landed.
 *
 *   SOURCE_DATABASE_URL="postgres://..." \
 *   TARGET_DATABASE_URL="postgres://..." \
 *   node migration/05-verify.mjs
 *
 * Checks, in order:
 *   1. every source table exists on the target with an identical row count
 *   2. constraint and index counts match
 *   3. the hunt-critical tables are spot-checked by primary key
 *   4. every blob URL still referenced in the target DB actually returns HTTP 200
 *
 * Check 4 is the one that catches a half-finished blob copy: the rows look fine and
 * the app renders, but the images 404 for players.
 */
import pg from "pg"

const SCHEMA = "public"
const sourceUrl = process.env.SOURCE_DATABASE_URL
const targetUrl = process.env.TARGET_DATABASE_URL
if (!sourceUrl || !targetUrl) {
  console.error("Set both SOURCE_DATABASE_URL and TARGET_DATABASE_URL.")
  process.exit(1)
}

const source = new pg.Client({ connectionString: sourceUrl })
const target = new pg.Client({ connectionString: targetUrl })
await source.connect()
await target.connect()

let failures = 0
const fail = (msg) => {
  console.error(`  FAIL  ${msg}`)
  failures++
}

// ------------------------------------------------------------ row counts
const { rows: tables } = await source.query(
  `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r' ORDER BY c.relname`,
  [SCHEMA],
)

console.log("Row counts:")
for (const { name } of tables) {
  const a = await source.query(`SELECT count(*)::int AS n FROM "${SCHEMA}"."${name}"`)
  let b
  try {
    b = await target.query(`SELECT count(*)::int AS n FROM "${SCHEMA}"."${name}"`)
  } catch {
    fail(`${name}: missing on target`)
    continue
  }
  if (a.rows[0].n !== b.rows[0].n) fail(`${name}: source ${a.rows[0].n} vs target ${b.rows[0].n}`)
  else if (a.rows[0].n > 0) console.log(`  ok    ${name}: ${a.rows[0].n}`)
}

// ------------------------------------------------------ full content hash
// Hashes every row rendered as text, on both sides. This is the check that proves
// timestamps did not shift, floats did not reformat and jsonb was not re-ordered -
// matching row counts alone would happily hide all three.
console.log("\nContent hashes:")
for (const { name } of tables) {
  const sql = `SELECT md5(string_agg(t::text, '' ORDER BY t::text)) AS h FROM "${SCHEMA}"."${name}" t`
  try {
    const a = await source.query(sql)
    const b = await target.query(sql)
    if (a.rows[0].h !== b.rows[0].h) fail(`${name}: content differs`)
    else if (a.rows[0].h !== null) console.log(`  ok    ${name}`)
  } catch (e) {
    fail(`${name}: ${e.message.slice(0, 70)}`)
  }
}

// ------------------------------------------------- constraints and indexes
const shape = async (c) => {
  const { rows } = await c.query(
    `SELECT
       (SELECT count(*)::int FROM pg_constraint co JOIN pg_class k ON k.oid = co.conrelid
          JOIN pg_namespace n ON n.oid = k.relnamespace WHERE n.nspname = $1) AS constraints,
       (SELECT count(*)::int FROM pg_index x JOIN pg_class t ON t.oid = x.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = $1) AS indexes`,
    [SCHEMA],
  )
  return rows[0]
}
const sShape = await shape(source)
const tShape = await shape(target)
console.log("\nSchema shape:")
if (sShape.constraints !== tShape.constraints)
  fail(`constraints: source ${sShape.constraints} vs target ${tShape.constraints}`)
else console.log(`  ok    constraints: ${sShape.constraints}`)
if (sShape.indexes !== tShape.indexes) fail(`indexes: source ${sShape.indexes} vs target ${tShape.indexes}`)
else console.log(`  ok    indexes: ${sShape.indexes}`)

// --------------------------------------------------------- spot checks
// These are the tables that decide whether the hunt still works: the QR tokens
// players scan, the leads they unlock, and the sessions keeping them signed in.
console.log("\nSpot checks:")
for (const table of ["clue_token", "location_qr", "lead", "lead_unlock", "user", "session", "team"]) {
  try {
    // Primary key columns come from the catalog: not every table uses "id"
    // (clue_token is keyed by its token), so hardcoding one breaks the check.
    const { rows: keyCols } = await source.query(
      `SELECT a.attname AS name
         FROM pg_constraint co
         JOIN pg_class c        ON c.oid = co.conrelid
         JOIN pg_namespace n    ON n.oid = c.relnamespace
         JOIN unnest(co.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
         JOIN pg_attribute a    ON a.attrelid = c.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1 AND c.relname = $2 AND co.contype = 'p'
        ORDER BY k.ord`,
      [SCHEMA, table],
    )
    if (keyCols.length === 0) {
      fail(`${table}: no primary key found`)
      continue
    }

    const cols = keyCols.map((c) => `"${c.name}"`).join(", ")
    const read = async (c) => {
      const { rows } = await c.query(`SELECT ${cols} FROM "${SCHEMA}"."${table}" ORDER BY ${cols} LIMIT 50`)
      return rows.map((r) => keyCols.map((k) => r[k.name]).join("|")).join(",")
    }
    const sa = await read(source)
    const sb = await read(target)
    if (sa !== sb) fail(`${table}: primary keys differ`)
    else console.log(`  ok    ${table}: keys match (${keyCols.map((k) => k.name).join(", ")})`)
  } catch (e) {
    fail(`${table}: ${e.message.slice(0, 70)}`)
  }
}

// ------------------------------------------------------------- blob URLs
console.log("\nBlob URLs referenced by the target DB:")
const { rows: columns } = await target.query(
  `SELECT c.relname AS table, a.attname AS column, format_type(a.atttypid, a.atttypmod) AS type
     FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) IN ('text', 'jsonb', 'json', 'character varying')`,
  [SCHEMA],
)

const urls = new Set()
for (const col of columns) {
  const isJson = col.type === "jsonb" || col.type === "json"
  const asText = isJson ? `"${col.column}"::text` : `"${col.column}"`
  const { rows } = await target.query(
    `SELECT ${asText} AS v FROM "${SCHEMA}"."${col.table}" WHERE ${asText} LIKE '%blob.vercel-storage.com%'`,
  )
  for (const r of rows) {
    for (const m of String(r.v).matchAll(/https:\/\/[^"'\s\\)]+\.blob\.vercel-storage\.com\/[^"'\s\\)]+/g)) {
      urls.add(m[0])
    }
  }
}

if (urls.size === 0) console.log("  (none referenced)")
for (const u of urls) {
  const res = await fetch(u, { method: "HEAD" }).catch(() => null)
  if (!res || !res.ok) fail(`unreachable blob (HTTP ${res ? res.status : "network error"}): ${u}`)
  else console.log(`  ok    ${res.status} ${u.split("/").slice(-1)[0]}`)
}

await source.end()
await target.end()

console.log(
  failures === 0
    ? "\nAll checks passed. Safe to switch the domain over."
    : `\n${failures} check(s) FAILED - do not switch the domain yet.`,
)
process.exit(failures === 0 ? 0 : 1)
