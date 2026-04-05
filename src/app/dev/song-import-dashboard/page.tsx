import type { Metadata } from 'next'
import SongImportDashboard from '@/components/dev/SongImportDashboard'
import { getSongImportDashboardData } from '@/lib/songbook/importDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Song Import Dashboard',
  description: 'Internal dashboard for Kuailepu import status, release readiness, and candidate tracking.',
  robots: {
    index: false,
    follow: false
  }
}

export default function SongImportDashboardPage() {
  const data = getSongImportDashboardData()

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <SongImportDashboard data={data} />
      </section>
    </main>
  )
}
