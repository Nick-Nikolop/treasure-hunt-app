"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, leadUnlock, session, team, teamMember, user } from "@/lib/db/schema"
import {
  requireAdmin,
  requireBootstrapAdmin,
  getAdminUser,
  isBootstrapEmail,
  superadminCount,
  type AdminUser,
} from "@/lib/admin"
import { siteUrl } from "@/lib/site-url"
import {
  createLocationQr,
  getActiveLocationQr,
  getLocationPings,
  type LocationPing,
} from "@/lib/location-ping"
import {
  logActivity,
  resolveUserSnapshot,
  actorLabel,
  listActivity,
  type ActivityCategory,
  type ActivityPage,
} from "@/lib/activity"
import { MAX_CREW_SIZE, generateInviteCode } from "@/lib/teams"
import {
  setProgressForUsers,
  getClueTokens,
  regenerateToken,
  approveLeadUnlock,
  type ClueTokenRow,
} from "@/lib/hunt"
import {
  getPendingProofs,
  getPendingProofCount,
  getRecentDecidedProofs,
  getProofById,
  decideProof,
  deleteProofsByIds,
  deleteAllDecidedProofs,
  type ProofRow,
} from "@/lib/proofs"
import {
  listHints,
  createHint,
  updateHint,
  deleteHint,
  regenerateHintToken,
  normalizeLeadOrder,
  type HintRow,
} from "@/lib/hints"
import {
  getScoreConfig,
  setScoreConfig,
  setLeadDifficulties,
} from "@/lib/scoring"
import {
  getSolveCooldownSeconds,
  setSolveCooldownSeconds,
  getPhaseSettings,
  setPhaseOverride,
  setPhaseUnlockTimes,
  getPhaseLeads,
  removePhaseLead,
} from "@/lib/hunt-config"
import {
  computeEffectivePhase,
  normalizedJournalUnlockMs,
  type PhaseInput,
  type PhaseOverride,
} from "@/lib/phase"
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  regenerateCampaignToken,
  getCampaignStats,
  type CampaignRow,
  type CampaignStats,
} from "@/lib/campaigns"
import { getEditableLeads, type EditableLead } from "@/lib/lead-content"
import {
  getLeadDefs,
  getTotalLeads,
  createLead,
  deleteLead,
  reorderLeads,
  updateLeadContent,
  updateLeadStamp,
  updateLeadGeo,
} from "@/lib/leads"
import { put, del } from "@vercel/blob"
import { getAnalyticsSnapshot, type AnalyticsSnapshot } from "@/lib/analytics"
import {
  FINISH_ORDER,
  effectiveUnlockedCount,
  isDifficulty,
  isLeadIcon,
  type Difficulty,
  type ScoreConfig,
} from "@/lib/clues"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Build the actor fields for an activity log entry from the acting admin. */
function adminActor(admin: AdminUser) {
  return {
    actorId: admin.id,
    actorName: actorLabel(admin),
    actorRole: admin.role,
  }
}

/**
 * Read a filtered, paginated page of the activity log for the admin dashboard.
 * Superadmin only. `before` is an ISO timestamp cursor for "load more".
 */
export async function getActivityLog(input: {
  category?: ActivityCategory | null
  userId?: string | null
  teamId?: string | null
  search?: string | null
  before?: string | null
}): Promise<ActivityPage> {
  await requireAdmin()
  return listActivity({
    category: input.category ?? null,
    userId: input.userId ?? null,
    teamId: input.teamId ?? null,
    search: input.search ?? null,
    before: input.before ? new Date(input.before) : null,
    limit: 50,
  })
}

export type AdminUserRow = {
  id: string
  name: string
  email: string
  firstName: string | null
  lastName: string | null
  yearOfBirth: number | null
  role: string
  createdAt: Date
  teamId: string | null
  teamName: string | null
  teamRole: string | null
  /** Effective unlocked-lead count for this user (stored + lead-1 time gate). */
  progress: number
}

export type AdminTeamRow = {
  id: string
  name: string
  ownerId: string
  inviteCode: string
  createdAt: Date
  /** Furthest lead any member of the team has reached. */
  progress: number
  members: {
    userId: string
    name: string
    email: string
    role: string
  }[]
}

export type AdminData = {
  users: AdminUserRow[]
  teams: AdminTeamRow[]
  superadminCount: number
  /** Total number of leads in the hunt (for progress controls). */
  totalLeads: number
  /** QR scan links, one per lead order (2..9). */
  tokens: ClueTokenRow[]
  /** Admin-authored hints, newest first. */
  hints: HintRow[]
  /** Trackable marketing links with visit summaries, newest first. */
  campaigns: CampaignRow[]
  /** Lead options (order + country names) for the hint association dropdown. */
  leadOptions: { order: number; country: string; countryEn: string }[]
  /** Global scoring tiers (placement points + difficulty bonuses). */
  scoreConfig: ScoreConfig
  /** Anti-cheat cooldown (seconds) enforced between consecutive QR solves. */
  solveCooldownSeconds: number
  /** Difficulty per lead order (1..TOTAL_CLUES). */
  leadDifficulties: { order: number; difficulty: Difficulty }[]
  /** Editable lead copy (subtitle + body, per language) with defaults merged. */
  leads: EditableLead[]
  /** First page of the audit log (newest first), unfiltered. */
  activity: ActivityPage
  /** Behavioural analytics snapshot (default 14-day window) for the Analytics tab. */
  analytics: AnalyticsSnapshot
  /** Phased-rollout control state for the Phase tab. */
  phase: PhaseAdminData
  /** Count of photo proofs awaiting review (drives the Proofs tab badge). */
  pendingProofCount: number
}

/** Everything the Phase tab needs to render + edit the rollout gates. */
export type PhaseAdminData = {
  settings: PhaseInput
  /** The effective phase right now, given the settings + server clock. */
  effectivePhase: 1 | 2 | 3
  /** The notify-later waitlist captured on the teaser (newest first). */
  waitlist: { email: string; createdAt: Date }[]
}

