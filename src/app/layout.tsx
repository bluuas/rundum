import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { isDemoModeEnabled } from '@/lib/auth/dev'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Rundum — find sports near you',
    template: '%s · Rundum',
  },
  description:
    'Discover and plan local sports activities nearby — running, cycling, hiking, yoga, tennis and more.',
  applicationName: 'Rundum',
  // robots.txt alone does not stop a linked page being indexed.
  ...(isDemoModeEnabled() ? { robots: { index: false, follow: false } } : {}),
}

export const viewport: Viewport = {
  // `viewport-fit=cover` is what makes env(safe-area-inset-*) resolve on iOS.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    // Matches --bg in globals.css, light and dark.
    { media: '(prefers-color-scheme: light)', color: '#fcfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0d0b' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
