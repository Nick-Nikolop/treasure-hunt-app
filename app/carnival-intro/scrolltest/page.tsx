import { GuardScroll } from "@/components/carnival-intro/guard-scroll"
import { PALETTE } from "@/components/carnival-intro/palette"

export const metadata = { robots: { index: false } }

export default function Page() {
  return (
    <main style={PALETTE} className="min-h-svh bg-[var(--ci-night)] px-4 py-16">
      <GuardScroll />
    </main>
  )
}
