import type { Metadata } from 'next'
import { Alegreya, Alegreya_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { cookies } from 'next/headers'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/components/pythea/language-provider'
import { LiteModeProvider } from '@/components/pythea/lite-mode-provider'
import { AnalyticsProvider } from '@/components/pythea/analytics-provider'
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE } from '@/lib/i18n'
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
const SITE_TITLE = 'Το Ταξίδι του Πυθέα του Μεσσήνιου'
const SITE_DESCRIPTION =
  'Κυνήγι θησαυρού στην Καλαμάτα. Ακολούθησε τα ίχνη ενός πολυταξιδεμένου εξερευνητή και μάθε να κοιτάς την πόλη σαν να την ανακαλύπτεις για πρώτη φορά.'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/compass-icon.png', type: 'image/png' },
    ],
    shortcut: '/compass-icon.png',
    apple: '/compass-icon.png',
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'el_GR',
    images: [
      {
        url: '/compass-icon.png',
        width: 1024,
        height: 1024,
        alt: 'Πυθέας - πυξίδα',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/compass-icon.png'],
  },
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
            <LiteModeProvider>{children}</LiteModeProvider>
          </LanguageProvider>
          <AnalyticsProvider />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