/** Load every user and team for the dashboard. Superadmin only. */
export async function getAdminData(): Promise<AdminData> {
  await requireAdmin()

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      yearOfBirth: user.yearOfBirth,
      role: user.role,
      createdAt: user.createdAt,
      teamId: teamMember.teamId,
      teamRole: teamMember.role,
      teamName: team.name,
    })
    .from(user)
    .leftJoin(teamMember, eq(teamMember.userId, user.id))
    .leftJoin(team, eq(team.id, teamMember.teamId))
    .orderBy(desc(user.createdAt))

  const teams = await db.select().from(team).orderBy(asc(team.createdAt))

  const allMembers = await db
    .select({
      teamId: teamMember.teamId,
      userId: teamMember.userId,
      role: teamMember.role,
      name: user.name,
      email: user.email,
    })
    .from(teamMember)
    .leftJoin(user, eq(user.id, teamMember.userId))
    .orderBy(asc(teamMember.joinedAt))

  // Per-user stored progress (highest unlocked lead), folded with the lead-1
  // time gate to get each user's effective progress.
  const now = Date.now()
  const editableLeads = await getEditableLeads()
  const unlocks = await db
    .select({ userId: leadUnlock.userId, leadOrder: leadUnlock.leadOrder })
    .from(leadUnlock)
  const storedByUser = new Map<string, number>()
  for (const row of unlocks) {
    storedByUser.set(row.userId, Math.max(storedByUser.get(row.userId) ?? 0, row.leadOrder))
  }
  const liveTotal = editableLeads.length
  const progressOf = (userId: string) =>
    effectiveUnlockedCount(storedByUser.get(userId) ?? 0, now, liveTotal)

  const teamsWithMembers: AdminTeamRow[] = teams.map((tm) => {
    const memberRows = allMembers.filter((m) => m.teamId === tm.id)
    // A team's progress is the furthest any of its members has reached.
    const teamProgress = memberRows.reduce((max, m) => Math.max(max, progressOf(m.userId)), 0)
    return {
      id: tm.id,
      name: tm.name,
      ownerId: tm.ownerId,
      inviteCode: tm.inviteCode,
      createdAt: tm.createdAt,
      progress: teamProgress,
      members: memberRows.map((m) => ({
        userId: m.userId,
        name: m.name ?? "",
        email: m.email ?? "",
        role: m.role,
      })),
    }
  })

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      yearOfBirth: u.yearOfBirth,
      role: u.role,
      createdAt: u.createdAt,
      teamId: u.teamId,
      teamName: u.teamName,
      teamRole: u.teamRole,
      progress: progressOf(u.id),
    })),
    teams: teamsWithMembers,
    superadminCount: await superadminCount(),
    totalLeads: editableLeads.length,
    tokens: await getClueTokens(),
    hints: await listHints(),
    campaigns: await listCampaigns(),
    leadOptions: editableLeads.map((c) => ({
      order: c.order,
      country: c.country,
      countryEn: c.countryEn,
    })),
    scoreConfig: await getScoreConfig(),
    solveCooldownSeconds: await getSolveCooldownSeconds(),
    leadDifficulties: editableLeads.map((c) => ({
      order: c.order,
      difficulty: c.difficulty,
    })),
    leads: editableLeads,
    activity: await listActivity({ limit: 50 }),
    analytics: await getAnalyticsSnapshot(14),
    phase: await getPhaseAdminData(),
    pendingProofCount: await getPendingProofCount(),
  }
}

// ── Photo-proof review ───────────────────────────────────────────────────────

/** A proof submission enriched with the lead's country names for display. */
export type AdminProofRow = ProofRow & { country: string; countryEn: string }

export type AdminProofsData = {
  pending: AdminProofRow[]
  recent: AdminProofRow[]
}

/** Attach the lead's current country names to a batch of proof rows. */
async function enrichProofs(rows: ProofRow[]): Promise<AdminProofRow[]> {
  const defs = await getLeadDefs()
  return rows.map((r) => {
    const def = defs.find((d) => d.order === r.leadOrder)
    return {
      ...r,
      country: def?.country ?? `No. ${String(r.leadOrder).padStart(2, "0")}`,
      countryEn: def?.countryEn ?? `No. ${String(r.leadOrder).padStart(2, "0")}`,
    }
  })
}

/** The proof review queue: pending (oldest first) + recently decided. Admin only. */
export async function adminListProofs(): Promise<AdminProofsData> {
  await requireAdmin()
  const [pending, recent] = await Promise.all([getPendingProofs(), getRecentDecidedProofs(20)])
  return {
    pending: await enrichProofs(pending),
    recent: await enrichProofs(recent),
  }
}

/**
 * Approve or reject a pending photo proof. On approve, unlock the lead for the
 * submitter's crew (order still enforced at approval time; the solve cooldown is
 * skipped since a human vetted it). Superadmin only. Idempotent: a proof that was
 * already decided by another admin is reported as such.
 */
export async function adminDecideProof(
  id: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<
  | { ok: true; decision: "approved" | "rejected"; unlock?: string }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin()

  const existing = await getProofById(id)
  if (!existing) return { ok: false, error: "not_found" }
  if (existing.status !== "pending") return { ok: false, error: "already_decided" }

  const cleanReason = decision === "rejected" ? (reason ?? "").trim().slice(0, 500) || null : null

  const decided = await decideProof(id, decision, { id: admin.id, name: actorLabel(admin) }, cleanReason)
  if (!decided) return { ok: false, error: "already_decided" }

  let unlock: string | undefined
  if (decision === "approved") {
    const res = await approveLeadUnlock(existing.userId, existing.leadOrder)
    unlock = res.status
  }

  const padded = String(existing.leadOrder).padStart(2, "0")
  await logActivity({
    category: "admin",
    action: decision === "approved" ? "admin.proof_approved" : "admin.proof_rejected",
    ...adminActor(admin),
    targetUserId: existing.userId,
    targetUserName: existing.userName,
    leadOrder: existing.leadOrder,
    summary:
      decision === "approved"
        ? `${actorLabel(admin)} approved ${existing.userName}'s photo proof for lead No. ${padded}`
        : `${actorLabel(admin)} rejected ${existing.userName}'s photo proof for lead No. ${padded}`,
    metadata: { context: existing.context, reason: cleanReason, unlock },
  })

  revalidatePath("/admin")
  return { ok: true, decision, unlock }
}

