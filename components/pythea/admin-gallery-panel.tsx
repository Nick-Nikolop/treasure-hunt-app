"use client"

// ─────────────────────────────────────────────────────────────────────────
//  The Gallery tab: the COMPLETE photo-proof archive.
//
//  Distinct from the Proofs tab on purpose. Proofs is a work queue - what needs
//  deciding right now, plus the last 20 decisions - so it deliberately hides
//  history. This tab is the opposite: every submission ever filed, never capped,
//  with filtering and grouping to find any of it again. It is read-only; deciding
//  and deleting stay in Proofs so there is exactly one place that mutates.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Camera,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Images,
  Users,
  Mail,
  MapPin,
  Clock,
  BadgeCheck,
  XCircle,
  Inbox,
  ShieldQuestion,
  Navigation,
  LayoutGrid,
  Rows3,
} from "lucide-react"
import { adminListProofGallery, type AdminGalleryProof } from "@/app/admin/actions"

/** How the archive is broken into sections. */
type GroupBy = "none" | "team" | "user" | "lead" | "day"
type StatusFilter = "all" | "pending" | "approved" | "rejected"
type Density = "grid" | "rows"

/** A single photo lifted out of its submission, so the grid can page through all of them. */
type Shot = {
  url: string
  /** Which photo of that submission this is, 1-based, for the caption. */
  n: number
  of: number
  proof: AdminGalleryProof
}

/**
 * The hunt runs on Athens wall-clock, so every stamp here pins that zone rather
 * than inheriting the viewer's. This is not only cosmetic: `dayKey` buckets the
 * "By day" grouping, so reading the date in a non-Athens zone would file proofs
 * submitted near midnight under the WRONG DAY, and the same value would render
 * differently server-side than in the browser.
 *
 * Pinning the zone (not an offset) keeps EET/EEST daylight saving correct.
 */
const ATHENS_TZ = "Europe/Athens"

