/**
 * STEP 1 - Dump the source Neon database (schema + data) to ./out
 *
 *   SOURCE_DATABASE_URL="postgres://..." node migration/01-dump-db.mjs
 *
 * Writes:
 *   out/schema.json  - tables, columns, constraints, indexes (exact DDL from Postgres)
 *   out/data/<table>.jsonl - one JSON array of text values per row
 *
 * Why not pg_dump: this project's Postgres client tools are not installed in every
 * environment, and the schema is simple enough (22 plain tables, no enums, views,
 * functions, triggers or sequences) that the catalog gives us everything. All DDL
 * for constraints and indexes comes from Postgres itself via pg_get_constraintdef /
 * pg_get_indexdef, so nothing is hand-reconstructed.
 *
 * Scope is the `public` schema only. `neon_auth` is Neon's own managed schema and is
 * recreated by the Neon integration on the target project - copying it would fight
 * with the platform.
 */
import { mkdir, writeFile, appendFile, rm } from "node:fs/promises"
import path from "node:path"
import pg from "pg"

const SCHEMA = "public"
const OUT = path.join(import.meta.dirname, "out")
const FETCH_SIZE = 2000

const url = process.env.SOURCE_DATABASE_URL
if (!url) {
  console.error("Set SOURCE_DATABASE_URL (the CURRENT project's DATABASE_URL).")
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()

// ---------------------------------------------------------------- schema
const { rows: tables } = await client.query(
  `SELECT c.relname AS name
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r'
    ORDER BY c.relname`,
  [SCHEMA],
)

const schema = { schema: SCHEMA, tables: [] }

for (const { name } of tables) {
  const { rows: columns } = await client.query(
    `SELECT a.attname                                  AS name,
            format_type(a.atttypid, a.atttypmod)       AS type,
            a.attnotnull                               AS not_null,
            pg_get_expr(d.adbin, d.adrelid)            AS default_expr
       FROM pg_attribute a
       JOIN pg_class c        ON c.oid = a.attrelid
       JOIN pg_namespace n    ON n.oid = c.relnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [SCHEMA, name],
  )

  // contype ordering: primary key first, then unique, then foreign keys. Foreign
  // keys are applied in a separate pass after all data lands, so they never block
  // an insert whose parent row has not been copied yet.
  const { rows: constraints } = await client.query(
    `SELECT co.conname AS name, co.contype AS type, pg_get_constraintdef(co.oid) AS def
       FROM pg_constraint co
       JOIN pg_class c     ON c.oid = co.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relname = $2
      ORDER BY CASE co.contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 ELSE 2 END, co.conname`,
    [SCHEMA, name],
  )

  // Indexes backing a constraint are created by the constraint itself, so they are
  // excluded here to avoid "relation already exists".
  const { rows: indexes } = await client.query(
    `SELECT i.relname AS name, pg_get_indexdef(i.oid) AS def
       FROM pg_index x
       JOIN pg_class i     ON i.oid = x.indexrelid
       JOIN pg_class t     ON t.oid = x.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = $1 AND t.relname = $2
        AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid = i.oid)
      ORDER BY i.relname`,
    [SCHEMA, name],
  )

  const { rows: count } = await client.query(`SELECT count(*)::int AS n FROM "${SCHEMA}"."${name}"`)

  schema.tables.push({ name, columns, constraints, indexes, rows: count[0].n })
}

await rm(OUT, { recursive: true, force: true })
await mkdir(path.join(OUT, "data"), { recursive: true })
await writeFile(path.join(OUT, "schema.json"), JSON.stringify(schema, null, 2))

// ---------------------------------------------------------------- data
/**
 * Every column is read as ::text and restored with an explicit cast back to its
 * own type. This is deliberate and load-bearing:
 *
 *   - `timestamp without time zone` would otherwise come back as a JS Date built in
 *     the machine's LOCAL zone; serialising that with toISOString() shifts every
 *     timestamp by the local UTC offset. Text round-trips exactly.
 *   - `double precision` avoids float formatting drift for the same reason.
 *   - jsonb keeps its exact serialisation instead of being re-stringified by JS.
 *
 * NULL stays null in JSON, so it is never confused with an empty string.
 */
let totalRows = 0
for (const table of schema.tables) {
  const file = path.join(OUT, "data", `${table.name}.jsonl`)
  await writeFile(file, "")
  if (table.rows === 0) {
    console.log(`  ${table.name}: 0 rows (skipped)`)
    continue
  }

  const cols = table.columns.map((c) => `"${c.name}"::text`).join(", ")
  await client.query("BEGIN")
  await client.query(`DECLARE dump_cur NO SCROLL CURSOR FOR SELECT ${cols} FROM "${SCHEMA}"."${table.name}"`)

  let written = 0
  for (;;) {
    const { rows } = await client.query(`FETCH ${FETCH_SIZE} FROM dump_cur`)
    if (rows.length === 0) break
    const lines = rows.map((r) => JSON.stringify(table.columns.map((c) => r[c.name]))).join("\n")
    await appendFile(file, lines + "\n")
    written += rows.length
  }
  await client.query("CLOSE dump_cur")
  await client.query("COMMIT")

  totalRows += written
  console.log(`  ${table.name}: ${written} rows`)
}

await client.end()
console.log(`\nDumped ${schema.tables.length} tables, ${totalRows} rows to ${OUT}`)
console.log("Next: 02-restore-db.mjs")
