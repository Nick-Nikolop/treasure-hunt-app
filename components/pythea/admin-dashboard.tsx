"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  KeyRound,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  Users,
  Pencil,
  Crown,
} from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import { AdminPasswordDialog } from "@/components/pythea/admin-password-dialog"
import {
  adminDeleteUser,
  adminSetRole,
  adminKickFromTeam,
  adminDisbandTeam,
  adminRenameTeam,
  type AdminData,
  type AdminUserRow,
  type AdminTeamRow,
  type ActionResult,
} from "@/app/admin/actions"

type Tab = "users" | "teams"

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
}: {
  data: AdminData
  currentUserId: string
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

  const errorText: Record<string, string> = {
    cannot_delete_self: "You can't delete your own account here.",
    protected: "That account is protected and can't be changed.",
    last_admin: "You can't remove the last superadmin.",
    not_found: "That record no longer exists.",
    not_in_team: "That user isn't in a team.",
    too_short: "Name is too short.",
    too_long: "Name is too long.",
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
        <div className="flex gap-3">
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

      {/* Tabs + search */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-sm border border-border p-1">
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users}>
            Users
          </TabButton>
          <TabButton active={tab === "teams"} onClick={() => setTab("teams")} icon={Crown}>
            Teams
          </TabButton>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "users" ? "Search users..." : "Search teams..."}
            className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
        </div>
      </div>

      {/* Content */}
      <div className="mt-5">
        {tab === "users" ? (
          <ul className="flex flex-col gap-2.5">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                isSelf={u.id === currentUserId}
                pending={pending}
                onResetPassword={() => setPwTarget({ id: u.id, email: u.email })}
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
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredTeams.map((tm) => (
              <TeamCard
                key={tm.id}
                tm={tm}
                pending={pending}
                onRename={() => {
                  setRenameTeam(tm)
                  setRenameValue(tm.name)
                }}
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
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-center rounded-sm border border-border bg-card/50 px-4 py-2">
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
      className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 font-sans text-sm font-bold tracking-chip transition-colors ${
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
  isSelf,
  pending,
  onResetPassword,
  onToggleRole,
  onKick,
  onDelete,
}: {
  u: AdminUserRow
  isSelf: boolean
  pending: boolean
  onResetPassword: () => void
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
          <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
            {u.teamName ? (
              <>
                Team: <span className="text-foreground">{u.teamName}</span>
                {u.teamRole === "owner" && " (owner)"}
              </>
            ) : (
              "No team"
            )}
            {" · "}
            Joined {fmtDate(u.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
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
  pending,
  onRename,
  onDisband,
  onKick,
}: {
  tm: AdminTeamRow
  pending: boolean
  onRename: () => void
  onDisband: () => void
  onKick: (userId: string, email: string) => void
}) {
  return (
    <li className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-brass" />
            <span className="font-serif text-lg font-black text-foreground">{tm.name}</span>
            <span className="font-sans text-[11px] text-muted-foreground">
              {tm.members.length} member(s)
            </span>
          </div>
          <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
            Invite code: <span className="font-mono text-foreground">{tm.inviteCode}</span> · Created{" "}
            {fmtDate(tm.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconBtn onClick={onRename} disabled={pending} title="Rename team" icon={Pencil} label="Rename" />
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
            <span className="min-w-0 truncate font-sans text-sm text-foreground">
              {m.name || m.email}
              {m.role === "owner" && (
                <span className="ml-2 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                  Owner
                </span>
              )}
              <span className="ml-2 font-sans text-xs text-muted-foreground">{m.email}</span>
            </span>
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
