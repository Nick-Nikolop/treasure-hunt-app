// TEMPORARY verification page. Fixture data only, no DB access, deleted after
// the visual check.
import type { FinalStandings, StandingRow } from "@/lib/standings"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AdminStandingsView } from "@/components/pythea/admin-standings-view"

const T = (
  name: string,
  position: number,
  progress: number,
  stage: StandingRow["stage"],
  decidedAt: number | null,
  members: string[],
): StandingRow => ({
  kind: "team",
  id: name,
  name,
  position,
  progress,
  total: 10,
  stage,
  finished: stage === "treasure",
  decidedAt,
  trailEndAt: decidedAt,
  compassAt: null,
  treasureAt: stage === "treasure" ? decidedAt : null,
  country: progress >= 10 ? "Φινλανδία" : "Ιταλία",
  countryEn: null,
  members,
  teamName: null,
})

const base = Date.parse("2026-08-01T06:20:58Z")

const data: FinalStandings = {
  total: 10,
  teams: [
    T("Scan & Deliver", 1, 10, "treasure", base, ["Νίκος", "Μαρία", "Γιώργος"]),
    T("Ορτίλοχος", 2, 10, "compass", base - 50_000_000, ["Ελένη", "Κώστας"]),
    T("Ανεξήγητα χαμένοι", 3, 10, "compass", base - 4_000_000, ["Δημήτρης", "Άννα"]),
    T("Νικητές παραλίγο", 4, 10, "compass", base - 3_000_000, ["Σοφία"]),
    T("Γυναικεία υπόθεση", 5, 10, "trail_end", base - 80_000_000, ["Ιωάννα", "Πέτρος"]),
    T("Καλημέρα από τη Πρέσπα", 6, 7, "none", base - 90_000_000, ["Θανάσης"]),
  ],
  players: [],
  stats: { teamCount: 17, playerCount: 41, finishedTeams: 1, endgameTeams: 12 },
}

export default function TmpPreview() {
  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AdminStandingsView data={data} />
      </div>
    </>
  )
}
