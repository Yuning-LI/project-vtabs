'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import AbcRenderer from '@/components/song/AbcRenderer'
import Skeleton from '@/components/ui/Skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

const songAbcMap: Record<string, string> = {
  'twinkle': `X:1\nT:Twinkle\nM:4/4\nL:1/4\nK:C\nC C G G | A A G2 | F F E E | D D C2 |]`,
  'ode-to-joy': `X:1\nT:Ode to Joy\nM:4/4\nL:1/4\nK:C\nE E F G | G F E D | C C D E | E3/2 D/2 D2 |\nE E F G | G F E D | C C D E | D3/2 C/2 C2 |]`,
  'amazing-grace': `X:1\nT:Amazing Grace\nM:3/4\nL:1/8\nK:C\nC2 E2 G2 | c4 B2 | A2 G2 E2 | C4 |]`
}

const songTitleMap: Record<string, string> = {
  'twinkle': 'Twinkle, Twinkle, Little Star',
  'ode-to-joy': 'Ode to Joy',
  'amazing-grace': 'Amazing Grace'
}

const songMetaMap: Record<string, { key: string; tempo: number }> = {
  'twinkle': { key: 'C', tempo: 100 },
  'ode-to-joy': { key: 'C', tempo: 120 },
  'amazing-grace': { key: 'C', tempo: 80 }
}

export default function SongPage() {
  const { id } = useParams()
  const [abcString, setAbcString] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [instrumentId] = useState('ocarina-12')

  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 300))
      const key = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'twinkle'
      const abc = songAbcMap[key] || songAbcMap['twinkle']
      setAbcString(abc)
      setLoading(false)
    }
    fetchSong()
  }, [id])

  if (loading) {
    return (
      <main className="bg-bg min-h-screen pb-20">
        <Header instrument={instrumentId} onInstrumentChange={() => {}} />
        <div className="p-4">
          <Skeleton />
        </div>
      </main>
    )
  }

  const key = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'twinkle'
  const title = songTitleMap[key] || 'Unknown Song'
  const meta = songMetaMap[key] || { key: 'C', tempo: 100 }

  return (
    <main className="bg-bg min-h-screen pb-20">
      <Header instrument={instrumentId} onInstrumentChange={() => {}} />
      <TitleBlock title={title} meta={meta} />
      <ErrorBoundary fallback={<div className="p-8 text-center text-red-600">乐谱渲染出错了</div>}>
        <AbcRenderer
          abcString={abcString!}
          instrumentId={instrumentId}
          onRenderStart={() => console.log('渲染开始')}
          onRenderComplete={() => console.log('渲染完成')}
        />
      </ErrorBoundary>
      <ControlBar />
    </main>
  )
}
