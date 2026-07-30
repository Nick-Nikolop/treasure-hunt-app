"use server"

import { auth } from "@/lib/auth"
import { db, pool } from "@/lib/db"
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
import { getFinaleConfig, setFinaleConfig, type FinaleConfig } from "@/lib/finale"
import { listCompassVariantAssignments } from "@/lib/compass-variant"
import {
  createLocationQr,
  getActiveLocationQr,
  getLocationPings,
  type LocationPing,
} from "@/lib/location-ping"
import {
  searchScanSubjects,
  getScanPingsForUser,
  getScanPingsForTeam,
  type ScanSubjects,
  type ScanPingRow,
} from "@/lib/scan-ping"
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
  getCrewUserIds,
  type ClueTokenRow,
  type ProgressStage,
} from "@/lib/hunt"
import {
  getPendingProofs,
  getPendingProofCount,
  getRecentDecidedProofs,
  getProofById,
  getEarlierPendingForLead,
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
  getSolveCooldownSeconds,
  setSolveCooldownSeconds,
  getLeadBgWashPct,
  setLeadBgWashPct,
  getCompassOpacityPct,
  setCompassOpacityPct,
  getPhaseSettings,
  setPhaseOverride,
  setPhaseUnlockTimes,
  setJournalLockedManual,
  setRostersLockedManual,
  getPhaseLeads,
  removePhaseLead,
} from "@/lib/hunt-config"
import {
  computeEffectivePhase,
  normalizedJournalUnlockMs,
  type PhaseSettings,
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
  COMPASS_LABELS,
  COMPASS_VARIANTS,
  type CompassVariant,
} from "@/lib/compass"
import {
  getLeadDefs,
  getTotalLeads,
  createLead,
  deleteLead,
  reorderLeads,
  updateLeadContent,
  updateLeadStamp,
  updateLeadBackground,
  updateLeadCompassVariant,
  updateLeadGeo,
  setTokenForLead,
} from "@/lib/leads"
import { del } from "@vercel/blob"
import {
  getAnalyticsSnapshot,
  getActivitySeries,
  getPresence,
  type ActivitySeries,
  type AnalyticsSnapshot,
  type PresenceSummary,
} from "@/lib/analytics"
import {
  FINISH_ORDER,
  COMPASS_ORDER,
  TRAIL_END_ORDER,
  leadsSolvedCount,
  isLeadOneOpen,
  START_MS,
  isLeadIcon,
} from "@/lib/clues"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
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
  /**
   * Whether they confirmed their email. Auth runs with
   * `requireEmailVerification: true`, so `false` here means they have NEVER been
   * able to sign in - which is a different situation from "signed in but quiet",
   * and the Users tab labels the two differently.
   */
  emailVerified: boolean
  createdAt: Date
  teamId: string | null
  teamName: string | null
  teamRole: string | null
  /** Effective unlocked-lead count for this user (stored + lead-1 time gate). */
  progress: number
  /**
   * Epoch ms this user arrived at their current lead, or null if they have not
   * started. This is the leaderboard tiebreak: among everyone on the same lead,
   * the earliest arrival is ahead.
   */
  reachedAt: number | null
  /** Endgame steps reached, each stamped by its own QR scan. */
  milestones: Milestones
  /**
   * Presence, derived from the analytics behaviour stream (see `getPresence`).
   * `lastSeenAt` is epoch ms of their newest event ever, or null for someone who
   * has never produced one. The rest describe where they were when that last
   * event fired.
   *
   * A null does NOT by itself mean "never logged in". Measured on live data, the
   * 29 users with no events break down as 28 unverified (so they truly never got
   * in) and 1 verified account that predates event tracking. Read it together
   * with `emailVerified` rather than alone.
   */
  lastSeenAt: number | null
  lastPath: string | null
  lastDevice: string | null
  lastBrowser: string | null
  lastOs: string | null
}

/**
 * The three endgame steps that live outside the lead count, so the Progress tab
 * can tell "solved every lead" apart from "actually finished". Each is stamped by
 * its own QR scan and stored as a sentinel row in `lead_unlock`.
 */
export type Milestones = {
  /** Scanned the last lead's own QR, so the first note is in hand. */
  trailEnd: boolean
  /** Scanned the compass QR, so the treasure hunt is on. */
  compass: boolean
  /** Scanned the treasure QR. Done. */
  finished: boolean
}

