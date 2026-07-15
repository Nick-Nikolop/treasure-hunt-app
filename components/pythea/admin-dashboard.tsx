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
} from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import { AdminPasswordDialog } from "@/components/pythea/admin-password-dialog"
import { AdminHintsPanel } from "@/components/pythea/admin-hints-panel"
import { AdminCampaignsPanel } from "@/components/pythea/admin-campaigns-panel"
import { AdminLeadsPanel } from "@/components/pythea/admin-leads-panel"
import { AdminActivityPanel } from "@/components/pythea/admin-activity-panel"
import { AdminAnalyticsPanel } from "@/components/pythea/admin-analytics-panel"
import { AdminPhasePanel } from "@/components/pythea/admin-phase-panel"
import { AdminLocationPanel } from "@/components/pythea/admin-location-panel"
import { MAX_CREW_SIZE } from "@/lib/teams"
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
  adminSaveScoring,
  getActivityLog,
  type AdminData,
  type AdminUserRow,
  type AdminTeamRow,
  type ActionResult,
} from "@/app/admin/actions"
import type { Difficulty, ScoreConfig } from "@/lib/clues"
import type { ActivityPage } from "@/lib/activity"

type Tab =
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
  const [tab, setTab] = useState<Tab>("users")
  const [query, setQuery] = useState("")
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
    | { kind: "user"; id: string; label: string; current: number }
    | { kind: "team"; id: string; label: string; current: number }
    | null
  >(null)
  const [progressValue, setProgressValue] = useState(0)
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

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.users
    return data.users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.teamName ?? "").toLowerCase().includes(q),
    )
  }, [data.users, query])

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
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <Stat label="USERS" value={data.users.length} />
          <Stat label="TEAMS" value={data.teams.length} />
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
      <div className="mt-6 flex max-w-full overflow-x-auto rounded-sm border border-border p-1 sm:inline-flex">
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
        </TabButton>
        <TabButton active={tab === "scoring"} onClick={() => setTab("scoring")} icon={Trophy}>
          Scoring
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
        {isBootstrap && (
          <TabButton
            active={tab === "location"}
            onClick={() => setTab("location")}
            icon={MapPin}
          >
            Location
          </TabButton>
        )}
      </div>

      {/* Search row, sits below the tab bar for the Users/Teams tabs */}
      {(tab === "users" || tab === "teams") && (
        <div className="relative mt-4 w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "users" ? "Search users..." : "Search teams..."}
            className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
        </div>
      )}

      {/* Content */}
      <div className="mt-5">
        {tab === "users" ? (
          <ul className="flex flex-col gap-2.5">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                totalLeads={data.totalLeads}
                isSelf={u.id === currentUserId}
                pending={pending}
                hasTeams={data.teams.length > 0}
                onSetProgress={() => {
                  const label =
                    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email
                  setProgressTarget({ kind: "user", id: u.id, label, current: u.progress })
                  setProgressValue(u.progress)
                }}
                onResetProgress={() =>
                  setConfirm({
                    title: "Reset progress",
                    body: `Reset ${u.email} back to the start? They will hold no QR leads.`,
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
                  setProgressValue(tm.progress)
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
          <AdminLeadsPanel leads={data.leads} tokens={data.tokens} />
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
        ) : tab === "location" && isBootstrap ? (
          <AdminLocationPanel />
        ) : (
          <ScoringPanel
            config={data.scoreConfig}
            solveCooldownSeconds={data.solveCooldownSeconds}
            leadDifficulties={data.leadDifficulties}
            leadOptions={data.leadOptions}
            pending={pending}
            onSave={(config, difficulties, solveCooldownSeconds) =>
              runAction(
                () => adminSaveScoring({ config, difficulties, solveCooldownSeconds }),
                "Scoring saved. All standings have been recalculated.",
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
                {tm.id === assignTarget?.teamId ? " — current" : ""}
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
          ) : (
            <>
              Set <span className="text-foreground">{progressTarget?.label}</span> to a specific lead.
              This only affects this user.
            </>
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!progressTarget) return
            const { kind, id } = progressTarget
            const value = progressValue
            runAction(
              () =>
                kind === "team"
                  ? adminSetTeamProgress(id, value)
                  : adminSetUserProgress(id, value),
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
            LEAD (0 = START, {data.totalLeads} = FINISHED)
          </label>
          <select
            id="progress-value"
            value={progressValue}
            onChange={(e) => setProgressValue(Number(e.target.value))}
            className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2.5 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          >
            {Array.from({ length: data.totalLeads + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0
                  ? "0 — Not started"
                  : `Lead ${String(i).padStart(2, "0")}${i === data.totalLeads ? " — Finished" : ""}`}
              </option>
            ))}
          </select>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-border bg-card/50 px-3 py-2 sm:min-w-[4.5rem] sm:px-4">
      <span className="font-serif text-2xl font-black text-brass">{value}</span>
      <span className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
        {label}
      </span>
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
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass/15 font-serif text-sm font-black text-brass">
          {displayName.slice(0, 1).toUpperCase()}
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

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
]

/**
 * The Scoring panel: edit the global placement tiers (points for the 1st / 2nd
 * / 3rd / everyone-else to complete a lead), the bonus that medium and hard
 * leads add on top, and the difficulty of each individual lead. Saving writes
 * the settings; since standings are computed live from them, every score is
 * recalculated on the next leaderboard read.
 */
function ScoringPanel({
  config,
  solveCooldownSeconds,
  leadDifficulties,
  leadOptions,
  pending,
  onSave,
}: {
  config: ScoreConfig
  solveCooldownSeconds: number
  leadDifficulties: { order: number; difficulty: Difficulty }[]
  leadOptions: AdminData["leadOptions"]
  pending: boolean
  onSave: (
    config: ScoreConfig,
    difficulties: { leadOrder: number; difficulty: Difficulty }[],
    solveCooldownSeconds: number,
  ) => void
}) {
  const [draft, setDraft] = useState<ScoreConfig>(config)
  const [diffs, setDiffs] = useState<Map<number, Difficulty>>(
    () => new Map(leadDifficulties.map((d) => [d.order, d.difficulty])),
  )
  // Cooldown is stored in seconds but edited in minutes for convenience.
  const [cooldownMin, setCooldownMin] = useState<number>(() =>
    Math.round((solveCooldownSeconds / 60) * 100) / 100,
  )

  // Re-sync local state if fresh server data arrives (e.g. after a save).
  useEffect(() => {
    setDraft(config)
  }, [config])
  useEffect(() => {
    setDiffs(new Map(leadDifficulties.map((d) => [d.order, d.difficulty])))
  }, [leadDifficulties])
  useEffect(() => {
    setCooldownMin(Math.round((solveCooldownSeconds / 60) * 100) / 100)
  }, [solveCooldownSeconds])

  const countryByOrder = useMemo(
    () => new Map(leadOptions.map((l) => [l.order, l])),
    [leadOptions],
  )

  function setNum(key: keyof ScoreConfig, value: string) {
    const n = Math.max(0, Math.round(Number(value) || 0))
    setDraft((d) => ({ ...d, [key]: n }))
  }

  // Preview the four tier totals for a given bonus.
  function tierPreview(bonus: number): string {
    return [draft.firstPoints, draft.secondPoints, draft.thirdPoints, draft.restPoints]
      .map((p) => p + bonus)
      .join(" / ")
  }

  function save() {
    const difficulties = leadOptions.map((l) => ({
      leadOrder: l.order,
      difficulty: diffs.get(l.order) ?? "easy",
    }))
    const cooldownSeconds = Math.max(0, Math.round((Number(cooldownMin) || 0) * 60))
    onSave(draft, difficulties, cooldownSeconds)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brass" />
          <h2 className="font-serif text-lg font-black text-foreground">Scoring</h2>
        </div>
        <p className="mt-1 font-sans text-[13px] leading-relaxed text-muted-foreground">
          Points are awarded each time a crew completes a lead (reaches the next stop, or scans the
          finishing QR on the last one). The first three to complete a lead earn the placement
          points below; everyone else earns the &ldquo;rest&rdquo; amount. Medium and hard leads add
          a flat bonus on top. Saving recalculates every standing instantly.
        </p>
      </div>

      {/* Placement tiers */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Placement points (Easy base)
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="1st" value={draft.firstPoints} onChange={(v) => setNum("firstPoints", v)} />
          <NumberField label="2nd" value={draft.secondPoints} onChange={(v) => setNum("secondPoints", v)} />
          <NumberField label="3rd" value={draft.thirdPoints} onChange={(v) => setNum("thirdPoints", v)} />
          <NumberField label="Everyone else" value={draft.restPoints} onChange={(v) => setNum("restPoints", v)} />
        </div>
      </div>

      {/* Difficulty bonuses */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Difficulty bonus (added to every tier)
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <NumberField label="Medium bonus" value={draft.mediumBonus} onChange={(v) => setNum("mediumBonus", v)} />
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {tierPreview(draft.mediumBonus)}
            </p>
          </div>
          <div>
            <NumberField label="Hard bonus" value={draft.hardBonus} onChange={(v) => setNum("hardBonus", v)} />
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {tierPreview(draft.hardBonus)}
            </p>
          </div>
        </div>
      </div>

      {/* Per-lead difficulty */}
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
          Lead difficulty
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {leadOptions.map((l) => {
            const country = countryByOrder.get(l.order)
            const current = diffs.get(l.order) ?? "easy"
            return (
              <li
                key={l.order}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-chip text-muted-foreground">
                    Lead {String(l.order).padStart(2, "0")}
                  </span>
                  <span className="ml-2 truncate font-sans text-sm text-foreground">
                    {country?.country ?? ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDiffs((m) => new Map(m).set(l.order, d.value))}
                      className={`rounded-sm px-2.5 py-1 font-sans text-[11px] font-bold tracking-chip transition-colors ${
                        current === d.value
                          ? "bg-brass text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
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
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Save className="size-4" />
          Save & recalculate
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
