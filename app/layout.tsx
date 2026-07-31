import type { Metadata, Viewport } from 'next'
import { Alegreya, Alegreya_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { cookies } from 'next/headers'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/components/pythea/language-provider'
import { LiteModeProvider } from '@/components/pythea/lite-mode-provider'
import { PhaseProvider } from '@/components/pythea/phase-provider'
import { AnalyticsProvider } from '@/components/pythea/analytics-provider'
import { CookieConsent } from '@/components/pythea/cookie-consent'
import { NotificationProvider } from '@/components/pythea/notification-provider'
import { HoldReleaseToast } from '@/components/pythea/hold-release-toast'
import { HoldWaitNotice } from '@/components/pythea/hold-wait-notice'
import { AdminAlertsWidget } from '@/components/pythea/admin-alerts-widget'
import { AnnouncementModal } from '@/components/pythea/announcement-modal'
import { ContactWidget } from '@/components/pythea/contact-widget'
import { getPhaseContext, getPublicPhase } from '@/lib/phase-guard'
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, type Locale } from '@/lib/i18n'
import { SITE, TEASER, SITE_URL, KEYWORDS, BRAND, BRAND_NAME_EN, VERIFICATION } from '@/lib/seo'
import './globals.css'

const alegreya = Alegreya({
  subsets: ['greek', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-alegreya',
  display: 'swap',
})

const alegreyaSans = Alegreya_Sans({
  subsets: ['greek', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-alegreya-sans',
  display: 'swap',
})
async function resolveLocale(): Promise<Locale> {
  const store = await cookies()
  const cookieLang = store.get(LANG_COOKIE)?.value
  return isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE
}

// Localized, per-request metadata. Greek is the default; the language is chosen
// via cookie and served from the SAME URL, so the canonical is the bare origin
// and the two languages are declared through Open Graph locale alternates.
// The Open Graph + Twitter images are supplied automatically by the file-based
// conventions app/opengraph-image.tsx and app/twitter-image.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const [locale, publicPhase] = await Promise.all([resolveLocale(), getPublicPhase()])
  const isEl = locale === 'el'
  const site = SITE[locale]

  // While the site is sealed (Phase 1) a shared link must stay mysterious: use
  // the teaser copy that never mentions a treasure hunt or teams. The page
  // <title> template still uses the real brand template so tab titles read
  // naturally; only the sharable title/description are swapped.
  const isTeaser = publicPhase === 1
  const shareTitle = isTeaser ? TEASER[locale].title : site.title
  const shareDescription = isTeaser ? TEASER[locale].description : site.description

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: shareTitle,
      template: site.titleTemplate,
    },
    description: shareDescription,
    applicationName: BRAND_NAME_EN,
    generator: 'v0.app',
    keywords: KEYWORDS,
    authors: [{ name: 'Pythea' }],
    creator: 'Pythea',
    publisher: 'Pythea',
    category: isEl ? 'Εκδηλώσεις' : 'Events',
    referrer: 'origin-when-cross-origin',
    alternates: {
      canonical: '/',
      languages: {
        'el-GR': '/',
        en: '/',
        'x-default': '/',
      },
    },
    // Favicon + apple touch icon are provided by the file-based conventions
    // app/icon.png and app/apple-icon.png (lightweight, properly sized crops of
    // the compass logo). Do not re-add an `icons` field here, it would override
    // those files and point back at the heavy 1024px source image.
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      siteName: shareTitle,
      type: 'website',
      url: '/',
      locale: isEl ? 'el_GR' : 'en_US',
      alternateLocale: isEl ? ['en_US'] : ['el_GR'],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    // Search-engine ownership verification. Only emitted when the matching env
    // var is set (GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION), so the
    // owner can verify in Google Search Console + Bing and submit the sitemap.
    verification: {
      ...(VERIFICATION.google ? { google: VERIFICATION.google } : {}),
      ...(VERIFICATION.bing ? { other: { 'msvalidate.01': VERIFICATION.bing } } : {}),
    },
    formatDetection: {
      telephone: false,
      address: false,
      email: false,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: BRAND.background },
    { media: '(prefers-color-scheme: light)', color: BRAND.cream },
  ],
  colorScheme: 'dark light',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read the saved language from the cookie so the very first paint renders in
  // the right language (no flash), defaulting to Greek.
  const store = await cookies()
  const cookieLang = store.get(LANG_COOKIE)?.value
  const locale = isLocale(cookieLang) ? cookieLang : DEFAULT_LOCALE

  // Resolve the phased-rollout context once per request so every page shares
  // the same effective phase and open tabs can auto-advance at each boundary.
  const phaseCtx = await getPhaseContext()
  const phaseValue = {
    phase: phaseCtx.phase,
    isSuperadmin: phaseCtx.isSuperadmin,
    journalLocked: phaseCtx.journalLocked,
    override: phaseCtx.settings.override,
    phase2UnlockMs: phaseCtx.settings.phase2UnlockMs,
    journalUnlockMs: phaseCtx.settings.journalUnlockMs,
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${alegreya.variable} ${alegreyaSans.variable} scroll-smooth bg-background`}
    >
      <body className="font-serif antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={['light', 'dark']}
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider initialLocale={locale}>
            <LiteModeProvider>
              <PhaseProvider value={phaseValue}>{children}</PhaseProvider>
            </LiteModeProvider>
            <CookieConsent />
            <NotificationProvider />
            {/* Global so a held crew is told the way opened wherever they are
                waiting, not only if they happen to be on the journal. */}
            <HoldReleaseToast />
            {/* The mirror of the toast above: while the hold is still on, a crew
                that closed the trail is reminded when the hunt resumes. Global
                for the same reason, and it reappears on every load by design. */}
            <HoldWaitNotice />
            <AdminAlertsWidget />
            {/* Site-wide notice, shown to everyone on every page. Reappears on
                each load / navigation by design (see the component); the journal
                label re-opens it after dismissal. Inside LanguageProvider so it
                reads localised copy. */}
            <AnnouncementModal />
            {/* Inside LanguageProvider: it reads localised copy. */}
            <ContactWidget />
          </LanguageProvider>
          <AnalyticsProvider />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
