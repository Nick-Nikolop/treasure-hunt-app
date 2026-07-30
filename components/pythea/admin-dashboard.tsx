"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  KeyRound,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Pencil,
  Crown,
  Flag,
  RotateCcw,
  Lightbulb,
  Trophy,
  Save,
  ScrollText,
  History,
  Link2,
  Activity,
  BarChart3,
  Layers,
  MapPin,
  Compass,
  Camera,
  Gauge,
} from "lucide-react"
import { AdminProofsPanel } from "@/components/pythea/admin-proofs-panel"
import { AdminProgressPanel } from "@/components/pythea/admin-progress-panel"
import { ModalShell } from "@/components/pythea/modal-shell"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import { AdminPasswordDialog } from "@/components/pythea/admin-password-dialog"
import { AdminHintsPanel } from "@/components/pythea/admin-hints-panel"
import { AdminCampaignsPanel } from "@/components/pythea/admin-campaigns-panel"
import { AdminLeadsPanel } from "@/components/pythea/admin-leads-panel"
import { AdminActivityPanel } from "@/components/pythea/admin-activity-panel"
import { AdminAnalyticsPanel } from "@/components/pythea/admin-analytics-panel"
import { AdminActivityChart } from "@/components/pythea/admin-activity-chart"
import { AdminPhasePanel } from "@/components/pythea/admin-phase-panel"
import { AdminLocationPanel } from "@/components/pythea/admin-location-panel"
import { AdminFinalePanel } from "@/components/pythea/admin-finale-panel"
import { MAX_CREW_SIZE } from "@/lib/teams"
import { cn } from "@/lib/utils"
import {
  adminDeleteUser,
  adminSetRole,
  adminKickFromTeam,
  adminAssignToTeam,
  adminCreateTeam,
  adminDisbandTeam,
  adminRenameTeam,
  adminSetUserProgress,
  adminSetTeamProgress,
  adminResetUserProgress,
  adminResetTeamProgress,
  adminSaveHuntRules,
  getActivityLog,
  getFinaleState,
  type AdminData,
  type AdminUserRow,
  type AdminTeamRow,
  type ActionResult,
} from "@/app/admin/actions"
import type { ActivityPage } from "@/lib/activity"

type Tab =
  | "progress"
  | "users"
  | "teams"
  | "hints"
  | "campaigns"
  | "scoring"
  | "leads"
  | "activity"
  | "analytics"
  | "phase"
  | "location"
  | "finale"
  | "proofs"

type ActivityFilter = { kind: "user" | "team"; id: string; label: string } | null

type Confirm = {
  title: string
  body: string
  confirmLabel: string
  run: () => Promise<ActionResult>
}

function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * Two-unit "how long ago": "just now", "4m ago", "2h 12m ago", "3d 4h ago",
 * "2mo 5d ago". Carrying the second unit matters here, because "2h ago" could
 * mean anything from 2:00 to 2:59 and admins use this to judge whether someone
 * is mid-hunt. The smaller unit is dropped when it is 0 ("3h ago", not
 * "3h 0m ago") and past a month the day remainder stops being useful.
 */
function fmtAgo(ms: number) {
  const mins = Math.floor(Math.max(0, ms) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) {
    const m = mins % 60
    return m === 0 ? `${hrs}h ago` : `${hrs}h ${m}m ago`
  }

  const days = Math.floor(hrs / 24)
  if (days < 30) {
    const h = hrs % 24
    return h === 0 ? `${days}d ago` : `${days}d ${h}h ago`
  }

  const months = Math.floor(days / 30)
  const d = days % 30
  return d === 0 ? `${months}mo ago` : `${months}mo ${d}d ago`
}

type PresenceState = "online" | "idle" | "offline" | "never"

/**
 * Bucket a user by how recently they emitted an event. Both timestamps are
 * server-side epoch ms (`presence.takenAt` and `lastSeenAt`), so this never
 * depends on the admin's own device clock being right.
 */
function presenceState(
  lastSeenAt: number | null,
  takenAt: number,
  onlineMin: number,
  recentMin: number,
): PresenceState {
  if (lastSeenAt == null) return "never"
  const mins = (takenAt - lastSeenAt) / 60_000
  if (mins <= onlineMin) return "online"
  if (mins <= recentMin) return "idle"
  return "offline"
}

const PRESENCE_DOT: Record<PresenceState, string> = {
  online: "bg-emerald-400 ring-2 ring-emerald-400/25",
  idle: "bg-amber-400 ring-2 ring-amber-400/20",
  offline: "bg-muted-foreground/30",
  never: "bg-muted-foreground/15",
}