export type AdminTeamRow = {
  id: string
  name: string
  ownerId: string
  inviteCode: string
  createdAt: Date
  /** Furthest lead any member of the team has reached. */
  progress: number
  /**
   * Epoch ms the crew first reached `progress`: the EARLIEST arrival among the
   * members standing on that furthest lead, so a crew is credited with when it
   * got there rather than when its last member caught up.
   */
  reachedAt: number | null
  /** Endgame steps the crew has reached (any member counts, like progress). */
  milestones: Milestones
  members: {
    userId: string
    name: string
    email: string
    role: string
    /** This member's own effective lead count, to spot a carried teammate. */
    progress: number
    /** Epoch ms this member reached their own lead, or null if not started. */
    reachedAt: number | null
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
  /** Anti-cheat cooldown (seconds) enforced between consecutive QR solves. */
  solveCooldownSeconds: number
  /** Global parchment-wash strength (%) over journal lead-page landmark art. */
  leadBgWashPct: number
  /** Global visibility (%) of the compass on journal lead pages. */
  compassOpacityPct: number
  /** Editable lead copy (subtitle + body, per language) with defaults merged. */
  leads: EditableLead[]
  /** First page of the audit log (newest first), unfiltered. */
  activity: ActivityPage
  /** Live headcount + per-user last-seen, for the Users tab. */
  presence: PresenceSummary
  /**
   * Default active-users history (last 24 hours) for the Users tab chart. The
   * chart swaps this out via `adminGetActivitySeries` when the range changes, so
   * this is only the first paint.
   */
  activitySeries: ActivitySeries
  /** Behavioural analytics snapshot (default 14-day window) for the Analytics tab. */
  analytics: AnalyticsSnapshot
  /** Phased-rollout control state for the Phase tab. */
  phase: PhaseAdminData
  /** Count of photo proofs awaiting review (drives the Proofs tab badge). */
  pendingProofCount: number
}

/** Everything the Phase tab needs to render + edit the rollout gates. */
export type PhaseAdminData = {
  settings: PhaseSettings
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
      emailVerified: user.emailVerified,
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
    .select({
      userId: leadUnlock.userId,
      leadOrder: leadUnlock.leadOrder,
      unlockedAt: leadUnlock.unlockedAt,
    })
    .from(leadUnlock)
  const storedByUser = new Map<string, number>()
  // Arrival time of each (user, lead) pair, so we can read off when a user got
  // to their furthest lead. Keyed "userId:leadOrder".
  const unlockAt = new Map<string, number>()
  // The endgame steps are stored as sentinel rows far above any real position, so
  // they are tracked separately rather than being folded into the max below (the
  // max is clamped to the lead total anyway, but keeping them apart is what lets
  // "10/10 leads" be told apart from "actually finished").
  const trailEndUsers = new Set<string>()
  const compassUsers = new Set<string>()
  const finishedUsers = new Set<string>()
  for (const row of unlocks) {
    if (row.leadOrder === TRAIL_END_ORDER) trailEndUsers.add(row.userId)
    else if (row.leadOrder === COMPASS_ORDER) compassUsers.add(row.userId)
    else if (row.leadOrder === FINISH_ORDER) finishedUsers.add(row.userId)
    else {
      storedByUser.set(row.userId, Math.max(storedByUser.get(row.userId) ?? 0, row.leadOrder))
      unlockAt.set(`${row.userId}:${row.leadOrder}`, row.unlockedAt.getTime())
    }
  }
  const liveTotal = editableLeads.length
  /**
   * True once a user has scanned any endgame QR. All three sit at the LAST lead
   * or beyond it, so any of them proves the whole trail is solved - which is what
   * lets the final lead be counted even though it never gets a real unlock row of
   * its own (see `leadsSolvedCount`).
   */
  const inEndgame = (userId: string) =>
    trailEndUsers.has(userId) || compassUsers.has(userId) || finishedUsers.has(userId)
  const progressOf = (userId: string) =>
    leadsSolvedCount(storedByUser.get(userId) ?? 0, inEndgame(userId), now, liveTotal)
  /**
   * When a user arrived at their current lead. Mirrors the leaderboard rule in
   * lib/hunt.ts: lead 1 opens for everyone at once (so it carries the shared
   * start time, not a personal scan), and anything beyond it is stamped by the
   * user's own unlock row.
   */
  const reachedAtOf = (userId: string): number | null => {
    const progress = progressOf(userId)
    if (progress === 0) return null
    if (progress === 1) return isLeadOneOpen(now) ? START_MS : null
    return unlockAt.get(`${userId}:${storedByUser.get(userId) ?? 0}`) ?? null
  }
  const milestonesOf = (userId: string): Milestones => ({
    trailEnd: trailEndUsers.has(userId),
    compass: compassUsers.has(userId),
    finished: finishedUsers.has(userId),
  })

  const teamsWithMembers: AdminTeamRow[] = teams.map((tm) => {
    const memberRows = allMembers.filter((m) => m.teamId === tm.id)
    // A team's progress is the furthest any of its members has reached.
    const teamProgress = memberRows.reduce((max, m) => Math.max(max, progressOf(m.userId)), 0)
    // Credit the crew with the first moment any of its members stood on that
    // furthest lead.
    const arrivals = memberRows
      .filter((m) => progressOf(m.userId) === teamProgress)
      .map((m) => reachedAtOf(m.userId))
      .filter((v): v is number => v !== null)
    return {
      id: tm.id,
      name: tm.name,
      ownerId: tm.ownerId,
      inviteCode: tm.inviteCode,
      createdAt: tm.createdAt,
      progress: teamProgress,
      reachedAt: teamProgress === 0 || arrivals.length === 0 ? null : Math.min(...arrivals),
      // A crew shares its progress, so any member reaching a step counts for all.
      milestones: {
        trailEnd: memberRows.some((m) => trailEndUsers.has(m.userId)),
        compass: memberRows.some((m) => compassUsers.has(m.userId)),
        finished: memberRows.some((m) => finishedUsers.has(m.userId)),
      },
      members: memberRows.map((m) => ({
        userId: m.userId,
        name: m.name ?? "",
        email: m.email ?? "",
        role: m.role,
        progress: progressOf(m.userId),
        reachedAt: reachedAtOf(m.userId),
      })),
    }
  })

  // Who is online right now, plus every user's last-seen stamp. One query.
  const presence = await getPresence()

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      yearOfBirth: u.yearOfBirth,
      role: u.role,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      teamId: u.teamId,
      teamName: u.teamName,
      teamRole: u.teamRole,
      progress: progressOf(u.id),
      reachedAt: reachedAtOf(u.id),
      milestones: milestonesOf(u.id),
      lastSeenAt: presence.byUser[u.id]?.lastSeenAt ?? null,
      lastPath: presence.byUser[u.id]?.path ?? null,
      lastDevice: presence.byUser[u.id]?.device ?? null,
      lastBrowser: presence.byUser[u.id]?.browser ?? null,
      lastOs: presence.byUser[u.id]?.os ?? null,
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
    solveCooldownSeconds: await getSolveCooldownSeconds(),
    leadBgWashPct: await getLeadBgWashPct(),
    compassOpacityPct: await getCompassOpacityPct(),
    leads: editableLeads,
    activity: await listActivity({ limit: 50 }),
    analytics: await getAnalyticsSnapshot(14),
    phase: await getPhaseAdminData(),
    pendingProofCount: await getPendingProofCount(),
    presence,
    activitySeries: await getActivitySeries("hour", 24),
  }
}

