"use client"

import { useState } from "react"
import { Footprints, MapPin, Monitor, UserPlus, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Journey, JourneySession } from "@/lib/people"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { describeEvent, duration, longDateFmt, timeFmt, dateTimeFmt, type EventTone } from "@/components/analytics/format"

const COLLAPSED = 30

const toneCls: Record<EventTone, string> = {
  key: "text-brass font-bold",
  error: "text-destructive font-bold",
  page: "text-foreground font-bold",
  normal: "text-foreground",
  quiet: "text-muted-foreground",
}

const dotCls: Record<EventTone, string> = {
  key: "bg-brass",
  error: "bg-destructive",
  page: "bg-foreground",
  normal: "bg-muted-foreground",
  quiet: "bg-border",
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</span>
      <span className="font-sans text-xl font-bold leading-none tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-sans text-sm text-foreground">{children}</dd>
    </div>
  )
}

function SessionCard({ s, index, hideQuiet }: { s: JourneySession; index: number; hideQuiet: boolean }) {
  const [open, setOpen] = useState(index < 3)
  const [all, setAll] = useState(false)
  const events = s.events
    .map((e) => ({ e, d: describeEvent(e) }))
    .filter(({ e, d }) => e.name !== "session.start" && (!hideQuiet || d.tone !== "quiet"))
  const visible = all ? events : events.slice(0, COLLAPSED)
  const pages = new Set(s.events.filter((e) => e.name === "page.view").map((e) => e.path)).size

  return (
    <li className={cn("rounded-sm border bg-card/90", s.signedUp ? "border-brass/60" : "border-border")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-sans text-sm font-bold text-foreground">
            {longDateFmt.format(new Date(s.startedAt))}
            {s.signedUp && (
              <span className="rounded-sm bg-brass/15 px-1.5 text-[10px] font-bold text-brass">SIGNED UP THIS VISIT</span>
            )}
          </span>
          <span className="truncate font-sans text-xs text-muted-foreground">
            {[
              s.entry ? `From ${s.entry.label}` : null,
              s.landingPath ? `landed on ${s.landingPath}` : null,
              s.device,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <span className="shrink-0 font-sans text-xs tabular-nums text-muted-foreground">
          {pages} pages · {events.length} steps · {duration(s.activeMs || new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime())}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {events.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">Only background events in this visit.</p>
          ) : (
            <ol className="relative flex flex-col gap-2 border-l border-border pl-4">
              {visible.map(({ e, d }) => (
                <li key={e.id} className="relative flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className={cn("absolute -left-[1.3rem] top-1.5 size-2 rounded-full", dotCls[d.tone])} aria-hidden="true" />
                  <time dateTime={e.at} className="w-16 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {timeFmt.format(new Date(e.at))}
                  </time>
                  <span className={cn("min-w-0 font-sans text-sm leading-relaxed", toneCls[d.tone])}>
                    {d.text}
                    {d.detail && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{d.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {events.length > COLLAPSED && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-3 font-sans text-xs font-bold text-brass hover:underline"
            >
              {all ? "Show less" : `Show all ${events.length} steps`}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export function JourneyView({ journey }: { journey: Journey }) {
  const [hideQuiet, setHideQuiet] = useState(false)
  const { account, totals, firstTouch } = journey
  const signupDevice = journey.devices.find((d) => d.linkedVia === "signup")

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <AnalyticsHeader
        title={account ? account.name || account.email : "Anonymous visitor"}
        description={account ? account.email : "No account yet. This device has not signed up or signed in."}
        back={{ href: "/analytics/people", label: "People" }}
      />

      <section aria-label="Summary" className="grid gap-6 rounded-sm border border-border bg-card/90 p-4 sm:p-6 md:grid-cols-2">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Fact label="FIRST CAME FROM">
            {firstTouch ? (
              <>
                {firstTouch.source.label}
                {firstTouch.source.id && firstTouch.source.id !== firstTouch.source.label && (
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{firstTouch.source.id}</span>
                )}
              </>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="FIRST SEEN">{firstTouch ? dateTimeFmt.format(new Date(firstTouch.at)) : "—"}</Fact>
          <Fact label="LANDED ON">
            <span className="font-mono text-xs">{firstTouch?.path ?? "—"}</span>
          </Fact>
          <Fact label="REFERRER">
            <span className="font-mono text-xs">{firstTouch?.referrer ?? "none (direct / QR / app)"}</span>
          </Fact>
          <Fact label="ACCOUNT">
            {account ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5 text-brass" aria-hidden="true" />
                Created {dateTimeFmt.format(new Date(account.createdAt))}
                {!account.emailVerified && <span className="text-muted-foreground">(unverified)</span>}
              </span>
            ) : (
              "No"
            )}
          </Fact>
          <Fact label="SIGN-UP">
            {signupDevice ? (
              <span className="inline-flex items-center gap-1.5">
                <UserPlus className="size-3.5 text-brass" aria-hidden="true" />
                After visiting, on {signupDevice.label}
              </span>
            ) : account ? (
              "Before tracking, or on an untracked device"
            ) : (
              "—"
            )}
          </Fact>
        </dl>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="VISITS" value={totals.visits} />
            <Stat label="PAGE VIEWS" value={totals.pageViews} />
            <Stat label="CLICKS" value={totals.clicks} />
            <Stat label="TIME ON SITE" value={duration(totals.activeMs)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-sans text-[11px] font-bold tracking-chip text-muted-foreground">DEVICES</span>
            <ul className="flex flex-col gap-1.5">
              {journey.devices.map((d) => (
                <li key={d.anonId} className="flex items-baseline gap-2 font-sans text-sm text-foreground">
                  <Monitor className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">{d.label}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {d.linkedVia ? `linked by ${d.linkedVia}` : "not linked"}
                  </span>
                </li>
              ))}
            </ul>
            {journey.places.length > 0 && (
              <p className="flex items-center gap-1.5 font-sans text-sm text-foreground">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {journey.places.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="visits-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="visits-title" className="flex items-center gap-2 font-serif text-2xl font-black text-foreground">
            <Footprints className="size-5 text-brass" aria-hidden="true" />
            Every visit
          </h2>
          <label className="flex items-center gap-2 font-sans text-xs text-muted-foreground">
            <input type="checkbox" checked={hideQuiet} onChange={(e) => setHideQuiet(e.target.checked)} className="accent-brass" />
            Hide scroll and time-on-page lines
          </label>
        </div>
        {totals.truncated && (
          <p className="font-sans text-xs text-muted-foreground">Very long history: showing the most recent 4,000 events.</p>
        )}
        {journey.sessions.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-6 text-center font-sans text-sm text-muted-foreground">
            No recorded activity yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {journey.sessions.map((s, i) => (
              <SessionCard key={s.id} s={s} index={i} hideQuiet={hideQuiet} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
