"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronDown, Copy, Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AnalyticsSnapshot, LabeledSource, Tally } from "@/lib/source-hits"
import { removeSourceLabel, saveSourceLabel } from "@/app/analytics/actions"

const SITE = "https://thehunt.gr"

const dateFmt = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const dayFmt = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit" })

function linkFor(row: { source: string; path: string }) {
  return `${SITE}${row.path}?s=${row.source}`
}

function seconds(s: number | null): string {
  if (s === null) return "—"
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function dayLabels(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  for (let i = n - 1; i >= 0; i--) out.push(dayFmt.format(new Date(d.getTime() - i * 86_400_000)))
  return out
}

function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-brass",
        className,
      )}
    >
      {done ? (
        <Check className="size-3.5 shrink-0 text-brass" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label ?? text}</span>
      <span className="sr-only">{done ? "Copied" : "Copy"}</span>
    </button>
  )
}

function Bars({ values, labels, tall }: { values: number[]; labels: string[]; tall?: boolean }) {
  const max = Math.max(1, ...values)
  const empty = values.every((v) => v === 0)
  return (
    <div className="flex flex-col gap-1.5">
      {empty && (
        <p className="font-sans text-xs text-muted-foreground">No visits in the last {values.length} days.</p>
      )}
      <div className={cn("flex items-end gap-1", empty ? "h-1" : tall ? "h-24" : "h-12")} role="img" aria-label={`Visits per day, last ${values.length} days`}>
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${labels[i]}: ${v}`}>
            <div
              className={cn("w-full rounded-t-[2px]", v ? "bg-brass" : "bg-border")}
              style={{ height: v ? `${Math.max(8, (v / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-sans text-[10px] tabular-nums text-muted-foreground">
        <span>{labels[0]}</span>
        <span>Σήμερα</span>
      </div>
    </div>
  )
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</span>
      <span className={cn("font-sans font-bold leading-none tabular-nums", strong ? "text-3xl text-brass" : "text-xl text-foreground")}>
        {value}
      </span>
    </div>
  )
}

function TallyList({ title, items }: { title: string; items: Tally[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{title}</span>
      {items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map((t) => (
            <li key={t.label} className="flex items-baseline justify-between gap-3 font-sans text-sm">
              <span className="truncate text-foreground">{t.label}</span>
              <span className="tabular-nums text-muted-foreground">{t.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="font-sans text-sm text-muted-foreground">—</span>
      )}
    </div>
  )
}

const inputCls =
  "w-full rounded-sm border border-border bg-background/70 px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-brass focus:outline-none"

function LabelForm({
  initial,
  lockSource,
  submitLabel,
  onDone,
  onCancel,
}: {
  initial: { source: string; title: string; path: string; note: string }
  lockSource?: boolean
  submitLabel: string
  onDone: (source: string) => void
  onCancel?: () => void
}) {
  const [v, setV] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const res = await saveSourceLabel(v)
          if (res.ok) onDone(res.source)
          else setError(res.error)
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">TITLE</span>
          <input
            className={inputCls}
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            placeholder="First Carnival Rollover"
            maxLength={80}
            required
            autoFocus={lockSource}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">ID (?s=)</span>
          <input
            className={cn(inputCls, "font-mono", lockSource && "opacity-60")}
            value={v.source}
            onChange={(e) => setV({ ...v, source: e.target.value })}
            placeholder="Leave empty for a random id"
            readOnly={lockSource}
            maxLength={80}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">PAGE</span>
          <input
            className={cn(inputCls, "font-mono")}
            value={v.path}
            onChange={(e) => setV({ ...v, path: e.target.value })}
            placeholder="/carnival"
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">NOTE (OPTIONAL)</span>
          <input
            className={inputCls}
            value={v.note}
            onChange={(e) => setV({ ...v, note: e.target.value })}
            placeholder="Where this link was posted"
            maxLength={280}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="font-sans text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 font-sans text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Check className="size-4" aria-hidden="true" />
          {pending ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function SourceCard({ row, labels }: { row: LabeledSource; labels: string[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const url = linkFor(row)

  return (
    <li className="flex flex-col gap-5 rounded-sm border border-border bg-card/90 p-4 sm:p-5">
      {editing ? (
        <LabelForm
          initial={{ source: row.source, title: row.title ?? "", path: row.path, note: row.note ?? "" }}
          lockSource
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            router.refresh()
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className={cn("text-pretty font-serif text-xl font-black", row.title ? "text-foreground" : "text-muted-foreground")}>
                {row.title ?? "Untitled source"}
              </h3>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-muted-foreground">
                <span className="font-mono text-foreground/80">s={row.source}</span>
                <span>
                  {row.firstAt ? dateFmt.format(new Date(row.firstAt)) : "No visits yet"}
                  {row.lastAt && ` → ${dateFmt.format(new Date(row.lastAt))}`}
                </span>
              </p>
              {row.note && <p className="font-sans text-sm leading-relaxed text-muted-foreground">{row.note}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-sans text-xs font-bold text-foreground transition-colors hover:border-brass"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                {row.title ? "Edit" : "Add title"}
              </button>
              {row.title && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Remove the title "${row.title}"? Visits are kept.`)) return
                    start(async () => {
                      await removeSourceLabel(row.source)
                      router.refresh()
                    })
                  }}
                  aria-label="Remove title"
                  className="grid size-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <CopyButton text={url} className="w-fit max-w-full" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-end">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="VISITS" value={row.visits} strong />
          <Stat label="UNIQUE DEVICES" value={row.uniqueDevices} />
          <Stat label="TODAY" value={row.today} />
          <Stat label="SIGNED UP" value={row.signedUp} />
        </div>
        <Bars values={row.daily} labels={labels} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        {open ? "LESS" : "MORE DETAILS"}
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="UNIQUE NETWORKS" value={row.uniqueNetworks} />
            <Stat label="NEW TO SITE" value={row.newVisitors} />
            <Stat label="LAST 7 DAYS" value={row.last7} />
            <Stat label="MEDIAN TIME ON SITE" value={seconds(row.medianSeconds)} />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <TallyList title="PAGES" items={row.paths} />
            <TallyList title="DEVICES" items={row.devices} />
            <TallyList title="OPENED FROM" items={row.apps} />
            <TallyList title="LOCATIONS" items={row.cities} />
          </div>
          {row.bots > 0 && (
            <p className="font-sans text-xs text-muted-foreground">
              {row.bots} link-preview / bot hit{row.bots === 1 ? "" : "s"} not counted.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

export function AnalyticsView({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const labels = useMemo(() => dayLabels(snapshot.totals.daily.length), [snapshot.totals.daily.length])
  const { totals } = snapshot

  const q = query.trim().toLowerCase()
  const shown = q
    ? snapshot.sources.filter((s) => s.source.includes(q) || s.title?.toLowerCase().includes(q))
    : snapshot.sources
  const createdRow = created ? snapshot.sources.find((s) => s.source === created) : null

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-1.5 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Admin
        </Link>
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[11px] font-bold tracking-chip text-brass">THE HUNT</p>
          <h1 className="font-serif text-4xl font-black text-foreground sm:text-5xl">Analytics</h1>
          <p className="max-w-[60ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Every link with <code className="font-mono text-foreground">?s=</code> or{" "}
            <code className="font-mono text-foreground">?source=</code> is counted here on its own. Give any id a title
            so you know what it is.
          </p>
        </div>
      </header>

      <section aria-label="All sources" className="grid gap-6 rounded-sm border border-border bg-card/90 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-end">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat label="VISITS" value={totals.visits} strong />
          <Stat label="TODAY" value={totals.today} />
          <Stat label="LAST 7 DAYS" value={totals.last7} />
          <Stat label="UNIQUE DEVICES" value={totals.uniqueDevices} />
          <Stat label="SIGNED UP" value={totals.signedUp} />
          <Stat label="SOURCES" value={snapshot.sources.length} />
        </div>
        <Bars values={totals.daily} labels={labels} tall />
      </section>

      <section aria-labelledby="new-link-title" className="flex flex-col gap-4">
        {creating ? (
          <div className="flex flex-col gap-4 rounded-sm border border-brass/50 bg-card/90 p-4 sm:p-5">
            <h2 id="new-link-title" className="flex items-center gap-2 font-serif text-xl font-black text-foreground">
              <Link2 className="size-5 text-brass" aria-hidden="true" />
              New link
            </h2>
            <LabelForm
              initial={{ source: "", title: "", path: "/carnival", note: "" }}
              submitLabel="Create link"
              onCancel={() => setCreating(false)}
              onDone={(source) => {
                setCreating(false)
                setCreated(source)
                router.refresh()
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="new-link-title" className="font-serif text-2xl font-black text-foreground">
              Sources
            </h2>
            <button
              type="button"
              onClick={() => {
                setCreating(true)
                setCreated(null)
              }}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 font-sans text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden="true" />
              New link
            </button>
          </div>
        )}

        {createdRow && (
          <div role="status" className="flex flex-col gap-2 rounded-sm border border-brass/50 bg-brass/10 p-4">
            <p className="font-sans text-sm font-bold text-foreground">{`"${createdRow.title}" is ready. Share this link:`}</p>
            <CopyButton text={linkFor(createdRow)} className="w-fit max-w-full" />
          </div>
        )}

        {snapshot.sources.length > 4 && (
          <label className="relative block">
            <span className="sr-only">Search sources</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or id"
              className={cn(inputCls, "pl-9")}
            />
          </label>
        )}

        {shown.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-6 text-center font-sans text-sm text-muted-foreground">
            {q ? "No source matches." : "No source visits yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shown.map((row) => (
              <SourceCard key={row.source} row={row} labels={labels} />
            ))}
          </ul>
        )}
      </section>

      {snapshot.recent.length > 0 && (
        <section aria-labelledby="recent-title" className="flex flex-col gap-3">
          <h2 id="recent-title" className="font-serif text-2xl font-black text-foreground">
            Latest arrivals
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-border bg-card/90 md:hidden">
            {snapshot.recent.map((h) => (
              <li key={h.id} className="flex flex-col gap-0.5 px-4 py-3 font-sans text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-bold text-foreground">{h.title ?? h.source}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{dateFmt.format(new Date(h.createdAt))}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {[h.path, h.deviceModel ?? h.device, h.inApp ?? (h.referrerHost === "direct" ? "Direct / QR" : h.referrerHost), h.city]
                    .filter(Boolean)
                    .join(" · ")}
                  {!h.isUnique && " · repeat"}
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-sm border border-border bg-card/90 md:block">
            <table className="w-full font-sans text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
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
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{dateFmt.format(new Date(h.createdAt))}</td>
                    <td className="px-3 py-2 text-foreground">
                      {h.title ?? <span className="font-mono text-xs">{h.source}</span>}
                      {!h.isUnique && <span className="ml-1.5 text-xs text-muted-foreground">(repeat)</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{h.path}</td>
                    <td className="px-3 py-2 text-foreground">{[h.deviceModel ?? h.device, h.os, h.browser].filter(Boolean).join(" · ")}</td>
                    <td className="px-3 py-2 text-foreground">{h.inApp ?? (h.referrerHost === "direct" ? "Direct / QR" : h.referrerHost)}</td>
                    <td className="px-3 py-2 text-foreground">{[h.city, h.country].filter(Boolean).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
