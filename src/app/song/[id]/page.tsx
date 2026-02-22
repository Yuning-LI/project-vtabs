'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import AbcRenderer from '@/components/song/AbcRenderer'
import Skeleton from '@/components/ui/Skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

/**
 * 硬编码几首曲子的 ABC 源码（完整版）
 */
const songAbcMap: Record<string, string> = {
  'twinkle': `X:1
T:Twinkle, Twinkle, Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |]`,

  'ode-to-joy': `X:1
T:Ode to Joy
M:4/4
L:1/4
K:C
E E F G | G F E D | C C D E | E3/2 D/2 D2 |
E E F G | G F E D | C C D E | D3/2 C/2 C2 |]`,

  'amazing-grace': `X:1
T:Amazing Grace
M:3/4
L:1/8
K:C
C2 E2 G2 | c4 B2 | A2 G2 E2 | C4 |
C2 E2 G2 | A4 G2 | F2 E2 D2 | C4 |]`,

  'mary-lamb': `X:1
T:Mary Had a Little Lamb
M:4/4
L:1/4
K:C
E D C D | E E E2 | D D D2 | E E E2 |
E D C D | E E E2 | D D E D | C2 C2 |]`,

  'jingle-bells': `X:1
T:Jingle Bells
M:4/4
L:1/8
K:C
E E E E | E E E2 | E G C D | E2 C2 |
E E E E | E E E2 | E G C D | E2 C2 |]`,

  'happy-birthday': `X:1
T:Happy Birthday
M:3/4
L:1/4
K:C
G G A G C B | G G A G D C | G G G E C B A | F F E C D C |]`
}

/**
 * 曲目标题映射
 */
const songTitleMap: Record<string, string> = {
  'twinkle': 'Twinkle, Twinkle, Little Star',
  'ode-to-joy': 'Ode to Joy',
  'amazing-grace': 'Amazing Grace',
  'mary-lamb': 'Mary Had a Little Lamb',
  'jingle-bells': 'Jingle Bells',
  'happy-birthday': 'Happy Birthday'
}

/**
 * 曲目元信息映射
 */
const songMetaMap: Record<string, { key: string; tempo: number }> = {
  'twinkle': { key: 'C', tempo: 100 },
  'ode-to-joy': { key: 'C', tempo: 120 },
  'amazing-grace': { key: 'C', tempo: 80 },
  'mary-lamb': { key: 'C', tempo: 110 },
  'jingle-bells': { key: 'C', tempo: 130 },
  'happy-birthday': { key: 'C', tempo: 90 }
}

/**
 * 曲目详情页，根据 URL 的 id 加载对应 ABC 并渲染
 *
 * @returns 曲目详情页面
 */
export default function SongPage() {
  const { id } = useParams()
  const [abcString, setAbcString] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [instrumentId] = useState('ocarina-12')

  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true)
      // 模拟加载延迟，确保骨架屏可见
      await new Promise(resolve => setTimeout(resolve, 300))
      const key = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'twinkle' // 兜底默认曲目
      const abc = songAbcMap[key] || songAbcMap['twinkle'] // 找不到时回退到默认曲目
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

  const key = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'twinkle' // 兜底默认曲目
  const title = songTitleMap[key] || 'Unknown Song'
  const meta = songMetaMap[key] || { key: 'C', tempo: 100 } // 缺失时回退默认元信息

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
