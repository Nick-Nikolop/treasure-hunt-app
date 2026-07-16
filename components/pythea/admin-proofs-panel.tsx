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
} from "lucide-react"
import { adminListProofs, adminDecideProof, type AdminProofRow } from "@/app/admin/actions"

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
    startTransition(async () => {
      try {
        await adminDecideProof(id, decision, why)
      } finally {
        setBusyId(null)
        setRejecting(null)
        setReason("")
        void load()
      }
    })
  }

  const pending = data.pending
  const recent = data.recent

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
            {pending.map((p) => (
              <li
                key={p.id}
                className="rounded-sm border border-border bg-card/60 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-base font-bold text-foreground">{p.userName}</p>
                    <p className="mt-0.5 font-sans text-[11px] tracking-chip text-muted-foreground">
                      LEAD No. {String(p.leadOrder).padStart(2, "0")} · {p.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ContextBadge context={p.context} />
                    <span className="font-sans text-[10px] tracking-chip text-muted-foreground/70">
                      {timeAgo(p.createdAt)}
                    </span>
                  </div>
                </div>

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

                {rejecting === p.id ? (
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
            ))}
          </ul>
        )}
      </section>

      {/* Recently decided */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-4 font-sans text-xs font-bold tracking-chip text-muted-foreground">
            RECENTLY DECIDED
          </h2>
          <ul className="divide-y divide-border rounded-sm border border-border">
            {recent.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
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
