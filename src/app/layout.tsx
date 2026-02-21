import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Project V-Tabs',
  description: 'Project V-Tabs'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-bg text-primary font-serif">{children}</body>
    </html>
  )
}