/**
 * Permanently delete decided (approved/rejected) photo proofs to free up space,
 * removing both the DB rows and their Blob images. Pass `{ all: true }` to purge
 * every decided proof, or a list of ids to delete a selection. Pending proofs
 * are never deleted. Superadmin only.
 */
export async function adminDeleteProofs(input: {
  ids?: string[]
  all?: boolean
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = await requireAdmin()

  const deleted = input.all
    ? await deleteAllDecidedProofs()
    : await deleteProofsByIds(input.ids ?? [])

  // Purge the images from Blob. A failure here shouldn't undo the DB deletion,
  // so swallow errors (orphan blobs are harmless and can be cleaned up later).
  if (deleted.photoUrls.length > 0) {
    try {
      await del(deleted.photoUrls)
    } catch {
      // ignore: rows are already gone; blobs are at worst orphaned
    }
  }

  if (deleted.count > 0) {
    await logActivity({
      category: "admin",
      action: "admin.proofs_deleted",
      ...adminActor(admin),
      summary: `${actorLabel(admin)} deleted ${deleted.count} photo proof${
        deleted.count === 1 ? "" : "s"
      }${input.all ? " (all decided)" : ""}`,
      metadata: { count: deleted.count, all: Boolean(input.all) },
    })
    revalidatePath("/admin")
  }

  return { ok: true, count: deleted.count }
}

// ── Global admin alerts (top-right widget on every page) ─────────────────────

/** A single lead that is missing required content, for the alerts widget. */
export type LeadIssue = { order: number; country: string; issues: string[] }

export type AdminAlerts = {
  /** Whether the caller is an admin. Non-admins get a benign empty payload. */
  isAdmin: boolean
  /** Photo proofs awaiting review. */
  pendingProofs: number
  /** Leads missing a location or other required info. */
  leadIssues: LeadIssue[]
}

/**
 * Lightweight, admin-gated summary powering the floating alerts widget. Safe to
 * call from any page: non-admins receive `{ isAdmin: false }` with zeroed
 * counts, so the widget renders nothing for them. Flags each lead that is
 * missing a location or key content (story, clue, or stamp image).
 */
export async function getAdminAlerts(): Promise<AdminAlerts> {
  const admin = await getAdminUser()
  if (!admin) return { isAdmin: false, pendingProofs: 0, leadIssues: [] }

  const [pendingProofs, leads] = await Promise.all([getPendingProofCount(), getEditableLeads()])

  const leadIssues: LeadIssue[] = []
  for (const l of leads) {
    const issues: string[] = []
    if (l.lat == null || l.lng == null) issues.push("location")
    if (!l.body || !l.body.trim()) issues.push("story")
    if (!l.subtitle || !l.subtitle.trim()) issues.push("clue")
    if (!l.stampImageUrl) issues.push("stamp")
    if (issues.length > 0) leadIssues.push({ order: l.order, country: l.country, issues })
  }

  return { isAdmin: true, pendingProofs, leadIssues }
}

/** Load the phase settings, the effective phase now, and the waitlist. */
async function getPhaseAdminData(): Promise<PhaseAdminData> {
  const settings = await getPhaseSettings()
  return {
    settings,
    effectivePhase: computeEffectivePhase(settings, Date.now()),
    waitlist: await getPhaseLeads(),
  }
}

/**
 * Save the phased-rollout configuration: the override mode and the two Athens
 * wall-clock unlock instants (already converted to UTC ms by the client). This
 * is the single most disruptive admin control, so the UI gates it behind a
 * double confirmation before calling this.
 */
export async function adminSavePhase(input: {
  override: PhaseOverride
  phase2UnlockMs: number
  journalUnlockMs: number
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const overrides: PhaseOverride[] = ["auto", "1", "2", "3"]
  if (!overrides.includes(input.override)) return { ok: false, error: "bad_value" }
  if (!Number.isFinite(input.phase2UnlockMs) || !Number.isFinite(input.journalUnlockMs)) {
    return { ok: false, error: "bad_value" }
  }

  const before = await getPhaseSettings()
  await setPhaseOverride(input.override)
  await setPhaseUnlockTimes({
    phase2UnlockMs: input.phase2UnlockMs,
    journalUnlockMs: input.journalUnlockMs,
  })

  const after: PhaseInput = {
    override: input.override,
    phase2UnlockMs: input.phase2UnlockMs,
    journalUnlockMs: normalizedJournalUnlockMs({
      override: input.override,
      phase2UnlockMs: input.phase2UnlockMs,
      journalUnlockMs: input.journalUnlockMs,
    }),
  }

  await logActivity({
    ...adminActor(admin),
    category: "admin",
    action: "phase_update",
    summary: `Phase settings updated (override ${before.override} → ${after.override})`,
  })

  // The gate is read on every request, but revalidate the key routes so any
  // cached shells refresh immediately.
  revalidatePath("/", "layout")
  return { ok: true }
}

/**
 * Remove a single email from the notify-later waitlist. Used when someone asks
 * to be taken off the list (GDPR erasure) or to clean up bad entries.
 */
export async function adminRemovePhaseLead(email: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const clean = String(email ?? "").trim().toLowerCase()
  if (!clean) return { ok: false, error: "bad_value" }

  const removed = await removePhaseLead(clean)
  if (!removed) return { ok: false, error: "not_found" }

  await logActivity({
    ...adminActor(admin),
    category: "admin",
    action: "waitlist_remove",
    summary: `${adminActor(admin).actorName} removed ${clean} from the notify-later waitlist`,
    metadata: { email: clean },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Save the editable content for a single lead, addressed by its stable id.
 * Country, subtitle, body (both languages), the stamp icon and the difficulty
 * are all editable; the stamp image and the lead's position are managed by
 * their own actions. The journal reflects the change on its next render.
 */
export async function adminSaveLead(input: {
  id: string
  country: string
  countryEn: string
  subtitle: string
  subtitleEn: string
  icon: string
  body: string
  bodyEn: string
  difficulty: Difficulty
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const id = (input.id ?? "").trim()
  if (!id) return { ok: false, error: "bad_value" }

  const country = (input.country ?? "").trim()
  const countryEn = (input.countryEn ?? "").trim()
  if (country.length < 1 || countryEn.length < 1) return { ok: false, error: "too_short" }
  if (!isDifficulty(input.difficulty)) return { ok: false, error: "bad_value" }
  const icon = isLeadIcon(input.icon) ? input.icon : "Landmark"

  const existing = (await getLeadDefs()).find((l) => l.id === id)
  if (!existing) return { ok: false, error: "not_found" }

  await updateLeadContent(id, {
    country,
    countryEn,
    subtitle: (input.subtitle ?? "").trim(),
    subtitleEn: (input.subtitleEn ?? "").trim(),
    icon,
    body: input.body ?? "",
    bodyEn: input.bodyEn ?? "",
    difficulty: input.difficulty,
  })

  await logActivity({
    category: "admin",
    action: "admin.lead_edited",
    ...adminActor(admin),
    leadOrder: existing.order,
    summary: `${adminActor(admin).actorName} edited lead No. ${String(existing.order).padStart(2, "0")} (${country})`,
  })

  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Save the scoring settings: the global placement tiers and each lead's
 * difficulty. Scores are computed live from these on every leaderboard read,
 * so saving here instantly recalculates every standing.
 */
export async function adminSaveScoring(input: {
  config: ScoreConfig
  difficulties: { leadOrder: number; difficulty: Difficulty }[]
  /** Anti-cheat cooldown between consecutive QR solves, in seconds. */
  solveCooldownSeconds?: number
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const c = input.config
  const nums = [
    c.firstPoints,
    c.secondPoints,
    c.thirdPoints,
    c.restPoints,
    c.mediumBonus,
    c.hardBonus,
  ]
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    return { ok: false, error: "bad_value" }
  }
  if (
    !Array.isArray(input.difficulties) ||
    input.difficulties.some((d) => !isDifficulty(d.difficulty))
  ) {
    return { ok: false, error: "bad_value" }
  }
  const cooldown = input.solveCooldownSeconds
  if (cooldown !== undefined && (!Number.isFinite(cooldown) || cooldown < 0)) {
    return { ok: false, error: "bad_value" }
  }

  await setScoreConfig(c)
  await setLeadDifficulties(input.difficulties)
  if (cooldown !== undefined) {
    await setSolveCooldownSeconds(cooldown)
  }

  await logActivity({
    category: "admin",
    action: "admin.scoring_updated",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} updated scoring settings and lead difficulties`,
    metadata: { config: c, solveCooldownSeconds: cooldown },
  })

  // Standings are derived live, but revalidate both surfaces so the new numbers
  // show immediately.
  revalidatePath("/admin")
  revalidatePath("/leaderboard")
  return { ok: true }
}

/** Permanently delete a user account and all of its data. */
export async function adminDeleteUser(targetUserId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (targetUserId === admin.id) return { ok: false, error: "cannot_delete_self" }

  // Protect the founding superadmin from deletion.
  const rows = await db
    .select({
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  const target = rows[0]
  if (!target) return { ok: false, error: "not_found" }
  if (isBootstrapEmail(target.email)) return { ok: false, error: "protected" }
  const targetName = actorLabel(target)

  // If they owned a team, hand it off (or disband) before removing them.
  await handleOwnerDeparture(targetUserId)

  // Remove membership, auth rows, then the user. (sessions/accounts also
  // cascade via FK, but delete explicitly to be safe.)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))
  await db.delete(session).where(eq(session.userId, targetUserId))
  await db.delete(account).where(eq(account.userId, targetUserId))
  await db.delete(user).where(eq(user.id, targetUserId))

  await logActivity({
    category: "admin",
    action: "admin.user_deleted",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary: `${adminActor(admin).actorName} permanently deleted the account of ${targetName} (${target.email})`,
    metadata: { email: target.email, role: target.role },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Promote or demote a user's superadmin status. */
export async function adminSetRole(
  targetUserId: string,
  role: "user" | "superadmin",
): Promise<ActionResult> {
  const admin = await requireAdmin()

  const rows = await db
    .select({
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  const target = rows[0]
  if (!target) return { ok: false, error: "not_found" }

  // Never let the founding superadmin be demoted.
  if (role === "user" && isBootstrapEmail(target.email)) {
    return { ok: false, error: "protected" }
  }

  // Don't allow removing the last remaining superadmin.
  if (role === "user" && target.role === "superadmin") {
    const count = await superadminCount()
    if (count <= 1) return { ok: false, error: "last_admin" }
  }

  await db.update(user).set({ role }).where(eq(user.id, targetUserId))

  const targetName = actorLabel(target)
  await logActivity({
    category: "admin",
    action: role === "superadmin" ? "admin.role_granted" : "admin.role_revoked",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary:
      role === "superadmin"
        ? `${adminActor(admin).actorName} promoted ${targetName} to superadmin`
        : `${adminActor(admin).actorName} revoked superadmin from ${targetName}`,
    metadata: { from: target.role, to: role },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Set a new password for any user (admin reset). */
export async function adminSetPassword(
  targetUserId: string,
  newPassword: string,
): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false, error: "too_short" }
  }

  const exists = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (exists.length === 0) return { ok: false, error: "not_found" }

  // Hash with Better Auth's own hasher so the new password is login-compatible.
  const hashed = await auth.$context.then((ctx) => ctx.password.hash(newPassword))

  const credentialRows = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")))
    .limit(1)

  if (credentialRows.length === 0) {
    // No credential row yet (e.g. never set a password): create one.
    await db.insert(account).values({
      id: randomUUID(),
      accountId: targetUserId,
      providerId: "credential",
      userId: targetUserId,
      password: hashed,
    })
  } else {
    await db
      .update(account)
      .set({ password: hashed })
      .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")))
  }

  // Invalidate existing sessions so the old password can't keep a session alive.
  await db.delete(session).where(eq(session.userId, targetUserId))

  const targetName = actorLabel(exists[0])
  await logActivity({
    category: "admin",
    action: "admin.password_reset",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    summary: `${adminActor(admin).actorName} reset the password for ${targetName} (${exists[0].email})`,
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Remove a user from whatever team they're in (kick). Handles ownership. */
export async function adminKickFromTeam(targetUserId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (membership.length === 0) return { ok: false, error: "not_in_team" }

  const kickedTeamId = membership[0].teamId
  const teamRows = await db
    .select({ name: team.name })
    .from(team)
    .where(eq(team.id, kickedTeamId))
    .limit(1)
  const target = await resolveUserSnapshot(targetUserId)

  await handleOwnerDeparture(targetUserId)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))

  await logActivity({
    category: "admin",
    action: "admin.member_kicked",
    ...adminActor(admin),
    targetUserId,
    targetUserName: target.name,
    teamId: kickedTeamId,
    teamName: teamRows[0]?.name ?? null,
    summary: `${adminActor(admin).actorName} kicked ${target.name} from "${teamRows[0]?.name ?? "?"}"`,
  })

  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Assign a user to a team, or move them from their current team to another.
 * The user always joins as a plain "member". If they currently own a team,
 * ownership is handed off (or the team disbanded) before they move out.
 */
export async function adminAssignToTeam(
  targetUserId: string,
  teamId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin()

  // Target must exist.
  const targetRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (targetRows.length === 0) return { ok: false, error: "not_found" }

  // Destination team must exist.
  const teamRows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (teamRows.length === 0) return { ok: false, error: "not_found" }

  // No-op if they're already on that team.
  const current = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (current[0]?.teamId === teamId) return { ok: false, error: "already_in_team" }
  const cameFromTeam = current[0]?.teamId ?? null

  // Respect the crew size cap on the destination.
  const destMembers = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  if (destMembers.length >= MAX_CREW_SIZE) return { ok: false, error: "team_full" }

  // Detach from their current team (handing off ownership first if needed),
  // then attach to the destination as a member.
  await handleOwnerDeparture(targetUserId)
  await db.delete(teamMember).where(eq(teamMember.userId, targetUserId))
  await db.insert(teamMember).values({
    id: randomUUID(),
    teamId,
    userId: targetUserId,
    role: "member",
  })

  const target = await resolveUserSnapshot(targetUserId)
  await logActivity({
    category: "admin",
    action: cameFromTeam ? "admin.member_moved" : "admin.member_assigned",
    ...adminActor(admin),
    targetUserId,
    targetUserName: target.name,
    teamId,
    teamName: teamRows[0].name,
    summary: cameFromTeam
      ? `${adminActor(admin).actorName} moved ${target.name} to team "${teamRows[0].name}"`
      : `${adminActor(admin).actorName} assigned ${target.name} to team "${teamRows[0].name}"`,
    metadata: { fromTeamId: cameFromTeam },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Disband a team entirely: remove all members and delete the team. */
export async function adminDisbandTeam(teamId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const rows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  const memberCount = (
    await db.select({ id: teamMember.id }).from(teamMember).where(eq(teamMember.teamId, teamId))
  ).length

  await db.delete(teamMember).where(eq(teamMember.teamId, teamId))
  await db.delete(team).where(eq(team.id, teamId))

  await logActivity({
    category: "admin",
    action: "admin.team_disbanded",
    ...adminActor(admin),
    teamId,
    teamName: rows[0].name,
    summary: `${adminActor(admin).actorName} disbanded team "${rows[0].name}" (${memberCount} member(s) removed)`,
    metadata: { memberCount },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Rename any team. */
export async function adminRenameTeam(teamId: string, name: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const rows = await db
    .select({ id: team.id, name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  if (rows.length === 0) return { ok: false, error: "not_found" }

  const oldName = rows[0].name
  await db.update(team).set({ name: trimmed }).where(eq(team.id, teamId))

  await logActivity({
    category: "admin",
    action: "admin.team_renamed",
    ...adminActor(admin),
    teamId,
    teamName: trimmed,
    summary: `${adminActor(admin).actorName} renamed team "${oldName}" to "${trimmed}"`,
    metadata: { oldName, newName: trimmed },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Create a new, empty team. The admin is recorded as the owner so the
 * `ownerId` column is satisfied, but no membership row is created, leaving all
 * 8 seats open for users to be assigned into via adminAssignToTeam.
 */
export async function adminCreateTeam(name: string): Promise<ActionResult> {
  await requireAdmin()

  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "too_short" }
  if (trimmed.length > 40) return { ok: false, error: "too_long" }

  const admin = await requireAdmin()
  const code = await uniqueInviteCode()
  const newTeamId = randomUUID()

  await db.insert(team).values({
    id: newTeamId,
    name: trimmed,
    ownerId: admin.id,
    inviteCode: code,
  })

  await logActivity({
    category: "admin",
    action: "admin.team_created",
    ...adminActor(admin),
    teamId: newTeamId,
    teamName: trimmed,
    summary: `${adminActor(admin).actorName} created an empty team "${trimmed}"`,
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Generate an invite code not already in use. Mirrors the teams feature. */
async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = generateInviteCode()
    const existing = await db
      .select({ id: team.id })
      .from(team)
      .where(eq(team.inviteCode, code))
      .limit(1)
    if (existing.length === 0) return code
  }
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
}

/**
 * Set a single user's progress to an exact lead (0..TOTAL_CLUES). This only
 * affects that user; teammates are not touched. Use the team action to move a
 * whole crew together.
 */
export async function adminSetUserProgress(
  targetUserId: string,
  targetLead: number,
): Promise<ActionResult> {
  const admin = await requireAdmin()

  const total = await getTotalLeads()
  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > total) {
    return { ok: false, error: "bad_value" }
  }
  const exists = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)
  if (exists.length === 0) return { ok: false, error: "not_found" }

  const lead = Math.floor(targetLead)
  await setProgressForUsers([targetUserId], lead)

  const targetName = actorLabel(exists[0])
  await logActivity({
    category: "admin",
    action: lead === 0 ? "admin.progress_reset" : "admin.progress_set",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    leadOrder: lead || null,
    summary:
      lead === 0
        ? `${adminActor(admin).actorName} reset ${targetName}'s progress to the start`
        : `${adminActor(admin).actorName} set ${targetName}'s progress to lead No. ${String(lead).padStart(2, "0")}`,
    metadata: { lead },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/**
 * Set an entire team's progress to an exact lead. Every current member is
 * brought to the same point (added or trimmed). Mirrors how a real scan
 * advances the whole crew.
 */
export async function adminSetTeamProgress(
  teamId: string,
  targetLead: number,
): Promise<ActionResult> {
  const admin = await requireAdmin()

  const total = await getTotalLeads()
  if (!Number.isFinite(targetLead) || targetLead < 0 || targetLead > total) {
    return { ok: false, error: "bad_value" }
  }
  const memberRows = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
  if (memberRows.length === 0) return { ok: false, error: "empty_team" }

  const teamRows = await db
    .select({ name: team.name })
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)
  const lead = Math.floor(targetLead)
  await setProgressForUsers(
    memberRows.map((m) => m.userId),
    lead,
  )

  const teamName = teamRows[0]?.name ?? "?"
  await logActivity({
    category: "admin",
    action: lead === 0 ? "admin.team_progress_reset" : "admin.team_progress_set",
    ...adminActor(admin),
    teamId,
    teamName: teamRows[0]?.name ?? null,
    leadOrder: lead || null,
    summary:
      lead === 0
        ? `${adminActor(admin).actorName} reset team "${teamName}" to the start`
        : `${adminActor(admin).actorName} set team "${teamName}" to lead No. ${String(lead).padStart(2, "0")}`,
    metadata: { lead, memberCount: memberRows.length },
  })

  revalidatePath("/admin")
  return { ok: true }
}

/** Reset a single user's progress back to the start (no QR leads held). */
export async function adminResetUserProgress(targetUserId: string): Promise<ActionResult> {
  return adminSetUserProgress(targetUserId, 0)
}

/** Reset an entire team's progress back to the start. */
export async function adminResetTeamProgress(teamId: string): Promise<ActionResult> {
  return adminSetTeamProgress(teamId, 0)
}

/**
 * Reset EVERY account's progress back to the very start (Lead 1). Wipes all
 * stored unlock rows in one pass, so no crew holds any QR lead and Lead 1
 * (time-gated, never stored) becomes everyone's current stop. Intended right
 * after restructuring the lead sequence, so position-based progress can't leave
 * anyone stranded on a lead that has moved or been removed.
 */
export async function adminResetAllProgress(): Promise<
  { ok: true; cleared: number } | { ok: false; error: string }
> {
  const admin = await requireAdmin()

  // Count affected players for the activity log before clearing.
  const affected = await db.selectDistinct({ userId: leadUnlock.userId }).from(leadUnlock)
  await db.delete(leadUnlock)

  await logActivity({
    category: "admin",
    action: "admin.all_progress_reset",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} reset ALL crews back to Lead 1 (${affected.length} affected)`,
    metadata: { affected: affected.length },
  })

  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true, cleared: affected.length }
}

/** Issue a fresh QR token for a lead, invalidating the old printed code. */
export async function adminRegenerateToken(leadOrder: number): Promise<ActionResult> {
  await requireAdmin()
  const order = Math.floor(leadOrder)
  const total = await getTotalLeads()
  const valid = (order >= 2 && order <= total) || order === FINISH_ORDER
  if (!Number.isFinite(leadOrder) || !valid) {
    return { ok: false, error: "bad_value" }
  }
  await regenerateToken(order)
  revalidatePath("/admin")
  return { ok: true }
}

// ── Leads: add / remove / reorder / stamp (admin) ───────────────────────────

/**
 * Reorder the whole sequence. `orderedIds` is the full list of lead ids in the
 * new order (position 1..N). Leads keep their stable ids and QR codes; only
 * their positions change. Because progression is stored by position, reordering
 * after players have progress can shift who is "ahead" — the UI warns about it.
 */
export async function adminReorderLeads(orderedIds: string[]): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "bad_value" }
  }
  const defs = await getLeadDefs()
  const known = new Set(defs.map((d) => d.id))
  // Must be a permutation of exactly the current leads.
  if (orderedIds.length !== defs.length || orderedIds.some((id) => !known.has(id))) {
    return { ok: false, error: "bad_value" }
  }
  if (new Set(orderedIds).size !== orderedIds.length) return { ok: false, error: "bad_value" }

  await reorderLeads(orderedIds)
  await logActivity({
    category: "admin",
    action: "admin.leads_reordered",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} reordered the leads`,
    metadata: { orderedIds },
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Append a new lead to the end of the sequence. A stable id is generated and a
 * fresh QR token is created for it automatically. Copy and stamp can be filled
 * in afterwards via the edit + stamp actions.
 */
export async function adminAddLead(input: {
  country: string
  countryEn: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requireAdmin()
  const country = (input.country ?? "").trim()
  const countryEn = (input.countryEn ?? "").trim()
  if (country.length < 1 || countryEn.length < 1) return { ok: false, error: "too_short" }

  const created = await createLead({ country, countryEn })
  await logActivity({
    category: "admin",
    action: "admin.lead_added",
    ...adminActor(admin),
    leadOrder: created.order,
    summary: `${adminActor(admin).actorName} added a new lead "${country}" at No. ${String(created.order).padStart(2, "0")}`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true, id: created.id }
}

/**
 * Remove a lead by its stable id. Deletes its QR token, journal content and
 * difficulty, then compacts the remaining positions. Its stamp image (if any)
 * is best-effort removed from Blob. Refuses to remove the very first lead so
 * the time-gated opener always exists.
 */
export async function adminRemoveLead(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const leadId = (id ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }
  if (defs.length <= 1) return { ok: false, error: "last_lead" }
  if (target.order === 1) return { ok: false, error: "first_lead" }

  // Best-effort blob cleanup for an uploaded stamp.
  if (target.stampImageUrl && target.stampImageUrl.includes(".public.blob.vercel-storage.com")) {
    try {
      await del(target.stampImageUrl)
    } catch {
      // Non-fatal: the row is still removed even if the blob lingers.
    }
  }

  await deleteLead(leadId)
  await logActivity({
    category: "admin",
    action: "admin.lead_removed",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} removed lead "${target.country}" (was No. ${String(target.order).padStart(2, "0")})`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/** Server-enforced cap for an uploaded stamp image (5 MB). */
const MAX_STAMP_BYTES = 5 * 1024 * 1024
const ALLOWED_STAMP_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"]

/**
 * Upload a new γραμματόσημο (stamp) image for a lead. The file is stored in
 * Blob and its public URL saved on the lead. Any previous uploaded stamp is
 * removed. `aspect` is the suggested ratio the admin authored to (e.g. "2:3").
 */
export async function adminUploadLeadStamp(
  formData: FormData,
): Promise<{ ok: true; url: string; aspect: string } | { ok: false; error: string }> {
  const admin = await requireAdmin()

  const id = String(formData.get("id") ?? "").trim()
  const aspect = String(formData.get("aspect") ?? "2:3").trim() || "2:3"
  const file = formData.get("file")
  if (!id) return { ok: false, error: "bad_value" }
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "no_file" }
  if (file.size > MAX_STAMP_BYTES) return { ok: false, error: "too_large" }
  if (!ALLOWED_STAMP_TYPES.includes(file.type)) return { ok: false, error: "bad_type" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === id)
  if (!target) return { ok: false, error: "not_found" }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png"
  const blob = await put(`stamps/${id}-${Date.now()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  })

  // Remove the previous uploaded stamp (bundled defaults are left alone).
  const prev = target.stampImageUrl
  if (prev && prev.includes(".public.blob.vercel-storage.com") && prev !== blob.url) {
    try {
      await del(prev)
    } catch {
      // Non-fatal.
    }
  }

  await updateLeadStamp(id, blob.url, aspect)
  await logActivity({
    category: "admin",
    action: "admin.lead_stamp_updated",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} updated the stamp for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true, url: blob.url, aspect }
}

/** Clear a lead's uploaded stamp, reverting it to the bundled/default art. */
export async function adminClearLeadStamp(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const leadId = (id ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  if (target.stampImageUrl && target.stampImageUrl.includes(".public.blob.vercel-storage.com")) {
    try {
      await del(target.stampImageUrl)
    } catch {
      // Non-fatal.
    }
  }

  await updateLeadStamp(leadId, null, target.stampAspect)
  await logActivity({
    category: "admin",
    action: "admin.lead_stamp_cleared",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} cleared the stamp for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Set or clear a lead's GPS scan gate. Pass empty lat/lng strings to clear the
 * gate (no location check). Radius is optional; blank falls back to the global
 * default at check time. Coordinates are validated to plausible WGS84 ranges.
 */
export async function adminSaveLeadGeo(input: {
  id: string
  lat: string
  lng: string
  radiusM: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  const leadId = (input.id ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  const latStr = (input.lat ?? "").trim()
  const lngStr = (input.lng ?? "").trim()
  const radiusStr = (input.radiusM ?? "").trim()

  // Clearing the gate: both coordinates blank.
  if (!latStr && !lngStr) {
    await updateLeadGeo(leadId, null, null, null)
  } else {
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, error: "bad_lat" }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { ok: false, error: "bad_lng" }
    let radius: number | null = null
    if (radiusStr) {
      const r = Number(radiusStr)
      if (!Number.isFinite(r) || r < 10 || r > 5000) return { ok: false, error: "bad_radius" }
      radius = Math.round(r)
    }
    await updateLeadGeo(leadId, lat, lng, radius)
  }

  await logActivity({
    category: "admin",
    action: "admin.lead_geo_updated",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} updated the location gate for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  return { ok: true }
}

// ── Hints (admin) ───────────────────────────────────────────────────────────

/**
 * Create a hint. `leadOrder` is optional: pass a number (1..TOTAL_CLUES) to tie
 * the hint to a lead, or null/empty to leave it unassociated.
 */
export async function adminCreateHint(input: {
  title: string
  body: string
  leadOrder: number | null
}): Promise<ActionResult> {
  await requireAdmin()
  const title = input.title?.trim() ?? ""
  const body = input.body?.trim() ?? ""
  if (title.length < 2) return { ok: false, error: "too_short" }
  if (title.length > 120) return { ok: false, error: "too_long" }
  if (body.length < 1) return { ok: false, error: "too_short" }

  await createHint({ title, body, leadOrder: await normalizeLeadOrder(input.leadOrder) })
  revalidatePath("/admin")
  return { ok: true }
}

/** Update a hint's title, body, and optional lead association. */
export async function adminUpdateHint(
  id: string,
  input: { title: string; body: string; leadOrder: number | null },
): Promise<ActionResult> {
  await requireAdmin()
  const title = input.title?.trim() ?? ""
  const body = input.body?.trim() ?? ""
  if (title.length < 2) return { ok: false, error: "too_short" }
  if (title.length > 120) return { ok: false, error: "too_long" }
  if (body.length < 1) return { ok: false, error: "too_short" }

  await updateHint(id, { title, body, leadOrder: await normalizeLeadOrder(input.leadOrder) })
  revalidatePath("/admin")
  return { ok: true }
}

/** Delete a hint. Its shareable link stops working immediately. */
export async function adminDeleteHint(id: string): Promise<ActionResult> {
  await requireAdmin()
  await deleteHint(id)
  revalidatePath("/admin")
  return { ok: true }
}

/** Issue a fresh link for a hint, invalidating the old one. */
export async function adminRegenerateHintToken(id: string): Promise<ActionResult> {
  await requireAdmin()
  await regenerateHintToken(id)
  revalidatePath("/admin")
  return { ok: true }
}

// ── Campaign links (trackable marketing redirects) ──────────────────────────

/** Create a trackable campaign link. Returns ok with a fresh token + link. */
export async function adminCreateCampaign(input: {
  name: string
  label: string | null
}): Promise<ActionResult> {
  const admin = await requireAdmin()
  const name = input.name?.trim() ?? ""
  const label = input.label?.trim() ? input.label.trim() : null
  if (name.length < 2) return { ok: false, error: "too_short" }
  if (name.length > 120) return { ok: false, error: "too_long" }

  const created = await createCampaign({ name, label })
  await logActivity({
    category: "admin",
    action: "admin.campaign_created",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} created campaign link "${name}"`,
    metadata: { token: created.token },
  })
  revalidatePath("/admin")
  return { ok: true }
}

/** Update a campaign link's name / label. */
export async function adminUpdateCampaign(
  id: string,
  input: { name: string; label: string | null },
): Promise<ActionResult> {
  await requireAdmin()
  const name = input.name?.trim() ?? ""
  const label = input.label?.trim() ? input.label.trim() : null
  if (name.length < 2) return { ok: false, error: "too_short" }
  if (name.length > 120) return { ok: false, error: "too_long" }

  await updateCampaign(id, { name, label })
  revalidatePath("/admin")
  return { ok: true }
}

/** Delete a campaign link and all of its recorded visits. */
export async function adminDeleteCampaign(id: string): Promise<ActionResult> {
  await requireAdmin()
  await deleteCampaign(id)
  revalidatePath("/admin")
  return { ok: true }
}

/** Issue a fresh token for a campaign link, invalidating the old one. */
export async function adminRegenerateCampaignToken(id: string): Promise<ActionResult> {
  await requireAdmin()
  await regenerateCampaignToken(id)
  revalidatePath("/admin")
  return { ok: true }
}

/** Read the detailed visit stats (14-day series + recent visits) for a link. */
export async function adminGetCampaignStats(id: string): Promise<CampaignStats> {
  await requireAdmin()
  return getCampaignStats(id)
}

/**
 * Behavioural analytics snapshot for the Analytics tab: headline counters, the
 * per-day timeline, top events/pages, device + browser splits, the auth funnel
 * (with login/registration timing) and the scan-outcome breakdown. Superadmin
 * only. `days` is the lookback window.
 */
export async function adminGetAnalytics(days = 14): Promise<AnalyticsSnapshot> {
  await requireAdmin()
  const clamped = Math.min(Math.max(Math.round(days), 1), 90)
  return getAnalyticsSnapshot(clamped)
}

/**
 * When a team owner is about to leave/be removed, transfer ownership to the
 * next-oldest member, or delete the team if they were the only member. Not
 * exported (helper) so the "use server" file only surfaces server actions.
 */
async function handleOwnerDeparture(targetUserId: string): Promise<void> {
  const membership = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.userId, targetUserId))
    .limit(1)
  if (membership.length === 0) return

  const teamId = membership[0].teamId
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  const t = rows[0]
  if (!t || t.ownerId !== targetUserId) return

  const remaining = await db
    .select()
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId))
    .orderBy(asc(teamMember.joinedAt))

  const heir = remaining.find((m) => m.userId !== targetUserId)
  if (!heir) {
    // They were the only member: delete the team.
    await db.delete(team).where(eq(team.id, teamId))
    return
  }

  await db.update(team).set({ ownerId: heir.userId }).where(eq(team.id, teamId))
  await db.update(teamMember).set({ role: "owner" }).where(eq(teamMember.userId, heir.userId))
}

// ---------------------------------------------------------------------------
// Location-ping diagnostic (founder-only). Every action here is gated by
// requireBootstrapAdmin, so other superadmins cannot generate QRs or read
// returned locations even if they reached the endpoint directly.
// ---------------------------------------------------------------------------

export type LocationState = {
  token: string | null
  link: string | null
  pings: LocationPing[]
}

function pingLink(token: string): string {
  return `${siteUrl()}/ping/${token}`
}

/** Generate a fresh location-ping QR and return its token + scan link. */
export async function generateLocationQr(): Promise<
  ActionResult & { token?: string; link?: string }
> {
  const admin = await requireBootstrapAdmin()
  const token = await createLocationQr(admin.id)
  return { ok: true, token, link: pingLink(token) }
}

/** Current QR (most recent) plus all of its returned locations, newest first. */
export async function getLocationState(): Promise<LocationState> {
  await requireBootstrapAdmin()
  const token = await getActiveLocationQr()
  if (!token) return { token: null, link: null, pings: [] }
  const pings = await getLocationPings(token)
  return { token, link: pingLink(token), pings }
}
