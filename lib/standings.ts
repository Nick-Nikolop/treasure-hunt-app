import "server-only"

import { db } from "@/lib/db"
import { user, team, teamMember, leadUnlock } from "@/lib/db/schema"
import { getLeadDefs } from "@/lib/leads"
import {
  COMPASS_ORDER,
  FINISH_ORDER,
  TRAIL_END_ORDER,
  isEndgameOrder,
  isLeadOneOpen,
  leadsSolvedCount,
  START_MS,
} from "@/lib/clues"

/**
 * FINAL STANDINGS
 *
 * The live leaderboard (`getLeaderboard` in lib/hunt.ts) ranks by trail progress
 * and arrival time only. That is right while the hunt is running, but it cannot
 * separate the endgame: reaching ANY endgame step makes the lead count read full,
 * so a crew that only found the Trail End note ties with the crew that actually
 * dug up the treasure.
 *
 * For the closing ceremony we need the real ordering, so this module ranks by the
 * endgame stage FIRST and only then falls back to trail progress:
 *
 *   1. stage      - treasure > compass > trail end > still on the trail
 *   2. progress   - how many leads are behind them
 *   3. decidedAt  - who got to that exact point first
 *   4. name       - stable final tiebreak
 *
 * It also returns a per-PLAYER ranking (every registered person, including people
 * inside a crew, which the live board folds into their team) so the ceremony can
 * honour individuals as well as crews.
 */

/** Endgame steps in play order: the note, then the compass, then the treasure. */
export type Stage = "none" | "trail_end" | "compass" | "treasure"

const STAGE_RANK: Record<Stage, number> = {
  none: 0,
  trail_end: 1,
  compass: 2,
  treasure: 3,
}

export type StandingRow = {
  kind: "team" | "player"
  id: string
  /** Team name, or the player's display name. */
  name: string
  /** 1-based finishing position after ranking. Ties share a position. */
  position: number
  /** How many leads are behind them. */
  progress: number
  /** Total leads on the trail, so the UI can render "8 / 10". */
  total: number
  stage: Stage
  /** True only for crews/players who reached the treasure. */
  finished: boolean
  /** Epoch ms of the moment that decided this position (highest step reached). */
  decidedAt: number | null
  /** Endgame milestone times, any of which may be null. */
  trailEndAt: number | null
  compassAt: number | null
  treasureAt: number | null
  /** Country of the lead they are standing on, for flavour. */
  country: string | null
  countryEn: string | null
  /** Team rows: member display names. Player rows: their crew name, or null. */
  members: string[]
  teamName: string | null
}

export type FinalStandings = {
  teams: StandingRow[]
  players: StandingRow[]
  total: number
  /** Headline numbers for the ceremony header. */
  stats: {
    teamCount: number
    playerCount: number
    finishedTeams: number
    /** Crews who reached at least the Trail End note. */
    endgameTeams: number
  }
}

function displayName(u: { firstName: string | null; name: string; email: string }): string {
  return u.firstName?.trim() || u.name?.trim() || u.email.split("@")[0]
}

/** Millis, with a fallback so nulls sort last instead of winning. */
function at(v: number | null, fallback: number): number {
  return v === null ? fallback : v
}

/**
 * Rank a list in place and stamp 1-based positions, letting genuine ties share a
 * position (two crews on the same stage, progress and exact timestamp are equal).
 */
function rankAndPosition(rows: StandingRow[]): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    const sa = STAGE_RANK[a.stage]
    const sb = STAGE_RANK[b.stage]
    if (sa !== sb) return sb - sa
    if (a.progress !== b.progress) return b.progress - a.progress
    const ta = at(a.decidedAt, Number.POSITIVE_INFINITY)
    const tb = at(b.decidedAt, Number.POSITIVE_INFINITY)
    if (ta !== tb) return ta - tb
    return a.name.localeCompare(b.name)
  })

  let position = 0
  let prevKey = ""
  sorted.forEach((row, i) => {
    const key = `${row.stage}|${row.progress}|${row.decidedAt ?? "x"}`
    if (key !== prevKey) {
      position = i + 1
      prevKey = key
    }
    row.position = position
  })
  return sorted
}

