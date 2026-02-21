'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import AbcRenderer from '@/components/song/AbcRenderer'
import Skeleton from '@/components/ui/Skeleton'

export default function SongPage() {
  const { id } = useParams()
  const [abcString, setAbcString] = useState<string | null>(null)
  const [instrumentId] = useState('ocarina-12')

  useEffect(() => {
    const mockAbc = `X:1
T:Twinkle
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |]`
    setAbcString(mockAbc)
  }, [id])

  if (!abcString) {
    return <Skeleton />
  }

  return (
    <main className="bg-bg min-h-screen pb-20">
      <Header instrument={instrumentId} onInstrumentChange={() => {}} />
      <TitleBlock
        title="Twinkle, Twinkle, Little Star"
        meta={{ key: 'C', tempo: 100 }}
      />
      <AbcRenderer
        abcString={abcString}
        instrumentId={instrumentId}
        onRenderStart={() => console.log('渲染开始')}
        onRenderComplete={() => console.log('渲染完成')}
      />
      <ControlBar />
    </main>
  )
}
