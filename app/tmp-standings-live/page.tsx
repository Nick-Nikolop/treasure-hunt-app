// TEMPORARY verification page: renders the real standings board without the
// superadmin guard so it can be inspected in the browser. Deleted after checking.
import { getFinalStandings, toStandingsBoard } from "@/lib/standings"
import { AdminStandingsView } from "@/components/pythea/admin-standings-view"

export const dynamic = "force-dynamic"

export default async function TmpStandingsPage() {
  const data = toStandingsBoard(await getFinalStandings())
  return <AdminStandingsView data={data} />
}
