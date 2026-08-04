import { getFinalStandings, toStandingsBoard } from "@/lib/standings"
import { AdminStandingsView } from "@/components/pythea/admin-standings-view"

export const dynamic = "force-dynamic"

export default async function TmpStandingsPage() {
  const data = toStandingsBoard(await getFinalStandings())
  return <AdminStandingsView data={data} />
}
