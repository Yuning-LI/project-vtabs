'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import AbcRenderer from '@/components/song/AbcRenderer'
import Skeleton from '@/components/ui/Skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import { songAbcMap, songMetaMap, songTitleMap } from '@/app/song/songData'

export default function SongClient() {
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
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center text-red-600">
            Sheet music rendering failed.
          </div>
        }
      >
        <AbcRenderer
          abcString={abcString!}
          instrumentId={instrumentId}
          onRenderStart={() => console.log('Render started')}
          onRenderComplete={() => console.log('Render complete')}
        />
      </ErrorBoundary>
      <ControlBar />
    </main>
  )
}
