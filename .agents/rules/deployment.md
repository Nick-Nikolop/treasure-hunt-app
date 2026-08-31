---
description: Rules for committing, git author settings, and Vercel deployment workflows
---

# Antigravity Git & Deployment Rules

## 1. Commit Authorship (Mandatory)
When making Git commits in this repository, ensure the commit author is set to:
- Name: `Nick`
- Email: `webmasteerras@gmail.com`

**Why:** Vercel checks the Git commit author against authorized team members. Any unverified email will cause Vercel to block automated deployments.

## 2. Deployments
- Pushing to branch `main` on `Nick-Nikolop/treasure-hunt-app` automatically triggers a production deployment on Vercel (`https://www.thehunt.gr`).
- Check status using: `npx -y vercel ls`
- Pull latest env variables using: `npx -y vercel env pull .env.local --yes`

## 3. Package Management & Local Server
- Use `pnpm` (`pnpm install`, `pnpm dev`, `pnpm build`).
