# Antigravity Developer & Deployment Guide

This document contains essential instructions, rules, and configurations for Antigravity (and developers) working on the **Treasure Hunt App** codebase.

---

## 1. Project & Deployment Architecture

- **GitHub Repository**: `Nick-Nikolop/treasure-hunt-app` (Private)
- **Vercel Project**: `treasure-hunt-app` (under `webmasteerras-5398's projects`)
- **Production Domain**: [https://www.thehunt.gr](https://www.thehunt.gr)
- **Framework**: Next.js 16 (Turbopack, App Router, React 19)
- **Package Manager**: `pnpm`

---

## 2. Git Commit Author Requirements (CRITICAL)

> [!IMPORTANT]
> **Vercel verifies that the Git commit author email matches the Vercel account.**
> If commits are authored by an email that is not associated with the Vercel account (`webmasteerras@gmail.com`), Vercel will **silently block the auto-deployment** (`buildSkipped: true` / status `UNKNOWN`).

Always verify local Git identity before committing:
```bash
git config user.name "Nick"
git config user.email "webmasteerras@gmail.com"
```

If a commit was accidentally made under a different email, amend it before pushing:
```bash
git commit --amend --reset-author --no-edit
git push --force-with-lease
```

---

## 3. Deployment Workflow

### Auto-Deployment via GitHub (Default)
1. Make code modifications and verify locally with `pnpm dev`.
2. Stage and commit changes with the correct author:
   ```bash
   git add <files>
   git commit -m "feat/fix: description"
   ```
3. Push to `main`:
   ```bash
   git push origin main
   ```
4. Vercel automatically detects the push, initiates the build, and updates `https://www.thehunt.gr`.
5. Check deployment status:
   ```bash
   npx -y vercel ls
   ```

### Manual Production Deploy (Fallback)
If GitHub auto-deploy is ever needed immediately without waiting for webhooks:
```bash
npx -y vercel --prod --yes
```

---

## 4. Environment Variables & Secrets

- Environment variables are stored in `.env.local` (kept out of Git via `.gitignore`).
- To pull the latest development/production environment variables directly from Vercel:
  ```bash
  npx -y vercel env pull .env.local --yes
  ```
- **Key required variables**:
  - `DATABASE_URL`: Neon PostgreSQL pooled connection string.
  - `BETTER_AUTH_SECRET`: Better Auth session signing secret.

---

## 5. Tracking Rule (MANDATORY for every addition or change)

> [!IMPORTANT]
> **Every new feature, page, flow or change MUST tie into the tracking system.** The admin People journeys
> (`/analytics/people`) and source analytics (`/analytics`) must always show what visitors and users actually did.
> A feature that ships without tracking is unfinished.

**How the system works**
- Client: `lib/analytics-client.ts` → `track(name, props)` (batched to `/api/track`). Page views, page dwell time,
  sessions and landing source (`?s=` / `utm_*`) are automatic via `components/pythea/analytics-provider.tsx`.
- Auto-capture: `components/pythea/behavior-tracker.tsx` logs every button/link click (label + link path),
  scroll depth and page errors. Mark elements `data-no-track` to skip, `data-track="name"` to give a clean label.
- Source links: `components/pythea/source-tracker.tsx` → `/api/source-hit` (`source_hit` table, titles in `source_label`).
- Event names live ONLY in `lib/analytics-events.ts` (`EV`). Readable labels for the journey view live in
  `components/analytics/format.ts`.
- Server reads: `lib/people.ts` (people list, journeys, source → sign-up conversion).

**Checklist for every change**
1. Any meaningful action (submit, start, finish, purchase, solve, fail, choose, share, download, open a dialog,
   step forward/back in a flow) fires `track(EV.xxx, {...})` with useful props (ids, step, result, value).
2. New event names are added to `EV` in `lib/analytics-events.ts` (dot-namespaced, e.g. `carnival.step`), never as
   inline strings, and get a readable label in `components/analytics/format.ts`.
3. Account / gameplay events that are part of the service use the `auth.` / `hunt.` / `team.` / `hint.` prefixes
   (see `isServiceEvent` in `lib/consent-server.ts`) so they stay linked to the account.
4. Renaming or moving a page/flow: keep old event names working or update `format.ts` + `lib/people.ts`, so
   existing history still reads correctly. Never delete tracking without replacing it.
5. New routes are covered automatically (root layout). If a route renders outside the root layout or bypasses
   `<AnalyticsProvider />`, wire it in explicitly.
6. Clickable custom elements (divs with onClick, cards) get a `role="button"` / `aria-label` or `data-track` so the
   click shows a readable label.
7. Verify in the journey view (`/analytics/people/...`) that the new actions appear before calling it done.
8. **Production has its own database** (the v0/dev DB is a separate copy). New analytics tables or columns MUST be
   added to `lib/analytics-storage.ts` (idempotent `CREATE TABLE / ADD COLUMN / CREATE INDEX IF NOT EXISTS`, run
   by `ensureAnalyticsStorage()` at the top of every analytics read/write). Never rely on a table created only in
   the dev DB, or production tracking silently fails.

**Privacy (non-negotiable, GDPR)**
- Respect the cookie banner. Without "accepted" consent there is NO device id, NO session id, NO storage and NO IP
  — events are only counted anonymously. This is enforced in `lib/analytics-client.ts` (`hasAnalyticsConsent`) and
  on the server (`lib/consent-server.ts`). Never bypass it, never add a second id/fingerprint.
- NEVER track typed field values, passwords, codes, answers, emails or free text. Track that something happened and
  its outcome (e.g. `{ correct: false, attempt: 3 }`), not what was typed.

---

## 6. Local Development Commands

- **Install dependencies**: `pnpm install`
- **Run dev server**: `pnpm dev` (Runs on `http://localhost:3000`)
- **Run linting**: `pnpm lint`
- **Build production bundle**: `pnpm build`
