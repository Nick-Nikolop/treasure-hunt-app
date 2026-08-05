import { AdminStandingsView } from "@/components/pythea/admin-standings-view"
import { getFinalStandings, toStandingsBoard } from "@/lib/standings"

// TEMP: ungated mirror of /standings, used only to verify the band funnel
// numbers in the browser. Deleted at the end of this task.
export const dynamic = "force-dynamic"

export default async function TmpStandingsLivePage() {
  const board = toStandingsBoard(await getFinalStandings())
  return <AdminStandingsView data={board} />
}
