import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPhaseContext } from "@/lib/phase-guard"
import { Atmosphere } from "@/components/pythea/atmosphere"
import { SiteHeader } from "@/components/pythea/site-header"
import { SiteFooter } from "@/components/pythea/site-footer"
import { GuideView } from "@/components/pythea/guide-view"
import { TeaserLanding } from "@/components/pythea/teaser-landing"
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, getDictionary } from "@/lib/i18n"

// The effective phase is recomputed against the live clock on each request.
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies()
  const cookieLang = store.get(LANG_COOKIE)?.value
  const locale = isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE
  const g = getDictionary(locale).guide
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: "/guide" },
  }
}

export default async function GuidePage() {
  // Phase 1 seals the whole site behind the teaser (the guide reveals the hunt
  // and teams), so a shared /guide link stays mysterious until launch.
  const phaseCtx = await getPhaseContext()
  if (phaseCtx.siteLocked) {
    return <TeaserLanding targetMs={phaseCtx.settings.phase2UnlockMs} />
  }

  // Server-resolved user for a flash-free header on first paint.
  const session = await auth.api.getSession({ headers: await headers() })
  const initialUser = session?.user
    ? {
        firstName: (session.user as { firstName?: string | null }).firstName ?? null,
        name: session.user.name ?? null,
        email: session.user.email,
        role: (session.user as { role?: string | null }).role ?? null,
      }
    : null

  return (
    <>
      <Atmosphere />
      <SiteHeader initialUser={initialUser} />
      <GuideView />
      <SiteFooter />
    </>
  )
}
