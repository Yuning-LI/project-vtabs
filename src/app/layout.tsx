import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Play By Fingering | Ocarina Letter Tabs & Fingering Charts',
  description:
    'English ocarina song pages for 12-hole AC ocarina with letter notes, optional numbered notes, visual fingering charts, and lyrics when available.',
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
        <meta
          name="google-site-verification"
          content="0v8KW9rp4IJiR2C0dT07wTgI5KZWSQDjREcYZ50ZPAM"
        />
      </head>
      <body className="bg-bg text-primary font-serif">{children}</body>
    </html>
  )
}
