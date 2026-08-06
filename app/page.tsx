import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { Hero } from "@/components/pythea/hero"
import { JournalTeaser } from "@/components/pythea/journal-teaser"
import { Story } from "@/components/pythea/story"
import { Journey } from "@/components/pythea/journey"
import { Treasure } from "@/components/pythea/treasure"
import { PrizePool } from "@/components/pythea/prize-pool"
import { HowItWorks } from "@/components/pythea/how-it-works"
import { Register } from "@/components/pythea/register"
import { Faq } from "@/components/pythea/faq"
import { Party } from "@/components/pythea/party"
import { FloatingCta } from "@/components/pythea/floating-cta"
import { SiteFooter } from "@/components/pythea/site-footer"
import { TeaserLanding } from "@/components/pythea/teaser-landing"
import { HuntCompleteBanner } from "@/components/pythea/hunt-complete-banner"
import { getPhaseContext } from "@/lib/phase-guard"
import { areRostersFrozen } from "@/lib/phase"
import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isLeadOneOpen, START_MS } from "@/lib/clues"
import { getIsInTeam } from "@/lib/hunt"
import { getTotalLeads } from "@/lib/leads"
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, getDictionary } from "@/lib/i18n"
import { homeJsonLd } from "@/lib/seo"
import { HowToPlayPreviewButton } from "@/components/pythea/how-to-play-modal"
import { getFinaleConfig } from "@/lib/finale"

// Recompute against the live clock on each request (for the countdown state).
export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ previewEnded?: string }>
}) {
  // Phase 1 seals the whole site behind the teaser for everyone except
  // superadmins. Resolve this first so we can short-circuit before doing the
  // rest of the home-page work.
  const phaseCtx = await getPhaseContext()
  if (phaseCtx.siteLocked) {
    return <TeaserLanding targetMs={phaseCtx.settings.phase2UnlockMs} />
  }

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

  // HUNT CLOSED: for a normal visitor `phaseCtx.huntClosed` is true past the
  // close instant. Superadmins never get `huntClosed` (so the site stays usable
  // for them), but they can preview the ended landing with ?previewEnded=1.
  const sp = await searchParams
  const previewEnded = phaseCtx.isSuperadmin && sp.previewEnded === "1"
  const huntClosed = phaseCtx.huntClosed || previewEnded

  if (huntClosed) {
    // When the hunt is over the landing IS the announcement: the marketing
    // sections (which mostly funnel into the now-sealed journal) are dropped and
    // the celebration banner stands alone. It scrolls itself into view.
    return (
      <>
        <Atmosphere />
        <SiteHeader initialUser={initialUser} />
        <main className="relative">
          <HuntCompleteBanner />
        </main>
        <SiteFooter />
      </>
    )
  }

  // The landing teaser is a public, global view. Only lead 1 is time-gated;
  // the rest are unlocked privately by each player scanning QR codes, so the
  // public page shows the countdown to lead 1 and then "the hunt has begun".
  const lead1Open = isLeadOneOpen(Date.now())
  const publicCount = lead1Open ? 1 : 0
  const countdownToMs = lead1Open ? null : START_MS

  // Live number of leads, so the journey stats and tagline scale with the
  // sequence an admin has actually configured (not a hardcoded 9).
  const totalLeads = await getTotalLeads()

  // Whether the signed-in visitor already belongs to a team, so the join panel
  // can show the right CTA (create/join a team) or hide once they're set.
  const isInTeam = session?.user ? await getIsInTeam(session.user.id) : false

  // Structured data (JSON-LD) for the home page, localized to the saved
  // language and built from the SAME FAQ copy that renders on the page so the
  // FAQ rich results stay valid.
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value
  const locale = isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE
  const jsonLd = homeJsonLd(locale, getDictionary(locale).faq.items)

  // Now read for everyone, not just admins: the hero shows the closing time.
  const { huntEndsAt } = await getFinaleConfig()

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is trusted, server-generated content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Atmosphere />
      <SiteHeader initialUser={initialUser} />
      {/* The `?locked=` countdown modal is intentionally NOT mounted: it used to
          pop by itself after a bounce from the journal or the leaderboard, and no
          popup may appear uninvited. Clicking a locked link still explains itself,
          because that modal is opened by the visitor's own click. */}
      <main className="relative">
        <Hero endsAt={huntEndsAt} />
        {/* Straight under the hero: WHERE the leads actually arrive. Players kept
            expecting an email or a text, so the real journal is shown (and
            linked) up front, with a countdown to the moment it opens. */}
        <JournalTeaser />
        {/* Welcome / join panel first, then the path (9 countries / 9 leads),
            then the "Ι. Ο ΘΡΥΛΟΣ" legend. The path links down to the legend for
            anyone who wants the backstory. */}
        {/* Mirrors areRostersLocked() rather than testing the phase directly,
            so turning the admin switch off reopens sign-ups here too. */}
        <Register
          isInTeam={isInTeam}
          rostersLocked={
            !phaseCtx.isSuperadmin && areRostersFrozen(phaseCtx.phase, phaseCtx.settings)
          }
        />
        <PrizePool />
        <Journey
          unlockedCount={publicCount}
          total={totalLeads}
          countdownToMs={countdownToMs}
        />
        <Story />
        <Treasure />
        <HowItWorks />
        <Faq />
        <Party />
        {/* Admin-only: proofread the first-visit walkthrough without having to
            clear localStorage in the journal. `phaseCtx.isSuperadmin` is already
            resolved above, so this costs no extra query. */}
        {phaseCtx.isSuperadmin && <HowToPlayPreviewButton endsAt={huntEndsAt} />}
      </main>
      {/* The floating register CTA only makes sense for signed-out visitors. */}
      {!initialUser && <FloatingCta />}
      <SiteFooter />
    </>
  )
}
