import type { Metadata } from 'next'
import { Suspense } from 'react'
import Script from 'next/script'
import './globals.css'
import { GoogleAnalyticsPageView } from '@/components/analytics/GoogleAnalyticsPageView'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { gaMeasurementId, googleSiteVerification, siteUrl } from '@/lib/site'

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
      <head>
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: false });
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body className="bg-bg text-primary font-serif">
        {gaMeasurementId ? (
          <Suspense fallback={null}>
            <GoogleAnalyticsPageView measurementId={gaMeasurementId} />
          </Suspense>
        ) : null}
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
