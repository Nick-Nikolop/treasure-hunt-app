import type { Metadata } from "next"
import { ArLab } from "@/components/ar-lab/lab"
import { getAdminUser } from "@/lib/admin"
import { MAX_TARGETS, listTargets } from "@/lib/ar-lab/storage"

export const metadata: Metadata = {
  title: "AR Lab",
  description: "Τεχνικό demo αναγνώρισης εικόνας για το The Hunt.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function ArLabPage() {
  const [admin, targets] = await Promise.all([getAdminUser(), listTargets()])

  return <ArLab targets={targets} isAdmin={!!admin} maxTargets={MAX_TARGETS} />
}
