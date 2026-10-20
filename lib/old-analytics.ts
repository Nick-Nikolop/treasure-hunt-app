import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getFinalStandings, type StandingRow } from "@/lib/standings"

/**
 * Everything the database still knows about Hunt #1 (Pythea), for the admin
 * archive at /oldanalytics. Read-only. Admin accounts (role superadmin) are
 * excluded from player numbers wherever the row carries a user id.
 *
 * Event-based numbers are limited to the hunt window: first player sign-up
 * until 2 days after the configured close (ceremony traffic included).
 * Campaign links are shown over their whole life, since they kept running.
 */

const ATHENS = sql.raw(`'Europe/Athens'`)
/** Timestamp columns are stored as UTC without zone; this renders Athens local time. */
const local = (col: string) => sql.raw(`(("${col}" at time zone 'UTC') at time zone ${"'Europe/Athens'"})`)

export type Count = { label: string; count: number }
export type DayPoint = { day: string; signups: number; devices: number; views: number }

export type LeadStat = {
  order: number
  country: string
  players: number
  bySource: Record<string, number>
  journalViews: number
  proofs: { approved: number; rejected: number; pending: number }
  firstName: string | null
  firstAt: string | null
  /** Median hours between unlocking the previous lead and this one. */
  medianHours: number | null
}

export type CampaignStat = {
  name: string
  label: string | null
  token: string
  visits: number
  unique: number
  firstAt: string | null
  lastAt: string | null
  signups: number
  ctaClicks: number
}

export type PageStat = { path: string; views: number; devices: number; avgSeconds: number | null }

export type OldHuntAnalytics = {
  window: { start: string; close: string; end: string }
  totals: {
    players: number
    verified: number
    teams: number
    teamPlayers: number
    soloPlayers: number
    preRegistrations: number
    sessions: number
    devices: number
    visits: number
    pageViews: number
    leadUnlocks: number
    proofs: number
    finishers: number
    events: number
  }
  days: DayPoint[]
  funnel: Count[]
  leads: LeadStat[]
  campaigns: CampaignStat[]
  proofs: {
    byOutcome: Count[]
    medianDecisionMinutes: number | null
    reviewers: Count[]
  }
  scans: { results: Count[]; gpsOk: number; gpsFail: number; failAvgDistanceM: number | null }
  teamSizes: Count[]
  finale: Count[]
  audience: {
    devices: Count[]
    os: Count[]
    browsers: Count[]
    ages: Count[]
    languages: Count[]
    settings: Count[]
    loginErrors: Count[]
    cta: Count[]
  }
  pages: PageStat[]
  /** [weekday 0=Mon..6=Sun][hour 0..23] page views, Athens time. */
  heatmap: number[][]
  actions: (Count & { category: string })[]
  standings: StandingRow[]
}

const n = (v: unknown) => Number(v ?? 0)
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)
const rows = <T>(r: { rows: unknown[] }) => r.rows as T[]

