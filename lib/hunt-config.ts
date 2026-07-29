// ─────────────────────────────────────────────────────────────────────────
//  Hunt-wide settings that live on the single `score_config` row. Despite that
//  legacy table name there is no scoring any more: standings are decided purely
//  by how far a crew has come and how early they got there. The row survives
//  because it carries the settings read here (cooldown, journal wash, compass,
//  phase rollout).
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { scoreConfig, phaseLead } from "@/lib/db/schema"
import { DEFAULT_COOLDOWN_SECONDS } from "@/lib/clues"
import { DEFAULT_COMPASS_OPACITY_PCT } from "@/lib/compass"
import {
  DEFAULT_JOURNAL_UNLOCK_MS,
  DEFAULT_PHASE2_UNLOCK_MS,
  computeEffectivePhase,
  type Phase,
  type PhaseSettings,
  type PhaseOverride,
} from "@/lib/phase"
import { desc, eq } from "drizzle-orm"

/** Clamp a raw cooldown to a sane non-negative range (0..24h, in seconds). */
function clampCooldown(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COOLDOWN_SECONDS
  return Math.max(0, Math.min(86_400, Math.floor(value)))
}

/**
 * The anti-cheat cooldown (in seconds) enforced between a crew's two
 * consecutive QR solves. Falls back to the default when no settings row exists.
 * A value of 0 disables the gate entirely.
 */
export async function getSolveCooldownSeconds(): Promise<number> {
  const rows = await db
    .select({ seconds: scoreConfig.solveCooldownSeconds })
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"))
    .limit(1)
  const row = rows[0]
  if (!row) return DEFAULT_COOLDOWN_SECONDS
  return clampCooldown(row.seconds)
}

/** Upsert the solve cooldown (seconds) onto the single settings row. */
export async function setSolveCooldownSeconds(seconds: number): Promise<void> {
  const value = clampCooldown(seconds)
  await db
    .insert(scoreConfig)
    .values({ id: "default", solveCooldownSeconds: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { solveCooldownSeconds: value, updatedAt: new Date() },
    })
}

// ─────────────────────────────────────────────────────────────────────────
//  Journal lead-page background wash (also on the single `score_config` row).
// ─────────────────────────────────────────────────────────────────────────

/** Default opacity (%) of the parchment wash over lead-page landmark art. */
export const DEFAULT_LEAD_BG_WASH_PCT = 72

