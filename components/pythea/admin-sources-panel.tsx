"use client"

import { useState } from "react"
import { Check, Copy, Radar } from "lucide-react"
import type { SourceRow, SourcesSnapshot, Tally } from "@/lib/source-hits"

const dateFmt = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function seconds(s: number | null): string {
  if (s === null) return "—"
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</span>
      <span className="font-serif text-xl font-black tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function TallyList({ title, items }: { title: string; items: Tally[] }) {
  if (!items.length) return null
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{title}</span>
      <ul className="flex flex-col gap-1">
        {items.map((t) => (
          <li key={t.label} className="flex items-baseline justify-between gap-3 font-sans text-sm">
            <span className="truncate text-foreground">{t.label}</span>
            <span className="tabular-nums text-muted-foreground">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourceCard({ row }: { row: SourceRow }) {
  return (
    <li className="flex flex-col gap-5 rounded-sm border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-base font-bold text-foreground">?source={row.source}</h3>
        <span className="font-sans text-xs text-muted-foreground">
          {row.firstAt ? dateFmt.format(new Date(row.firstAt)) : "—"} →{" "}
          {row.lastAt ? dateFmt.format(new Date(row.lastAt)) : "—"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="VISITS" value={row.visits} />
        <Stat label="UNIQUE DEVICES" value={row.uniqueDevices} />
        <Stat label="UNIQUE NETWORKS" value={row.uniqueNetworks} />
        <Stat label="NEW TO SITE" value={row.newVisitors} />
        <Stat label="TODAY" value={row.today} />
        <Stat label="LAST 7 DAYS" value={row.last7} />
        <Stat label="SIGNED UP" value={row.signedUp} />
        <Stat label="MEDIAN TIME ON SITE" value={seconds(row.medianSeconds)} />
      </div>
      <div className="grid grid-cols-1 gap-5 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <TallyList title="PAGES" items={row.paths} />
        <TallyList title="DEVICES" items={row.devices} />
        <TallyList title="OPENED FROM" items={row.apps} />
        <TallyList title="LOCATIONS" items={row.cities} />
      </div>
      {row.bots > 0 && (
        <p className="font-sans text-xs text-muted-foreground">
          {row.bots} link-preview / bot hit{row.bots === 1 ? "" : "s"} excluded from the numbers above.
        </p>
      )}
    </li>
  )
}

/** Counts for every `?source=` link: who arrived, from where, on what, and whether they signed up. */
export function AdminSourcesPanel({ snapshot }: { snapshot: SourcesSnapshot }) {
  const [copied, setCopied] = useState(false)
  const example = "/carnival?s=likjldgfskj4fw3a"

  return (
    <section aria-labelledby="sources-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="sources-title" className="flex items-center gap-2 font-serif text-2xl font-black text-foreground">
          <Radar className="size-5 text-brass" aria-hidden="true" />
          Sources
        </h2>
        <p className="max-w-[70ch] font-sans text-sm leading-relaxed text-muted-foreground">
          Add <code className="font-mono text-foreground">?source=anything</code> to any link on the site and every
          arrival is counted here automatically. No setup per source.
        </p>
        <a
          href="/analytics"
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-sm bg-primary px-3 py-1.5 font-sans text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open analytics (titles + links)
        </a>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}${example}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-brass"
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {example}
        </button>
      </div>

      {snapshot.sources.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border p-6 text-center font-sans text-sm text-muted-foreground">
          No source visits yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {snapshot.sources.map((row) => (
            <SourceCard key={row.source} row={row} />
          ))}
        </ul>
      )}

      {snapshot.recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-sans text-xs font-bold tracking-chip text-muted-foreground">LATEST ARRIVALS</h3>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[640px] font-sans text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-bold">When</th>
                  <th className="px-3 py-2 font-bold">Source</th>
                  <th className="px-3 py-2 font-bold">Page</th>
                  <th className="px-3 py-2 font-bold">Device</th>
                  <th className="px-3 py-2 font-bold">Opened from</th>
                  <th className="px-3 py-2 font-bold">Location</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recent.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(h.createdAt))}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {h.source}
                      {!h.isUnique && <span className="ml-1.5 text-muted-foreground">(repeat)</span>}
                    </td>
                    <td className="px-3 py-2 text-foreground">{h.path}</td>
                    <td className="px-3 py-2 text-foreground">
                      {[h.deviceModel ?? h.device, h.os, h.browser].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {h.inApp ?? (h.referrerHost === "direct" ? "Direct / QR" : h.referrerHost)}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {[h.city, h.country].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
