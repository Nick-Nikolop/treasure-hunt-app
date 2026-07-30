"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
  Search,
  User,
  Users,
  MapPin,
  Crosshair,
  ExternalLink,
  Navigation,
  Check,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { ModalShell } from "@/components/pythea/modal-shell"
import {
  adminSearchScanSubjects,
  adminGetUserScanPings,
  adminGetTeamScanPings,
} from "@/app/admin/actions"
import type { ScanSubjects, ScanPingRow } from "@/lib/scan-ping"

type Subject =
  | { kind: "user"; id: string; name: string; sub: string; pings: number }
  | { kind: "team"; id: string; name: string; sub: string; pings: number }

function gmapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function osmEmbed(lat: number, lng: number) {
  const d = 0.004
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${lat},${lng}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function AdminScanLookup() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ScanSubjects>({ users: [], teams: [] })
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Subject | null>(null)
  const [pings, setPings] = useState<ScanPingRow[]>([])
  const [loadingPings, startPings] = useTransition()
  const [popup, setPopup] = useState<ScanPingRow | null>(null)
  const seq = useRef(0)

  // Debounced search as the founder types. A per-request sequence guards against
  // out-of-order responses overwriting a newer query's results.
  const runSearch = useCallback(async (q: string) => {
    const mine = ++seq.current
    if (q.trim().length < 2) {
      setResults({ users: [], teams: [] })
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const res = await adminSearchScanSubjects(q)
      if (mine === seq.current) setResults(res)
    } catch {
      if (mine === seq.current) setResults({ users: [], teams: [] })
    } finally {
      if (mine === seq.current) setSearching(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void runSearch(query), 300)
    return () => clearTimeout(id)
  }, [query, runSearch])

  function openSubject(s: Subject) {
    setSelected(s)
    setPings([])
    startPings(async () => {
      try {
        const rows =
          s.kind === "user"
            ? await adminGetUserScanPings(s.id)
            : await adminGetTeamScanPings(s.id)
        setPings(rows)
      } catch {
        setPings([])
      }
    })
  }

  const hasResults = results.users.length > 0 || results.teams.length > 0

  return (
    <div className="rounded-md border border-border bg-background/40 p-5">
      <div className="flex items-center gap-2">
        <Crosshair className="size-5 text-brass" aria-hidden />
        <h2 className="font-serif text-xl font-black text-foreground">Scan locations</h2>
      </div>
      <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
        Look up a person or crew to see where their hunt scans were sent from. Useful for judging
        photo proofs. Explorers are never told this is recorded, and only you can see it.
      </p>

      {selected ? (
        <SubjectDetail
          subject={selected}
          pings={pings}
          loading={loadingPings}
          onBack={() => {
            setSelected(null)
            setPings([])
          }}
          onOpenPing={setPopup}
        />
      ) : (
        <>
          <div className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or crew..."
              className="w-full rounded-sm border border-border bg-background py-2.5 pl-9 pr-9 font-sans text-sm text-foreground outline-none transition-colors focus:border-brass"
            />
            {searching && (
              <Loader2
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {query.trim().length >= 2 && !searching && !hasResults && (
              <p className="py-6 text-center font-sans text-sm text-muted-foreground">
                No matches.
              </p>
            )}

            {results.users.map((u) => (
              <SubjectRow
                key={`u-${u.id}`}
                icon={<User className="size-4 text-brass" aria-hidden />}
                name={u.name || u.email}
                sub={u.teamName ? `${u.email} \u00B7 ${u.teamName}` : u.email}
                pings={u.pings}
                onClick={() =>
                  openSubject({
                    kind: "user",
                    id: u.id,
                    name: u.name || u.email,
                    sub: u.email,
                    pings: u.pings,
                  })
                }
              />
            ))}

            {results.teams.map((t) => (
              <SubjectRow
                key={`t-${t.id}`}
                icon={<Users className="size-4 text-brass" aria-hidden />}
                name={t.name}
                sub={`${t.members} ${t.members === 1 ? "member" : "members"}`}
                pings={t.pings}
                onClick={() =>
                  openSubject({
                    kind: "team",
                    id: t.id,
                    name: t.name,
                    sub: `${t.members} members`,
                    pings: t.pings,
                  })
                }
              />
            ))}
          </div>
        </>
      )}

      <PingMapPopup ping={popup} onClose={() => setPopup(null)} />
    </div>
  )
}

function SubjectRow({
  icon,
  name,
  sub,
  pings,
  onClick,
}: {
  icon: React.ReactNode
  name: string
  sub: string
  pings: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-brass"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-card">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-bold text-foreground">{name}</span>
        <span className="block truncate font-sans text-xs text-muted-foreground">{sub}</span>
      </span>
      <span
        className={
          "shrink-0 rounded-sm px-2 py-1 font-sans text-[10px] font-bold tracking-chip " +
          (pings > 0 ? "bg-brass/15 text-brass" : "bg-card text-muted-foreground")
        }
      >
        {pings} {pings === 1 ? "ping" : "pings"}
      </span>
    </button>
  )
}

function SubjectDetail({
  subject,
  pings,
  loading,
  onBack,
  onOpenPing,
}: {
  subject: Subject
  pings: ScanPingRow[]
  loading: boolean
  onBack: () => void
  onOpenPing: (p: ScanPingRow) => void
}) {
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
      >
        <ArrowLeft className="size-4" />
        Back to search
      </button>

      <div className="mt-3 flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-card">
          {subject.kind === "user" ? (
            <User className="size-4 text-brass" aria-hidden />
          ) : (
            <Users className="size-4 text-brass" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm font-bold text-foreground">
            {subject.name}
          </span>
          <span className="block truncate font-sans text-xs text-muted-foreground">
            {subject.sub}
          </span>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-brass" aria-hidden />
        </div>
      ) : pings.length === 0 ? (
        <p className="py-8 text-center font-sans text-sm text-muted-foreground">
          No scan locations captured yet. New scans from now on will appear here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {pings.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenPing(p)}
                className="flex w-full items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-brass"
              >
                <span
                  className={
                    "flex size-8 shrink-0 items-center justify-center rounded-sm border " +
                    (p.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-400")
                  }
                >
                  {p.ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-sans text-sm font-bold text-foreground">
                      {p.leadLabel}
                    </span>
                    {subject.kind === "team" && (
                      <span className="truncate font-sans text-xs text-muted-foreground">
                        {p.userName}
                      </span>
                    )}
                  </span>
                  <span className="block font-sans text-xs text-muted-foreground">
                    {fmtTime(p.createdAt)}
                    {p.accuracy != null && ` \u00B7 \u00B1${Math.round(p.accuracy)}m`}
                    {!p.ok && p.distanceM != null && ` \u00B7 ${p.distanceM}m away`}
                  </span>
                </span>
                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PingMapPopup({ ping, onClose }: { ping: ScanPingRow | null; onClose: () => void }) {
  return (
    <ModalShell open={ping !== null} onClose={onClose} labelledBy="scan-ping-title">
      {ping && (
        <>
          <div className="flex items-center gap-2">
            <Navigation className="size-5 text-brass" aria-hidden />
            <h2 id="scan-ping-title" className="font-serif text-xl font-black text-foreground">
              {ping.leadLabel}
            </h2>
          </div>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            {ping.userName}
            {ping.teamName && ` \u00B7 ${ping.teamName}`}
            {` \u00B7 ${fmtTime(ping.createdAt)}`}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Result" value={ping.ok ? "In range" : "Too far"} tone={ping.ok ? "ok" : "warn"} />
            <Stat
              label="Accuracy"
              value={ping.accuracy != null ? `\u00B1${Math.round(ping.accuracy)}m` : "unknown"}
            />
            {!ping.ok && ping.distanceM != null && (
              <Stat label="Distance" value={`${ping.distanceM}m`} tone="warn" />
            )}
            {!ping.ok && ping.radiusM != null && <Stat label="Radius" value={`${ping.radiusM}m`} />}
          </div>

          <div className="mt-4 overflow-hidden rounded-sm border border-border">
            <iframe
              title="Scan location map"
              src={osmEmbed(ping.lat, ping.lng)}
              className="h-56 w-full"
              loading="lazy"
            />
          </div>
          <p className="mt-2 text-center font-sans text-[11px] text-muted-foreground">
            {ping.lat.toFixed(6)}, {ping.lng.toFixed(6)}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
            <a
              href={gmapsLink(ping.lat, ping.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-brass px-5 py-3 font-sans text-sm font-bold tracking-chip text-background transition-transform hover:-translate-y-0.5"
            >
              <ExternalLink className="size-4" />
              Open in Google Maps
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-sm border border-border px-5 py-3 font-sans text-sm font-bold tracking-chip text-foreground transition-colors hover:border-brass"
            >
              Close
            </button>
          </div>
        </>
      )}
    </ModalShell>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "ok" | "warn"
}) {
  return (
    <div className="rounded-sm border border-border bg-background px-3 py-2">
      <p className="font-sans text-[10px] font-bold tracking-chip text-muted-foreground">{label}</p>
      <p
        className={
          "mt-0.5 font-sans text-sm font-bold " +
          (tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  )
}
