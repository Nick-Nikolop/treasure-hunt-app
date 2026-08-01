"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Camera,
  Check,
  X,
  MapPin,
  Navigation,
  ShieldQuestion,
  Loader2,
  BadgeCheck,
  XCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Square,
  CheckSquare,
  Lock,
  ArrowDown,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react"
import {
  adminListProofs,
  adminDecideProof,
  adminDeleteProofs,
  type AdminProofRow,
} from "@/app/admin/actions"
import { finaleOrderLabel } from "@/lib/clues"

const POLL_MS = 8000

/**
 * How many decided proofs to reveal per "show more".
 *
 * Duplicated from the server action rather than imported, because a
 * `"use server"` module can only export async functions. The server clamps to its
 * own copy as the floor, so the two agreeing is a nicety, not a correctness
 * requirement: a mismatch changes the step size, never the safety of the query.
 */
const PROOF_HISTORY_PAGE = 10

function timeAgo(d: Date | string): string {
  const then = typeof d === "string" ? new Date(d) : d
  const s = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** "1st", "2nd", "3rd", "4th"… for phrasing which lead a proof is for. */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

/**
 * How far apart two submissions were, down to the second, because two crews
 * racing to the same lead are often only seconds apart and that gap is exactly
 * what decides who was there first.
 */
function gapLabel(later: Date | string, earlier: Date | string): string {
  const a = typeof later === "string" ? new Date(later) : later
  const b = typeof earlier === "string" ? new Date(earlier) : earlier
  const s = Math.max(0, Math.round((a.getTime() - b.getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 === 0 ? `${m}m` : `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return m % 60 === 0 ? `${h}h` : `${h}h ${m % 60}m`
}

/**
 * The hunt runs on Athens wall-clock, so that is the only zone these stamps may
 * be read in. Every formatter below pins it explicitly rather than letting
 * `Intl` fall back to the viewer's zone: an admin reviewing from another country
 * would otherwise audit a race using times shifted by hours, and the same value
 * would render differently on the server than in the browser.
 *
 * Pinning the zone (rather than hardcoding an offset) also keeps EET/EEST
 * daylight saving correct for free.
 */
const ATHENS_TZ = "Europe/Athens"

/**
 * `hourCycle: "h23"` rather than `hour12: false`, which renders midnight as
 * "24:00:00" in en-GB on some engines.
 */
const ATHENS_STAMP = new Intl.DateTimeFormat("en-GB", {
  timeZone: ATHENS_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

const ATHENS_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: ATHENS_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

/** Full Athens date + time to the second, for the audit trail. */
function athensStamp(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return ATHENS_STAMP.format(t)
}

/** Exact clock time, so the admin can audit the order rather than trust it. */
function clockTime(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return ATHENS_CLOCK.format(t)
}

/**
 * One labelled timestamp. `at` is nullable because a decided row could in
 * principle carry no `decidedAt`, and inventing a date for it would corrupt the
 * very audit trail this is here to provide.
 */
function Stamp({ label, at }: { label: string; at: Date | string | null }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="font-bold tracking-chip text-muted-foreground/50">{label}</span>
      {at ? (
        <span className="tabular-nums text-muted-foreground/80">{athensStamp(at)}</span>
      ) : (
        <span className="italic text-muted-foreground/40">not recorded</span>
      )}
    </span>
  )
}

type QueueInfo = {
  /** True when this proof is at the front of its lead's queue (decidable). */
  first: boolean
  /** The proof it must wait for, when it is not first. */
  waitingFor: AdminProofRow | null
  /** Position within this lead's queue, 1-based. */
  place: number
  /** How many pending proofs this lead has in total. */
  total: number
}

/**
 * Work out each lead's review order. `pending` arrives oldest-first from the
 * server, so the first row seen for a lead is that lead's front of queue; the
 * rest are locked behind it until it has been decided.
 */
function buildQueue(pending: AdminProofRow[]): Map<string, QueueInfo> {
  const byLead = new Map<number, AdminProofRow[]>()
  for (const p of pending) {
    const list = byLead.get(p.leadOrder)
    if (list) list.push(p)
    else byLead.set(p.leadOrder, [p])
  }
  const out = new Map<string, QueueInfo>()
  for (const list of byLead.values()) {
    list.forEach((p, i) => {
      out.set(p.id, {
        first: i === 0,
        waitingFor: i === 0 ? null : list[0],
        place: i + 1,
        total: list.length,
      })
    })
  }
  return out
}

type Lightbox = { urls: string[]; index: number } | null

// --- Decided-history filter / sort vocabulary. ---
type StatusFilter = "all" | "approved" | "rejected"
type ContextFilter = "all" | "too_far" | "location_denied"
type SortKey =
  | "decided_desc"
  | "decided_asc"
  | "sent_desc"
  | "sent_asc"
  | "name_asc"
  | "lead_asc"

const SORT_LABELS: Record<SortKey, string> = {
  decided_desc: "Reviewed · newest",
  decided_asc: "Reviewed · oldest",
  sent_desc: "Sent · newest",
  sent_asc: "Sent · oldest",
  name_asc: "Team / explorer · A–Z",
  lead_asc: "Lead / stop · order",
}

/** Millis for a nullable date, with a fallback so nulls sort last, not first. */
function ms(d: Date | string | null, fallback: number): number {
  if (!d) return fallback
  const t = typeof d === "string" ? new Date(d) : d
  const n = t.getTime()
  return Number.isFinite(n) ? n : fallback
}

export function AdminProofsPanel() {
  const [data, setData] = useState<{
    pending: AdminProofRow[]
    recent: AdminProofRow[]
    recentTotal: number
  }>({
    pending: [],
    recent: [],
    recentTotal: 0,
  })
  /**
   * How many decided rows to ask for. Held in a ref as well as state because the
   * background poll calls `load` on an interval: reading the count off state
   * inside `load` would need it in the dep array, which would tear down and
   * recreate the interval on every expansion, and a stale closure would quietly
   * snap the list back to the first page mid-review.
   */
  const [recentLimit, setRecentLimit] = useState(PROOF_HISTORY_PAGE)
  const recentLimitRef = useRef(PROOF_HISTORY_PAGE)
  const [expanding, setExpanding] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [lightbox, setLightbox] = useState<Lightbox>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  /** Set when the server refuses a decision because someone else is first in line. */
  const [blocked, setBlocked] = useState<string | null>(null)
  // Selection + deletion state for the "recently decided" log.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<null | "selected" | "all">(null)
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()
  const initialised = useRef(false)

  // --- Decided-history filter / search / sort (client-side over the full
  // archive, which is auto-loaded below). ---
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all")
  // A specific lead/stop to narrow to, keyed by its numeric leadOrder ("all" = any).
  const [leadFilter, setLeadFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("decided_desc")

  const load = useCallback(async () => {
    try {
      const next = await adminListProofs(recentLimitRef.current)
      setData(next)
      setLoaded(true)
      initialised.current = true
    } catch {
      // Non-admin/transient: leave state as-is.
    }
  }, [])

  /** Reveal the next page of decided history, keeping what is already on screen. */
  const showMore = useCallback(async () => {
    const next = recentLimitRef.current + PROOF_HISTORY_PAGE
    recentLimitRef.current = next
    setRecentLimit(next)
    setExpanding(true)
    try {
      await load()
    } finally {
      setExpanding(false)
    }
  }, [load])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  function decide(id: string, decision: "approved" | "rejected", why?: string) {
    setBusyId(id)
    setBlocked(null)
    startTransition(async () => {
      try {
        const res = await adminDecideProof(id, decision, why)
        // Lost a race: another admin (or a stale page) means someone else is now
        // first in line for this lead. Say who, instead of failing silently.
        if (!res.ok && res.error === "not_first_for_lead" && res.blockedBy) {
          setBlocked(`${res.blockedBy.name} submitted for this lead first. Review theirs first.`)
        }
      } finally {
        setBusyId(null)
        setRejecting(null)
        setReason("")
        void load()
      }
    })
  }

  const pending = data.pending
  const queue = buildQueue(pending)
  const recent = data.recent

  // Filters + search + sort run over the WHOLE decided archive, not just the
  // current page, or they would silently lie by only searching the first 10
  // rows. So once the total is known, pull the full archive in one go (capped at
  // the action's 500 ceiling). Runs once; the SHOW MORE button remains as a
  // fallback for the rare case of more than 500 decided proofs.
  useEffect(() => {
    if (!loaded) return
    if (data.recentTotal > recentLimitRef.current && recentLimitRef.current < 500) {
      const full = Math.min(500, data.recentTotal)
      recentLimitRef.current = full
      setRecentLimit(full)
      void load()
    }
  }, [loaded, data.recentTotal, load])

  // Distinct leads present in the decided archive, for the "stop" dropdown.
  const leadOptions = useMemo(() => {
    const seen = new Map<number, string>()
    for (const r of recent) {
      if (seen.has(r.leadOrder)) continue
      seen.set(
        r.leadOrder,
        finaleOrderLabel(r.leadOrder)
          ? r.country
          : `No. ${String(r.leadOrder).padStart(2, "0")} · ${r.country}`,
      )
    }
    return [...seen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([order, label]) => ({ order, label }))
  }, [recent])

  const filtersActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    contextFilter !== "all" ||
    leadFilter !== "all"

  const filteredRecent = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = recent.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (contextFilter !== "all" && r.context !== contextFilter) return false
      if (leadFilter !== "all" && String(r.leadOrder) !== leadFilter) return false
      if (q) {
        const hay = [
          r.userName,
          r.country,
          r.countryEn,
          r.note ?? "",
          r.reason ?? "",
          r.reviewerName ?? "",
        ]
          .join(" ")
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const sorted = [...rows]
    switch (sortKey) {
      case "decided_desc":
        sorted.sort((a, b) => ms(b.decidedAt, 0) - ms(a.decidedAt, 0))
        break
      case "decided_asc":
        sorted.sort((a, b) => ms(a.decidedAt, Infinity) - ms(b.decidedAt, Infinity))
        break
      case "sent_desc":
        sorted.sort((a, b) => ms(b.createdAt, 0) - ms(a.createdAt, 0))
        break
      case "sent_asc":
        sorted.sort((a, b) => ms(a.createdAt, Infinity) - ms(b.createdAt, Infinity))
        break
      case "name_asc":
        sorted.sort(
          (a, b) =>
            a.userName.localeCompare(b.userName) || ms(b.decidedAt, 0) - ms(a.decidedAt, 0),
        )
        break
      case "lead_asc":
        sorted.sort(
          (a, b) => a.leadOrder - b.leadOrder || ms(b.decidedAt, 0) - ms(a.decidedAt, 0),
        )
        break
    }
    return sorted
  }, [recent, search, statusFilter, contextFilter, leadFilter, sortKey])

  // Drop any selected ids that are no longer in the decided list (e.g. removed
  // by another admin or after our own delete).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const live = new Set(recent.map((r) => r.id))
      const next = new Set([...prev].filter((id) => live.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [recent])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select-all works over the CURRENTLY FILTERED rows, so "select all → delete"
  // deletes exactly what is on screen, never hidden rows behind an active filter.
  const allSelected =
    filteredRecent.length > 0 && filteredRecent.every((r) => selected.has(r.id))
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filteredRecent.map((r) => r.id)))
  }

  function runDelete(mode: "selected" | "all") {
    setDeleting(true)
    startTransition(async () => {
      try {
        if (mode === "all") await adminDeleteProofs({ all: true })
        else await adminDeleteProofs({ ids: [...selected] })
      } finally {
        setDeleting(false)
        setConfirmDelete(null)
        setSelected(new Set())
        void load()
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Pending queue */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Camera className="size-4 text-brass" />
          <h2 className="font-sans text-xs font-bold tracking-chip text-foreground">
            PENDING REVIEW
          </h2>
          <span className="rounded-full bg-brass/15 px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip text-brass">
            {pending.length}
          </span>
          <span className="font-sans text-[10px] tracking-chip text-muted-foreground/40">
            TIMES: ATHENS
          </span>
        </div>

        {blocked && (
          <div className="mb-4 flex items-start gap-2 rounded-sm border border-brass/60 bg-brass/10 px-3 py-2.5">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-brass" aria-hidden />
            <p className="font-serif text-sm text-foreground">{blocked}</p>
          </div>
        )}

        {!loaded ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border py-16 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="mt-3 font-serif text-sm text-muted-foreground">
              No photo proofs waiting. You are all caught up.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {pending.map((p) => {
              const q = queue.get(p.id)
              const contested = (q?.total ?? 1) > 1
              const locked = q ? !q.first : false
              return (
              <li
                key={p.id}
                className={
                  locked
                    ? "rounded-sm border border-dashed border-border bg-card/30 p-4 md:p-5"
                    : contested
                      ? "rounded-sm border-2 border-brass bg-card/60 p-4 md:p-5"
                      : "rounded-sm border border-border bg-card/60 p-4 md:p-5"
                }
              >
                {/* Racing crews: make the required order impossible to miss. */}
                {contested && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {q?.first ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brass px-2.5 py-1 font-sans text-[10px] font-bold tracking-chip text-primary-foreground">
                          <ArrowDown className="size-3" aria-hidden />
                          REVIEW THIS FIRST
                        </span>
                        <span className="font-sans text-[10px] tracking-chip text-muted-foreground">
                          EARLIEST OF {q.total} FOR THIS LEAD
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-sans text-[10px] font-bold tracking-chip text-muted-foreground">
                          <Lock className="size-3" aria-hidden />
                          WAITING · No. {q?.place} OF {q?.total}
                        </span>
                        <span className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
                          BEHIND {q?.waitingFor?.userName.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-base font-bold text-foreground">{p.userName}</p>
                    <p className="mt-0.5 font-sans text-[11px] tracking-chip text-muted-foreground">
                      {finaleOrderLabel(p.leadOrder)
                        ? p.country
                        : `LEAD No. ${String(p.leadOrder).padStart(2, "0")} · ${p.country}`}
                    </p>
                    {/* Shown outright, not just as a hover title: when two crews
                        race the same lead, the exact filing second decides who was
                        first, and a tooltip is no place to keep the deciding fact. */}
                    <p className="mt-1 font-sans text-[10px]">
                      <Stamp label="SENT" at={p.createdAt} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ContextBadge context={p.context} />
                    <span
                      className="font-sans text-[10px] tracking-chip text-muted-foreground/70"
                      title={clockTime(p.createdAt)}
                    >
                      {timeAgo(p.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 font-serif text-sm leading-relaxed text-muted-foreground">
                  {finaleOrderLabel(p.leadOrder) ? (
                    // The endgame QRs are steps, not numbered stops, so they get
                    // named. Their orders are sentinels (100000+) and reading them
                    // as positions produces "the 100001st lead".
                    <>
                      <span className="font-bold text-foreground">{p.userName}</span> scanned the{" "}
                      {p.country} QR, submitting {p.photoUrls.length} photo
                      {p.photoUrls.length === 1 ? "" : "s"} as proof of being there. Approving marks{" "}
                      {p.country} as reached for their crew.
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{p.userName}</span> scanned the QR
                      of the {ordinal(p.leadOrder - 1)} lead in order to proceed to the{" "}
                      {ordinal(p.leadOrder)} ({p.country}), submitting {p.photoUrls.length} photo
                      {p.photoUrls.length === 1 ? "" : "s"} as proof of being there. Approving
                      unlocks {p.country} and lets their crew continue.
                    </>
                  )}
                </p>

                {p.note && (
                  <p className="mt-3 rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm italic text-muted-foreground">
                    {"\u201C"}
                    {p.note}
                    {"\u201D"}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.photoUrls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox({ urls: p.photoUrls, index: i })}
                      className="size-20 overflow-hidden rounded-sm border border-border transition-opacity hover:opacity-80 md:size-24"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url || "/placeholder.svg"}
                        alt={`${p.userName} proof ${i + 1}`}
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {locked ? (
                  <div className="mt-4 rounded-sm border border-border bg-background px-3 py-3">
                    <p className="font-serif text-sm leading-relaxed text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {q?.waitingFor?.userName}
                      </span>{" "}
                      sent proof for this same lead{" "}
                      <span className="font-bold text-brass">
                        {gapLabel(p.createdAt, q?.waitingFor?.createdAt ?? p.createdAt)} earlier
                      </span>{" "}
                      ({clockTime(q?.waitingFor?.createdAt ?? p.createdAt)} vs{" "}
                      {clockTime(p.createdAt)}). Decide theirs first so this lead is awarded in the
                      order the crews actually reached it.
                    </p>
                  </div>
                ) : rejecting === p.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Optional reason (shown to the explorer)"
                      rows={2}
                      maxLength={500}
                      className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brass"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => decide(p.id, "rejected", reason)}
                        disabled={busyId === p.id}
                        className="inline-flex items-center gap-2 rounded-sm bg-destructive px-4 py-2 font-sans text-xs font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === p.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejecting(null)
                          setReason("")
                        }}
                        disabled={busyId === p.id}
                        className="inline-flex items-center rounded-sm border border-border bg-background px-4 py-2 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => decide(p.id, "approved")}
                      disabled={busyId === p.id}
                      className="inline-flex items-center gap-2 rounded-sm bg-brass px-4 py-2 font-sans text-xs font-bold tracking-chip text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === p.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Approve &amp; unlock
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(p.id)
                        setReason("")
                      }}
                      disabled={busyId === p.id}
                      className="inline-flex items-center gap-2 rounded-sm border border-border bg-background px-4 py-2 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <X className="size-4" />
                      Reject
                    </button>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Recently decided */}
      {recent.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">
                DECIDED HISTORY
              </h2>
              {/* Says how much of the archive is on screen, so a short list is
                  never mistaken for the whole history. While filtering, it names
                  the matched count against the loaded total. */}
              <span className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
                {filtersActive
                  ? `${filteredRecent.length} of ${recent.length} match`
                  : `${recent.length} / ${data.recentTotal}`}
              </span>
              {/* Names the zone once here instead of stamping an abbreviation onto
                  every row, which would also have to flip EET/EEST twice a year. */}
              <span className="font-sans text-[10px] tracking-chip text-muted-foreground/40">
                TIMES: ATHENS
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
              >
                {allSelected ? (
                  <CheckSquare className="size-3.5 text-brass" />
                ) : (
                  <Square className="size-3.5" />
                )}
                {allSelected ? "CLEAR" : "SELECT ALL"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete("selected")}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-background px-3 py-1.5 font-sans text-[10px] font-bold tracking-chip text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  DELETE {selected.size}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete("all")}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                DELETE ALL
              </button>
            </div>
          </div>

          {/* Filter / search / sort toolbar. Operates on the full loaded
              archive; results feed the list, the counts and select-all below. */}
          <div className="mb-4 rounded-sm border border-border bg-card/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team, stop, note, reviewer…"
                  className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-2 font-sans text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-brass"
                />
              </div>

              <div className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-muted-foreground/60" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  aria-label="Filter by decision"
                  className="rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground outline-none focus:border-brass"
                >
                  <option value="all">All decisions</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <select
                value={contextFilter}
                onChange={(e) => setContextFilter(e.target.value as ContextFilter)}
                aria-label="Filter by scan context"
                className="rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground outline-none focus:border-brass"
              >
                <option value="all">Any context</option>
                <option value="too_far">Too far</option>
                <option value="location_denied">Location denied</option>
              </select>

              <select
                value={leadFilter}
                onChange={(e) => setLeadFilter(e.target.value)}
                aria-label="Filter by stop"
                className="max-w-[200px] rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground outline-none focus:border-brass"
              >
                <option value="all">Any stop</option>
                {leadOptions.map((o) => (
                  <option key={o.order} value={String(o.order)}>
                    {o.label}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-1.5">
                <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Sort"
                  className="rounded-sm border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground outline-none focus:border-brass"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("all")
                    setContextFilter("all")
                    setLeadFilter("all")
                  }}
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  <X className="size-3" />
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {confirmDelete && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3">
              <p className="font-sans text-xs text-destructive">
                {confirmDelete === "all"
                  ? "Permanently delete ALL decided proofs and their photos? This cannot be undone."
                  : `Permanently delete ${selected.size} selected proof${
                      selected.size === 1 ? "" : "s"
                    } and their photos? This cannot be undone.`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runDelete(confirmDelete)}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-3 py-1.5 font-sans text-[10px] font-bold tracking-chip text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  CONFIRM DELETE
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                  className="inline-flex items-center rounded-sm border border-border bg-background px-3 py-1.5 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {filteredRecent.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border py-12 text-center">
              <Search className="size-6 text-muted-foreground/50" />
              <p className="mt-2 font-serif text-sm text-muted-foreground">
                No decided proofs match these filters.
              </p>
            </div>
          ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {filteredRecent.map((p) => (
              <li
                key={p.id}
                className={`px-4 py-3 transition-colors ${
                  selected.has(p.id) ? "bg-brass/5" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      aria-label={selected.has(p.id) ? "Deselect" : "Select"}
                      aria-pressed={selected.has(p.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-brass"
                    >
                      {selected.has(p.id) ? (
                        <CheckSquare className="size-4 text-brass" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </button>
                    {p.status === "approved" ? (
                      <BadgeCheck className="size-4 shrink-0 text-brass" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <p className="font-serif text-sm text-foreground">
                        {p.userName} ·{" "}
                        {finaleOrderLabel(p.leadOrder)
                          ? p.country
                          : `No. ${String(p.leadOrder).padStart(2, "0")} · ${p.country}`}
                      </p>
                      {/* A rejection with no note read as a bare "REJECTED" with
                          nothing beside it, indistinguishable from feedback that
                          failed to load. Live data says every rejection so far has
                          no reason recorded, so this is the normal case, not an
                          edge one, and it has to say so out loud. */}
                      {p.status === "rejected" &&
                        (p.reason && p.reason.trim().length > 0 ? (
                          <p className="font-sans text-[11px] text-muted-foreground">
                            <span className="font-bold tracking-chip text-amber-500/80">
                              FEEDBACK:{" "}
                            </span>
                            {p.reason}
                          </p>
                        ) : (
                          <p className="font-sans text-[11px] italic text-muted-foreground/60">
                            Rejected with no feedback
                          </p>
                        ))}
                      {/* Both ends of the decision, to the second. Wraps rather
                          than sitting in the cramped right-hand column, so a long
                          stamp cannot squeeze the status badge off the row. */}
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-sans text-[10px]">
                        <Stamp label="SENT" at={p.createdAt} />
                        <Stamp label="REVIEWED" at={p.decidedAt} />
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-sans text-[10px] font-bold tracking-chip ${
                        p.status === "approved" ? "text-brass" : "text-amber-500"
                      }`}
                    >
                      {p.status === "approved" ? "APPROVED" : "REJECTED"}
                    </p>
                    {p.reviewerName && (
                      <p className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
                        {p.reviewerName}
                      </p>
                    )}
                  </div>
                </div>

                {/* What the explorer wrote when they filed it. Shown in the same
                    quoted style as the pending queue, so the note that justified a
                    decision stays readable next to the decision itself instead of
                    being lost the moment it is judged. */}
                {p.note && p.note.trim().length > 0 && (
                  <p className="mt-2 ml-7 rounded-sm border border-border bg-background px-3 py-2 font-serif text-sm italic text-muted-foreground">
                    {"\u201C"}
                    {p.note}
                    {"\u201D"}
                  </p>
                )}

                {/* Submitted photos stay viewable after a decision. */}
                {p.photoUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                    {p.photoUrls.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightbox({ urls: p.photoUrls, index: i })}
                        className="size-12 overflow-hidden rounded-sm border border-border transition-opacity hover:opacity-80"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`${p.userName} proof ${i + 1}`}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          )}

          {/* Only offered while rows remain AND no filter is active (a filter runs
              over the already-loaded archive, so paging in more is irrelevant).
              Names the exact number left so you can tell "3 more" from "300 more". */}
          {!filtersActive && data.recentTotal > recent.length && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void showMore()}
                disabled={expanding}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-4 py-2 font-sans text-[10px] font-bold tracking-chip text-muted-foreground transition-colors hover:border-brass hover:text-brass disabled:opacity-50"
              >
                {expanding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
                SHOW {Math.min(PROOF_HISTORY_PAGE, data.recentTotal - recent.length)} MORE
                <span className="font-normal text-muted-foreground/60">
                  ({data.recentTotal - recent.length} left)
                </span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Photo lightbox */}
      <AnimatePresence>
        {lightbox && (
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
              className="absolute inset-0 cursor-default bg-background/90 backdrop-blur-sm"
            />
            <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.urls[lightbox.index] || "/placeholder.svg"}
                alt={`Proof ${lightbox.index + 1}`}
                className="max-h-[80vh] w-auto rounded-sm border border-border object-contain"
              />
              <div className="mt-4 flex items-center gap-4">
                {lightbox.urls.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous"
                      onClick={() =>
                        setLightbox((lb) =>
                          lb
                            ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length }
                            : lb,
                        )
                      }
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <span className="font-sans text-xs tracking-chip text-muted-foreground">
                      {lightbox.index + 1} / {lightbox.urls.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next"
                      onClick={() =>
                        setLightbox((lb) =>
                          lb ? { ...lb, index: (lb.index + 1) % lb.urls.length } : lb,
                        )
                      }
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brass hover:text-brass"
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

function ContextBadge({ context }: { context: string }) {
  const tooFar = context === "too_far"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[10px] font-bold tracking-chip ${
        tooFar ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"
      }`}
    >
      {tooFar ? <Navigation className="size-3" /> : <ShieldQuestion className="size-3" />}
      {tooFar ? "TOO FAR" : "LOCATION DENIED"}
    </span>
  )
}