export function AdminDashboard({
  data,
  currentUserId,
  isBootstrap = false,
}: {
  data: AdminData
  currentUserId: string
  isBootstrap?: boolean
}) {
  const router = useRouter()
  // People vs entrants: a crew races as ONE entrant sharing one position, so the
  // Progress tab always shows fewer entrants than there are registered people.
  // Spelled out here so the two numbers visibly reconcile instead of looking
  // like a bug. Nothing is filtered by email verification.
  const soloPeople = data.users.filter((u) => u.teamId == null).length
  const peopleInCrews = data.users.length - soloPeople
  const entrantCount = data.teams.length + soloPeople

  // Progress opens first: it is the "where is everyone" view admins want mid-hunt.
  const [tab, setTab] = useState<Tab>("progress")
  const [query, setQuery] = useState("")
  // Users tab: narrow the list to whoever is online/idle right now.
  const [onlineOnly, setOnlineOnly] = useState(false)
  // Opt-in polling. Off by default because a refresh re-runs the whole admin
  // query, which is heavy; admins watching the hunt live can switch it on.
  const [livePresence, setLivePresence] = useState(false)
  // Seconds since this snapshot arrived. Measured from mount rather than by
  // comparing clocks, so a skewed device clock cannot make it read wrong.
  const [snapshotAge, setSnapshotAge] = useState(0)
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  // Dialog state
  const [pwTarget, setPwTarget] = useState<{ id: string; email: string } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [renameTeam, setRenameTeam] = useState<AdminTeamRow | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [assignTarget, setAssignTarget] = useState<AdminUserRow | null>(null)
  const [assignValue, setAssignValue] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createValue, setCreateValue] = useState("")
  // Progress editor: targets either a user or a whole team.
  const [progressTarget, setProgressTarget] = useState<
    | { kind: "user"; id: string; label: string; current: number; teamName: string | null }
    | { kind: "team"; id: string; label: string; current: number }
    | null
  >(null)
  // Either a lead number as a string ("1".."10"), or "hold" / "compass" /
  // "treasure" for the endgame steps. Lead 0 is not a real stop, so the lowest
  // selectable value is 1.
  const [progressValue, setProgressValue] = useState("1")
  /**
   * Whether the trail-end hold is on. Only then is "waiting on the hold" a real
   * place a crew can sit, so the option is hidden otherwise rather than offering
   * a state the hunt cannot currently produce. Read here rather than taken from
   * `AdminData` because the hold is toggled from the Finale tab and changes
   * independently of this payload.
   */
  const [holdEnabled, setHoldEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    getFinaleState()
      .then((c) => {
        if (alive) setHoldEnabled(c.holdEnabled)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  // Activity log: server-seeded first page, plus optional per-entity drill-down.
  // `activityKey` forces the panel to remount (reset its internal list) whenever
  // the seed changes.
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(null)
  const [activitySeed, setActivitySeed] = useState<ActivityPage>(data.activity)
  const [activityKey, setActivityKey] = useState(0)

  // Open the Activity tab focused on a single user or team.
  function openActivity(filter: NonNullable<ActivityFilter>) {
    startTransition(async () => {
      const page = await getActivityLog({
        userId: filter.kind === "user" ? filter.id : null,
        teamId: filter.kind === "team" ? filter.id : null,
      })
      setActivityFilter(filter)
      setActivitySeed(page)
      setActivityKey((k) => k + 1)
      setTab("activity")
    })
  }

  // Drop the drill-down and reload the full, unfiltered log.
  function clearActivityFilter() {
    startTransition(async () => {
      const page = await getActivityLog({})
      setActivityFilter(null)
      setActivitySeed(page)
      setActivityKey((k) => k + 1)
    })
  }

  const errorText: Record<string, string> = {
    cannot_delete_self: "You can't delete your own account here.",
    protected: "That account is protected and can't be changed.",
    last_admin: "You can't remove the last superadmin.",
    not_found: "That record no longer exists.",
    not_in_team: "That user isn't in a team.",
    already_in_team: "That user is already in that team.",
    team_full: "That team is already full.",
    too_short: "Name is too short.",
    too_long: "Name is too long.",
    bad_value: "That progress value is out of range.",
    empty_team: "That team has no members to set progress for.",
  }

  function runAction(fn: () => Promise<ActionResult>, successText: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        setBanner({ kind: "ok", text: successText })
        router.refresh()
      } else {
        setBanner({ kind: "err", text: errorText[res.error] ?? "Something went wrong." })
      }
      setConfirm(null)
    })
  }

  // Age the snapshot label once a second. Resets whenever fresh data arrives.
  useEffect(() => {
    setSnapshotAge(0)
    const id = setInterval(() => setSnapshotAge((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [data.presence.takenAt])

  // Live mode: re-pull the dashboard every 20s while the Users tab is open.
  useEffect(() => {
    if (!livePresence || tab !== "users") return
    const id = setInterval(() => router.refresh(), 20_000)
    return () => clearInterval(id)
  }, [livePresence, tab, router])

  const presence = data.presence

  /**
   * Accounts that can never have been online: sign-in requires a verified email
   * (`requireEmailVerification: true`), so these are dead sign-ups, not quiet
   * users. Worth a headline number because they inflate the total user count.
   */
  const unverifiedCount = useMemo(
    () => data.users.filter((u) => !u.emailVerified).length,
    [data.users],
  )

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = !q
      ? data.users
      : data.users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            u.name.toLowerCase().includes(q) ||
            (u.teamName ?? "").toLowerCase().includes(q),
        )
    const stateOf = (u: AdminUserRow) =>
      presenceState(u.lastSeenAt, presence.takenAt, presence.onlineWindowMin, presence.recentWindowMin)
    const shown = onlineOnly
      ? matches.filter((u) => {
          const s = stateOf(u)
          return s === "online" || s === "idle"
        })
      : matches
    // Most recently seen first, so whoever is live floats to the top. Users who
    // have never emitted an event sort last.
    return [...shown].sort((a, b) => (b.lastSeenAt ?? -1) - (a.lastSeenAt ?? -1))
  }, [data.users, query, onlineOnly, presence])

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.teams
    return data.teams.filter(
      (tm) =>
        tm.name.toLowerCase().includes(q) ||
        tm.inviteCode.toLowerCase().includes(q) ||
        tm.members.some((m) => m.email.toLowerCase().includes(q)),
    )
  }, [data.teams, query])

  // Leads missing required content (same rules as the global alerts widget:
  // no location, story, clue, or stamp image). Drives the red badge on the tab.
  const leadIssueCount = useMemo(
    () =>
      data.leads.filter(
        (l) =>
          l.lat == null ||
          l.lng == null ||
          !l.body?.trim() ||
          !l.subtitle?.trim() ||
          !l.stampImageUrl,
      ).length,
    [data.leads],
  )

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:py-14">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            BACK TO SITE
          </Link>
          <h1 className="mt-3 flex items-center gap-3 font-serif text-3xl font-black text-foreground md:text-4xl">
            <Shield className="size-7 text-brass" />
            Control room
          </h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Superadmin tools. Changes here are immediate and permanent.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Stat
            label="ONLINE"
            value={presence.onlineNow}
            hint={`${presence.recentlyActive} in last ${presence.recentWindowMin}m`}
            live
          />
          <Stat
            label="PEOPLE"
            value={data.users.length}
            hint={`${peopleInCrews} in crews, ${soloPeople} solo`}
          />
          <Stat label="CREWS" value={data.teams.length} hint={`${entrantCount} entrants racing`} />
          <Stat label="ADMINS" value={data.superadminCount} />
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          role="status"
          className={`mt-5 rounded-sm border px-4 py-3 font-sans text-sm ${
            banner.kind === "ok"
              ? "border-brass/40 bg-brass/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-sm border border-border p-1">
        <TabButton active={tab === "progress"} onClick={() => setTab("progress")} icon={Gauge}>
          Progress
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users}>
          Users
        </TabButton>
        <TabButton active={tab === "teams"} onClick={() => setTab("teams")} icon={Crown}>
          Teams
        </TabButton>
        <TabButton active={tab === "hints"} onClick={() => setTab("hints")} icon={Lightbulb}>
          Hints
        </TabButton>
        <TabButton active={tab === "campaigns"} onClick={() => setTab("campaigns")} icon={Link2}>
          Campaigns
        </TabButton>
        <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={ScrollText}>
          Leads
          {leadIssueCount > 0 && (
            <span
              title={`${leadIssueCount} lead${leadIssueCount === 1 ? "" : "s"} missing info`}
              className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 py-0.5 font-sans text-[10px] font-black leading-none text-destructive-foreground"
            >
              {leadIssueCount}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "scoring"} onClick={() => setTab("scoring")} icon={Trophy}>
          Rules
        </TabButton>
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={History}>
          Activity
        </TabButton>
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")} icon={BarChart3}>
          Analytics
        </TabButton>
        <TabButton active={tab === "phase"} onClick={() => setTab("phase")} icon={Layers}>
          Phase
        </TabButton>
        <TabButton active={tab === "proofs"} onClick={() => setTab("proofs")} icon={Camera}>
          Proofs
          {data.pendingProofCount > 0 && (
            <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brass px-1 py-0.5 font-sans text-[10px] font-black leading-none text-primary-foreground">
              {data.pendingProofCount}
            </span>
          )}
        </TabButton>
        {isBootstrap && (
          <TabButton
            active={tab === "location"}
            onClick={() => setTab("location")}
            icon={MapPin}
          >
            Location
          </TabButton>
        )}
        {/* Finale is open to every superadmin: both of its actions (getFinaleState,
            adminSaveFinale) only require an admin, unlike the Location tab above
            whose actions are bootstrap-only. */}
        <TabButton active={tab === "finale"} onClick={() => setTab("finale")} icon={Compass}>
          Finale
        </TabButton>
      </div>

      {/* Same reconciliation as the Progress tab, phrased for whichever list is
          open, so a lower entrant count never reads as missing people. */}
      {(tab === "users" || tab === "teams") && (
        <p className="mt-4 font-sans text-[11px] leading-relaxed text-muted-foreground">
          {tab === "users" ? (
            <>
              All {data.users.length} registered people, verified email or not. {peopleInCrews} of
              them are in a crew and {soloPeople} are on their own, which is why the Progress tab
              counts {entrantCount} entrants rather than {data.users.length}.
            </>
          ) : (
            <>
              {data.teams.length} crews holding {peopleInCrews} people. Each crew races as one
              entrant sharing one position, so together with the {soloPeople} solo explorers the
              Progress tab counts {entrantCount} entrants.
            </>
          )}
        </p>
      )}

      {/* Search row, sits below the tab bar for the Users/Teams tabs */}
      {(tab === "users" || tab === "teams") && (
        <div className="relative mt-3 w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "users" ? "Search users..." : "Search teams..."}
            className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
        </div>
      )}

      {/* Live presence, Users tab only */}
      {tab === "users" && (
        <section className="mt-3 rounded-sm border border-border bg-card/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <PresenceCount
                tone="online"
                value={presence.onlineNow}
                label="Online now"
                hint={`active in the last ${presence.onlineWindowMin} min`}
              />
              <PresenceCount
                tone="idle"
                value={presence.recentlyActive}
                label="Recently active"
                hint={`within ${presence.recentWindowMin} min`}
              />
              <PresenceCount
                tone="anon"
                value={presence.anonOnline}
                label="Signed out"
                hint="devices browsing without an account"
              />
              <PresenceCount
                tone="unverified"
                value={unverifiedCount}
                label="Never verified"
                hint="cannot sign in until they confirm their email"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-[10px] uppercase tracking-chip text-muted-foreground/70">
                {snapshotAge < 5 ? "Updated just now" : `Updated ${snapshotAge}s ago`}
              </span>
              <button
                type="button"
                onClick={() => setLivePresence((v) => !v)}
                aria-pressed={livePresence}
                title={
                  livePresence
                    ? "Stop auto-refreshing"
                    : "Auto-refresh this dashboard every 20 seconds"
                }
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-sans text-[10px] font-bold uppercase tracking-chip transition-colors ${
                  livePresence
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-border bg-background text-muted-foreground hover:border-brass hover:text-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    livePresence ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/40"
                  }`}
                />
                {livePresence ? "Live" : "Go live"}
              </button>
              <button
                type="button"
                onClick={() => router.refresh()}
                title="Refresh now"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
            <label className="flex cursor-pointer items-center gap-2 font-sans text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="size-3.5 accent-brass"
              />
              Show only people who are online or idle
            </label>
            {/* Presence is inferred from the behaviour stream, so say so plainly. */}
            <p className="font-sans text-[10px] leading-snug text-muted-foreground/60">
              Based on page views and taps, not a live connection. Someone reading one page
              without tapping can slip to idle.
            </p>
          </div>
        </section>
      )}

      {/* Active-users history, Users tab only */}
      {tab === "users" && (
        <div className="mt-3">
          <AdminActivityChart initial={data.activitySeries} />
        </div>
      )}

      {/* Content */}
      <div className="mt-5">
        {tab === "progress" ? (
          <AdminProgressPanel
            users={data.users}
            teams={data.teams}
            totalLeads={data.totalLeads}
            leadOptions={data.leadOptions}
          />
        ) : tab === "users" ? (
          <ul className="flex flex-col gap-2.5">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                totalLeads={data.totalLeads}
                pState={presenceState(
                  u.lastSeenAt,
                  presence.takenAt,
                  presence.onlineWindowMin,
                  presence.recentWindowMin,
                )}
                snapshotAt={presence.takenAt}
                isSelf={u.id === currentUserId}
                pending={pending}
                hasTeams={data.teams.length > 0}
                onSetProgress={() => {
                  const label =
                    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email
                  setProgressTarget({
                    kind: "user",
                    id: u.id,
                    label,
                    current: u.progress,
                    teamName: u.teamName ?? null,
                  })
                  setProgressValue(String(Math.max(1, u.progress)))
                }}
                onResetProgress={() =>
                  setConfirm({
                    title: "Reset progress",
                    body: u.teamName
                      ? `Reset ${u.email} back to the start? This moves their whole team "${u.teamName}" back to the start too, since a team shares one progress.`
                      : `Reset ${u.email} back to the start? They will hold no QR leads.`,
                    confirmLabel: "Reset",
                    run: () => adminResetUserProgress(u.id),
                  })
                }
                onAssign={() => {
                  setAssignTarget(u)
                  setAssignValue("")
                }}
                onResetPassword={() => setPwTarget({ id: u.id, email: u.email })}
                onViewActivity={() => {
                  const label =
                    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email
                  openActivity({ kind: "user", id: u.id, label })
                }}
                onToggleRole={() =>
                  runAction(
                    () => adminSetRole(u.id, u.role === "superadmin" ? "user" : "superadmin"),
                    u.role === "superadmin" ? "Superadmin revoked." : "User promoted to superadmin.",
                  )
                }
                onKick={() =>
                  setConfirm({
                    title: "Kick from team",
                    body: `Remove ${u.email} from "${u.teamName}"? If they own the team, ownership transfers to the next member.`,
                    confirmLabel: "Kick",
                    run: () => adminKickFromTeam(u.id),
                  })
                }
                onDelete={() =>
                  setConfirm({
                    title: "Delete account",
                    body: `Permanently delete ${u.email}? This removes their account, sessions, and team membership. This cannot be undone.`,
                    confirmLabel: "Delete account",
                    run: () => adminDeleteUser(u.id),
                  })
                }
              />
            ))}
            {filteredUsers.length === 0 && <Empty>No users match your search.</Empty>}
          </ul>
        ) : tab === "teams" ? (
          <ul className="flex flex-col gap-3">
            <li className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreateValue("")
                  setCreateOpen(true)
                }}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Plus className="size-4" />
                New team
              </button>
            </li>
            {filteredTeams.map((tm) => (
              <TeamCard
                key={tm.id}
                tm={tm}
                totalLeads={data.totalLeads}
                pending={pending}
                onRename={() => {
                  setRenameTeam(tm)
                  setRenameValue(tm.name)
                }}
                onSetProgress={() => {
                  setProgressTarget({ kind: "team", id: tm.id, label: tm.name, current: tm.progress })
                  setProgressValue(String(Math.max(1, tm.progress)))
                }}
                onViewActivity={() => openActivity({ kind: "team", id: tm.id, label: tm.name })}
                onResetProgress={() =>
                  setConfirm({
                    title: "Reset team progress",
                    body: `Reset "${tm.name}" back to the start? Every member will hold no QR leads.`,
                    confirmLabel: "Reset",
                    run: () => adminResetTeamProgress(tm.id),
                  })
                }
                onDisband={() =>
                  setConfirm({
                    title: "Disband team",
                    body: `Disband "${tm.name}"? All ${tm.members.length} member(s) will be removed and the team deleted. This cannot be undone.`,
                    confirmLabel: "Disband",
                    run: () => adminDisbandTeam(tm.id),
                  })
                }
                onKick={(userId, email) =>
                  setConfirm({
                    title: "Kick from team",
                    body: `Remove ${email} from "${tm.name}"?`,
                    confirmLabel: "Kick",
                    run: () => adminKickFromTeam(userId),
                  })
                }
              />
            ))}
            {filteredTeams.length === 0 && <Empty>No teams match your search.</Empty>}
          </ul>
        ) : tab === "hints" ? (
          <AdminHintsPanel hints={data.hints} leadOptions={data.leadOptions} />
        ) : tab === "campaigns" ? (
          <AdminCampaignsPanel campaigns={data.campaigns} />
        ) : tab === "leads" ? (
          <AdminLeadsPanel
            leads={data.leads}
            tokens={data.tokens}
            leadBgWashPct={data.leadBgWashPct}
            compassOpacityPct={data.compassOpacityPct}
          />
        ) : tab === "activity" ? (
          <AdminActivityPanel
            key={activityKey}
            initialPage={activitySeed}
            lockedFilter={activityFilter}
            onClearFilter={clearActivityFilter}
          />
        ) : tab === "analytics" ? (
          <AdminAnalyticsPanel initial={data.analytics} />
        ) : tab === "phase" ? (
          <AdminPhasePanel data={data.phase} />
        ) : tab === "proofs" ? (
          <AdminProofsPanel />
        ) : tab === "location" && isBootstrap ? (
          <AdminLocationPanel />
        ) : tab === "finale" ? (
          <AdminFinalePanel />
        ) : (
          <HuntRulesPanel
            solveCooldownSeconds={data.solveCooldownSeconds}
            pending={pending}
            onSave={(solveCooldownSeconds) =>
              runAction(
                () => adminSaveHuntRules({ solveCooldownSeconds }),
                "Hunt rules saved.",
              )
            }
          />
        )}
      </div>

      {/* Password reset */}
      <AdminPasswordDialog
        open={pwTarget !== null}
        onClose={() => setPwTarget(null)}
        target={pwTarget}
      />

      {/* Destructive confirm */}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        pending={pending}
        onConfirm={() => {
          if (confirm) runAction(confirm.run, `${confirm.confirmLabel} done.`)
        }}
      />

      {/* Rename team */}
      <ModalShell
        open={renameTeam !== null}
        onClose={() => setRenameTeam(null)}
        labelledBy="rename-title"
      >
        <h2 id="rename-title" className="font-serif text-2xl font-black text-foreground">
          Rename team
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (renameTeam) {
              const id = renameTeam.id
              runAction(() => adminRenameTeam(id, renameValue), "Team renamed.")
              setRenameTeam(null)
            }
          }}
          className="mt-5"
        >
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenameTeam(null)}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Assign / move to team */}
      <ModalShell
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        labelledBy="assign-title"
      >
        <h2 id="assign-title" className="font-serif text-2xl font-black text-foreground">
          {assignTarget?.teamId ? "Move to another team" : "Assign to a team"}
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          {assignTarget?.teamId ? (
            <>
              {assignTarget?.email} is currently in{" "}
              <span className="text-foreground">{assignTarget?.teamName}</span>. Pick a new team.
            </>
          ) : (
            <>{assignTarget?.email} isn&apos;t in a team yet. Pick one to add them to.</>
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (assignTarget && assignValue) {
              const id = assignTarget.id
              const teamId = assignValue
              runAction(() => adminAssignToTeam(id, teamId), "User assigned to team.")
              setAssignTarget(null)
            }
          }}
          className="mt-5"
        >
          <label
            htmlFor="assign-team"
            className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
          >
            TEAM
          </label>
          <select
            id="assign-team"
            value={assignValue}
            onChange={(e) => setAssignValue(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          >
            <option value="" disabled>
              Select a team...
            </option>
            {data.teams.map((tm) => (
              <option key={tm.id} value={tm.id} disabled={tm.id === assignTarget?.teamId}>
                {tm.name} ({tm.members.length}/{MAX_CREW_SIZE})
                {tm.id === assignTarget?.teamId ? " (current)" : ""}
              </option>
            ))}
          </select>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending || !assignValue}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {assignTarget?.teamId ? "Move" : "Assign"}
            </button>
            <button
              type="button"
              onClick={() => setAssignTarget(null)}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Create team */}
      <ModalShell open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-title">
        <h2 id="create-title" className="font-serif text-2xl font-black text-foreground">
          Create a team
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Starts empty with all {MAX_CREW_SIZE} seats open. Assign users into it from the Users tab.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const name = createValue
            runAction(() => adminCreateTeam(name), "Team created.")
            setCreateOpen(false)
          }}
          className="mt-5"
        >
          <label
            htmlFor="create-team-name"
            className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
          >
            TEAM NAME
          </label>
          <input
            id="create-team-name"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            placeholder="The Argonauts"
            className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending || createValue.trim().length < 2}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Set progress (user or team) */}
      <ModalShell
        open={progressTarget !== null}
        onClose={() => setProgressTarget(null)}
        labelledBy="progress-title"
      >
        <h2 id="progress-title" className="font-serif text-2xl font-black text-foreground">
          Set progress
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          {progressTarget?.kind === "team" ? (
            <>
              Move the whole team <span className="text-foreground">{progressTarget?.label}</span> to a
              specific lead. Every member is brought to the same point.
            </>
          ) : progressTarget?.teamName ? (
            <>
              Set <span className="text-foreground">{progressTarget?.label}</span> to a specific lead.
            </>
          ) : (
            <>
              Set <span className="text-foreground">{progressTarget?.label}</span> to a specific lead.
              This only affects this user.
            </>
          )}
        </p>

        {progressTarget?.kind === "user" && progressTarget.teamName && (
          <p className="mt-3 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 font-sans text-xs text-foreground">
            Heads up: this player is on team{" "}
            <span className="font-bold">{progressTarget.teamName}</span>. Since a team shares one
            progress, this moves the whole crew to the same lead.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!progressTarget) return
            const { kind, id } = progressTarget
            // Every endgame stage implies all leads are solved, so they pin the
            // lead number to the last one and let the stage carry the rest.
            const finale =
              progressValue === "hold" ||
              progressValue === "compass" ||
              progressValue === "treasure"
            const lead = finale ? data.totalLeads : Number(progressValue)
            const stage = finale ? (progressValue as "hold" | "compass" | "treasure") : "lead"
            runAction(
              () =>
                kind === "team"
                  ? adminSetTeamProgress(id, lead, stage)
                  : adminSetUserProgress(id, lead, stage),
              "Progress updated.",
            )
            setProgressTarget(null)
          }}
          className="mt-5"
        >
          <label
            htmlFor="progress-value"
            className="font-sans text-xs font-bold tracking-chip text-muted-foreground"
          >
            STAGE
          </label>
          <select
            id="progress-value"
            value={progressValue}
            onChange={(e) => setProgressValue(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          >
            {Array.from({ length: data.totalLeads }, (_, i) => {
              const n = i + 1
              return (
                <option key={n} value={n}>
                  Lead {String(n).padStart(2, "0")}
                </option>
              )
            })}
            {/* Only offered while the hold is on: with the hold lifted there is
                nothing to wait for, so a crew cannot sit here. */}
            {holdEnabled && (
              <option value="hold">The Hold (trail closed, waiting)</option>
            )}
            <option value="compass">The Compass (all leads solved)</option>
            <option value="treasure">The Treasure (finished)</option>
          </select>
          <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
            {progressValue === "treasure"
              ? "Counts as finished, exactly like scanning the Treasure QR: it takes their place in the winner order by finish time."
              : progressValue === "compass"
                ? "Every lead is solved and the compass is revealed. They now need to find the Compass QR. This does not finish the hunt: only that scan does."
                : progressValue === "hold"
                  ? "Every lead is solved and the trail is closed, but the compass step has not opened for them yet. This is where a crew waits while the hold is on, and it seals note 1 until you lift it."
                  : (() => {
                    // The QR hidden AT a lead unlocks the NEXT lead, so a crew
                    // sitting on lead N hunts lead N's own QR to reach N+1.
                    const n = Number(progressValue)
                    const here = String(n).padStart(2, "0")
                    const next =
                      n >= data.totalLeads
                        ? "the Compass"
                        : `Lead ${String(n + 1).padStart(2, "0")}`
                    return `They are at Lead ${here} and need to find Lead ${here}'s QR to reach ${next}.`
                  })()}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setProgressTarget(null)}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </ModalShell>
    </main>
  )
}

