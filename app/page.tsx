import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { Hero } from "@/components/pythea/hero"
import { Story } from "@/components/pythea/story"
import { Journey } from "@/components/pythea/journey"
import { Treasure } from "@/components/pythea/treasure"
import { HowItWorks } from "@/components/pythea/how-it-works"
import { Register } from "@/components/pythea/register"
import { SiteFooter } from "@/components/pythea/site-footer"
import { buildClueState } from "@/lib/clues"

// Recompute against the live clock on each request (for the countdown state).
export const dynamic = "force-dynamic"

export default function Page() {
  // Only non-spoiler counts are passed to the landing page.
  const state = buildClueState(Date.now())

  return (
    <>
      <Atmosphere />
      <SiteHeader />
      <main className="relative">
        <Hero />
        <Story />
        <Journey
          unlockedCount={state.unlockedCount}
          total={state.total}
          nextUnlockMs={state.nextUnlockMs}
        />
        <Treasure />
        <HowItWorks />
        <Register />
      </main>
      <SiteFooter />
    </>
  )
}
