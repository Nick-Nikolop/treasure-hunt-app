"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, Monitor, Search, Smartphone, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PeopleSnapshot, PersonRow } from "@/lib/people"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { relative } from "@/components/analytics/format"

type Filter = "all" | "accounts" | "anonymous" | "signups"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "accounts", label: "With account" },
  { id: "signups", label: "Signed up after visiting" },
  { id: "anonymous", label: "Anonymous" },
]

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</span>
      <span className={cn("font-sans font-bold leading-none tabular-nums", strong ? "text-3xl text-brass" : "text-xl text-foreground")}>
        {value}
      </span>
    </div>
  )
}

function pct(part: number, whole: number) {
  if (!whole) return "—"
  return `${Math.round((part / whole) * 100)}%`
}

function PersonItem({ p }: { p: PersonRow }) {
  const mobile = p.devices.some((d) => /mobile|iphone|android|ios/i.test(d.label))
  const DeviceIcon = mobile ? Smartphone : Monitor
  return (
    <li>
      <Link
        href={`/analytics/people/${p.key}`}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_repeat(3,4.5rem)_6.5rem_auto]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border",
              p.userId ? "border-brass/60 bg-brass/15 text-brass" : "border-border bg-background/60 text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {p.userId ? <UserRound className="size-4" /> : <DeviceIcon className="size-4" />}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-sans text-sm font-bold text-foreground">
                {p.userId ? p.name || p.email : "Anonymous visitor"}
              </span>
              {p.isAdmin && (
                <span className="shrink-0 rounded-sm border border-border px-1.5 font-sans text-[10px] font-bold text-muted-foreground">ADMIN</span>
              )}
              {p.signedUpHere && (
                <span className="shrink-0 rounded-sm bg-brass/15 px-1.5 font-sans text-[10px] font-bold text-brass">SIGNED UP</span>
              )}
            </span>
            <span className="truncate font-sans text-xs text-muted-foreground">
              {p.userId ? p.email : [p.devices[0]?.label, p.city].filter(Boolean).join(" · ")}
              {p.devices.length > 1 && ` · ${p.devices.length} devices`}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-col md:flex">
          <span className="truncate font-sans text-sm text-foreground">{p.source.label}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{p.firstPath ?? "—"}</span>
        </div>
        <span className="hidden text-right font-sans text-sm tabular-nums text-foreground md:block">{p.visits}</span>
        <span className="hidden text-right font-sans text-sm tabular-nums text-foreground md:block">{p.pageViews}</span>
        <span className="hidden text-right font-sans text-sm tabular-nums text-foreground md:block">{p.events}</span>
        <span className="hidden text-right font-sans text-xs tabular-nums text-muted-foreground md:block">{relative(p.lastSeenAt)}</span>

        <div className="flex items-center gap-2">
          <span className="font-sans text-xs tabular-nums text-muted-foreground md:hidden">
            {p.visits} visits · {relative(p.lastSeenAt)}
          </span>
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </Link>
    </li>
  )
}

export function PeopleView({ snapshot }: { snapshot: PeopleSnapshot }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [hideAdmins, setHideAdmins] = useState(true)
  const { totals } = snapshot

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return snapshot.people.filter((p) => {
      if (hideAdmins && p.isAdmin) return false
      if (filter === "accounts" && !p.userId) return false
      if (filter === "anonymous" && p.userId) return false
      if (filter === "signups" && !p.signedUpHere) return false
      if (!q) return true
      return [p.name, p.email, p.source.label, p.firstPath, p.city, ...p.devices.map((d) => d.label)]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    })
  }, [snapshot.people, filter, query, hideAdmins])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <AnalyticsHeader
        title="People"
        description="Every device that opened the site, and every account it became. Signed-in devices are merged per account, so a journey includes everything they did before signing up."
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-5 rounded-sm border border-border bg-card/90 p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
        <Stat label="DEVICES" value={totals.devices} strong />
        <Stat label="NEW · 7 DAYS" value={totals.newLast7} />
        <Stat label="ACTIVE TODAY" value={totals.activeToday} />
        <Stat label="ACCOUNTS SEEN" value={totals.accounts} />
        <Stat label="VISIT → SIGN-UP" value={`${totals.signedUpAfterVisit} · ${pct(totals.signedUpAfterVisit, totals.devices)}`} />
        <Stat label="NO-CONSENT VIEWS · 7D" value={totals.anonymousViews7} />
      </section>

      <section aria-labelledby="conversion-title" className="flex flex-col gap-3">
        <h2 id="conversion-title" className="font-serif text-2xl font-black text-foreground">
          Where they come from
        </h2>
        {snapshot.conversion.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-6 text-center font-sans text-sm text-muted-foreground">No visitors yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border bg-card/90">
            <table className="w-full font-sans text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-bold">First source</th>
                  <th className="px-3 py-2 text-right font-bold">Devices</th>
                  <th className="px-3 py-2 text-right font-bold">Accounts</th>
                  <th className="w-[30%] px-3 py-2 font-bold">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.conversion.map((c) => {
                  const rate = c.devices ? c.accounts / c.devices : 0
                  return (
                    <tr key={c.label} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">
                        {c.label}
                        {c.id && c.id !== c.label && <span className="ml-2 font-mono text-xs text-muted-foreground">{c.id}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{c.devices}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{c.accounts}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full bg-brass" style={{ width: `${Math.round(rate * 100)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct(c.accounts, c.devices)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="people-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="people-title" className="font-serif text-2xl font-black text-foreground">
            Everyone <span className="font-sans text-base font-bold tabular-nums text-muted-foreground">{shown.length}</span>
          </h2>
          <label className="flex items-center gap-2 font-sans text-xs text-muted-foreground">
            <input type="checkbox" checked={hideAdmins} onChange={(e) => setHideAdmins(e.target.checked)} className="accent-brass" />
            Hide admins
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Filter people" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 font-sans text-xs font-bold transition-colors",
                  filter === f.id ? "border-brass bg-brass/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative block sm:ml-auto sm:w-72">
            <span className="sr-only">Search people</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, source, city, device"
              className="w-full rounded-sm border border-border bg-background/70 py-2 pl-9 pr-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-brass focus:outline-none"
            />
          </label>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-6 text-center font-sans text-sm text-muted-foreground">Nobody matches.</p>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border bg-card/90">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_repeat(3,4.5rem)_6.5rem_auto] gap-3 bg-muted/60 px-4 py-2 font-sans text-xs font-bold text-muted-foreground md:grid">
              <span>Person</span>
              <span>First came from</span>
              <span className="text-right">Visits</span>
              <span className="text-right">Pages</span>
              <span className="text-right">Actions</span>
              <span className="text-right">Last seen</span>
              <span className="w-4" />
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {shown.map((p) => (
                <PersonItem key={p.key} p={p} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}
