import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin"
import { getAdminData } from "@/app/admin/actions"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { AdminDashboard } from "@/components/pythea/admin-dashboard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin · Pythea",
  description: "Superadmin control room.",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  // Guard: only superadmins (or the bootstrap email, auto-promoted) get in.
  const admin = await getAdminUser()
  if (!admin) redirect("/")

  const data = await getAdminData()

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-screen flex-col">
        <AdminDashboard data={data} currentUserId={admin.id} />
      </div>
    </>
  )
}
