# Migrating this project to another v0 / Vercel account

Copies the Neon database and the Blob store into a **new project on a different
account**. v0-managed Neon projects and Blob stores cannot be transferred between
accounts, so the target provisions its own and we copy data in.

Verified against the live source database: 22 tables, 39,237 rows, 27 MB, 5 blobs
(9.26 MB). No extensions, enums, views, triggers or sequences, so nothing here
needs special handling.

`pg_dump` is **not** used. It is unavailable in the v0 sandbox (no root to install
it, and the client must match Postgres 17), so these scripts do the same job in
pure Node with the `pg` driver that is already a dependency.

---

## Order matters

Run them in this order. Steps 3 and 4 are a pair: step 3 writes the URL map that
step 4 consumes, and skipping 4 leaves every image in the app pointing at the old
account's blob store.

```bash
# 0. Target project first: push this repo to GitHub, create the v0 project on the
#    other account from it, then add the Neon + Blob integrations THERE. That is
#    what generates the target DATABASE_URL and BLOB_READ_WRITE_TOKEN below.

export SOURCE_DATABASE_URL='...'          # this project's DATABASE_URL
export TARGET_DATABASE_URL='...'          # new project's DATABASE_URL
export SOURCE_BLOB_TOKEN='...'            # this project's BLOB_READ_WRITE_TOKEN
export TARGET_BLOB_TOKEN='...'            # new project's BLOB_READ_WRITE_TOKEN

node migration/01-dump-db.mjs             # -> migration/out/
node migration/02-restore-db.mjs          # schema + data (add --fresh to re-run)
node migration/03-copy-blobs.mjs          # -> migration/out/blob-url-map.json
node migration/04-rewrite-blob-urls.mjs   # patches URLs in the target DB
node migration/05-verify.mjs              # exits non-zero if anything is off
```

Every script accepts `--dry-run` except the dump (which only reads) and takes its
credentials from the environment, so nothing is hardcoded.

## What each step does

**01-dump-db** writes one JSONL file per table plus `schema.json`. Values are
serialised losslessly: timestamps keep microsecond precision, `jsonb` keeps key
order, `bytea` becomes base64. Reads inside a `REPEATABLE READ` snapshot so a
long dump cannot tear across tables.

**02-restore-db** recreates tables, then loads data parent-before-child so the two
foreign keys (`campaign_visit -> campaign_link`, `team_member -> team`) never fail,
then applies primary keys, unique constraints, foreign keys and indexes. Refuses to
run against a non-empty target unless you pass `--fresh`, which drops and rebuilds.

**03-copy-blobs** downloads each blob and re-uploads it to the target store,
preserving pathnames and content types. Writes `blob-url-map.json` (old URL -> new
URL), because the new store has a different hostname *and* fresh random suffixes.

**04-rewrite-blob-urls** finds every text/jsonb column in the target database that
contains a source blob URL and rewrites it using that map. It discovers columns
from the catalog rather than hardcoding them, so columns added later are still
covered. Currently it patches `lead.stampImageUrl`, `lead.backgroundImageUrl` and
`proof_submission.photoUrls` (a jsonb array, handled element-wise). It deliberately
leaves relative paths such as `/stamps/serbia.png` alone.

**05-verify** compares table lists, row counts, primary keys, constraint and index
counts, then hashes every row rendered as text on both sides. The hash is the check
that matters: matching row counts would happily hide shifted timestamps, reformatted
floats or re-ordered `jsonb`.

## Env vars to copy by hand

The integrations regenerate their own vars. These six must be re-entered in the
new project:

`BETTER_AUTH_SECRET`, `API_KEY`, `API_KEY_2`, `APPS_SCRIPT_SECRET`,
`APPS_SCRIPT_WEBHOOK_URL`, `AI_GATEWAY_API_KEY`

Copy `BETTER_AUTH_SECRET` **verbatim** to keep all existing sessions valid. Change
it and every signed-in user is logged out at once. Password hashes are unaffected
either way, so nobody is locked out permanently.

## Two things that are easy to miss

**The printed QR codes encode a domain.** The tokens in `clue_token` and
`location_qr` migrate fine, but if the physical codes point at the current domain
and it does not move with the project, every code in the field goes dead. Moving
the custom domain to the new project avoids this entirely.

**`APPS_SCRIPT_WEBHOOK_URL` points outward.** Repoint the Apps Script at the new
deployment, and audit `campaign_link.targetUrl` for absolute URLs baked in.

## Scope

Only the `public` schema is migrated. The database also contains a Neon-managed
`neon_auth` schema, which is infrastructure belonging to the source Neon project;
the app never queries it and the target's own Neon integration provides its own.
Auth data the app actually uses lives in `public` (`user`, `session`, `account`)
and is migrated.

## Do not commit the output

`migration/out/` holds session tokens, password hashes and personal data copied
verbatim from the database. It is gitignored. Delete it once the migration is done.
