import { getFinalStandings, toStandingsBoard } from "@/lib/standings"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AdminStandingsView } from "@/components/pythea/admin-standings-view"

export const dynamic = "force-dynamic"

// TEMP: unguarded mirror of /standings for mobile layout review only. Delete.
export default async function TmpStandingsPage() {
  const data = toStandingsBoard(await getFinalStandings())
  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AdminStandingsView data={data} />
      </div>
    </>
  )
}
