"use client"

import { useState, useTransition } from "react"
import { motion } from "framer-motion"
import {
  Anchor,
  ArrowLeft,
  Compass,
  Crown,
  LogOut,
  Pencil,
  Plus,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { ThemeToggle } from "@/components/pythea/theme-toggle"
import { LanguageToggle } from "@/components/pythea/language-toggle"
import { useI18n } from "@/components/pythea/language-provider"
import { InviteDialog } from "@/components/pythea/invite-dialog"
import { ConfirmDialog } from "@/components/pythea/confirm-dialog"
import { RenameDialog } from "@/components/pythea/rename-dialog"
import {
  createCrew,
  joinCrewByCode,
  leaveCrew,
  removeMember,
} from "@/app/teams/actions"
import type { Crew } from "@/lib/teams"

type Props = {
  crew: Crew | null
  maxSize: number
}

function displayName(m: Crew["members"][number]) {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim()
  return full || m.name || "—"
}

export function TeamsView({ crew, maxSize }: Props) {
  const { t } = useI18n()

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-8 md:px-8">
      {/* Top row: home + toggles */}
      <div className="flex items-center justify-between gap-3 py-2">
        <a
          href="/"
          className="group flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-sans text-[11px] font-bold tracking-chip">
            {t.teams.back}
          </span>
        </a>
        <div className="flex items-center gap-2.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {crew ? (
        <CrewPanel crew={crew} maxSize={maxSize} displayName={displayName} />
      ) : (
        <EmptyPanel />
      )}
    </main>
  )
}

/* ── No crew yet: create or join ───────────────────────────────────────── */

function EmptyPanel() {
  const { t } = useI18n()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function errText(key: string) {
    const e = t.teams.errors as Record<string, string>
    return e[key] ?? t.teams.errors.generic
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createCrew(name)
      if (!res.ok) setError(errText(res.error))
      // On success the action revalidates /teams and the server re-renders.
    })
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await joinCrewByCode(code)
      if (!res.ok) setError(errText(res.error))
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10"
    >
      <span className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-brass">
        <Anchor className="size-3.5" />
        {t.teams.emptyBadge}
      </span>
      <h1 className="mt-4 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl">
        {t.teams.emptyTitle}
      </h1>
      <p className="mt-4 max-w-lg text-pretty font-serif text-lg leading-relaxed text-muted-foreground">
        {t.teams.emptySubtitle}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 font-sans text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-start">
        {/* Create */}
        <form
          onSubmit={handleCreate}
          className="rounded-md border border-border bg-card/60 p-6 backdrop-blur-sm"
        >
          <h2 className="flex items-center gap-2 font-serif text-xl font-extrabold text-foreground">
            <Plus className="size-4 text-brass" />
            {t.teams.createTitle}
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.teams.createPlaceholder}
            maxLength={40}
            className="mt-4 w-full rounded-sm border border-border bg-background px-4 py-3 font-serif text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brass"
          />
          <button
            type="submit"
            disabled={pending || name.trim().length < 2}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="size-4" />
            {t.teams.createCta}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center justify-center md:h-full md:flex-col">
          <span className="hidden h-full w-px bg-border md:block" aria-hidden />
          <span className="px-3 font-sans text-xs font-bold tracking-chip text-muted-foreground">
            {t.teams.orDivider}
          </span>
          <span className="hidden h-full w-px bg-border md:block" aria-hidden />
        </div>

        {/* Join */}
        <form
          onSubmit={handleJoin}
          className="rounded-md border border-border bg-card/60 p-6 backdrop-blur-sm"
        >
          <h2 className="flex items-center gap-2 font-serif text-xl font-extrabold text-foreground">
            <Users className="size-4 text-brass" />
            {t.teams.joinTitle}
          </h2>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t.teams.joinPlaceholder}
            className="mt-4 w-full rounded-sm border border-border bg-background px-4 py-3 font-mono uppercase tracking-widest text-foreground outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-brass"
          />
          <button
            type="submit"
            disabled={pending || code.trim().length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border px-6 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.teams.joinCta}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

