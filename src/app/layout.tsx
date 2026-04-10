import type { Metadata } from 'next'
import './globals.css'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { googleSiteVerification, siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Play By Fingering | Ocarina Letter Tabs & Fingering Charts',
  description:
    'English melody pages with letter notes, optional numbered notes, fingering charts, and switchable ocarina, recorder, and tin whistle views on supported songs.',
  robots: {
    index: true,
    follow: true
  },
  verification: {
    google: googleSiteVerification,
    other: {
      'p:domain_verify': 'f96d1058665f0cbbf2452a0a5fa3fc57'
    }
  },
  icons: {
    icon: '/icon.svg'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head />
      <body className="bg-bg text-primary font-serif">
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