/**
 * Active-users history for the Users tab chart. Kept separate from
 * `adminGetAnalytics` so changing the chart range does not re-run the whole
 * (heavy) analytics snapshot. `getActivitySeries` clamps `points` itself.
 */
export async function adminGetActivitySeries(
  granularity: "hour" | "day",
  points: number,
): Promise<ActivitySeries> {
  await requireAdmin()
  return getActivitySeries(granularity, points)
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
 * skipped since a human vetted it) and stamp the unlock with the moment the
 * photos were SENT rather than reviewed, so review lag costs no time. Superadmin
 * only. Idempotent: a proof that was already decided by another admin is
 * reported as such.
 *
 * Refuses any proof that is not first in line for its lead, reporting who is
 * ahead, so racing crews are always judged in the order they actually arrived.
 */
export async function adminDecideProof(
  id: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<
  | { ok: true; decision: "approved" | "rejected"; unlock?: string }
  | { ok: false; error: string; blockedBy?: { name: string; createdAt: Date } }
> {
  const admin = await requireAdmin()

  const existing = await getProofById(id)
  if (!existing) return { ok: false, error: "not_found" }
  if (existing.status !== "pending") return { ok: false, error: "already_decided" }

  // Whoever reached a lead FIRST must be judged first, so only the front of each
  // lead's queue can be decided. The UI already locks the later cards, but this
  // is the real guard: it also covers a stale page and two admins working at once.
  const ahead = await getEarlierPendingForLead(existing)
  if (ahead) {
    return {
      ok: false,
      error: "not_first_for_lead",
      blockedBy: { name: ahead.userName, createdAt: ahead.createdAt },
    }
  }

  const cleanReason = decision === "rejected" ? (reason ?? "").trim().slice(0, 500) || null : null

  const decided = await decideProof(id, decision, { id: admin.id, name: actorLabel(admin) }, cleanReason)
  if (!decided) return { ok: false, error: "already_decided" }

  let unlock: string | undefined
  if (decision === "approved") {
    // Credit the moment they SENT the photos, not the moment we got round to
    // reviewing them, so waiting on a manual check never costs anyone time.
    const res = await approveLeadUnlock(existing.userId, existing.leadOrder, existing.createdAt)
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
  /** Manual journal + leaderboard seal. */
  journalLockedManual: boolean
  /** Whether rosters freeze once the hunt goes live. Defaults ON. */
  rostersLockedManual: boolean
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const overrides: PhaseOverride[] = ["auto", "1", "2", "3"]
  if (!overrides.includes(input.override)) return { ok: false, error: "bad_value" }
  if (!Number.isFinite(input.phase2UnlockMs) || !Number.isFinite(input.journalUnlockMs)) {
    return { ok: false, error: "bad_value" }
  }
  if (typeof input.journalLockedManual !== "boolean") return { ok: false, error: "bad_value" }
  if (typeof input.rostersLockedManual !== "boolean") return { ok: false, error: "bad_value" }

  const before = await getPhaseSettings()
  await setPhaseOverride(input.override)
  await setPhaseUnlockTimes({
    phase2UnlockMs: input.phase2UnlockMs,
    journalUnlockMs: input.journalUnlockMs,
  })
  await setJournalLockedManual(input.journalLockedManual)
  await setRostersLockedManual(input.rostersLockedManual)

  const after: PhaseSettings = {
    override: input.override,
    phase2UnlockMs: input.phase2UnlockMs,
    journalUnlockMs: normalizedJournalUnlockMs({
      override: input.override,
      phase2UnlockMs: input.phase2UnlockMs,
      journalUnlockMs: input.journalUnlockMs,
    }),
    journalLockedManual: input.journalLockedManual,
    rostersLockedManual: input.rostersLockedManual,
  }

  // Call out a journal seal flip explicitly: it is the one change here that can
  // shut a live hunt out of the journal, so it must be obvious in the audit log.
  const sealChanged = before.journalLockedManual !== after.journalLockedManual
  const sealNote = sealChanged
    ? `; journal ${after.journalLockedManual ? "LOCKED" : "UNLOCKED"}`
    : ""

  // Same for the roster freeze: it decides whether crews can still change
  // mid-hunt, so a flip needs to be traceable.
  const rosterNote =
    before.rostersLockedManual !== after.rostersLockedManual
      ? `; rosters ${after.rostersLockedManual ? "LOCK ON" : "LOCK OFF"}`
      : ""

  await logActivity({
    ...adminActor(admin),
    category: "admin",
    action: "phase_update",
    summary: `Phase settings updated (override ${before.override} → ${after.override})${sealNote}${rosterNote}`,
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
 * Country, subtitle, body (both languages) and the stamp icon are all editable;
 * the stamp image and the lead's position are managed by their own actions. The journal reflects the change on its next render.
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
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const id = (input.id ?? "").trim()
  if (!id) return { ok: false, error: "bad_value" }

  const country = (input.country ?? "").trim()
  const countryEn = (input.countryEn ?? "").trim()
  if (country.length < 1 || countryEn.length < 1) return { ok: false, error: "too_short" }
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
 * Set how visible the compass is on every journal lead page (0..100). 0 hides
 * it entirely, 100 is fully opaque. One global value shared by all leads, since
 * the needle direction is part of the finale puzzle. Superadmin only.
 */
export async function adminSetCompassOpacity(pct: number): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (!Number.isFinite(pct)) return { ok: false, error: "bad_value" }
  const value = Math.max(0, Math.min(100, Math.round(pct)))

  await setCompassOpacityPct(value)

  await logActivity({
    category: "admin",
    action: "admin.compass_opacity",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} set the journal compass visibility to ${value}%`,
    metadata: { compassOpacityPct: value },
  })

  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Set the single global parchment-wash strength (0..100) applied over the
 * landmark background on every journal lead page. 0 shows the art fully, 100
 * hides it behind solid parchment. Superadmin only.
 */
export async function adminSetLeadBgWash(pct: number): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (!Number.isFinite(pct)) return { ok: false, error: "bad_value" }
  const value = Math.max(0, Math.min(100, Math.round(pct)))

  await setLeadBgWashPct(value)

  await logActivity({
    category: "admin",
    action: "admin.lead_bg_wash",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} set the lead background wash to ${value}%`,
    metadata: { leadBgWashPct: value },
  })

  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Save the anti-cheat solve cooldown. This used to also save placement points
 * and per-lead difficulty; both are gone, because standings are now decided
 * purely by how far a crew has come and how early they got there.
 */
export async function adminSaveHuntRules(input: {
  /** Anti-cheat cooldown between consecutive QR solves, in seconds. */
  solveCooldownSeconds?: number
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const cooldown = input.solveCooldownSeconds
  if (cooldown !== undefined && (!Number.isFinite(cooldown) || cooldown < 0)) {
    return { ok: false, error: "bad_value" }
  }
  if (cooldown !== undefined) {
    await setSolveCooldownSeconds(cooldown)
  }

  await logActivity({
    category: "admin",
    action: "admin.hunt_rules_updated",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} updated the solve cooldown`,
    metadata: { solveCooldownSeconds: cooldown },
  })

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
 * Set a user's progress to an exact lead (0..TOTAL_CLUES). Because a team shares
 * one effective progress, this moves the target user's WHOLE crew (the user and
 * every teammate) to the same point, in both directions, so a team never drifts
 * out of sync. For a solo player it just moves that one account.
 */
export async function adminSetUserProgress(
  targetUserId: string,
  targetLead: number,
  stage: ProgressStage = "lead",
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

  // Both finale stages sit past the last lead, so they pin the target there.
  const finale = stage === "compass" || stage === "treasure"
  const lead = finale ? total : Math.floor(targetLead)
  // Move the whole crew together (solo players resolve to just themselves).
  const crew = await getCrewUserIds(targetUserId)
  await setProgressForUsers(crew, lead, "admin", stage)

  const targetName = actorLabel(exists[0])
  const reset = !finale && lead === 0
  const where =
    stage === "treasure"
      ? "the treasure (finished)"
      : stage === "compass"
        ? "the compass"
        : `lead No. ${String(lead).padStart(2, "0")}`
  await logActivity({
    category: "admin",
    action: reset ? "admin.progress_reset" : "admin.progress_set",
    ...adminActor(admin),
    targetUserId,
    targetUserName: targetName,
    leadOrder: finale ? null : lead || null,
    summary: reset
      ? `${adminActor(admin).actorName} reset ${targetName}'s progress to the start`
      : `${adminActor(admin).actorName} set ${targetName}'s progress to ${where}`,
    metadata: { lead, stage, crewSize: crew.length },
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
  stage: ProgressStage = "lead",
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
  // Both finale stages sit past the last lead, so they pin the target there.
  const finale = stage === "compass" || stage === "treasure"
  const lead = finale ? total : Math.floor(targetLead)
  await setProgressForUsers(
    memberRows.map((m) => m.userId),
    lead,
    "admin",
    stage,
  )

  const teamName = teamRows[0]?.name ?? "?"
  const reset = !finale && lead === 0
  const where =
    stage === "treasure"
      ? "the treasure (finished)"
      : stage === "compass"
        ? "the compass"
        : `lead No. ${String(lead).padStart(2, "0")}`
  await logActivity({
    category: "admin",
    action: reset ? "admin.team_progress_reset" : "admin.team_progress_set",
    ...adminActor(admin),
    teamId,
    teamName: teamRows[0]?.name ?? null,
    leadOrder: finale ? null : lead || null,
    summary: reset
      ? `${adminActor(admin).actorName} reset team "${teamName}" to the start`
      : `${adminActor(admin).actorName} set team "${teamName}" to ${where}`,
    metadata: { lead, stage, memberCount: memberRows.length },
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

/**
 * Point one QR at an admin-chosen URL. This is the only way a scan link can
 * change: there is no random regeneration, so a link only ever moves when an
 * admin deliberately types the new one. Refuses a slug that another QR already
 * uses, since two QRs on the same URL would unlock the wrong step.
 */
export async function adminSetLeadToken(
  leadId: string,
  desired: string,
): Promise<ActionResult & { takenBy?: string }> {
  const admin = await requireAdmin()
  if (typeof leadId !== "string" || !leadId || typeof desired !== "string") {
    return { ok: false, error: "bad_value" }
  }

  const res = await setTokenForLead(leadId, desired)
  if (!res.ok) {
    return res.reason === "duplicate"
      ? { ok: false, error: "duplicate", takenBy: res.takenBy }
      : { ok: false, error: "bad_slug" }
  }

  await logActivity({
    category: "admin",
    action: "admin.lead_token_set",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} set a QR link to /q/${res.token}`,
    metadata: { leadId, token: res.token },
  })
  revalidatePath("/admin")
  return { ok: true }
}

/** Issue a fresh QR token for a lead, invalidating the old printed code. */
export async function adminRegenerateToken(leadOrder: number): Promise<ActionResult> {
  await requireAdmin()
  const order = Math.floor(leadOrder)
  const total = await getTotalLeads()
  const valid =
    (order >= 2 && order <= total) || order === COMPASS_ORDER || order === FINISH_ORDER
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
 * Remove a lead by its stable id. Deletes its QR token and journal content,
 * then compacts the remaining positions. Its stamp image (if any)
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

/**
 * Lead artwork is uploaded straight from the browser to Blob via
 * /api/admin-image-upload, so these actions receive a finished Blob URL rather
 * than the file itself. Sending the bytes through a Server Action capped the
 * upload at 4.5 MB on Vercel (a hard platform limit that `bodySizeLimit` cannot
 * raise), which returned a 413 for any reasonably sized background. Size and
 * content-type are enforced when the upload token is minted.
 */
const BLOB_HOST_FRAGMENT = ".public.blob.vercel-storage.com"

/** Reject anything that is not one of our own Blob URLs. */
function isOwnBlobUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && u.hostname.endsWith(BLOB_HOST_FRAGMENT)
  } catch {
    return false
  }
}

/**
 * Attach an already-uploaded γραμματόσημο (stamp) image to a lead. Any previous
 * uploaded stamp is removed. `aspect` is the suggested ratio the admin authored
 * to (e.g. "2:3").
 */
export async function adminUploadLeadStamp(
  id: string,
  url: string,
  aspect: string,
): Promise<{ ok: true; url: string; aspect: string } | { ok: false; error: string }> {
  const admin = await requireAdmin()

  const leadId = (id ?? "").trim()
  const nextAspect = (aspect ?? "2:3").trim() || "2:3"
  const nextUrl = (url ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }
  if (!nextUrl) return { ok: false, error: "no_file" }
  if (!isOwnBlobUrl(nextUrl)) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  // Remove the previous uploaded stamp (bundled defaults are left alone).
  const prev = target.stampImageUrl
  if (prev && prev.includes(BLOB_HOST_FRAGMENT) && prev !== nextUrl) {
    try {
      await del(prev)
    } catch {
      // Non-fatal.
    }
  }

  await updateLeadStamp(leadId, nextUrl, nextAspect)
  await logActivity({
    category: "admin",
    action: "admin.lead_stamp_updated",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} updated the stamp for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true, url: nextUrl, aspect: nextAspect }
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
 * Upload a new full-bleed background image for a lead's journal page. Stored in
 * Blob; any previous uploaded background is removed. When cleared, the journal
 * falls back to a bundled landmark chosen by lead order.
 */
export async function adminUploadLeadBackground(
  id: string,
  url: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = await requireAdmin()

  const leadId = (id ?? "").trim()
  const nextUrl = (url ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }
  if (!nextUrl) return { ok: false, error: "no_file" }
  if (!isOwnBlobUrl(nextUrl)) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  // Remove the previous uploaded background (bundled defaults are left alone).
  const prev = target.backgroundImageUrl
  if (prev && prev.includes(BLOB_HOST_FRAGMENT) && prev !== nextUrl) {
    try {
      await del(prev)
    } catch {
      // Non-fatal.
    }
  }

  await updateLeadBackground(leadId, nextUrl)
  await logActivity({
    category: "admin",
    action: "admin.lead_background_updated",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} updated the page background for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true, url: nextUrl }
}

/** Clear a lead's uploaded background, reverting it to the bundled landmark art. */
export async function adminClearLeadBackground(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const leadId = (id ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  if (
    target.backgroundImageUrl &&
    target.backgroundImageUrl.includes(".public.blob.vercel-storage.com")
  ) {
    try {
      await del(target.backgroundImageUrl)
    } catch {
      // Non-fatal.
    }
  }

  await updateLeadBackground(leadId, null)
  await logActivity({
    category: "admin",
    action: "admin.lead_background_cleared",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} cleared the page background for lead "${target.country}"`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/** Pick which bundled compass watermark a lead's journal page shows. */
export async function adminSetLeadCompassVariant(
  id: string,
  variant: string,
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const leadId = (id ?? "").trim()
  if (!leadId) return { ok: false, error: "bad_value" }
  if (!COMPASS_VARIANTS.includes(variant as CompassVariant)) {
    return { ok: false, error: "bad_value" }
  }

  const defs = await getLeadDefs()
  const target = defs.find((d) => d.id === leadId)
  if (!target) return { ok: false, error: "not_found" }

  await updateLeadCompassVariant(leadId, variant as CompassVariant)
  await logActivity({
    category: "admin",
    action: "admin.lead_compass_set",
    ...adminActor(admin),
    leadOrder: target.order,
    summary: `${adminActor(admin).actorName} set the compass to ${COMPASS_LABELS[variant as CompassVariant]} for lead "${target.country}"`,
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

// ── Finale (the compass + winner screen) ──────────────────────────────────

/** Read the finale configuration (compass GPS + editable notes) for the admin. */
export async function getFinaleState(): Promise<FinaleConfig> {
  await requireAdmin()
  return getFinaleConfig()
}

/**
 * How many crews are parked at the trail end right now, i.e. would be released
 * the instant the hold is lifted.
 *
 * Powers the confirmation dialog: "this frees N crews" is a far better prompt
 * than a generic "are you sure", because lifting the hold is irreversible in
 * practice (once a crew has read the compass hint, re-sealing does not unlearn
 * it). Counts distinct CREWS, not rows, since a team shares one trail-end.
 */
export async function adminCountHeldCrews(): Promise<number> {
  await requireAdmin()
  // One SQL pass. `lead_unlock` has no crewKey column (unlocks are per user), so
  // crews are collapsed here the same way the app does it elsewhere: a team id
  // when the explorer is on a team, otherwise their own id. Without that
  // grouping a 4-person team would be counted as 4 waiting crews.
  const res = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM (
       SELECT DISTINCT COALESCE('team:' || tm."teamId", 'solo:' || lu."userId") AS crew
         FROM "lead_unlock" lu
         LEFT JOIN "team_member" tm ON tm."userId" = lu."userId"
        WHERE lu."leadOrder" = $1
          AND NOT EXISTS (
            SELECT 1 FROM "lead_unlock" c
             WHERE c."leadOrder" = $2 AND c."userId" = lu."userId"
          )
     ) crews`,
    [TRAIL_END_ORDER, COMPASS_ORDER],
  )
  return Number(res.rows[0]?.n ?? 0)
}

export type CompassVariantRow = {
  /** Team name, or the explorer's name for a solo crew. */
  name: string
  /** True when this crew is a team, so the panel can label it. */
  isTeam: boolean
  /** 1-based variant number, matching the numbering shown in the editor. */
  variant: number
  assignedAt: string
}

/**
 * Who has been handed which of the four rotating compass hints.
 *
 * Read-only by design: this NEVER assigns, so opening the admin panel cannot
 * consume a slot in the rotation and shift what the next real crew receives.
 * Names are resolved here rather than stored, so a team rename shows through.
 */
export async function adminListCompassVariants(): Promise<CompassVariantRow[]> {
  await requireAdmin()
  const rows = await listCompassVariantAssignments()
  if (rows.length === 0) return []

  const teamIds = rows.filter((r) => r.crewKey.startsWith("team:")).map((r) => r.crewKey.slice(5))
  const userIds = rows.filter((r) => r.crewKey.startsWith("solo:")).map((r) => r.crewKey.slice(5))

  const [teams, users] = await Promise.all([
    teamIds.length > 0
      ? db.select({ id: team.id, name: team.name }).from(team).where(inArray(team.id, teamIds))
      : Promise.resolve([] as { id: string; name: string }[]),
    userIds.length > 0
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
      : Promise.resolve([] as { id: string; name: string }[]),
  ])
  const teamName = new Map(teams.map((t) => [t.id, t.name]))
  const userName = new Map(users.map((u) => [u.id, u.name]))

  return rows.map((r) => {
    const isTeam = r.crewKey.startsWith("team:")
    const id = r.crewKey.slice(5)
    return {
      name: (isTeam ? teamName.get(id) : userName.get(id)) ?? id,
      isTeam,
      variant: r.variantIndex + 1,
      assignedAt: r.assignedAt.toISOString(),
    }
  })
}

/** Parse one lat/lng/radius trio from string inputs. Returns nulls when blank
 *  (clears the gate) or an error code when a provided value is out of range. */
function parseGate(
  latStr: string,
  lngStr: string,
  radiusStr: string,
): { lat: number | null; lng: number | null; radius: number | null } | { error: string } {
  let lat: number | null = null
  let lng: number | null = null
  let radius: number | null = null
  const la = (latStr ?? "").trim()
  const ln = (lngStr ?? "").trim()
  const ra = (radiusStr ?? "").trim()
  if (la || ln) {
    lat = Number(la)
    lng = Number(ln)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "bad_lat" }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "bad_lng" }
  }
  if (ra) {
    const r = Number(ra)
    if (!Number.isFinite(r) || r < 10 || r > 5000) return { error: "bad_radius" }
    radius = Math.round(r)
  }
  return { lat, lng, radius }
}

/**
 * Save the finale COPY only: the journal note plus its call-to-action, the
 * compass-scan note and the winner message + prize note, in both languages.
 * The two GPS gates live on their own finale QR cards in the Leads tab, so this
 * is a read-modify-write over the shared row that preserves both of them.
 */
export async function adminSaveFinale(input: {
  note1: string
  note1En: string
  note1Cta: string
  note1CtaEn: string
  /**
   * The four rotating hiding hints. Order is meaningful: a crew's stored
   * assignment is an index into this list, so editing hint 3 rewrites what every
   * crew already on variant 3 reads. Blank entries fall back to their default.
   */
  compassHints: { el: string; en: string }[]
  /** Shared "put the compass back" line shown under every variant. */
  compassReturn: string
  compassReturnEn: string
  note2: string
  note2En: string
  note2Cta: string
  note2CtaEn: string
  winner: string
  winnerEn: string
  winnerNote: string
  winnerNoteEn: string
  /** Bare "HH:MM" time the hunt closes. Sanitized in `setFinaleConfig`. */
  huntEndsAt: string
  /**
   * Copy for the trail-end hold paper. Optional so an older client that does not
   * send it leaves the existing wording alone instead of resetting it. The hold
   * TOGGLE is deliberately NOT here: releasing crews is a separate, confirmed
   * action (`adminSetTrailEndHold`) rather than a side effect of saving copy.
   */
  holdTitle?: string
  holdTitleEn?: string
  holdBody?: string
  holdBodyEn?: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const current = await getFinaleConfig()
  await setFinaleConfig({
    lat: current.lat,
    lng: current.lng,
    radiusM: current.radiusM,
    treasureLat: current.treasureLat,
    treasureLng: current.treasureLng,
    treasureRadiusM: current.treasureRadiusM,
    trailEndLat: current.trailEndLat,
    trailEndLng: current.trailEndLng,
    trailEndRadiusM: current.trailEndRadiusM,
    note1: input.note1 ?? "",
    note1En: input.note1En ?? "",
    note1Cta: input.note1Cta ?? "",
    note1CtaEn: input.note1CtaEn ?? "",
    compassHints: Array.isArray(input.compassHints) ? input.compassHints : current.compassHints,
    compassReturn: input.compassReturn ?? "",
    compassReturnEn: input.compassReturnEn ?? "",
    note2: input.note2 ?? "",
    note2En: input.note2En ?? "",
    note2Cta: input.note2Cta ?? "",
    note2CtaEn: input.note2CtaEn ?? "",
    winner: input.winner ?? "",
    winnerEn: input.winnerEn ?? "",
    winnerNote: input.winnerNote ?? "",
    winnerNoteEn: input.winnerNoteEn ?? "",
    huntEndsAt: input.huntEndsAt ?? "",
    // Never altered by a copy save: only adminSetTrailEndHold moves this.
    holdEnabled: current.holdEnabled,
    holdTitle: input.holdTitle ?? current.holdTitle,
    holdTitleEn: input.holdTitleEn ?? current.holdTitleEn,
    holdBody: input.holdBody ?? current.holdBody,
    holdBodyEn: input.holdBodyEn ?? current.holdBodyEn,
  })

  await logActivity({
    category: "admin",
    action: "admin.finale_updated",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} updated the finale notes`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Turn the trail-end hold on or off.
 *
 * Its own action rather than part of the finale copy save, because releasing the
 * hold is consequential and immediate: every crew parked after lead 10 is freed
 * at once and gets an alert. A dedicated action means one confirmed click, its
 * own activity-log entry, and no chance of a stray form save releasing everyone.
 *
 * `setFinaleConfig` stamps `holdLiftedAt` on the on -> off transition, which is
 * what makes the release alert targetable.
 */
export async function adminSetTrailEndHold(input: { enabled: boolean }): Promise<ActionResult> {
  const admin = await requireAdmin()
  const enabled = input.enabled === true

  const current = await getFinaleConfig()
  if (current.holdEnabled === enabled) return { ok: true }

  await setFinaleConfig({
    lat: current.lat,
    lng: current.lng,
    radiusM: current.radiusM,
    treasureLat: current.treasureLat,
    treasureLng: current.treasureLng,
    treasureRadiusM: current.treasureRadiusM,
    trailEndLat: current.trailEndLat,
    trailEndLng: current.trailEndLng,
    trailEndRadiusM: current.trailEndRadiusM,
    note1: current.note1,
    note1En: current.note1En,
    note1Cta: current.note1Cta,
    note1CtaEn: current.note1CtaEn,
    compassHints: current.compassHints,
    compassReturn: current.compassReturn,
    compassReturnEn: current.compassReturnEn,
    note2: current.note2,
    note2En: current.note2En,
    note2Cta: current.note2Cta,
    note2CtaEn: current.note2CtaEn,
    winner: current.winner,
    winnerEn: current.winnerEn,
    winnerNote: current.winnerNote,
    winnerNoteEn: current.winnerNoteEn,
    huntEndsAt: current.huntEndsAt,
    holdEnabled: enabled,
    holdTitle: current.holdTitle,
    holdTitleEn: current.holdTitleEn,
    holdBody: current.holdBody,
    holdBodyEn: current.holdBodyEn,
  })

  await logActivity({
    category: "admin",
    action: enabled ? "admin.hold_enabled" : "admin.hold_lifted",
    ...adminActor(admin),
    summary: enabled
      ? `${adminActor(admin).actorName} sealed the first note again after lead 10`
      : `${adminActor(admin).actorName} lifted the hold after lead 10, releasing the first note`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
  return { ok: true }
}

/**
 * Save only ONE finale QR's GPS gate (compass or treasure) without touching the
 * notes or the other gate. Powers the inline location editor on each finale QR
 * card in the Leads tab. Blank lat/lng clears that gate. Read-modify-write over
 * the shared `score_config` row so the other finale fields are preserved.
 */
export async function adminSaveFinaleGeo(input: {
  which: "compass" | "treasure" | "trailEnd"
  lat: string
  lng: string
  radiusM: string
}): Promise<ActionResult> {
  const admin = await requireAdmin()

  const gate = parseGate(input.lat, input.lng, input.radiusM)
  if ("error" in gate) return { ok: false, error: gate.error }

  const current = await getFinaleConfig()
  await setFinaleConfig({
    lat: input.which === "compass" ? gate.lat : current.lat,
    lng: input.which === "compass" ? gate.lng : current.lng,
    radiusM: input.which === "compass" ? gate.radius : current.radiusM,
    treasureLat: input.which === "treasure" ? gate.lat : current.treasureLat,
    treasureLng: input.which === "treasure" ? gate.lng : current.treasureLng,
    treasureRadiusM: input.which === "treasure" ? gate.radius : current.treasureRadiusM,
    trailEndLat: input.which === "trailEnd" ? gate.lat : current.trailEndLat,
    trailEndLng: input.which === "trailEnd" ? gate.lng : current.trailEndLng,
    trailEndRadiusM: input.which === "trailEnd" ? gate.radius : current.trailEndRadiusM,
    note1: current.note1,
    note1En: current.note1En,
    note1Cta: current.note1Cta,
    note1CtaEn: current.note1CtaEn,
    // Carried through untouched: this action only moves a QR gate, and dropping
    // these would reset every hint variant to its default mid-hunt.
    compassHints: current.compassHints,
    holdEnabled: current.holdEnabled,
    holdTitle: current.holdTitle,
    holdTitleEn: current.holdTitleEn,
    holdBody: current.holdBody,
    holdBodyEn: current.holdBodyEn,
    compassReturn: current.compassReturn,
    compassReturnEn: current.compassReturnEn,
    note2: current.note2,
    note2En: current.note2En,
    note2Cta: current.note2Cta,
    note2CtaEn: current.note2CtaEn,
    winner: current.winner,
    winnerEn: current.winnerEn,
    winnerNote: current.winnerNote,
    winnerNoteEn: current.winnerNoteEn,
    // Untouched here: this action only moves a QR gate, so carry the end time
    // through or the read-modify-write would silently reset it to the default.
    huntEndsAt: current.huntEndsAt,
  })

  await logActivity({
    category: "admin",
    action: "admin.finale_updated",
    ...adminActor(admin),
    summary: `${adminActor(admin).actorName} updated the ${input.which} QR location`,
  })
  revalidatePath("/admin")
  revalidatePath("/journal")
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

// --- Scan location review (bootstrap founder only) -------------------------
// These expose where explorers scanned from, for judging photo proofs. Each is
// guarded by requireBootstrapAdmin so no other superadmin can read positions,
// mirroring the location-QR actions above.

/** Search users + teams by name/email, annotated with captured scan counts. */
export async function adminSearchScanSubjects(query: string): Promise<ScanSubjects> {
  await requireBootstrapAdmin()
  return searchScanSubjects(query)
}

/** Every captured scan position for one explorer, newest first. */
export async function adminGetUserScanPings(userId: string): Promise<ScanPingRow[]> {
  await requireBootstrapAdmin()
  return getScanPingsForUser(userId)
}

/** Every captured scan position for a whole crew, newest first. */
export async function adminGetTeamScanPings(teamId: string): Promise<ScanPingRow[]> {
  await requireBootstrapAdmin()
  return getScanPingsForTeam(teamId)
}