/** One headline number in the Users-tab presence strip. */
function PresenceCount({
  tone,
  value,
  label,
  hint,
}: {
  tone: "online" | "idle" | "anon" | "unverified"
  value: number
  label: string
  hint: string
}) {
  const dot =
    tone === "online"
      ? "bg-emerald-400 ring-2 ring-emerald-400/25"
      : tone === "idle"
        ? "bg-amber-400 ring-2 ring-amber-400/20"
        : tone === "unverified"
          ? "bg-rose-400/70 ring-2 ring-rose-400/15"
          : "bg-muted-foreground/40"
  return (
    <div className="flex items-center gap-2.5">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl font-black leading-none text-foreground">{value}</span>
          <span className="font-sans text-[11px] font-bold text-foreground">{label}</span>
        </div>
        <p className="font-sans text-[10px] leading-snug text-muted-foreground/70">{hint}</p>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  live,
}: {
  label: string
  value: number
  /** Optional breakdown under the label, so totals reconcile across tabs. */
  hint?: string
  /**
   * Marks a figure that moves on its own. It turns the number green and adds a
   * pulsing dot, so a stale-looking 0 is recognisably "nobody here right now"
   * rather than a tile that failed to load.
   */
  live?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-sm border bg-card/50 px-3 py-2 sm:min-w-[4.5rem] sm:px-4",
        live && value > 0 ? "border-emerald-500/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 font-serif text-2xl font-black",
          live && value > 0 ? "text-emerald-300" : "text-brass",
        )}
      >
        {live && value > 0 && (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
        )}
        {value}
      </span>
      <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 text-center font-sans text-[9px] leading-snug text-muted-foreground/70">
          {hint}
        </span>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm font-bold tracking-chip transition-colors sm:px-4 ${
      active ? "bg-brass text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
      {children}
    </li>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (role === "superadmin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-brass/15 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
        <Shield className="size-3" />
        Superadmin
      </span>
    )
  }
  return null
}

