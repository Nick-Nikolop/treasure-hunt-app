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

## 5. Local Development Commands

- **Install dependencies**: `pnpm install`
- **Run dev server**: `pnpm dev` (Runs on `http://localhost:3000`)
- **Run linting**: `pnpm lint`
- **Build production bundle**: `pnpm build`