/* ── Existing crew: roster + controls ──────────────────────────────────── */

function CrewPanel({
  crew,
  maxSize,
  displayName,
}: {
  crew: Crew
  maxSize: number
  displayName: (m: Crew["members"][number]) => string
}) {
  const { t } = useI18n()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Crew["members"][number] | null>(null)
  const [pending, startTransition] = useTransition()

  const isFull = crew.members.length >= maxSize

  function handleLeave() {
    startTransition(async () => {
      await leaveCrew()
      setLeaveOpen(false)
    })
  }

  function handleRemove() {
    if (!removeTarget) return
    const target = removeTarget
    startTransition(async () => {
      await removeMember(target.userId)
      setRemoveTarget(null)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8"
    >
      {/* Crew header */}
      <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-brass">
            <Compass className="size-3.5" />
            {t.teams.crewBadge}
          </span>
          <h1 className="mt-3 flex items-center gap-3 text-balance font-serif text-4xl font-black leading-tight text-foreground md:text-5xl">
            {crew.name}
            {crew.isOwner && (
              <button
                type="button"
                onClick={() => setRenameOpen(true)}
                aria-label={t.teams.renameCta}
                className="text-muted-foreground transition-colors hover:text-brass"
              >
                <Pencil className="size-5" />
              </button>
            )}
          </h1>
          <p className="mt-2 font-sans text-xs font-bold tracking-chip text-muted-foreground">
            {t.teams.membersCount(crew.members.length, maxSize)}
          </p>
        </div>

        {crew.isOwner && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-brass px-6 py-3 font-sans text-sm font-bold tracking-chip text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <UserPlus className="size-4" />
            {t.teams.inviteCta}
          </button>
        )}
      </div>

      {isFull && (
        <p className="mt-4 font-sans text-xs font-bold tracking-chip text-muted-foreground">
          {t.teams.fullNote}
        </p>
      )}

      {/* Roster */}
      <ul className="mt-6 flex flex-col gap-3">
        {crew.members.map((m, i) => (
          <motion.li
            key={m.userId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-4 rounded-sm border border-border bg-card/60 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brass/50 font-serif text-lg font-black text-brass">
                {displayName(m).charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-serif text-lg font-extrabold leading-snug text-foreground">
                  {displayName(m)}
                  {m.isYou && (
                    <span className="ml-2 align-middle font-sans text-[10px] font-bold tracking-chip text-brass">
                      {t.teams.youTag}
                    </span>
                  )}
                </p>
                <span className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                  {m.role === "owner" ? (
                    <>
                      <Crown className="size-3 text-brass" />
                      {t.teams.ownerTag}
                    </>
                  ) : (
                    t.teams.memberTag
                  )}
                </span>
              </div>
            </div>

            {/* Owner can remove other members */}
            {crew.isOwner && !m.isYou && (
              <button
                type="button"
                onClick={() => setRemoveTarget(m)}
                aria-label={t.teams.removeLabel(displayName(m))}
                className="inline-flex size-9 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <UserMinus className="size-4" />
              </button>
            )}
          </motion.li>
        ))}
      </ul>

      {/* Leave */}
      <div className="mt-8 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="inline-flex items-center gap-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="size-4" />
          {t.teams.leaveCta}
        </button>
      </div>

      {/* Dialogs */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteCode={crew.inviteCode}
        canRegenerate={crew.isOwner}
      />
      <RenameDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentName={crew.name}
      />
      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={t.teams.leaveTitle}
        body={crew.isOwner ? t.teams.leaveBodyOwner : t.teams.leaveBodyMember}
        confirmLabel={t.teams.leaveConfirm}
        cancelLabel={t.teams.cancel}
        onConfirm={handleLeave}
        pending={pending}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={removeTarget ? t.teams.removeTitle(displayName(removeTarget)) : ""}
        body={t.teams.removeBody}
        confirmLabel={t.teams.removeConfirm}
        cancelLabel={t.teams.cancel}
        onConfirm={handleRemove}
        pending={pending}
      />
    </motion.div>
  )
}
