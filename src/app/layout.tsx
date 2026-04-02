import type { Metadata } from 'next'
import './globals.css'
import { googleSiteVerification, siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Play By Fingering | Ocarina Letter Tabs & Fingering Charts',
  description:
    'English ocarina song pages for 12-hole AC ocarina with letter notes, optional numbered notes, visual fingering charts, and lyrics when available.',
  robots: {
    index: true,
    follow: true
  },
  verification: {
    google: googleSiteVerification
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
      <body className="bg-bg text-primary font-serif">{children}</body>
    </html>
  )
}
