import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { Hero } from "@/components/pythea/hero"
import { Story } from "@/components/pythea/story"
import { Journey } from "@/components/pythea/journey"
import { Treasure } from "@/components/pythea/treasure"
import { HowItWorks } from "@/components/pythea/how-it-works"
import { Register } from "@/components/pythea/register"
import { SiteFooter } from "@/components/pythea/site-footer"
import { cookies } from "next/headers"
import { buildClueState, isOverrideAuthorized, PREVIEW_COOKIE } from "@/lib/clues"

// Recompute against the live clock on each request (for the countdown state).
export const dynamic = "force-dynamic"

export default async function Page() {
  // Respect the per-browser testing override so the landing teaser count
  // stays in sync with the journey page during testing. Public, time-locked
  // behavior is unchanged for real visitors.
  const allow = isOverrideAuthorized()
  const store = await cookies()
  const cookieVal = store.get(PREVIEW_COOKIE)?.value
  const preview = allow && cookieVal !== undefined ? Number(cookieVal) : undefined

  // Only non-spoiler counts are passed to the landing page.
  const state = buildClueState(Date.now(), preview, allow)

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
