"use client"

// ─────────────────────────────────────────────────────────────────────────
//  The Gallery tab: the COMPLETE photo-proof archive.
//
//  Distinct from the Proofs tab on purpose. Proofs is a work queue - what needs
//  deciding right now, plus the last 20 decisions - so it deliberately hides
//  history. This tab is the opposite: every submission ever filed, never capped,
//  with filtering and grouping to find any of it again. It never decides or
//  deletes: those stay in Proofs so exactly one place mutates. It DOES download,
//  which reads nothing but Blob storage.
//
//  PERFORMANCE IS THE WHOLE STORY HERE. The archive is ~400 phone originals of
//  roughly 4 MB each. Pointing tiles at those originals asked the browser for well
//  over a gigabyte to paint 150 px squares, which is what made this tab "bug ugly
//  and sometimes not even open the images". Two rules keep it quick, and both must
//  survive future edits:
//
//    1. A grid tile NEVER loads an original. It loads a resized copy from
//       /api/admin-proof-thumb (~17 KB instead of 4 MB).
//    2. An <img> is only created once it is close to the viewport, so scrolling
//       pays for what it shows instead of firing 400 requests on mount.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  Download,
  CheckSquare,
  Square,
  RotateCw,
  ImageOff,
  FileArchive,
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

/** Width presets the thumbnail route accepts. Anything else is coerced to 480 there. */
const THUMB_GRID = 480
const THUMB_ROW = 160
const THUMB_LIGHTBOX = 960

function thumbSrc(url: string, w: number): string {
  return `/api/admin-proof-thumb?w=${w}&u=${encodeURIComponent(url)}`
}

/**
 * Filenames for downloads.
 *
 * Deliberately reduced to ASCII. Explorer names here are usually Greek, and a zip
 * entry with non-ASCII bytes is still mangled by some desktop unzippers, so the
 * archive would arrive full of unreadable names. The English lead name and the
 * Athens date keep each file identifiable without them.
 */
function asciiSlug(raw: string): string {
  const stripped = raw
    .normalize("NFD")
    // Drop combining accents, so "Ορτίλοχος" and "Renée" both survive as letters.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return stripped.length > 0 ? stripped : "explorer"
}

/** Keep whatever extension Blob stored, defaulting to jpg. */
function extOf(url: string): string {
  const m = /\.([a-z0-9]{3,4})(?:$|\?)/i.exec(url)
  return m ? m[1].toLowerCase() : "jpg"
}

function fileNameFor(shot: Shot): string {
  const who = asciiSlug(shot.proof.userName)
  const where = asciiSlug(shot.proof.countryEn || shot.proof.country)
  const when = dayKey(shot.proof.createdAt)
  const which = shot.of > 1 ? `-${shot.n}` : ""
  return `${who}-${where}-${when}${which}.${extOf(shot.url)}`
}

