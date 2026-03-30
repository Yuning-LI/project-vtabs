'use client'

import { useMemo, useState } from 'react'
import Header from '@/components/layout/Header'
import TitleBlock from '@/components/layout/TitleBlock'
import ControlBar from '@/components/layout/ControlBar'
import JianpuRenderer from '@/components/song/JianpuRenderer'
import type { SongDoc } from '@/lib/songbook/types'
import { getSongViewData } from '@/lib/songbook/songView'

/**
 * 歌曲详情页的客户端接线层。
 *
 * 这个文件不承担复杂音乐逻辑，它的职责是把“当前产品决策”落实成页面结构。
 * 但要特别注意：它现在已经不是公开 `/song/<slug>` 路由的默认实现。
 *
 * 当前它保留的主要价值是：
 * - 作为站点原生渲染链的研究样本
 * - 作为未来逐步脱离 iframe/runtime 时可复用的 UI 资产
 * - 供 dev/import 预览链继续参考
 *
 * 当前产品决策非常重要，交接时必须先读懂：
 * - 对外默认详情页不是五线谱，也不是简谱，而是“字母谱 + 指法图 + 歌词”
 * - 底层稳定真相源仍然是手写简谱 notation
 * - ABC 虽然已在少量歌曲存在，但目前主要用于校验和未来迁移，不直接驱动当前详情页
 *
 * 所以如果未来别的账号接手，先不要因为看见 song.abc 就直接把前台切回 ABC。
 * 必须先确认：
 * - ABC 解析链稳定
 * - 歌词对位稳定
 * - 指法叠加稳定
 * - 和当前手写简谱自动比对通过
 */
export default function SongClient({ song }: { song: SongDoc }) {
  const [instrumentId] = useState('ocarina-12')
  const title = song.title

  /**
   * getSongViewData 负责把“曲库存档”转换成“页面当前应该展示什么”。
   * 页面层只消费结果，不再自己判断移调或真相源。
   */
  const songView = useMemo(() => getSongViewData(song), [song])
  const meta = { ...song.meta, key: songView.keyLabel }
  const primaryLyrics = songView.alignedLyrics ?? songView.lyrics
  const hasPrimaryLyrics = Boolean(primaryLyrics?.length)
  const hasExtraLyrics = Boolean(songView.extraLyrics?.length)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] pb-20">
      <Header instrument={instrumentId} notationMode="letter" onInstrumentChange={() => {}} />
      <TitleBlock title={title} meta={meta} />
      <section className="px-4 pb-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section
            className={`rounded-[24px] border px-5 py-4 shadow-[0_14px_28px_rgba(84,58,32,0.05)] ${
              song.review?.status === 'verified'
                ? 'border-emerald-200 bg-emerald-50/80'
                : 'border-amber-200 bg-amber-50/80'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  song.review?.status === 'verified'
                    ? 'bg-white text-emerald-800'
                    : 'bg-white text-amber-800'
                }`}
              >
                {song.review?.status === 'verified' ? 'Melody Rechecked' : 'Review Pending'}
              </div>
              {song.review?.checkedOn ? (
                <div className="text-sm text-stone-600">Checked on {song.review.checkedOn}</div>
              ) : (
                <div className="text-sm text-stone-600">Awaiting external melody check</div>
              )}
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              {song.review?.note ?? 'This song is published for catalog breadth, but it still needs a manual melody review before it should be treated as fully trusted.'}
            </p>
          </section>
          {/* 当前默认详情谱面：字母谱 + 指法图 + 歌词 */}
          <JianpuRenderer
            notation={songView.notation}
            tonicMidi={songView.tonicMidi}
            lyrics={primaryLyrics}
            displayMode="letter"
          />
          <div className="space-y-4 pt-2">
            {hasExtraLyrics ? (
              <section className="rounded-[28px] border border-stone-200/70 bg-white/80 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.05)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Additional Verses
                </h2>
                <div className="mt-4 space-y-4">
                  {songView.extraLyrics?.map((verse, index) => (
                    <p key={`extra-verse-${index}`} className="text-sm leading-7 text-stone-700">
                      {verse}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-stone-200/70 bg-white/75 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.05)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">About This Song</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-600">{song.description}</p>
            </section>

            <section className="rounded-[28px] border border-stone-200/70 bg-white/70 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.05)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Notation Rules</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-600">
                Letter names show the sounding pitch for each melody note, `—` sustains the previous note, and `Pause` marks silence.
              </p>
              {!hasPrimaryLyrics ? (
                <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-600">
                  This entry is treated as an instrumental melody in the current catalog, so the page
                  hides lyric rows instead of reserving empty lyric slots.
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </section>
      <ControlBar />
    </main>
  )
}