export async function getOldHuntAnalytics(): Promise<OldHuntAnalytics> {
  const bounds = rows<{ start: string | null; close: string | null }>(
    await db.execute(sql`
      select (select min("createdAt") from "user" where role <> 'superadmin') as start,
             (select "huntCloseAt" from score_config limit 1) as close
    `),
  )[0]
  const start = new Date(bounds?.start ?? "2026-06-23T00:00:00Z")
  const close = new Date(bounds?.close ?? "2026-08-01T14:00:00Z")
  const end = new Date(close.getTime() + 2 * 86_400_000)
  const S = start.toISOString()
  const E = end.toISOString()
  const inWindow = sql`e."createdAt" >= ${S}::timestamp and e."createdAt" < ${E}::timestamp`
  const notAdmin = sql`(e."userId" is null or e."userId" not in (select id from "user" where role = 'superadmin'))`

  const [
    totalsR,
    daysR,
    funnelR,
    leadsR,
    leadSrcR,
    leadViewsR,
    leadProofsR,
    leadFirstR,
    leadGapR,
    campaignsR,
    proofOutcomeR,
    proofTimeR,
    reviewersR,
    scanResultR,
    gpsR,
    teamSizeR,
    finaleR,
    devR,
    osR,
    browserR,
    ageR,
    langR,
    settingsR,
    loginErrR,
    ctaR,
    pagesR,
    heatR,
    actionsR,
    standings,
  ] = await Promise.all([
    db.execute(sql`
      with players as (select id, "emailVerified" from "user" where role <> 'superadmin'),
      crew as (select tm."userId" from team_member tm join players p on p.id = tm."userId")
      select
        (select count(*) from players)::int as players,
        (select count(*) from players where "emailVerified")::int as verified,
        (select count(distinct tm."teamId") from team_member tm join players p on p.id = tm."userId")::int as teams,
        (select count(*) from crew)::int as "teamPlayers",
        (select count(*) from players where id not in (select "userId" from crew))::int as "soloPlayers",
        (select count(*) from phase_lead)::int as "preRegistrations",
        (select count(*) from session s join players p on p.id = s."userId")::int as sessions,
        (select count(distinct e."anonId") from analytics_event e where ${inWindow})::int as devices,
        (select count(*) from analytics_event e where e.name = 'session.start' and ${inWindow} and ${notAdmin})::int as visits,
        (select count(*) from analytics_event e where e.name = 'page.view' and ${inWindow} and ${notAdmin})::int as "pageViews",
        (select count(*) from lead_unlock lu join players p on p.id = lu."userId")::int as "leadUnlocks",
        (select count(*) from proof_submission ps join players p on p.id = ps."userId")::int as proofs,
        (select count(distinct a."actorId") from activity_log a join players p on p.id = a."actorId" where a.action = 'lead.finished')::int as finishers,
        (select count(*) from analytics_event e where ${inWindow})::int as events
    `),
    db.execute(sql`
      with d as (
        select generate_series(date_trunc('day', ${S}::timestamp at time zone 'UTC' at time zone ${ATHENS}),
                               date_trunc('day', ${E}::timestamp at time zone 'UTC' at time zone ${ATHENS}),
                               interval '1 day')::date as day
      ),
      su as (select ${local("createdAt")}::date as day, count(*)::int n from "user" where role <> 'superadmin' group by 1),
      ev as (
        select (("createdAt" at time zone 'UTC') at time zone ${ATHENS})::date as day,
               count(distinct "anonId")::int devices,
               (count(*) filter (where name = 'page.view'))::int views
        from analytics_event e where ${inWindow} group by 1
      )
      select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(su.n, 0) as signups,
             coalesce(ev.devices, 0) as devices, coalesce(ev.views, 0) as views
      from d left join su on su.day = d.day left join ev on ev.day = d.day order by d.day
    `),
    db.execute(sql`
      with players as (select id, "emailVerified" from "user" where role <> 'superadmin')
      select
        (select count(distinct e."anonId") from analytics_event e where ${inWindow})::int as visited,
        (select count(distinct e."anonId") from analytics_event e where e.name = 'auth.view' and ${inWindow})::int as "authView",
        (select count(distinct coalesce(e."anonId", e.id)) from analytics_event e where e.name = 'auth.register.submit' and ${inWindow})::int as "registerSubmit",
        (select count(*) from players)::int as registered,
        (select count(*) from players where "emailVerified")::int as verified,
        (select count(distinct lu."userId") from lead_unlock lu join players p on p.id = lu."userId")::int as unlocked,
        (select count(distinct lu."userId") from lead_unlock lu join players p on p.id = lu."userId" where lu."leadOrder" >= 5)::int as half,
        (select count(distinct a."actorId") from activity_log a join players p on p.id = a."actorId" where a.action = 'lead.finished')::int as finished,
        (select count(distinct f."userId") from finale_grant f join players p on p.id = f."userId" where f.view = 'treasure')::int as treasure
    `),
    db.execute(sql`
      select l.position as "order", l.country,
        count(distinct lu."userId")::int as players
      from lead l
      left join lead_unlock lu on lu."leadOrder" = l.position
        and lu."userId" not in (select id from "user" where role = 'superadmin')
      group by l.position, l.country order by l.position
    `),
    db.execute(sql`
      select lu."leadOrder" as "order", lu.source, count(*)::int n
      from lead_unlock lu where lu."userId" not in (select id from "user" where role = 'superadmin')
      group by 1, 2
    `),
    db.execute(sql`
      select (e.props->>'leadOrder')::int as "order", count(*)::int n
      from analytics_event e
      where e.name = 'hunt.journal_lead_view' and ${notAdmin} and e.props->>'leadOrder' ~ '^[0-9]+$'
      group by 1
    `),
    db.execute(sql`
      select ps."leadOrder" as "order", ps.status, count(*)::int n
      from proof_submission ps where ps."userId" not in (select id from "user" where role = 'superadmin')
      group by 1, 2
    `),
    db.execute(sql`
      select distinct on (lu."leadOrder") lu."leadOrder" as "order", lu."unlockedAt" as at,
        coalesce(nullif(trim(u."firstName"), ''), u.name) as name
      from lead_unlock lu join "user" u on u.id = lu."userId"
      where u.role <> 'superadmin' and lu.source not in ('admin', 'skip')
      order by lu."leadOrder", lu."unlockedAt"
    `),
    db.execute(sql`
      with u as (
        select lu."userId", lu."leadOrder", min(lu."unlockedAt") at
        from lead_unlock lu where lu."userId" not in (select id from "user" where role = 'superadmin')
        group by 1, 2
      )
      select cur."leadOrder" as "order",
        percentile_cont(0.5) within group (order by extract(epoch from cur.at - prev.at) / 3600.0) as hours
      from u cur join u prev on prev."userId" = cur."userId" and prev."leadOrder" = cur."leadOrder" - 1
      where cur.at > prev.at
      group by 1
    `),
    db.execute(sql`
      with signups as (
        select e.props->>'campaignSource' as token, count(distinct coalesce(e."userId", e."anonId"))::int n
        from analytics_event e where e.name = 'auth.register.success' group by 1
      ),
      cta as (
        select e.props->>'campaignSource' as token, count(*)::int n
        from analytics_event e where e.name = 'cta.click' group by 1
      )
      select l.name, l.label, l.token,
        count(v.id)::int as visits,
        (count(v.id) filter (where v."isUnique"))::int as "unique",
        min(v."createdAt") as "firstAt", max(v."createdAt") as "lastAt",
        coalesce(max(s.n), 0)::int as signups, coalesce(max(c.n), 0)::int as "ctaClicks"
      from campaign_link l
      left join campaign_visit v on v."linkId" = l.id
      left join signups s on s.token = l.token
      left join cta c on c.token = l.token
      group by l.id, l.name, l.label, l.token
      order by visits desc
    `),
    db.execute(sql`
      select ps.status || ' · ' || ps.context as label, count(*)::int as count
      from proof_submission ps where ps."userId" not in (select id from "user" where role = 'superadmin')
      group by 1 order by 2 desc
    `),
    db.execute(sql`
      select percentile_cont(0.5) within group (order by extract(epoch from "decidedAt" - "createdAt") / 60.0) as minutes
      from proof_submission where "decidedAt" is not null
    `),
    db.execute(sql`
      select coalesce("reviewerName", '—') as label, count(*)::int as count
      from proof_submission where "decidedAt" is not null group by 1 order by 2 desc
    `),
    db.execute(sql`
      select coalesce(e.props->>'status', '—') as label, count(*)::int as count
      from analytics_event e where e.name = 'hunt.scan_result' and ${notAdmin} group by 1 order by 2 desc
    `),
    db.execute(sql`
      select (count(*) filter (where ok))::int as ok, (count(*) filter (where not ok))::int as fail,
        round(avg("distanceM") filter (where not ok))::int as "failAvg"
      from scan_ping where "userId" not in (select id from "user" where role = 'superadmin')
    `),
    db.execute(sql`
      with sizes as (
        select tm."teamId", count(*)::int size from team_member tm
        join "user" u on u.id = tm."userId" where u.role <> 'superadmin' group by 1
      )
      select size::text || (case when size = 1 then ' player' else ' players' end) as label, count(*)::int as count
      from sizes group by size order by size
    `),
    db.execute(sql`
      select f.view as label, count(distinct f."userId")::int as count
      from finale_grant f join "user" u on u.id = f."userId" where u.role <> 'superadmin'
      group by 1 order by 2 desc
    `),
    db.execute(sql`
      select coalesce(e.device, '—') as label, count(distinct e."anonId")::int as count
      from analytics_event e where ${inWindow} and e."anonId" is not null group by 1 order by 2 desc
    `),
    db.execute(sql`
      select coalesce(e.os, '—') as label, count(distinct e."anonId")::int as count
      from analytics_event e where ${inWindow} and e."anonId" is not null group by 1 order by 2 desc limit 8
    `),
    db.execute(sql`
      select coalesce(e.browser, '—') as label, count(distinct e."anonId")::int as count
      from analytics_event e where ${inWindow} and e."anonId" is not null group by 1 order by 2 desc limit 8
    `),
    db.execute(sql`
      select case when "yearOfBirth" is null then 'Not given'
                  else (2026 - "yearOfBirth")::int / 10 * 10 || '–' || ((2026 - "yearOfBirth")::int / 10 * 10 + 9) end as label,
             count(*)::int as count
      from "user" where role <> 'superadmin'
      group by 1 order by min(coalesce(2026 - "yearOfBirth", 999))
    `),
    db.execute(sql`
      select 'Switched to ' || upper(coalesce(e.props->>'locale', '?')) as label, count(*)::int as count
      from analytics_event e where e.name = 'settings.language_toggle' and ${notAdmin} group by 1 order by 2 desc
    `),
    db.execute(sql`
      select case e.name when 'settings.theme_toggle' then 'Theme toggle'
                         when 'settings.lite_toggle' then 'Lite mode toggle' else e.name end as label,
             count(*)::int as count
      from analytics_event e where e.name in ('settings.theme_toggle', 'settings.lite_toggle') and ${notAdmin}
      group by 1 order by 2 desc
    `),
    db.execute(sql`
      select coalesce(e.props->>'reason', e.props->>'code', '—') as label, count(*)::int as count
      from analytics_event e where e.name in ('auth.login.error', 'auth.register.error') and ${notAdmin}
      group by 1 order by 2 desc limit 8
    `),
    db.execute(sql`
      select coalesce(e.props->>'id', '—') || ' · ' || coalesce(e.props->>'location', '—') as label, count(*)::int as count
      from analytics_event e where e.name = 'cta.click' and ${notAdmin} group by 1 order by 2 desc limit 10
    `),
    db.execute(sql`
      select regexp_replace(coalesce(e.path, '/'), '\\?.*$', '') as path,
        (count(*) filter (where e.name = 'page.view'))::int as views,
        count(distinct e."anonId") filter (where e.name = 'page.view')::int as devices,
        round(avg(e."durationMs") filter (where e.name = 'page.leave' and e."durationMs" between 1000 and 3600000) / 1000.0)::int as "avgSeconds"
      from analytics_event e
      where ${inWindow} and ${notAdmin} and e.name in ('page.view', 'page.leave')
        and coalesce(e.path, '') not like '/admin%'
      group by 1 having count(*) filter (where e.name = 'page.view') > 0
      order by views desc limit 15
    `),
    db.execute(sql`
      select (extract(isodow from ${local("createdAt")})::int - 1) as dow,
             extract(hour from ${local("createdAt")})::int as hour, count(*)::int as n
      from analytics_event e where e.name = 'page.view' and ${inWindow} and ${notAdmin}
      group by 1, 2
    `),
    db.execute(sql`
      select category, action as label, count(*)::int as count
      from activity_log group by 1, 2 order by 3 desc
    `),
    getFinalStandings(close.getTime()).catch(() => null),
  ])

  const t = rows<Record<string, unknown>>(totalsR)[0] ?? {}
  const f = rows<Record<string, unknown>>(funnelR)[0] ?? {}

  const bySource = new Map<number, Record<string, number>>()
  for (const r of rows<{ order: number; source: string; n: number }>(leadSrcR)) {
    const m = bySource.get(r.order) ?? {}
    m[r.source] = n(r.n)
    bySource.set(r.order, m)
  }
  const views = new Map(rows<{ order: number; n: number }>(leadViewsR).map((r) => [n(r.order), n(r.n)]))
  const proofs = new Map<number, { approved: number; rejected: number; pending: number }>()
  for (const r of rows<{ order: number; status: string; n: number }>(leadProofsR)) {
    const p = proofs.get(r.order) ?? { approved: 0, rejected: 0, pending: 0 }
    if (r.status === "approved" || r.status === "rejected" || r.status === "pending") p[r.status] += n(r.n)
    proofs.set(r.order, p)
  }
  const first = new Map(rows<{ order: number; at: string; name: string }>(leadFirstR).map((r) => [n(r.order), r]))
  const gaps = new Map(rows<{ order: number; hours: number }>(leadGapR).map((r) => [n(r.order), Number(r.hours)]))

  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const r of rows<{ dow: number; hour: number; n: number }>(heatR)) {
    if (r.dow >= 0 && r.dow < 7 && r.hour >= 0 && r.hour < 24) heatmap[r.dow][r.hour] = n(r.n)
  }

  const counts = (r: { rows: unknown[] }): Count[] =>
    rows<{ label: string; count: number }>(r).map((x) => ({ label: String(x.label), count: n(x.count) }))

  const gps = rows<{ ok: number; fail: number; failAvg: number | null }>(gpsR)[0]

  return {
    window: { start: start.toISOString(), close: close.toISOString(), end: end.toISOString() },
    totals: {
      players: n(t.players),
      verified: n(t.verified),
      teams: n(t.teams),
      teamPlayers: n(t.teamPlayers),
      soloPlayers: n(t.soloPlayers),
      preRegistrations: n(t.preRegistrations),
      sessions: n(t.sessions),
      devices: n(t.devices),
      visits: n(t.visits),
      pageViews: n(t.pageViews),
      leadUnlocks: n(t.leadUnlocks),
      proofs: n(t.proofs),
      finishers: n(t.finishers),
      events: n(t.events),
    },
    days: rows<DayPoint>(daysR).map((d) => ({
      day: d.day,
      signups: n(d.signups),
      devices: n(d.devices),
      views: n(d.views),
    })),
    funnel: [
      { label: "Visited the site", count: n(f.visited) },
      { label: "Opened sign-up / login", count: n(f.authView) },
      { label: "Created an account", count: n(f.registered) },
      { label: "Verified email", count: n(f.verified) },
      { label: "Unlocked a lead", count: n(f.unlocked) },
      { label: "Reached lead 5", count: n(f.half) },
      { label: "Finished the trail", count: n(f.finished) },
      { label: "Reached the treasure", count: n(f.treasure) },
    ],
    leads: rows<{ order: number; country: string; players: number }>(leadsR).map((l) => {
      const o = n(l.order)
      const fr = first.get(o)
      const gap = gaps.get(o)
      return {
        order: o,
        country: l.country,
        // Lead 1 is open to every player from the start, so it has no unlock rows.
        players: o === 1 ? n(t.players) : n(l.players),
        bySource: bySource.get(o) ?? {},
        journalViews: views.get(o) ?? 0,
        proofs: proofs.get(o) ?? { approved: 0, rejected: 0, pending: 0 },
        firstName: fr?.name ?? null,
        firstAt: iso(fr?.at),
        medianHours: gap === undefined || Number.isNaN(gap) ? null : Math.round(gap * 10) / 10,
      }
    }),
    campaigns: rows<Record<string, unknown>>(campaignsR).map((c) => ({
      name: String(c.name),
      label: (c.label as string | null) ?? null,
      token: String(c.token),
      visits: n(c.visits),
      unique: n(c.unique),
      firstAt: iso(c.firstAt),
      lastAt: iso(c.lastAt),
      signups: n(c.signups),
      ctaClicks: n(c.ctaClicks),
    })),
    proofs: {
      byOutcome: counts(proofOutcomeR),
      medianDecisionMinutes: (() => {
        const m = rows<{ minutes: number | null }>(proofTimeR)[0]?.minutes
        return m === null || m === undefined ? null : Math.round(Number(m))
      })(),
      reviewers: counts(reviewersR),
    },
    scans: {
      results: counts(scanResultR),
      gpsOk: n(gps?.ok),
      gpsFail: n(gps?.fail),
      failAvgDistanceM: gps?.failAvg === null || gps?.failAvg === undefined ? null : n(gps.failAvg),
    },
    teamSizes: counts(teamSizeR),
    finale: counts(finaleR),
    audience: {
      devices: counts(devR),
      os: counts(osR),
      browsers: counts(browserR),
      ages: counts(ageR),
      languages: counts(langR),
      settings: counts(settingsR),
      loginErrors: counts(loginErrR),
      cta: counts(ctaR),
    },
    pages: rows<Record<string, unknown>>(pagesR).map((p) => ({
      path: String(p.path),
      views: n(p.views),
      devices: n(p.devices),
      avgSeconds: p.avgSeconds === null ? null : n(p.avgSeconds),
    })),
    heatmap,
    actions: rows<{ category: string; label: string; count: number }>(actionsR).map((a) => ({
      category: a.category,
      label: a.label,
      count: n(a.count),
    })),
    standings: standings?.entries ?? [],
  }
}