export function AdminGalleryPanel() {
  const [proofs, setProofs] = useState<AdminGalleryProof[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [leads, setLeads] = useState<{ order: number; label: string }[]>([])
  const [loaded, setLoaded] = useState(false)
  /** The archive query itself can fail; without this the tab sat on a spinner forever. */
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [teamId, setTeamId] = useState<string>("all")
  const [leadOrder, setLeadOrder] = useState<string>("all")
  const [groupBy, setGroupBy] = useState<GroupBy>("none")
  const [density, setDensity] = useState<Density>("grid")

  const [lightbox, setLightbox] = useState<{ shots: Shot[]; index: number } | null>(null)

  /** Selection is by URL: the archive has no duplicate photo URLs, so it is a safe key. */
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [zipping, setZipping] = useState(false)
  const [downloadingOne, setDownloadingOne] = useState<string | null>(null)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await adminListProofGallery()
      setProofs(data.proofs)
      setTeams(data.teams)
      setLeads(data.leads)
    } catch {
      setLoadError("The archive could not be loaded.")
    } finally {
      // Always flips, so a failure shows the retry instead of an endless spinner.
      setLoaded(true)
    }
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

  /**
   * Every surviving photo, flattened IN SECTION ORDER.
   *
   * Derived from `sections` rather than `filtered` on purpose: while a grouping is
   * active those two orders differ, so building the roll from `filtered` made the
   * lightbox arrows jump somewhere other than the neighbouring tile on screen.
   */
  const shots = useMemo<Shot[]>(
    () =>
      sections.flatMap((s) =>
        s.items.flatMap((p) =>
          p.photoUrls.map((url, i) => ({ url, n: i + 1, of: p.photoUrls.length, proof: p })),
        ),
      ),
    [sections],
  )

  /** O(1) url -> position in the roll, so opening a tile cannot mis-seek. */
  const shotIndex = useMemo(() => {
    const m = new Map<string, number>()
    shots.forEach((s, i) => m.set(s.url, i))
    return m
  }, [shots])

  const openShot = useCallback(
    (url: string) => {
      setLightbox({ shots, index: shotIndex.get(url) ?? 0 })
    },
    [shots, shotIndex],
  )

  const toggleOne = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }, [])

  /** Selecting is only meaningful over what the filters currently show. */
  const selectAllShown = useCallback(() => {
    setSelected(new Set(shots.map((s) => s.url)))
  }, [shots])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  /**
   * One photo, straight to disk.
   *
   * The bytes are fetched and re-offered as an object URL because `<a download>` is
   * IGNORED for cross-origin targets - Blob lives on another host, so linking
   * directly would just navigate to the image instead of saving it. Blob answers
   * with `access-control-allow-origin: *`, which is what makes the fetch legal.
   */
  const downloadOne = useCallback(async (shot: Shot) => {
    setDownloadingOne(shot.url)
    setDownloadNote(null)
    try {
      const res = await fetch(shot.url)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = fileNameFor(shot)
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoked on a delay: dropping it in the same tick cancels the save in
      // some browsers before they have read the blob.
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000)
    } catch {
      setDownloadNote("That photo could not be downloaded. It may no longer be in storage.")
    } finally {
      setDownloadingOne(null)
    }
  }, [])

  /**
   * The selection as one zip, built by /api/admin-proof-zip.
   *
   * Submitted as a real form into a hidden iframe rather than fetched, so the
   * browser streams the archive to disk instead of holding all of it in memory,
   * and a server-side failure renders in the invisible frame instead of replacing
   * this page.
   */
  const downloadSelected = useCallback(() => {
    const chosen = shots.filter((s) => selected.has(s.url))
    if (chosen.length === 0) return

    setZipping(true)
    setDownloadNote(null)
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/api/admin-proof-zip"
    form.target = "proof-zip-sink"
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = "files"
    input.value = JSON.stringify(
      chosen.map((s) => ({ url: s.url, name: fileNameFor(s) })),
    )
    form.appendChild(input)
    document.body.appendChild(form)
    form.submit()
    form.remove()

    // There is no completion event for an iframe download, so the button unlocks
    // on a timer and says so, rather than pretending to track progress.
    window.setTimeout(() => setZipping(false), 4000)
  }, [shots, selected])

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

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-16 text-center">
        <ImageOff className="size-6 text-muted-foreground" />
        <p className="font-sans text-sm text-muted-foreground">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-brass/10 px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:border-brass"
        >
          <RotateCw className="size-3.5" />
          Try again
        </button>
      </div>
    )
  }

  const selectedCount = selected.size

  return (
    <div className="flex flex-col gap-4">
      {/* Where the streamed zip lands. Kept mounted so a download in flight is
          never interrupted by a re-render. */}
      <iframe name="proof-zip-sink" title="Download target" className="hidden" />

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

        {/* Selection bar. Its own row so the controls above never reflow when the
            counts appear. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              setSelecting((s) => !s)
              // Leaving select mode drops the selection, so a stale set cannot be
              // downloaded later by surprise.
              if (selecting) clearSelection()
            }}
            aria-pressed={selecting}
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip transition-colors ${
              selecting
                ? "border-brass bg-brass text-background"
                : "border-border text-muted-foreground hover:border-brass hover:text-brass"
            }`}
          >
            {selecting ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
            {selecting ? "Selecting" : "Select"}
          </button>

          {selecting && (
            <>
              <span className="font-sans text-xs tracking-chip text-muted-foreground tabular-nums">
                {selectedCount} of {shots.length} selected
              </span>
              <button
                type="button"
                onClick={selectAllShown}
                disabled={shots.length === 0 || selectedCount === shots.length}
                className="rounded-sm border border-border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select all shown
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedCount === 0}
                className="rounded-sm border border-border px-2.5 py-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={downloadSelected}
                disabled={selectedCount === 0 || zipping}
                className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-brass/10 px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:border-brass disabled:cursor-not-allowed disabled:opacity-40"
              >
                {zipping ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileArchive className="size-3.5" />
                )}
                {zipping ? "Preparing zip…" : `Download ${selectedCount || ""} as zip`}
              </button>
            </>
          )}

          {!selecting && (
            <span className="font-sans text-xs text-muted-foreground">
              Turn on Select to pick photos and download them together. Every tile can also be
              downloaded on its own.
            </span>
          )}
        </div>

        {downloadNote && (
          <p className="font-sans text-xs text-destructive" role="status">
            {downloadNote}
          </p>
        )}
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
                        selecting={selecting}
                        isSelected={selected.has(url)}
                        busy={downloadingOne === url}
                        onOpen={() => openShot(url)}
                        onToggle={() => toggleOne(url)}
                        onDownload={() =>
                          void downloadOne({ url, n: i + 1, of: p.photoUrls.length, proof: p })
                        }
                      />
                    )),
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {s.items.map((p) => (
                    <ProofRowCard
                      key={p.id}
                      proof={p}
                      selecting={selecting}
                      selected={selected}
                      busyUrl={downloadingOne}
                      onOpen={openShot}
                      onToggle={toggleOne}
                      onDownload={downloadOne}
                    />
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
          <Lightbox
            shot={lightbox.shots[lightbox.index]}
            index={lightbox.index}
            total={lightbox.shots.length}
            busy={downloadingOne === lightbox.shots[lightbox.index].url}
            onDownload={() => void downloadOne(lightbox.shots[lightbox.index])}
            onClose={() => setLightbox(null)}
            onPrev={() =>
              setLightbox((lb) =>
                lb ? { ...lb, index: (lb.index - 1 + lb.shots.length) % lb.shots.length } : lb,
              )
            }
            onNext={() =>
              setLightbox((lb) => (lb ? { ...lb, index: (lb.index + 1) % lb.shots.length } : lb))
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * An archive photo that loads politely.
 *
 * Three things this fixes, all of which the tab used to get wrong:
 *   - it waits until it is near the viewport before requesting anything, so
 *     opening the tab no longer fires hundreds of requests at once;
 *   - it shows a skeleton while loading instead of an empty frame, which is what
 *     made a slow photo look like a broken one;
 *   - if the resize fails it retries the ORIGINAL once before giving up, so a
 *     thumbnail problem can never hide a photo that is perfectly fine.
 */
function ProofImage({
  url,
  width,
  alt,
  className,
}: {
  url: string
  width: number
  alt: string
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")
  /** Bumped to force a fresh request when the admin presses retry. */
  const [attempt, setAttempt] = useState(0)
  /** After a thumbnail failure the original is tried once, unresized. */
  const [useOriginal, setUseOriginal] = useState(false)

  useEffect(() => {
    const node = hostRef.current
    if (!node || inView) return
    // A generous margin so images are ready by the time they scroll in, without
    // reaching so far that the whole archive counts as visible.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true)
      },
      { rootMargin: "300px" },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [inView])

  const src = useOriginal ? url : thumbSrc(url, width)

  return (
    <div ref={hostRef} className={`relative size-full overflow-hidden bg-muted/40 ${className ?? ""}`}>
      {inView && state !== "error" && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={`${src}-${attempt}`}
          src={src || "/placeholder.svg"}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`size-full object-cover transition-opacity duration-200 ${
            state === "ok" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setState("ok")}
          onError={() => {
            if (!useOriginal) {
              // The resize failed; the photo itself may still be there.
              setUseOriginal(true)
              setState("loading")
            } else {
              setState("error")
            }
          }}
        />
      )}

      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-full animate-pulse bg-muted/60" />
          <Loader2 className="absolute size-4 animate-spin text-muted-foreground/60" />
        </div>
      )}

      {state === "error" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setUseOriginal(false)
            setState("loading")
            setAttempt((a) => a + 1)
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-brass"
          title="This photo did not load. Click to try again."
        >
          <ImageOff className="size-4" />
          <span className="font-sans text-[10px] font-bold tracking-chip">RETRY</span>
        </button>
      )}
    </div>
  )
}

/** The full-size view, with its own loading and error handling. */
function Lightbox({
  shot,
  index,
  total,
  busy,
  onDownload,
  onClose,
  onPrev,
  onNext,
}: {
  shot: Shot
  index: number
  total: number
  busy: boolean
  onDownload: () => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading")
  const [attempt, setAttempt] = useState(0)

  // Every new photo starts out loading again, otherwise the previous one's "ok"
  // would claim the next original had already arrived.
  useEffect(() => {
    setState("loading")
    setAttempt(0)
  }, [shot.url])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/95 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-full w-full max-w-4xl flex-col items-center overflow-y-auto">
        <div className="relative flex min-h-[40vh] w-full items-center justify-center">
          {/* The already-cached thumbnail sits underneath so the frame is filled the
              instant it opens. The multi-megabyte original then fades in over it -
              previously this space stayed blank while it downloaded, which read as
              "the image will not open". */}
          {state !== "ok" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumbSrc(shot.url, THUMB_LIGHTBOX) || "/placeholder.svg"}
              alt=""
              aria-hidden="true"
              className="max-h-[72vh] w-auto rounded-sm border border-border object-contain opacity-60 blur-[1px]"
            />
          )}

          {state !== "error" && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${shot.url}-${attempt}`}
              src={shot.url || "/placeholder.svg"}
              alt={`Proof by ${shot.proof.userName}`}
              decoding="async"
              className={`max-h-[72vh] w-auto rounded-sm border border-border object-contain ${
                state === "ok" ? "" : "absolute inset-0 m-auto opacity-0"
              }`}
              onLoad={() => setState("ok")}
              onError={() => setState("error")}
            />
          )}

          {state === "loading" && (
            <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-sm bg-background/90 px-2.5 py-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              LOADING FULL SIZE
            </span>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-border p-8 text-center">
              <ImageOff className="size-6 text-muted-foreground" />
              <p className="font-sans text-sm text-muted-foreground">
                This photo could not be opened.
              </p>
              <button
                type="button"
                onClick={() => {
                  setState("loading")
                  setAttempt((a) => a + 1)
                }}
                className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-brass/10 px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:border-brass"
              >
                <RotateCw className="size-3.5" />
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 w-full max-w-2xl rounded-sm border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-black text-foreground">
                {shot.proof.userName}
              </p>
              <p className="truncate font-sans text-xs text-muted-foreground">{shot.proof.email}</p>
            </div>
            <StatusChip status={shot.proof.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {shot.proof.teamName ?? "Solo"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {shot.proof.country}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {fullStamp(shot.proof.createdAt)}
            </span>
            <ContextChip context={shot.proof.context} />
          </div>
          {shot.proof.note && (
            <p className="mt-2 border-t border-border pt-2 font-sans text-xs leading-relaxed text-foreground">
              {shot.proof.note}
            </p>
          )}
          {shot.proof.reason && (
            <p className="mt-2 border-t border-border pt-2 font-sans text-xs leading-relaxed text-destructive">
              Rejected: {shot.proof.reason}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous"
            onClick={onPrev}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="font-sans text-xs tracking-chip text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            aria-label="Next"
            onClick={onNext}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 font-sans text-xs font-bold tracking-chip text-brass transition-colors hover:border-brass disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {busy ? "Saving…" : "Download"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </motion.div>
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
  selecting,
  isSelected,
  busy,
  onOpen,
  onToggle,
  onDownload,
}: {
  url: string
  proof: AdminGalleryProof
  n: number
  of: number
  selecting: boolean
  isSelected: boolean
  busy: boolean
  onOpen: () => void
  onToggle: () => void
  onDownload: () => void
}) {
  return (
    // A div, not a button: the tile now holds its own download button, and nesting
    // a button inside a button is invalid HTML and breaks click handling.
    <div
      role="button"
      tabIndex={0}
      // In select mode the whole tile toggles, which is what makes picking a run of
      // photos quick; otherwise it opens.
      onClick={selecting ? onToggle : onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (selecting) onToggle()
          else onOpen()
        }
      }}
      // Grid tiles are thumbnails with no room for a full stamp, so the exact
      // Athens times ride along as a tooltip; the rows density and the lightbox
      // both show them outright.
      title={`${proof.userName} · ${proof.country}\nSent ${fullStamp(proof.createdAt)}${
        proof.decidedAt ? `\nReviewed ${fullStamp(proof.decidedAt)}` : ""
      }`}
      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-sm border bg-background transition-colors ${
        isSelected ? "border-brass ring-2 ring-brass/50" : "border-border hover:border-brass"
      }`}
    >
      <ProofImage
        url={url}
        width={THUMB_GRID}
        alt={`Proof by ${proof.userName} for ${proof.country}`}
        className="transition-transform duration-300 group-hover:scale-105"
      />

      {/* Identity is burned into the tile so the grid is scannable without
          opening anything, which is the whole point of the grid density. */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-background/95 to-transparent p-2 text-left">
        <span className="truncate font-sans text-[11px] font-bold text-foreground">
          {proof.userName}
        </span>
        <span className="truncate font-sans text-[10px] text-muted-foreground">
          {proof.teamName ?? "Solo"} · {proof.country}
        </span>
      </span>

      <span className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1">
        {of > 1 && (
          <span className="rounded-sm bg-background/85 px-1.5 py-0.5 font-sans text-[10px] font-black tabular-nums text-muted-foreground">
            {n}/{of}
          </span>
        )}
        <StatusDot status={proof.status} />
      </span>

      {/* Selection marker. Always visible in select mode so it is obvious which
          tiles are picked without hovering each one. */}
      {selecting && (
        <span
          className={`pointer-events-none absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-sm border ${
            isSelected
              ? "border-brass bg-brass text-background"
              : "border-border bg-background/85 text-muted-foreground"
          }`}
        >
          {isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
        </span>
      )}

      {/* Per-photo download. Hidden while selecting so it cannot be hit by accident
          when the tile's job is to toggle. */}
      {!selecting && (
        <button
          type="button"
          onClick={(e) => {
            // Without this the tile's own click would open the lightbox too.
            e.stopPropagation()
            onDownload()
          }}
          disabled={busy}
          aria-label={`Download photo by ${proof.userName}`}
          title="Download this photo"
          className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-sm border border-border bg-background/90 text-muted-foreground opacity-0 transition-all hover:border-brass hover:text-brass focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
        </button>
      )}
    </div>
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
  selecting,
  selected,
  busyUrl,
  onOpen,
  onToggle,
  onDownload,
}: {
  proof: AdminGalleryProof
  selecting: boolean
  selected: Set<string>
  busyUrl: string | null
  onOpen: (url: string) => void
  onToggle: (url: string) => void
  onDownload: (shot: Shot) => void
}) {
  return (
    <article className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3 sm:flex-row">
      <div className="flex shrink-0 flex-wrap gap-2">
        {proof.photoUrls.map((url, i) => {
          const isSelected = selected.has(url)
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                role="button"
                tabIndex={0}
                onClick={() => (selecting ? onToggle(url) : onOpen(url))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    if (selecting) onToggle(url)
                    else onOpen(url)
                  }
                }}
                className={`relative size-20 cursor-pointer overflow-hidden rounded-sm border transition-colors ${
                  isSelected ? "border-brass ring-2 ring-brass/50" : "border-border hover:border-brass"
                }`}
              >
                <ProofImage
                  url={url}
                  width={THUMB_ROW}
                  alt={`Proof ${i + 1} by ${proof.userName}`}
                />
                {selecting && (
                  <span
                    className={`pointer-events-none absolute left-1 top-1 flex size-5 items-center justify-center rounded-sm border ${
                      isSelected
                        ? "border-brass bg-brass text-background"
                        : "border-border bg-background/85 text-muted-foreground"
                    }`}
                  >
                    {isSelected ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
                  </span>
                )}
              </div>
              {!selecting && (
                <button
                  type="button"
                  onClick={() =>
                    onDownload({ url, n: i + 1, of: proof.photoUrls.length, proof })
                  }
                  disabled={busyUrl === url}
                  className="inline-flex items-center gap-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass disabled:opacity-50"
                  title="Download this photo"
                >
                  {busyUrl === url ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  SAVE
                </button>
              )}
            </div>
          )
        })}
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
