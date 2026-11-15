import type { Metadata } from "next"
import { headers } from "next/headers"
import { ArLab } from "@/components/ar-lab/lab"
import { getAdminUser } from "@/lib/admin"
import { MAX_TARGETS, listTargets } from "@/lib/ar-lab/storage"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "AR Lab",
  description: "Τεχνικό demo αναγνώρισης εικόνας για το The Hunt.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function ArLabPage() {
  const [session, admin, targets] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getAdminUser(),
    listTargets(),
  ])

  return <ArLab targets={targets} isAdmin={!!admin} signedIn={!!session?.user} maxTargets={MAX_TARGETS} />
}
