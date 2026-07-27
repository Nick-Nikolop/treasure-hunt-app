"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown,
  Users,
  User as UserIcon,
  Trophy,
  Compass,
  ScrollText,
  MapPin,
  Search,
  Hourglass,
} from "lucide-react"
import type { AdminTeamRow, AdminUserRow, Milestones } from "@/app/admin/actions"

/**
 * One rung of the hunt, ordered from "not started" to "finished". Leads are
 * numbered 0..total; the three endgame steps sit above them because they are
 * stamped by their own QRs rather than by a lead count.
 */
type StageKey = number | "trailEnd" | "compass" | "finished"

type Entrant = {
  kind: "team" | "solo"
  id: string
  /** Team name, or the solo explorer's best display name. */
  label: string
  /** Secondary line: member count for a crew, email for a solo explorer. */
  sub: string
  progress: number
  milestones: Milestones
  /** Crew members, empty for a solo explorer. */
  members: { userId: string; name: string; email: string; role: string; progress: number }[]
}

/** Where an entrant currently stands, as a sortable rung. */
function stageOf(e: Entrant): StageKey {
  if (e.milestones.finished) return "finished"
  if (e.milestones.compass) return "compass"
  if (e.milestones.trailEnd) return "trailEnd"
  return e.progress
}

/** Sort key so the furthest along come first. Endgame steps outrank any lead. */
function stageRank(s: StageKey): number {
  if (s === "finished") return 1_000_003
  if (s === "compass") return 1_000_002
  if (s === "trailEnd") return 1_000_001
  return s
}