function IconBtn({
  onClick,
  disabled,
  title,
  danger,
  icon: Icon,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  danger?: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
          : "border-border text-muted-foreground hover:border-brass hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function UserCard({
  u,
  totalLeads,
  pState,
  snapshotAt,
  isSelf,
  pending,
  hasTeams,
  onSetProgress,
  onResetProgress,
  onAssign,
  onResetPassword,
  onViewActivity,
  onToggleRole,
  onKick,
  onDelete,
}: {
  u: AdminUserRow
  totalLeads: number
  /** Live/idle/offline bucket, computed by the caller from the snapshot. */
  pState: PresenceState
  /** Server epoch ms of the presence snapshot, the reference for "x ago". */
  snapshotAt: number
  isSelf: boolean
  pending: boolean
  hasTeams: boolean
  onSetProgress: () => void
  onResetProgress: () => void
  onAssign: () => void
  onResetPassword: () => void
  onViewActivity: () => void
  onToggleRole: () => void
  onKick: () => void
  onDelete: () => void
}) {
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email.split("@")[0]
  return (
    <li className="flex flex-col gap-3 rounded-sm border border-border bg-card/40 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {/* Avatar carries the presence dot, so status reads at a glance. */}
        <span className="relative shrink-0">
          <span className="flex size-9 items-center justify-center rounded-full bg-brass/15 font-serif text-sm font-black text-brass">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${PRESENCE_DOT[pState]}`}
            title={
              pState === "online"
                ? "Online now"
                : pState === "idle"
                  ? "Recently active"
                  : pState === "never"
                    ? "Never seen"
                    : "Offline"
            }
          />
          <span className="sr-only">
            {pState === "online"
              ? "Online now"
              : pState === "idle"
                ? "Recently active"
                : pState === "never"
                  ? "Never seen"
                  : "Offline"}
          </span>
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-bold text-foreground">{displayName}</span>
            <RoleBadge role={u.role} />
            {isSelf && (
              <span className="font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                You
              </span>
            )}
          </div>
          <p className="truncate font-sans text-xs text-muted-foreground">{u.email}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-sans text-[11px] text-muted-foreground">
            {u.teamName ? (
              <span>
                Team: <span className="text-foreground">{u.teamName}</span>
                {u.teamRole === "owner" && " (owner)"}
              </span>
            ) : (
              <span>No team</span>
            )}
            <span aria-hidden>·</span>
            <ProgressBadge progress={u.progress} total={totalLeads} />
            <span aria-hidden>·</span>
            <span>Joined {fmtDate(u.createdAt)}</span>
          </p>
          {/* Presence detail: when they were last seen, and on what. */}
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-sans text-[11px] text-muted-foreground">
            {pState === "online" ? (
              <span className="font-bold text-emerald-300">Online now</span>
            ) : u.lastSeenAt == null ? (
              /**
               * No events ever. Sign-in REQUIRES a verified email, so an
               * unverified account provably never got in, while a verified one
               * did get in and simply left no trace (it predates tracking, or
               * every request was blocked/prefetched). Two different facts, so
               * they get two different labels rather than one vague guess.
               */
              u.emailVerified ? (
                <span
                  className="italic text-muted-foreground/60"
                  title="Signed in at some point, but has no recorded activity. Their visits may predate activity tracking."
                >
                  No activity recorded
                </span>
              ) : (
                <span
                  className="font-bold text-rose-300/90"
                  title="Never confirmed their email address. Sign-in requires verification, so this account has never been used."
                >
                  Never verified email
                </span>
              )
            ) : (
              <span>
                Last online{" "}
                <span
                  className={pState === "idle" ? "font-bold text-amber-300" : "text-foreground"}
                  title={new Date(u.lastSeenAt).toLocaleString()}
                >
                  {fmtAgo(snapshotAt - u.lastSeenAt)}
                </span>
              </span>
            )}
            {u.lastPath && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">
                  {pState === "online" ? "On" : "Was on"}{" "}
                  <span className="font-mono text-[10px] text-foreground">{u.lastPath}</span>
                </span>
              </>
            )}
            {(u.lastDevice || u.lastBrowser || u.lastOs) && (
              <>
                <span aria-hidden>·</span>
                <span>{[u.lastDevice, u.lastOs, u.lastBrowser].filter(Boolean).join(" / ")}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <IconBtn
          onClick={onSetProgress}
          disabled={pending}
          title="Set progress"
          icon={Flag}
          label="Progress"
        />
        <IconBtn
          onClick={onResetProgress}
          disabled={pending || u.progress === 0}
          title="Reset progress to start"
          icon={RotateCcw}
          label="Reset"
        />
        <IconBtn
          onClick={onToggleRole}
          disabled={pending || isSelf}
          title={isSelf ? "You can't change your own role" : "Toggle superadmin"}
          icon={u.role === "superadmin" ? ShieldOff : Shield}
          label={u.role === "superadmin" ? "Revoke admin" : "Make admin"}
        />
        <IconBtn
          onClick={onResetPassword}
          disabled={pending}
          title="Reset password"
          icon={KeyRound}
          label="Password"
        />
        <IconBtn
          onClick={onViewActivity}
          disabled={pending}
          title="View this user's activity log"
          icon={Activity}
          label="Activity"
        />
        <IconBtn
          onClick={onAssign}
          disabled={pending || !hasTeams}
          title={hasTeams ? (u.teamId ? "Move to another team" : "Assign to a team") : "No teams exist yet"}
          icon={UserPlus}
          label={u.teamId ? "Move" : "Assign"}
        />
        {u.teamId && (
          <IconBtn onClick={onKick} disabled={pending} title="Kick from team" icon={UserMinus} label="Kick" />
        )}
        <IconBtn
          onClick={onDelete}
          disabled={pending || isSelf}
          title={isSelf ? "You can't delete yourself" : "Delete account"}
          danger
          icon={Trash2}
          label="Delete"
        />
      </div>
    </li>
  )
}

function TeamCard({
  tm,
  totalLeads,
  pending,
  onRename,
  onSetProgress,
  onResetProgress,
  onViewActivity,
  onDisband,
  onKick,
}: {
  tm: AdminTeamRow
  totalLeads: number
  pending: boolean
  onRename: () => void
  onSetProgress: () => void
  onResetProgress: () => void
  onViewActivity: () => void
  onDisband: () => void
  onKick: (userId: string, email: string) => void
}) {
  return (
    <li className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Crown className="size-4 text-brass" />
            <span className="font-serif text-lg font-black text-foreground">{tm.name}</span>
            <span className="font-sans text-[11px] text-muted-foreground">
              {tm.members.length} member(s)
            </span>
            <ProgressBadge progress={tm.progress} total={totalLeads} />
          </div>
          <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
            Invite code: <span className="font-mono text-foreground">{tm.inviteCode}</span> · Created{" "}
            {fmtDate(tm.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconBtn onClick={onSetProgress} disabled={pending} title="Set team progress" icon={Flag} label="Progress" />
          <IconBtn
            onClick={onResetProgress}
            disabled={pending || tm.progress === 0}
            title="Reset team progress"
            icon={RotateCcw}
            label="Reset"
          />
          <IconBtn onClick={onRename} disabled={pending} title="Rename team" icon={Pencil} label="Rename" />
          <IconBtn
            onClick={onViewActivity}
            disabled={pending}
            title="View this team's activity log"
            icon={Activity}
            label="Activity"
          />
          <IconBtn
            onClick={onDisband}
            disabled={pending}
            title="Disband team"
            danger
            icon={Trash2}
            label="Disband"
          />
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3">
        {tm.members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-sans text-sm text-foreground">
                  {m.name || m.email}
                </span>
                {m.role === "owner" && (
                  <span className="shrink-0 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                    Owner
                  </span>
                )}
              </div>
              <span className="block truncate font-sans text-xs text-muted-foreground">
                {m.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onKick(m.userId, m.email)}
              disabled={pending}
              title="Kick from team"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-sans text-[11px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
            >
              <UserMinus className="size-3" />
              Kick
            </button>
          </li>
        ))}
      </ul>
    </li>
  )
}

function ProgressBadge({ progress, total }: { progress: number; total: number }) {
  const done = progress >= total
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-chip ${
        progress === 0
          ? "bg-border/40 text-muted-foreground"
          : done
            ? "bg-brass/20 text-brass"
            : "bg-brass/10 text-foreground"
      }`}
      title="Leads unlocked"
    >
      <Flag className="size-3" />
      {progress}/{total}
    </span>
  )
}

