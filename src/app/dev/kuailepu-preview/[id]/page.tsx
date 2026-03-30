import fs from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import JianpuRenderer from '@/components/song/JianpuRenderer'
import { buildKuailepuRenderablePreview } from '@/lib/songbook/kuailepuImport'

export const dynamic = 'force-dynamic'

/**
 * 本地快乐谱导入预览页。
 *
 * 这个页面的目标不是直接作为线上功能发布，而是给导入流程做人工验收：
 * - 读取 reference/songs/<id>.json
 * - 展示快乐谱原始数据提取后的可渲染 notation 候选
 * - 用现有 JianpuRenderer 看“如果按我们当前 UI 体系渲染，会是什么感觉”
 * - 同时把歌词槽位和旋律槽位摊开，便于判断这首歌离正式入库还有多远
 *
 * 这里现在会把提取出的歌词一并喂给 JianpuRenderer，
 * 但前提是：歌词先按 notation 行的可唱槽位切片。
 * 这样做是为了在保住原始乐句/小节观感的同时，避免歌词错位。
 *
 * 注意它和当前公开详情页已经不是一条链：
 * - 公开详情页现在默认走 Kuailepu runtime iframe
 * - 这个 dev 预览页只是保留给“导入审核 / 原生链研究 / 未来迁移”使用
 */
export default function KuailepuPreviewPage({ params }: { params: { id: string } }) {
  const filePath = path.resolve(process.cwd(), 'reference', 'songs', `${params.id}.json`)

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const preview = buildKuailepuRenderablePreview(payload)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_48px_rgba(84,58,32,0.08)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
              Local Import Preview
            </div>
            <div className="text-sm text-stone-600">reference/songs/{params.id}.json</div>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
            {preview.title || params.id}
          </h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-700">
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Alias: {preview.aliasTitle ?? 'N/A'}
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Keynote: {preview.keynote ?? 'N/A'}
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Meter: {preview.meter ?? 'N/A'}
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Tonic guess: {preview.guessedTonicMidi}
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Range shift: {preview.recommendedShift >= 0 ? `+${preview.recommendedShift}` : preview.recommendedShift}
            </div>
            <div className="rounded-full bg-stone-100 px-3 py-1">
              Render tonic: {preview.renderTonicMidi}
            </div>
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-600">
            This page renders the melody skeleton extracted from the Kuailepu JSON using the current
            site renderer. It is a review tool for import quality, not a production route.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-900">Notation Preview</h2>
          <JianpuRenderer
            notation={preview.renderNotationLines}
            tonicMidi={preview.renderTonicMidi}
            lyrics={preview.renderAlignedLyrics}
            displayMode="letter"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_14px_32px_rgba(84,58,32,0.06)]">
            <h2 className="text-lg font-semibold text-stone-900">Simplified Notation Lines</h2>
            <div className="mt-4 space-y-3">
              {preview.renderNotationLines.map((line, index) => (
                <div key={`note-line-${index}`} className="rounded-2xl bg-stone-50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
                    Line {index + 1} • note slots {preview.renderNoteSlotCounts[index]}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-stone-800">
                    {line}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_14px_32px_rgba(84,58,32,0.06)]">
            <h2 className="text-lg font-semibold text-stone-900">Aligned Lyric Preview</h2>
            <div className="mt-4 space-y-3">
              {preview.renderAlignedLyrics.map((line, index) => (
                <div key={`lyric-line-${index}`} className="rounded-2xl bg-stone-50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
                    Block {index + 1} • lyric slots {preview.renderLyricSlotCounts[index]}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-stone-800">
                    {line}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        </section>

        {preview.extraLyricBlocks.length > 0 ? (
          <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_14px_32px_rgba(84,58,32,0.06)]">
            <h2 className="text-lg font-semibold text-stone-900">Extra Lyric Blocks</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-600">
              These lyric blocks were preserved from the Kuailepu source but not used in the main
              render pass, because their slot counts fit better as alternate verses than as the
              primary lyric track for this page.
            </p>
            <div className="mt-4 space-y-3">
              {preview.extraLyricBlocks.map((line, index) => (
                <div key={`extra-lyric-${index}`} className="rounded-2xl bg-stone-50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
                    Extra Block {index + 1}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-stone-800">
                    {line}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        ) : null}

          <section className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-5 shadow-[0_14px_32px_rgba(84,58,32,0.06)]">
          <h2 className="text-lg font-semibold text-amber-900">Current Import Status</h2>
          <p className="mt-3 text-sm leading-7 text-amber-950">
            This preview now applies the same range-fitting rule used by the production renderer, keeps
            the original phrase-based notation lines, and slices lyrics onto those lines by singable-note
            counts. It is good enough for MVP import review, but final publication should still confirm
            lyric cleanup and tonic choice song by song.
          </p>
        </section>
      </div>
    </main>
  )
}