/** Clamp a raw wash value to a whole percentage in the 0..100 range. */
function clampWash(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LEAD_BG_WASH_PCT
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * How strongly the parchment wash covers the landmark background on every
 * journal lead page (0 = art fully visible, 100 = art hidden). A single global
 * setting shared by all leads. Falls back to the default when no row exists.
 */
export async function getLeadBgWashPct(): Promise<number> {
  const rows = await db
    .select({ pct: scoreConfig.leadBgWashPct })
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"))
    .limit(1)
  const row = rows[0]
  if (!row) return DEFAULT_LEAD_BG_WASH_PCT
  return clampWash(row.pct)
}

/** Upsert the lead-page background wash strength (%) onto the settings row. */
export async function setLeadBgWashPct(pct: number): Promise<void> {
  const value = clampWash(pct)
  await db
    .insert(scoreConfig)
    .values({ id: "default", leadBgWashPct: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { leadBgWashPct: value, updatedAt: new Date() },
    })
}

// ─────────────────────────────────────────────────────────────────────────
//  Journal compass visibility (also on the single `score_config` row).
// ─────────────────────────────────────────────────────────────────────────

/** Clamp a raw compass opacity to a whole percentage in the 0..100 range. */
function clampCompassOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COMPASS_OPACITY_PCT
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * How visible the compass is on every journal lead page (0 = invisible,
 * 100 = fully opaque). A single global setting shared by all leads. Falls back
 * to the default when no settings row exists yet.
 */
export async function getCompassOpacityPct(): Promise<number> {
  const rows = await db
    .select({ pct: scoreConfig.compassOpacityPct })
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"))
    .limit(1)
  const row = rows[0]
  if (!row) return DEFAULT_COMPASS_OPACITY_PCT
  return clampCompassOpacity(row.pct)
}

/** Upsert the journal compass visibility (%) onto the settings row. */
export async function setCompassOpacityPct(pct: number): Promise<void> {
  const value = clampCompassOpacity(pct)
  await db
    .insert(scoreConfig)
    .values({ id: "default", compassOpacityPct: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { compassOpacityPct: value, updatedAt: new Date() },
    })
}

// ─────────────────────────────────────────────────────────────────────────
//  Phased rollout settings (also live on the single `score_config` row).
// ─────────────────────────────────────────────────────────────────────────

/** Normalize a stored override string to the strict PhaseOverride union. */
function normalizeOverride(value: string | null | undefined): PhaseOverride {
  return value === "1" || value === "2" || value === "3" ? value : "auto"
}

/**
 * Read the current phase configuration (override + the two unlock instants),
 * falling back to the code defaults when the row or a column is empty.
 */
export async function getPhaseSettings(): Promise<PhaseSettings> {
  const rows = await db
    .select({
      override: scoreConfig.phaseOverride,
      phase2: scoreConfig.phase2UnlockAt,
      journal: scoreConfig.journalUnlockAt,
      journalLockedManual: scoreConfig.journalLockedManual,
    })
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"))
    .limit(1)
  const row = rows[0]
  return {
    override: normalizeOverride(row?.override),
    phase2UnlockMs: row?.phase2 ? row.phase2.getTime() : DEFAULT_PHASE2_UNLOCK_MS,
    journalUnlockMs: row?.journal ? row.journal.getTime() : DEFAULT_JOURNAL_UNLOCK_MS,
    // Absent row / column ⇒ OPEN. The journal defaults to unlocked so a fresh
    // or half-migrated database can never accidentally seal it.
    journalLockedManual: row?.journalLockedManual ?? false,
  }
}

/** Flip the manual journal + leaderboard seal. */
export async function setJournalLockedManual(locked: boolean): Promise<void> {
  await db
    .insert(scoreConfig)
    .values({ id: "default", journalLockedManual: locked, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { journalLockedManual: locked, updatedAt: new Date() },
    })
}

/** Compute the effective phase right now (or at a given instant). */
export async function getEffectivePhase(nowMs: number = Date.now()): Promise<Phase> {
  const settings = await getPhaseSettings()
  return computeEffectivePhase(settings, nowMs)
}

/** Upsert the phase override ("auto" | "1" | "2" | "3"). */
export async function setPhaseOverride(override: PhaseOverride): Promise<void> {
  await db
    .insert(scoreConfig)
    .values({ id: "default", phaseOverride: override, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { phaseOverride: override, updatedAt: new Date() },
    })
}

/** Upsert both countdown targets (UTC ms). Pass null to clear back to default. */
export async function setPhaseUnlockTimes(input: {
  phase2UnlockMs: number | null
  journalUnlockMs: number | null
}): Promise<void> {
  const phase2 = input.phase2UnlockMs != null ? new Date(input.phase2UnlockMs) : null
  const journal = input.journalUnlockMs != null ? new Date(input.journalUnlockMs) : null
  await db
    .insert(scoreConfig)
    .values({
      id: "default",
      phase2UnlockAt: phase2,
      journalUnlockAt: journal,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { phase2UnlockAt: phase2, journalUnlockAt: journal, updatedAt: new Date() },
    })
}

// ── Notify-later waitlist (phase_lead) ──────────────────────────────────────

/**
 * Add an email to the notify-later waitlist. Idempotent: a duplicate email is
 * silently ignored. Returns true when a new row was created. `termsVersion`
 * records the Terms/Privacy revision the visitor consented to; the acceptance
 * time is stamped here on the server.
 */
export async function addPhaseLead(rawEmail: string, termsVersion?: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase()
  if (!email) return false
  const inserted = await db
    .insert(phaseLead)
    .values({
      id: crypto.randomUUID(),
      email,
      termsVersion: termsVersion ?? null,
      acceptedTermsAt: termsVersion ? new Date() : null,
    })
    .onConflictDoNothing({ target: phaseLead.email })
    .returning({ id: phaseLead.id })
  return inserted.length > 0
}

/** All waitlist entries, newest first (admin export). */
export async function getPhaseLeads(): Promise<{ email: string; createdAt: Date }[]> {
  return db
    .select({ email: phaseLead.email, createdAt: phaseLead.createdAt })
    .from(phaseLead)
    .orderBy(desc(phaseLead.createdAt))
}

/** Count of waitlist entries (cheap, for the admin summary). */
export async function getPhaseLeadCount(): Promise<number> {
  const rows = await getPhaseLeads()
  return rows.length
}

/**
 * Remove a single email from the notify-later waitlist. Returns true when a row
 * was actually deleted (false if the email was not on the list).
 */
export async function removePhaseLead(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase()
  if (!email) return false
  const deleted = await db
    .delete(phaseLead)
    .where(eq(phaseLead.email, email))
    .returning({ id: phaseLead.id })
  return deleted.length > 0
}
