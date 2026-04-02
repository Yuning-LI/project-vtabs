import type { Metadata } from 'next'
import Link from 'next/link'
import { songCatalog } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'

/**
 * 首页策展顺序，不是字母序，也不是数据库自然顺序。
 *
 * 业务原因：
 * - 这个站当前阶段更像“对外首发展示页”，不是资料库索引页
 * - 首页默认目标是提高首批欧美用户的识别度和点击率
 * - 所以排序优先级是“高认知 / 高搜索 / 高点击潜力”而不是字母序
 *
 * 后续如果要做搜索或 A-Z 浏览，再另做二级视图；
 * 不要把首页默认排序直接改回 alphabetic。
 */
const SONG_ORDER = [
  'happy-birthday',
  'twinkle',
  'frere-jacques',
  'london-bridge',
  'old-macdonald',
  'do-your-ears-hang-low',
  'jingle-bells',
  'deck-the-halls',
  'silent-night',
  'we-wish-you-a-merry-christmas',
  'amazing-grace',
  'ode-to-joy',
  'yankee-doodle',
  'greensleeves',
  'red-river-valley',
  'canon',
  'can-can',
  'fur-elise',
  'moonlight-sonata',
  'minuet-in-g',
  'air-on-the-g-string',
  'god-rest-you-merry-gentlemen',
  'scotland-the-brave',
  'santa-lucia',
  'long-long-ago',
  'were-you-there',
  'wedding-march',
  'schubert-serenade',
  'auld-lang-syne',
  'scarborough-fair',
  'mary-lamb',
  'brahms-lullaby'
] as const

export const metadata: Metadata = {
  title: 'Play By Fingering | Ocarina Letter Tabs, Numbered Notes & Fingering Charts',
  description:
    'English ocarina song pages for 12-hole AC ocarina with letter notes, optional numbered notes, visual fingering charts, and lyrics when available.',
  alternates: {
    canonical: '/'
  },
  robots: {
    index: true,
    follow: true
  }
}

/**
 * 首页当前承担两个角色：
 * 1. 给搜索引擎和用户一个“这站是干什么的”的总入口
 * 2. 给首批外链和收录流量一个尽量高转化的曲库落地页
 *
 * 因此这里刻意不展示过多曲目元信息，而是只露歌名：
 * - 降低列表视觉噪音
 * - 更像可扫读的 song catalog
 * - 避免首页变成信息过载的半详情页
 */
export default function Home() {
  const featuredSongs = [
    ...SONG_ORDER.map(id => songCatalog.find(song => song.id === id)).filter(
      (song): song is (typeof songCatalog)[number] => Boolean(song)
    ),
    ...songCatalog.filter(song => !SONG_ORDER.includes(song.id as (typeof SONG_ORDER)[number]))
  ]

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <div className="page-warm-hero px-6 py-7 md:px-8 md:py-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Song Library
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-900 md:text-6xl">
            Ocarina Letter Tabs
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700 md:text-lg">
            Browse English song pages for 12-hole AC ocarina with letter notes, optional numbered notes, visual fingering charts, and lyrics when available.
          </p>
        </div>
      </section>

      <section className="page-warm-container pt-0">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Browse Ocarina Songs</h2>
            <p className="text-sm text-stone-700">Find melody pages for folk songs, nursery rhymes, Christmas songs, and famous classical themes in a clean 12-hole AC ocarina format.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredSongs.map(song => {
            const presentation = getSongPresentation(song)

            return (
              <Link
                key={song.id}
                href={`/song/${song.slug}`}
                className="page-warm-card-link group block p-5 md:p-6"
              >
                <h2 className="text-xl font-semibold text-stone-900 transition group-hover:text-stone-700">
                  {presentation.title}
                </h2>
              </Link>
            )
          })}
        </div>

        <section className="page-warm-panel mt-10 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">About This Library</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
            This site focuses on the search terms real players use most often: ocarina letter tabs, 12-hole AC fingering charts, easy melody pages, and optional numbered notes. Instead of staff notation, each page is optimized around readable note labels, practical fingering support, and a mobile-friendly song layout that is fast to scan during practice.
          </p>
        </section>
      </section>
    </main>
  )
}
