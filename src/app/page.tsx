import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import Skeleton from '@/components/ui/Skeleton'

export default function Home() {
  return (
    <main className="bg-bg min-h-screen pb-20">
      <Header instrument="ocarina-12" />
      <TitleBlock
        title="Twinkle, Twinkle, Little Star"
        meta={{ key: 'C', tempo: 100 }}
      />
      <div className="p-4">
        <Skeleton />
      </div>
      <ControlBar />
    </main>
  )
}