/**
 * The Hunt rules panel. There is no scoring in this hunt: standings are decided
 * purely by how far a crew has come and how early they got there, so the old
 * placement-points and lead-difficulty controls are gone. What remains here is
 * the anti-cheat solve cooldown.
 */
function HuntRulesPanel({
  solveCooldownSeconds,
  pending,
  onSave,
}: {
  solveCooldownSeconds: number
  pending: boolean
  onSave: (solveCooldownSeconds: number) => void
}) {
  // Cooldown is stored in seconds but edited in minutes for convenience.
  const [cooldownMin, setCooldownMin] = useState<number>(() =>
    Math.round((solveCooldownSeconds / 60) * 100) / 100,
  )

  // Re-sync local state if fresh server data arrives (e.g. after a save).
  useEffect(() => {
    setCooldownMin(Math.round((solveCooldownSeconds / 60) * 100) / 100)
  }, [solveCooldownSeconds])

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Hunt rules</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          There are no points. A standing is decided by how far a crew has come and, for anyone tied
          on the same lead, who arrived there first. See the Progress tab for the live order.
        </p>
      </div>

      {/* Anti-cheat solve cooldown */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Solve cooldown
        </h3>
        <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Minimum time that must pass between a crew&rsquo;s two consecutive QR solves. If players
          scan the next lead too soon, they see a countdown and the solve is refused until the
          cooldown elapses. Set to 0 to disable.
        </p>
        <div className="mt-3 max-w-[12rem]">
          <NumberField
            label="Minutes"
            value={cooldownMin}
            onChange={(v) => setCooldownMin(Math.max(0, Number(v) || 0))}
          />
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            {Math.max(0, Math.round((Number(cooldownMin) || 0) * 60))} seconds
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSave(Math.max(0, Math.round((Number(cooldownMin) || 0) * 60)))}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Save className="size-4" />
          Save
        </button>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-brass"
      />
    </label>
  )
}
