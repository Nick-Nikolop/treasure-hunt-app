import type { Metadata } from 'next'
import { Alegreya, Alegreya_Sans, Mynerve } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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

// Flowing handwriting style with Greek glyph coverage, used for the journal's
// "handwritten" reading mode. (Connected cursive scripts like Dancing Script
// have no Greek glyphs; Mynerve is the most cursive Greek-capable option.)
const mynerve = Mynerve({
  subsets: ['greek', 'latin'],
  weight: ['400'],
  variable: '--font-mynerve',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Το Ταξίδι του Πυθέα του Μεσσήνιου',
  description:
    'Κυνήγι θησαυρού στην Καλαμάτα. Ακολούθησε τα ίχνη ενός πολυταξιδεμένου εξερευνητή και μάθε να κοιτάς την πόλη σαν να την ανακαλύπτεις για πρώτη φορά.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="el"
      className={`${alegreya.variable} ${alegreyaSans.variable} ${mynerve.variable} bg-background`}
    >
      <body className="font-serif antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