export function AdminProgressPanel({
  users,
  teams,
  totalLeads,
  leadOptions,
}: {
  users: AdminUserRow[]
  teams: AdminTeamRow[]
  totalLeads: number
  /** Lead names, used to label each rung with the place rather than a number. */
  leadOptions: { order: number; country: string }[]
}) {
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  // Teams are entrants in their own right; only users with no team appear on
  // their own, so nobody is counted twice.
  const entrants = useMemo<Entrant[]>(() => {
    const fromTeams: Entrant[] = teams.map((t) => ({
      kind: "team",
      id: `team:${t.id}`,
      label: t.name,
      sub: `${t.members.length} ${t.members.length === 1 ? "member" : "members"}`,
      progress: t.progress,
      milestones: t.milestones,
      members: t.members,
    }))

    const solos: Entrant[] = users
      .filter((u) => u.teamId == null)
      .map((u) => ({
        kind: "solo",
        id: `user:${u.id}`,
        label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email,
        sub: u.email,
        progress: u.progress,
        milestones: u.milestones,
        members: [],
      }))

    return [...fromTeams, ...solos]
  }, [teams, users])

  // Every rung, highest first, each with the entrants standing on it. Empty
  // rungs are kept so the shape of the field stays readable.
  const rungs = useMemo(() => {
    const countryOf = new Map(leadOptions.map((l) => [l.order, l.country]))
    const keys: StageKey[] = ["finished", "compass", "trailEnd"]
    for (let i = totalLeads; i >= 0; i--) keys.push(i)

    return keys.map((key) => {
      const here = entrants.filter((e) => stageOf(e) === key)
      let label: string
      let hint: string
      if (key === "finished") {
        label = "Treasure found"
        hint = "Scanned the treasure QR"
      } else if (key === "compass") {
        label = "Hunting the treasure"
        hint = "Has the compass, looking for the treasure"
      } else if (key === "trailEnd") {
        label = "Hunting the compass"
        hint = "Holds the first note, looking for the compass"
      } else if (key === 0) {
        label = "Not started"
        hint = "No leads unlocked yet"
      } else {
        label = `Lead ${String(key).padStart(2, "0")} · ${countryOf.get(key) ?? "—"}`
        hint =
          key >= totalLeads
            ? "Every lead solved, still to scan the last lead's QR"
            : `Solved ${key} of ${totalLeads} leads`
      }
      return { key, label, hint, here }
    })
  }, [entrants, leadOptions, totalLeads])

  const q = query.trim().toLowerCase()
  const matches = (e: Entrant) =>
    q === "" ||
    e.label.toLowerCase().includes(q) ||
    e.sub.toLowerCase().includes(q) ||
    e.members.some(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )

  // Rungs collapse by default once they hold a crowd: before the hunt starts the
  // whole field sits on lead 1, and rendering 150+ rows inline pushes the endgame
  // rungs off the screen entirely. Small groups stay open since they are the ones
  // worth reading at a glance.
  const AUTO_OPEN_MAX = 12
  const [openRungs, setOpenRungs] = useState<Record<string, boolean>>({})
  const isRungOpen = (key: StageKey, count: number) =>
    openRungs[String(key)] ?? count <= AUTO_OPEN_MAX
  const toggleRung = (key: StageKey, count: number) =>
    setOpenRungs((prev) => ({
      ...prev,
      [String(key)]: !(prev[String(key)] ?? count <= AUTO_OPEN_MAX),
    }))

  const shown = entrants.filter(matches)
  const started = entrants.filter((e) => stageRank(stageOf(e)) > 0).length
  const finished = entrants.filter((e) => e.milestones.finished).length
  const endgame = entrants.filter(
    (e) => e.milestones.trailEnd && !e.milestones.finished,
  ).length

  return (
    <div className="flex flex-col gap-4">
      {/* Totals across the whole field */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tally icon={Users} label="Entrants" value={entrants.length} />
        <Tally icon={MapPin} label="Started" value={started} />
        <Tally icon={Compass} label="In the endgame" value={endgame} />
        <Tally icon={Trophy} label="Finished" value={finished} />
      </div>

      <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
        A crew counts as one entrant and shares one position, so only explorers with no crew are
        listed on their own. Click any row to see who is in it.
      </p>

      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search crews, explorers..."
          className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
        />
      </div>

      {q !== "" && (
        <p className="font-sans text-[11px] text-muted-foreground">
          {shown.length === 0
            ? "Nothing matches your search."
            : `${shown.length} of ${entrants.length} shown.`}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {rungs.map((rung) => {
          const here = rung.here.filter(matches).sort((a, b) => a.label.localeCompare(b.label))
          // While searching, hide rungs with no match to keep the list short.
          if (q !== "" && here.length === 0) return null

          const isEndgame =
            rung.key === "finished" || rung.key === "compass" || rung.key === "trailEnd"

          const hasRows = here.length > 0
          // A search already narrows the field, so matches stay open regardless.
          const expanded = q !== "" || isRungOpen(rung.key, here.length)
          // Only clickable when there is something to reveal, so empty rungs do
          // not offer a button that does nothing.
          const HeaderTag = hasRows ? "button" : "div"

          return (
            <li
              key={String(rung.key)}
              className={`rounded-sm border ${
                here.length > 0 ? "border-border bg-card/40" : "border-border/50"
              }`}
            >
              <HeaderTag
                {...(hasRows
                  ? {
                      type: "button" as const,
                      onClick: () => toggleRung(rung.key, here.length),
                      "aria-expanded": expanded,
                      className:
                        "w-full cursor-pointer text-left transition-colors hover:bg-card/70",
                    }
                  : {})}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-3">
                  <div className="flex items-center gap-2">
                    {rung.key === "finished" ? (
                      <Trophy className="size-3.5 shrink-0 text-brass" />
                    ) : rung.key === "compass" ? (
                      <Compass className="size-3.5 shrink-0 text-brass" />
                    ) : rung.key === "trailEnd" ? (
                      <ScrollText className="size-3.5 shrink-0 text-brass" />
                    ) : rung.key === 0 ? (
                      <Hourglass className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`font-sans text-[11px] font-bold uppercase tracking-chip ${
                        isEndgame ? "text-brass" : "text-foreground"
                      }`}
                    >
                      {rung.label}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
                    {here.length === 0 ? "nobody" : `${here.length} here`}
                    {hasRows && (
                      <ChevronDown
                        className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    )}
                  </span>
                </div>

                <p className="px-4 pb-2 pt-0.5 font-sans text-[11px] leading-relaxed text-muted-foreground">
                  {rung.hint}
                </p>
              </HeaderTag>

              {hasRows && expanded && (
                <ul className="flex flex-col gap-1.5 px-3 pb-3">
                  {here.map((e) => (
                    <EntrantRow
                      key={e.id}
                      entrant={e}
                      totalLeads={totalLeads}
                      open={openId === e.id}
                      onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                    />
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** One crew or solo explorer, expandable to show its members. */
function EntrantRow({
  entrant,
  totalLeads,
  open,
  onToggle,
}: {
  entrant: Entrant
  totalLeads: number
  open: boolean
  onToggle: () => void
}) {
  const isTeam = entrant.kind === "team"
  // A solo explorer has nothing to expand into, so the row stays inert.
  const expandable = isTeam && entrant.members.length > 0

  return (
    <li className="rounded-sm border border-border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        {isTeam ? (
          <Users className="size-3.5 shrink-0 text-brass" />
        ) : (
          <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-bold text-foreground">{entrant.label}</p>
          <p className="truncate font-sans text-[11px] text-muted-foreground">{entrant.sub}</p>
        </div>

        <span className="shrink-0 font-sans text-[11px] tabular-nums text-muted-foreground">
          {entrant.progress}/{totalLeads}
        </span>

        {expandable && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground"
          >
            {open ? "Hide" : "Who"}
            <ChevronDown
              className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        )}
      </div>

      {open && expandable && (
        <ul className="flex flex-col gap-1 border-t border-border px-3 py-2">
          {entrant.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-sans text-[12px] text-foreground">
                {m.name || m.email}
                {m.role === "owner" && (
                  <span className="ml-1.5 font-sans text-[10px] font-bold uppercase tracking-chip text-brass">
                    owner
                  </span>
                )}
              </span>
              <span className="shrink-0 truncate font-sans text-[11px] text-muted-foreground">
                {m.email}
              </span>
              <span className="shrink-0 font-sans text-[11px] tabular-nums text-muted-foreground">
                {m.progress}/{totalLeads}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function Tally({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 text-brass" />
        <span className="font-sans text-[10px] font-bold uppercase tracking-chip">{label}</span>
      </div>
      <p className="mt-1 font-heading text-2xl tabular-nums text-foreground">{value}</p>
    </div>
  )
}
