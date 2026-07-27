/**
 * STEP 2 - Restore ./out into the TARGET Neon database.
 *
 *   TARGET_DATABASE_URL="postgres://..." node migration/02-restore-db.mjs
 *   TARGET_DATABASE_URL="postgres://..." node migration/02-restore-db.mjs --fresh
 *
 * Default run refuses to touch a target that already has rows in these tables.
 * Pass --fresh to DROP the public tables listed in the dump and rebuild them, which
 * is what you want when re-running after a failed attempt.
 *
 * Order of operations: tables + primary/unique constraints -> data -> foreign keys
 * -> indexes. Foreign keys go on last so no insert can fail on a parent row that
 * has not been copied yet, and indexes go last because building them once at the
 * end is far quicker than maintaining them during the insert.
 */
import { readFile } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import path from "node:path"
import pg from "pg"

const OUT = path.join(import.meta.dirname, "out")
const BATCH = 500
const fresh = process.argv.includes("--fresh")

const url = process.env.TARGET_DATABASE_URL
if (!url) {
  console.error("Set TARGET_DATABASE_URL (the NEW project's DATABASE_URL).")
  process.exit(1)
}

const schema = JSON.parse(await readFile(path.join(OUT, "schema.json"), "utf8"))
const S = schema.schema

const client = new pg.Client({ connectionString: url })
await client.connect()

// Guard: never silently merge into a populated database.
if (!fresh) {
  const names = schema.tables.map((t) => t.name)
  const { rows } = await client.query(
    `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relkind = 'r' AND c.relname = ANY($2)`,
    [S, names],
  )
  for (const { name } of rows) {
    const { rows: c } = await client.query(`SELECT count(*)::int AS n FROM "${S}"."${name}"`)
    if (c[0].n > 0) {
      console.error(`Target already has ${c[0].n} rows in "${name}".`)
      console.error("Re-run with --fresh to drop and rebuild, or point at an empty database.")
      process.exit(1)
    }
  }
}

if (fresh) {
  // CASCADE clears the dependent foreign keys along with the tables.
  const list = schema.tables.map((t) => `"${S}"."${t.name}"`).join(", ")
  await client.query(`DROP TABLE IF EXISTS ${list} CASCADE`)
  console.log("Dropped existing tables (--fresh)")
}

// ------------------------------------------------- tables + local constraints
for (const t of schema.tables) {
  const cols = t.columns.map((c) => {
    let sql = `"${c.name}" ${c.type}`
    if (c.default_expr) sql += ` DEFAULT ${c.default_expr}`
    if (c.not_null) sql += " NOT NULL"
    return sql
  })
  const local = t.constraints.filter((c) => c.type !== "f").map((c) => `CONSTRAINT "${c.name}" ${c.def}`)
  await client.query(`CREATE TABLE "${S}"."${t.name}" (\n  ${[...cols, ...local].join(",\n  ")}\n)`)
}
console.log(`Created ${schema.tables.length} tables`)

// ------------------------------------------------------------------- data
let totalRows = 0
for (const t of schema.tables) {
  if (t.rows === 0) continue

  const colList = t.columns.map((c) => `"${c.name}"`).join(", ")
  // Each parameter is cast back to the column's exact type, undoing the ::text
  // used at dump time. See the note in 01-dump-db.mjs for why that matters.
  const casts = t.columns.map((c, i) => `$${i + 1}::${c.type}`)

  const rl = createInterface({ input: createReadStream(path.join(OUT, "data", `${t.name}.jsonl`)), crlfDelay: Infinity })
  let batch = []
  let written = 0

  const flush = async () => {
    if (batch.length === 0) return
    // One multi-row INSERT per batch, with placeholders offset per row.
    const values = batch
      .map((_, r) => `(${casts.map((c) => c.replace(/\$(\d+)/, (_m, n) => `$${r * t.columns.length + Number(n)}`)).join(", ")})`)
      .join(", ")
    await client.query(`INSERT INTO "${S}"."${t.name}" (${colList}) VALUES ${values}`, batch.flat())
    written += batch.length
    batch = []
  }

  for await (const line of rl) {
    if (!line) continue
    batch.push(JSON.parse(line))
    if (batch.length >= BATCH) await flush()
  }
  await flush()

  totalRows += written
  const flag = written === t.rows ? "" : `  <-- expected ${t.rows}`
  console.log(`  ${t.name}: ${written} rows${flag}`)
}
console.log(`Inserted ${totalRows} rows`)

// ------------------------------------------------- foreign keys, then indexes
for (const t of schema.tables) {
  for (const c of t.constraints.filter((c) => c.type === "f")) {
    await client.query(`ALTER TABLE "${S}"."${t.name}" ADD CONSTRAINT "${c.name}" ${c.def}`)
  }
}
for (const t of schema.tables) {
  for (const i of t.indexes) {
    await client.query(i.def)
  }
}
console.log("Applied foreign keys and indexes")

await client.end()
console.log("\nNext: 03-copy-blobs.mjs")
