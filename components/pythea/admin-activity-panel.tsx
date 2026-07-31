"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Search,
  X,
  Compass,
  Satellite,
  ShieldAlert,
  MapPinOff,
  Users,
  Shield,
  LogIn,
  ScrollText,
  ChevronDown,
  Camera,
  QrCode,
  Wand2,
} from "lucide-react"
import { getActivityLog } from "@/app/admin/actions"
import { type ActivityRow, type ActivityCategory, type ActivityPage } from "@/lib/activity"

type CategoryFilter = ActivityCategory | "all"

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lead", label: "Leads" },
  { key: "team", label: "Teams" },
  { key: "admin", label: "Admin" },
  { key: "auth", label: "Auth" },
  { key: "auto", label: "Automated re-placement" },
]

/** Small icon + tone per category for the row marker and chips. */
function categoryMeta(category: string): {
  icon: typeof Compass
  tone: string
  label: string
} {
  switch (category) {
    case "lead":
      return { icon: Compass, tone: "text-brass", label: "Lead" }
    case "team":
      return { icon: Users, tone: "text-foreground", label: "Team" }
    case "admin":
      return { icon: Shield, tone: "text-destructive", label: "Admin" }
    case "auth":
      return { icon: LogIn, tone: "text-muted-foreground", label: "Auth" }
    case "auto":
      return { icon: Wand2, tone: "text-sky-400", label: "Re-placement" }
    default:
      return { icon: ScrollText, tone: "text-muted-foreground", label: category }
  }
}

/**
 * How a lead was passed. Scanning the QR is the entry point for BOTH routes, so
 * a "QR SCAN" badge would say nothing: what matters is whether the automated GPS
 * check placed the crew at the mark, or an admin approved a photo by hand.
 *
 * "legacy" is for rows written before the distinction was recorded (stored as
 * "qr"). Those cannot be split into gps-vs-skip retroactively, so they get a
 * neutral chip rather than a confident and possibly wrong one. Unrecognised
 * values return null, so an unknown source shows no badge instead of a lie.
 */
type PassMethod = "gps" | "proof" | "skip" | "nogate" | "legacy"

const PASS_METHODS: Record<
  PassMethod,
  { label: string; title: string; icon: LucideIcon; className: string }
> = {
  gps: {
    label: "GPS CHECK",
    title: "Passed automatically: the location check placed them inside the lead's radius",
    icon: Satellite,
    className: "border-brass/45 bg-brass/15 text-brass",
  },
  proof: {
    label: "PHOTO PROOF",
    title: "Passed by photo proof, reviewed and approved by an admin",
    icon: Camera,
    className: "border-sky-500/45 bg-sky-500/15 text-sky-400",
  },
  skip: {
    label: "CHECK SKIPPED",
    title: "A superadmin bypassed a verification step, so this unlock was not fully verified",
    icon: ShieldAlert,
    className: "border-amber-500/45 bg-amber-500/15 text-amber-400",
  },
  nogate: {
    label: "NO GPS GATE",
    title: "This lead has no coordinates configured, so no location check was possible",
    icon: MapPinOff,
    className: "border-border bg-muted/40 text-muted-foreground",
  },
  legacy: {
    label: "QR SCAN",
    title: "Logged before GPS and skip were recorded separately, so the exact route is unknown",
    icon: QrCode,
    className: "border-border bg-muted/40 text-muted-foreground",
  },
}

function passMethod(row: ActivityRow): PassMethod | null {
  if (row.category !== "lead") return null
  const src = (row.metadata as { source?: unknown } | null)?.source
  if (src === "gps" || src === "proof" || src === "skip" || src === "nogate") return src
  return src === "qr" ? "legacy" : null
}

function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Read-only audit-log viewer for the admin dashboard. Seeded by the server with
 * the first (unfiltered) page; category switches, search, drill-down, and
 * "load more" call the `getActivityLog` server action on explicit user events.
 *
 * When opened via a per-user / per-team drill-down, `lockedFilter` pins the
 * query to that entity and shows a removable chip.
 */