export async function getFinalStandings(nowMs: number = Date.now()): Promise<FinalStandings> {
  const [users, members, teams, unlocks, leadDefs] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        email: user.email,
      })
      .from(user),
    db.select({ userId: teamMember.userId, teamId: teamMember.teamId }).from(teamMember),
    db.select({ id: team.id, name: team.name }).from(team),
    db
      .select({
        userId: leadUnlock.userId,
        leadOrder: leadUnlock.leadOrder,
        unlockedAt: leadUnlock.unlockedAt,
      })
      .from(leadUnlock),
    getLeadDefs(),
  ])

  const total = leadDefs.length
  const countryByPos = new Map(
    leadDefs.map((d) => [d.order, { country: d.country, countryEn: d.countryEn }]),
  )
  const countryFor = (progress: number) =>
    countryByPos.get(progress) ?? { country: null, countryEn: null }
  const lead1Open = isLeadOneOpen(nowMs)

  // Group every unlock row by user.
  const byUser = new Map<string, { order: number; at: number }[]>()
  for (const row of unlocks) {
    const list = byUser.get(row.userId) ?? []
    list.push({ order: row.leadOrder, at: row.unlockedAt.getTime() })
    byUser.set(row.userId, list)
  }

  type Measured = {
    progress: number
    stage: Stage
    decidedAt: number | null
    trailEndAt: number | null
    compassAt: number | null
    treasureAt: number | null
  }

  /** Earliest time this user scanned a given sentinel, or null. */
  function sentinelAt(rows: { order: number; at: number }[], order: number): number | null {
    const times = rows.filter((r) => r.order === order).map((r) => r.at)
    return times.length ? Math.min(...times) : null
  }

  function measure(userId: string): Measured {
    const rows = byUser.get(userId) ?? []
    const storedMax = rows.reduce(
      (m, r) => (isEndgameOrder(r.order) ? m : Math.max(m, r.order)),
      0,
    )
    const inEndgame = rows.some((r) => isEndgameOrder(r.order))
    const progress = leadsSolvedCount(storedMax, inEndgame, nowMs, total)

    const trailEndAt = sentinelAt(rows, TRAIL_END_ORDER)
    const compassAt = sentinelAt(rows, COMPASS_ORDER)
    const treasureAt = sentinelAt(rows, FINISH_ORDER)

    // Highest step actually reached decides both the stage and the timestamp the
    // ranking compares, so like is always compared with like.
    let stage: Stage = "none"
    let decidedAt: number | null = null
    if (treasureAt !== null) {
      stage = "treasure"
      decidedAt = treasureAt
    } else if (compassAt !== null) {
      stage = "compass"
      decidedAt = compassAt
    } else if (trailEndAt !== null) {
      stage = "trail_end"
      decidedAt = trailEndAt
    } else if (progress > 0) {
      // Still on the trail: timed by the last real lead they scanned into. Lead 1
      // is handed to everyone at the start, so it has no scan of its own.
      decidedAt =
        progress === 1
          ? lead1Open
            ? START_MS
            : null
          : (rows.find((r) => r.order === storedMax)?.at ?? null)
    }

    return { progress, stage, decidedAt, trailEndAt, compassAt, treasureAt }
  }

  const userById = new Map(users.map((u) => [u.id, u]))

  // --- Teams: a crew is measured by its furthest member. ---
  const memberIdsOf = new Map<string, string[]>()
  const teamIdOfUser = new Map<string, string>()
  for (const m of members) {
    teamIdOfUser.set(m.userId, m.teamId)
    const list = memberIdsOf.get(m.teamId) ?? []
    list.push(m.userId)
    memberIdsOf.set(m.teamId, list)
  }
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]))

  const teamRows: StandingRow[] = teams.map((t) => {
    const ids = memberIdsOf.get(t.id) ?? []
    const measured = ids.map(measure)

    const bestStageRank = measured.reduce((m, x) => Math.max(m, STAGE_RANK[x.stage]), 0)
    const stage =
      (Object.keys(STAGE_RANK) as Stage[]).find((s) => STAGE_RANK[s] === bestStageRank) ?? "none"
    const progress = measured.reduce((m, x) => Math.max(m, x.progress), 0)

    // Among the members who actually reached the crew's best stage, the earliest
    // arrival is the crew's time.
    const decidedTimes = measured
      .filter((x) => STAGE_RANK[x.stage] === bestStageRank && x.decidedAt !== null)
      .map((x) => x.decidedAt as number)
    const decidedAt = decidedTimes.length ? Math.min(...decidedTimes) : null

    const firstOf = (pick: (m: Measured) => number | null) => {
      const times = measured.map(pick).filter((v): v is number => v !== null)
      return times.length ? Math.min(...times) : null
    }

    return {
      kind: "team" as const,
      id: t.id,
      name: t.name,
      position: 0,
      progress,
      total,
      stage,
      finished: stage === "treasure",
      decidedAt,
      trailEndAt: firstOf((m) => m.trailEndAt),
      compassAt: firstOf((m) => m.compassAt),
      treasureAt: firstOf((m) => m.treasureAt),
      ...countryFor(progress),
      members: ids
        .map((id) => userById.get(id))
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map(displayName),
      teamName: null,
    }
  })

  // --- Players: every registered person on their own merits. ---
  const playerRows: StandingRow[] = users.map((u) => {
    const m = measure(u.id)
    const teamId = teamIdOfUser.get(u.id)
    return {
      kind: "player" as const,
      id: u.id,
      name: displayName(u),
      position: 0,
      progress: m.progress,
      total,
      stage: m.stage,
      finished: m.stage === "treasure",
      decidedAt: m.decidedAt,
      trailEndAt: m.trailEndAt,
      compassAt: m.compassAt,
      treasureAt: m.treasureAt,
      ...countryFor(m.progress),
      members: [],
      teamName: teamId ? (teamNameById.get(teamId) ?? null) : null,
    }
  })

  const rankedTeams = rankAndPosition(teamRows)
  const rankedPlayers = rankAndPosition(playerRows)

  return {
    teams: rankedTeams,
    players: rankedPlayers,
    total,
    stats: {
      teamCount: rankedTeams.length,
      playerCount: rankedPlayers.length,
      finishedTeams: rankedTeams.filter((t) => t.finished).length,
      endgameTeams: rankedTeams.filter((t) => t.stage !== "none").length,
    },
  }
}
