import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Play By Fingering – Ocarina Tabs & Visual Fingering Charts',
  description:
    'Free interactive ocarina tabs for 12-hole AC ocarina. Visual fingering charts for beginners. Learn Zelda songs, folk tunes, and more.'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
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