export function AdminActivityPanel({
  initialPage,
  lockedFilter,
  onClearFilter,
}: {
  initialPage: ActivityPage
  lockedFilter: { kind: "user" | "team"; id: string; label: string } | null
  onClearFilter: () => void
}) {
  const [rows, setRows] = useState<ActivityRow[]>(initialPage.rows)
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor)
  const [hasMore, setHasMore] = useState(initialPage.hasMore)
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [search, setSearch] = useState("")
  const [pending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lockedUserId = lockedFilter?.kind === "user" ? lockedFilter.id : null
  const lockedTeamId = lockedFilter?.kind === "team" ? lockedFilter.id : null

  // Run a fresh query (page 1) for the current filters, replacing the list.
  function refetch(next: { category?: CategoryFilter; search?: string }) {
    const cat = next.category ?? category
    const q = next.search ?? search
    startTransition(async () => {
      const page = await getActivityLog({
        category: cat === "all" ? null : cat,
        userId: lockedUserId,
        teamId: lockedTeamId,
        search: q.trim() || null,
        before: null,
      })
      setRows(page.rows)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    })
  }

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      const page = await getActivityLog({
        category: category === "all" ? null : category,
        userId: lockedUserId,
        teamId: lockedTeamId,
        search: search.trim() || null,
        before: cursor,
      })
      setRows((prev) => [...prev, ...page.rows])
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    })
  }

  function onSearchChange(value: string) {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => refetch({ search: value }), 300)
  }

  function onCategoryChange(key: CategoryFilter) {
    setCategory(key)
    refetch({ category: key })
  }

  // Group rows by calendar day for readable scanning.
  const grouped = useMemo(() => {
    const groups: { day: string; items: ActivityRow[] }[] = []
    for (const row of rows) {
      const day = new Date(row.createdAt).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.items.push(row)
      else groups.push({ day, items: [row] })
    }
    return groups
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-full overflow-x-auto rounded-sm border border-border p-1">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onCategoryChange(t.key)}
              className={`shrink-0 rounded-sm px-3 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors ${
                category === t.key
                  ? "bg-brass text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, team..."
            className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
          />
        </div>
      </div>

      {/* Drill-down chip */}
      {lockedFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-brass/10 px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-brass">
            {lockedFilter.kind === "user" ? "User" : "Team"}: {lockedFilter.label}
            <button
              type="button"
              onClick={onClearFilter}
              aria-label="Clear filter"
              className="transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
          <span className="font-sans text-xs text-muted-foreground">
            Showing activity for this {lockedFilter.kind}.
          </span>
        </div>
      )}

      {/* Log */}
      {rows.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border px-4 py-10 text-center font-sans text-sm text-muted-foreground">
          No activity matches these filters yet.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map((group) => (
            <div key={group.day}>
              <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-chip text-muted-foreground">
                {group.day}
              </p>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((row) => (
                  <ActivityItem key={row.id} row={row} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 font-sans text-sm font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-foreground disabled:opacity-50"
          >
            <ChevronDown className="size-4" />
            {pending ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  )
}

function ActivityItem({ row }: { row: ActivityRow }) {
  const meta = categoryMeta(row.category)
  const Icon = meta.icon
  const via = passMethod(row)
  return (
    <li className="flex items-start gap-3 rounded-sm border border-border bg-card/40 px-3 py-2.5">
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background ${meta.tone}`}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-sans text-sm text-foreground">{row.summary}</p>
          {/* How presence at the mark was established. The QR is common to both
              routes, so this names the actual verification, not the scan. */}
          {via && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip ${PASS_METHODS[via].className}`}
              title={PASS_METHODS[via].title}
            >
              {(() => {
                const Glyph = PASS_METHODS[via].icon
                return <Glyph className="size-3" aria-hidden />
              })()}
              {PASS_METHODS[via].label}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-[11px] text-muted-foreground">
          <span className={`font-bold uppercase tracking-chip ${meta.tone}`}>{meta.label}</span>
          <span aria-hidden>·</span>
          <span>{fmtDateTime(row.createdAt)}</span>
          {row.teamName && (
            <>
              <span aria-hidden>·</span>
              <span>
                Team: <span className="text-foreground">{row.teamName}</span>
              </span>
            </>
          )}
          {row.actorName && row.actorName !== row.targetUserName && (
            <>
              <span aria-hidden>·</span>
              <span>
                by <span className="text-foreground">{row.actorName}</span>
              </span>
            </>
          )}
        </p>
      </div>
    </li>
  )
}