/** `hourCycle: "h23"` because `hour12: false` renders midnight as "24:00". */
const ATHENS_FULL = new Intl.DateTimeFormat("en-GB", {
  timeZone: ATHENS_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

const ATHENS_DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: ATHENS_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

/**
 * ISO `YYYY-MM-DD` in Athens. `en-CA` is used because it formats as ISO, which
 * sorts correctly as a plain string; `getDate()` and friends would silently read
 * the viewer's zone instead.
 */
const ATHENS_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: ATHENS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function fullStamp(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return ATHENS_FULL.format(t)
}

function dayLabel(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return ATHENS_DAY.format(t)
}

/** Sort key for day groups: newest day first, independent of locale wording. */
function dayKey(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return ATHENS_DAY_KEY.format(t)
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "pending", label: "Pending" },
]

const GROUP_TABS: { key: GroupBy; label: string }[] = [
  { key: "none", label: "Newest" },
  { key: "team", label: "Team" },
  { key: "user", label: "Explorer" },
  { key: "lead", label: "Lead" },
  { key: "day", label: "Day" },
]

export function AdminGalleryPanel() {
  const [proofs, setProofs] = useState<AdminGalleryProof[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [leads, setLeads] = useState<{ order: number; label: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [teamId, setTeamId] = useState<string>("all")
  const [leadOrder, setLeadOrder] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<GroupBy>("none")
  const [density, setDensity] = useState<Density>("grid")

  const [lightbox, setLightbox] = useState<{ shots: Shot[]; index: number } | null>(null)

  const load = useCallback(async () => {
    const data = await adminListProofGallery()
    setProofs(data.proofs)
    setTeams(data.teams)
    setLeads(data.leads)
    setLoaded(true)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Rows surviving every active filter. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return proofs.filter((p) => {
      if (status !== "all" && p.status !== status) return false
      // "Solo" is its own bucket: a crewless explorer has no teamId to match.
      if (teamId === "solo" ? p.teamId !== null : teamId !== "all" && p.teamId !== teamId)
        return false
      if (leadOrder !== "all" && String(p.leadOrder) !== leadOrder) return false
      if (q.length === 0) return true
      // Searched together so one box covers "who", "where" and "why rejected",
      // which is how an admin actually recalls a submission.
      return (
        p.userName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.teamName ?? "solo").toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.countryEn.toLowerCase().includes(q) ||
        (p.note ?? "").toLowerCase().includes(q) ||
        (p.reason ?? "").toLowerCase().includes(q)
      )
    })
  }, [proofs, search, status, teamId, leadOrder])

  /** Every surviving photo, flattened, in the same order the sections render. */
  const shots = useMemo<Shot[]>(
    () =>
      filtered.flatMap((p) =>
        p.photoUrls.map((url, i) => ({ url, n: i + 1, of: p.photoUrls.length, proof: p })),
      ),
    [filtered],
  )

  /** The filtered archive split into titled sections. */
  const sections = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", title: "", sub: "", items: filtered }]

    const buckets = new Map<string, { title: string; sub: string; items: AdminGalleryProof[] }>()
    for (const p of filtered) {
      let key: string
      let title: string
      let sub: string
      if (groupBy === "team") {
        key = p.teamId ?? "solo"
        title = p.teamName ?? "Solo explorers"
        sub = p.teamId ? "Crew" : "No crew"
      } else if (groupBy === "user") {
        key = p.userId
        title = p.userName
        sub = p.email
      } else if (groupBy === "lead") {
        key = String(p.leadOrder)
        title = p.country
        sub = p.countryEn === p.country ? "" : p.countryEn
      } else {
        key = dayKey(p.createdAt)
        title = dayLabel(p.createdAt)
        sub = ""
      }
      const b = buckets.get(key)
      if (b) b.items.push(p)
      else buckets.set(key, { title, sub, items: [p] })
    }

    const out = [...buckets.entries()].map(([key, v]) => ({ key, ...v }))
    // Day groups read newest-first (the rows already arrive that way); the rest
    // are alphabetical, which is how you scan for a name you half remember.
    if (groupBy === "day") return out.sort((a, b) => b.key.localeCompare(a.key))
    if (groupBy === "lead") return out.sort((a, b) => Number(a.key) - Number(b.key))
    return out.sort((a, b) => a.title.localeCompare(b.title))
  }, [filtered, groupBy])

  const openShot = useCallback(
    (url: string) => {
      const i = shots.findIndex((s) => s.url === url)
      setLightbox({ shots, index: i < 0 ? 0 : i })
    },
    [shots],
  )

  // Arrow keys page the lightbox; Escape closes it. Bound while it is open only.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
      else if (e.key === "ArrowLeft")
        setLightbox((lb) =>
          lb ? { ...lb, index: (lb.index - 1 + lb.shots.length) % lb.shots.length } : lb,
        )
      else if (e.key === "ArrowRight")
        setLightbox((lb) => (lb ? { ...lb, index: (lb.index + 1) % lb.shots.length } : lb))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  const activeFilters =
    (search.trim().length > 0 ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (teamId !== "all" ? 1 : 0) +
    (leadOrder !== "all" ? 1 : 0)

  const clearAll = () => {
    setSearch("")
    setStatus("all")
    setTeamId("all")
    setLeadOrder("all")
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="font-sans text-sm">Loading the archive…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Totals. Photo count is what the eye is looking for here, not row count. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={Images} label="Photos" value={shots.length} />
        <Stat icon={Camera} label="Submissions" value={filtered.length} />
        <Stat icon={Users} label="Crews" value={teams.length} />
        <Stat icon={MapPin} label="Leads" value={leads.length} />
      </div>

      {/* Names the zone once, rather than stamping an abbreviation onto every row
          that would also have to flip EET/EEST twice a year. */}
      <p className="font-sans text-[10px] tracking-chip text-muted-foreground/40">
        ALL TIMES IN ATHENS TIME (EUROPE/ATHENS)
      </p>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full overflow-x-auto rounded-sm border border-border p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatus(t.key)}
                className={`shrink-0 rounded-sm px-3 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors ${
                  status === t.key
                    ? "bg-brass text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, team, lead, note…"
              className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-3 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              label="Team"
              value={teamId}
              onChange={setTeamId}
              options={[
                { value: "all", label: "All teams" },
                { value: "solo", label: "Solo explorers" },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <Select
              label="Lead"
              value={leadOrder}
              onChange={setLeadOrder}
              options={[
                { value: "all", label: "All leads" },
                ...leads.map((l) => ({ value: String(l.order), label: l.label })),
              ]}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-xs tracking-chip text-muted-foreground">Group</span>
              <div className="flex overflow-x-auto rounded-sm border border-border p-1">
                {GROUP_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setGroupBy(t.key)}
                    className={`shrink-0 rounded-sm px-2.5 py-1 font-sans text-xs font-bold tracking-chip transition-colors ${
                      groupBy === t.key
                        ? "bg-brass text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-brass/10 px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:border-brass"
              >
                Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
                <X className="size-3.5" />
              </button>
            )}
            <div className="flex rounded-sm border border-border p-1">
              <button
                type="button"
                onClick={() => setDensity("grid")}
                aria-label="Photo grid"
                aria-pressed={density === "grid"}
                className={`rounded-sm p-1.5 transition-colors ${
                  density === "grid"
                    ? "bg-brass text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDensity("rows")}
                aria-label="Detailed rows"
                aria-pressed={density === "rows"}
                className={`rounded-sm p-1.5 transition-colors ${
                  density === "rows"
                    ? "bg-brass text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Rows3 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Archive */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-border py-16 text-center">
          <Inbox className="size-6 text-muted-foreground" />
          <p className="font-sans text-sm text-muted-foreground">
            {proofs.length === 0
              ? "No photo proofs have been filed yet."
              : "No submissions match these filters."}
          </p>
          {proofs.length > 0 && activeFilters > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="font-sans text-xs font-bold tracking-chip text-brass hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <section key={s.key} className="flex flex-col gap-3">
              {s.title && (
                <header className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-base font-black text-foreground">
                      {s.title}
                    </h3>
                    {s.sub && (
                      <p className="truncate font-sans text-xs text-muted-foreground">{s.sub}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-sans text-xs tracking-chip text-muted-foreground">
                    {s.items.reduce((n, p) => n + p.photoCount, 0)} photo
                    {s.items.reduce((n, p) => n + p.photoCount, 0) === 1 ? "" : "s"}
                  </span>
                </header>
              )}

              {density === "grid" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {s.items.flatMap((p) =>
                    p.photoUrls.map((url, i) => (
                      <PhotoTile
                        key={`${p.id}-${i}`}
                        url={url}
                        proof={p}
                        n={i + 1}
                        of={p.photoUrls.length}
                        onOpen={() => openShot(url)}
                      />
                    )),
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {s.items.map((p) => (
                    <ProofRowCard key={p.id} proof={p} onOpen={openShot} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Lightbox. Pages across every filtered photo, not just one submission's,
          so arrowing through the archive works like a photo roll. */}
      <AnimatePresence>
        {lightbox && lightbox.shots[lightbox.index] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLightbox(null)}
              className="absolute inset-0 cursor-default bg-background/95 backdrop-blur-sm"
            />
            <div className="relative z-10 flex max-h-full w-full max-w-4xl flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.shots[lightbox.index].url || "/placeholder.svg"}
                alt={`Proof by ${lightbox.shots[lightbox.index].proof.userName}`}
                className="max-h-[72vh] w-auto rounded-sm border border-border object-contain"
              />

              <div className="mt-4 w-full max-w-2xl rounded-sm border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-sm font-black text-foreground">
                      {lightbox.shots[lightbox.index].proof.userName}
                    </p>
                    <p className="truncate font-sans text-xs text-muted-foreground">
                      {lightbox.shots[lightbox.index].proof.email}
                    </p>
                  </div>
                  <StatusChip status={lightbox.shots[lightbox.index].proof.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {lightbox.shots[lightbox.index].proof.teamName ?? "Solo"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {lightbox.shots[lightbox.index].proof.country}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {fullStamp(lightbox.shots[lightbox.index].proof.createdAt)}
                  </span>
                  <ContextChip context={lightbox.shots[lightbox.index].proof.context} />
                </div>
                {lightbox.shots[lightbox.index].proof.note && (
                  <p className="mt-2 border-t border-border pt-2 font-sans text-xs leading-relaxed text-foreground">
                    {lightbox.shots[lightbox.index].proof.note}
                  </p>
                )}
                {lightbox.shots[lightbox.index].proof.reason && (
                  <p className="mt-2 border-t border-border pt-2 font-sans text-xs leading-relaxed text-destructive">
                    Rejected: {lightbox.shots[lightbox.index].proof.reason}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() =>
                    setLightbox((lb) =>
                      lb
                        ? { ...lb, index: (lb.index - 1 + lb.shots.length) % lb.shots.length }
                        : lb,
                    )
                  }
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="font-sans text-xs tracking-chip text-muted-foreground">
                  {lightbox.index + 1} / {lightbox.shots.length}
                </span>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() =>
                    setLightbox((lb) =>
                      lb ? { ...lb, index: (lb.index + 1) % lb.shots.length } : lb,
                    )
                  }
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  <ChevronRight className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="ml-2 flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Camera
  label: string
  value: number
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 font-sans text-xs tracking-chip text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 font-serif text-2xl font-black leading-none text-foreground tabular-nums">
        {value}
      </p>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-sans text-xs tracking-chip text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[11rem] truncate rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs font-bold text-foreground outline-none transition-colors focus:border-brass"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatusChip({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] font-black tracking-chip text-emerald-500">
        <BadgeCheck className="size-3" />
        APPROVED
      </span>
    )
  if (status === "rejected")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-sans text-[10px] font-black tracking-chip text-destructive">
        <XCircle className="size-3" />
        REJECTED
      </span>
    )
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-brass/40 bg-brass/10 px-2 py-0.5 font-sans text-[10px] font-black tracking-chip text-brass">
      <Clock className="size-3" />
      PENDING
    </span>
  )
}

/** Why the explorer had to upload photos instead of passing the GPS gate. */
function ContextChip({ context }: { context: string }) {
  const denied = context === "denied"
  return (
    <span className="inline-flex items-center gap-1">
      {denied ? <ShieldQuestion className="size-3.5" /> : <Navigation className="size-3.5" />}
      {denied ? "Location denied" : "Too far"}
    </span>
  )
}

function PhotoTile({
  url,
  proof,
  n,
  of,
  onOpen,
}: {
  url: string
  proof: AdminGalleryProof
  n: number
  of: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      // Grid tiles are thumbnails with no room for a full stamp, so the exact
      // Athens times ride along as a tooltip; the rows density and the lightbox
      // both show them outright.
      title={`${proof.userName} · ${proof.country}\nSent ${fullStamp(proof.createdAt)}${
        proof.decidedAt ? `\nReviewed ${fullStamp(proof.decidedAt)}` : ""
      }`}
      className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-background transition-colors hover:border-brass"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url || "/placeholder.svg"}
        alt={`Proof by ${proof.userName} for ${proof.country}`}
        loading="lazy"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Identity is burned into the tile so the grid is scannable without
          opening anything, which is the whole point of the grid density. */}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-background/95 to-transparent p-2 text-left">
        <span className="truncate font-sans text-[11px] font-bold text-foreground">
          {proof.userName}
        </span>
        <span className="truncate font-sans text-[10px] text-muted-foreground">
          {proof.teamName ?? "Solo"} · {proof.country}
        </span>
      </span>
      <span className="absolute right-1.5 top-1.5 flex items-center gap-1">
        {of > 1 && (
          <span className="rounded-sm bg-background/85 px-1.5 py-0.5 font-sans text-[10px] font-black tabular-nums text-muted-foreground">
            {n}/{of}
          </span>
        )}
        <StatusDot status={proof.status} />
      </span>
    </button>
  )
}

/** Compact status marker for the grid, where a full chip would crowd the tile. */
function StatusDot({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-emerald-500"
      : status === "rejected"
        ? "bg-destructive"
        : "bg-brass"
  return <span className={`size-2 rounded-full ring-2 ring-background ${cls}`} title={status} />
}

function ProofRowCard({
  proof,
  onOpen,
}: {
  proof: AdminGalleryProof
  onOpen: (url: string) => void
}) {
  return (
    <article className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3 sm:flex-row">
      <div className="flex shrink-0 gap-2">
        {proof.photoUrls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(url)}
            className="size-20 overflow-hidden rounded-sm border border-border transition-colors hover:border-brass"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url || "/placeholder.svg"}
              alt={`Proof ${i + 1} by ${proof.userName}`}
              loading="lazy"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate font-serif text-sm font-black text-foreground">
            {proof.userName}
          </p>
          <StatusChip status={proof.status} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3.5" />
            {proof.email}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {proof.teamName ?? "Solo"}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {proof.country}
          </span>
          {/* `fullStamp` already carries the time to the second, so the old
              trailing `clockTime` here only repeated it. */}
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock className="size-3.5" />
            <span className="font-bold tracking-chip text-muted-foreground/50">SENT</span>
            <span className="tabular-nums">{fullStamp(proof.createdAt)}</span>
          </span>
          <ContextChip context={proof.context} />
        </div>
        {proof.note && (
          <p className="mt-2 font-sans text-xs leading-relaxed text-foreground">{proof.note}</p>
        )}
        {proof.reason && (
          <p className="mt-1 font-sans text-xs leading-relaxed text-destructive">
            Rejected: {proof.reason}
          </p>
        )}
        {/* Keyed off status, not `reviewerName`: a decided proof missing the
            reviewer's name would otherwise hide its review time entirely, which is
            the one fact this line exists to record. */}
        {proof.status !== "pending" && (
          <p className="mt-1 font-sans text-[11px] text-muted-foreground">
            <span className="font-bold tracking-chip text-muted-foreground/50">REVIEWED </span>
            {proof.decidedAt ? (
              <span className="tabular-nums">{fullStamp(proof.decidedAt)}</span>
            ) : (
              <span className="italic text-muted-foreground/50">time not recorded</span>
            )}
            {proof.reviewerName ? ` · by ${proof.reviewerName}` : ""}
          </p>
        )}
      </div>
    </article>
  )
}
