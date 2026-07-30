"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
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
  Trash2,
  Square,
  CheckSquare,
  Lock,
  ArrowDown,
} from "lucide-react"
import {
  adminListProofs,
  adminDecideProof,
  adminDeleteProofs,
  type AdminProofRow,
} from "@/app/admin/actions"

const POLL_MS = 8000

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

/** Exact clock time, so the admin can audit the order rather than trust it. */
function clockTime(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d
  return t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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

export function AdminProofsPanel() {
  const [data, setData] = useState<{ pending: AdminProofRow[]; recent: AdminProofRow[] }>({
    pending: [],
    recent: [],
  })
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

  const load = useCallback(async () => {
    try {
      const next = await adminListProofs()
      setData(next)
      setLoaded(true)
      initialised.current = true
    } catch {
      // Non-admin/transient: leave state as-is.
    }
  }, [])

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

  const allSelected = recent.length > 0 && selected.size === recent.length
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recent.map((r) => r.id)))
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
                      LEAD No. {String(p.leadOrder).padStart(2, "0")} · {p.country}
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
                  <span className="font-bold text-foreground">{p.userName}</span> scanned the QR of
                  the {ordinal(p.leadOrder - 1)} lead in order to proceed to the{" "}
                  {ordinal(p.leadOrder)} ({p.country}), submitting {p.photoUrls.length} photo
                  {p.photoUrls.length === 1 ? "" : "s"} as proof of being there. Approving unlocks{" "}
                  {p.country} and lets their crew continue.
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
                RECENTLY DECIDED
              </h2>
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

          <ul className="divide-y divide-border rounded-sm border border-border">
            {recent.map((p) => (
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
                        {p.userName} · No. {String(p.leadOrder).padStart(2, "0")} · {p.country}
                      </p>
                      {p.status === "rejected" && p.reason && (
                        <p className="font-sans text-[11px] text-muted-foreground">{p.reason}</p>
                      )}
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
