import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { Hero } from "@/components/pythea/hero"
import { Story } from "@/components/pythea/story"
import { Journey } from "@/components/pythea/journey"
import { Treasure } from "@/components/pythea/treasure"
import { PrizePool } from "@/components/pythea/prize-pool"
import { HowItWorks } from "@/components/pythea/how-it-works"
import { Register } from "@/components/pythea/register"
import { Faq } from "@/components/pythea/faq"
import { FloatingCta } from "@/components/pythea/floating-cta"
import { SiteFooter } from "@/components/pythea/site-footer"
import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isLeadOneOpen, START_MS, TOTAL_CLUES } from "@/lib/clues"
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, getDictionary } from "@/lib/i18n"
import { homeJsonLd } from "@/lib/seo"

// Recompute against the live clock on each request (for the countdown state).
export const dynamic = "force-dynamic"

export default async function Page() {
  // Resolve the session on the server so the header renders the correct
  // signed-in/out state on the first paint (no logged-out flash).
  const session = await auth.api.getSession({ headers: await headers() })
  const initialUser = session?.user
    ? {
        firstName: (session.user as { firstName?: string | null }).firstName ?? null,
        name: session.user.name ?? null,
        email: session.user.email,
        role: (session.user as { role?: string | null }).role ?? null,
      }
    : null

  // The landing teaser is a public, global view. Only lead 1 is time-gated;
  // the rest are unlocked privately by each player scanning QR codes, so the
  // public page shows the countdown to lead 1 and then "the hunt has begun".
  const lead1Open = isLeadOneOpen(Date.now())
  const publicCount = lead1Open ? 1 : 0
  const countdownToMs = lead1Open ? null : START_MS

  // Structured data (JSON-LD) for the home page, localized to the saved
  // language and built from the SAME FAQ copy that renders on the page so the
  // FAQ rich results stay valid.
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value
  const locale = isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE
  const jsonLd = homeJsonLd(locale, getDictionary(locale).faq.items)

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is trusted, server-generated content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Atmosphere />
      <SiteHeader initialUser={initialUser} />
      <main className="relative">
        <Hero />
        {/* Welcome / join panel first, then the path (9 countries / 9 leads),
            then the "Ι. Ο ΘΡΥΛΟΣ" legend. The path links down to the legend for
            anyone who wants the backstory. */}
        <Register />
        <Journey
          unlockedCount={publicCount}
          total={TOTAL_CLUES}
          countdownToMs={countdownToMs}
        />
        <Story />
        <Treasure />
        <PrizePool />
        <HowItWorks />
        <Faq />
      </main>
      <FloatingCta />
      <SiteFooter />
    </>
  )
}
