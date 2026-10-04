import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Download } from "lucide-react"
import { getAdminUser, isBootstrapEmail } from "@/lib/admin"
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
        <AdminDashboard
          data={data}
          currentUserId={admin.id}
          isBootstrap={isBootstrapEmail(admin.email)}
        />
      </div>
      <a
        href="/admin/motion-kit"
        download
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download className="size-4" aria-hidden="true" />
        Download motion kit (.zip)
      </a>
    </>
  )
}
