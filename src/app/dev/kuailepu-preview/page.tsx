import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * 本地快乐谱预览索引页。
 *
 * 用途：
 * - 枚举 reference/songs 下当前已有的原始 JSON
 * - 让人工验收时不用手敲每个预览 URL
 * - 明确这些只是“本地导入候选”，不是已经并入正式曲库的页面
 */
export default function KuailepuPreviewIndexPage() {
  const songsDir = path.resolve(process.cwd(), 'reference', 'songs')
  const songFiles = fs.existsSync(songsDir)
    ? fs.readdirSync(songsDir).filter(file => file.endsWith('.json')).sort()
    : []

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_48px_rgba(84,58,32,0.08)]">
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            Local Import Preview
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
            Kuailepu Song Candidates
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
            These pages are local review routes generated from `reference/songs/*.json`. They are not
            yet part of the published catalog unless the song is separately added into the production
            `SongDoc` data.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {songFiles.map(file => {
            const slug = file.replace(/\.json$/, '')
            return (
              <Link
                key={slug}
                href={`/dev/kuailepu-preview/${slug}`}
                className="rounded-[24px] border border-stone-200 bg-white/90 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(84,58,32,0.1)]"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Preview</div>
                <div className="mt-2 text-lg font-semibold text-stone-900">{slug}</div>
                <div className="mt-2 text-sm text-stone-600">/dev/kuailepu-preview/{slug}</div>
              </Link>
            )
          })}
        </section>
      </div>
    </main>
  )
}
