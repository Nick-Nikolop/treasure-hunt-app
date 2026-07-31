// TEMPORARY dev-only harness used to visually verify the Proofs panel against
// real database rows without a signed admin session. Deleted after verification.
import { notFound } from "next/navigation"
import { AdminProofsPanel } from "@/components/pythea/admin-proofs-panel"

export default function VerifyProofsPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <main className="min-h-screen bg-background p-8">
      <AdminProofsPanel />
    </main>
  )
}
