import type { Metadata } from 'next'
import LibraryBrowser from '@/components/library/LibraryBrowser'
import { songCatalog } from '@/lib/songbook/catalog'
import { getSongPresentation } from '@/lib/songbook/presentation'

export const metadata: Metadata = {
  title: 'Play By Fingering | Ocarina Tabs, Recorder Notes & Tin Whistle Letter Notes',
  description:
    'English melody pages with ocarina tabs, recorder notes, tin whistle letter notes, optional numbered notes, fingering charts, and switchable instrument views on supported songs.',
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
  const librarySongs = songCatalog.map((song, index) => {
    const presentation = getSongPresentation(song)

    return {
      id: song.id,
      slug: song.slug,
      title: presentation.title,
      familyLabel: presentation.familyLabel,
      featuredRank: index + 1
    }
  })
  const familyFilters = [
    'Nursery Rhyme',
    'Folk Song',
    'Classical Melody',
    'Holiday Song',
    'Hymn or Spiritual',
    'March or Parade Tune',
    'Dance Melody',
    'Popular Song Melody'
  ].filter(label => librarySongs.some(song => song.familyLabel === label))

  return (
    <main className="page-warm-shell">
      <section className="page-warm-container">
        <div className="page-warm-hero px-6 py-7 md:px-8 md:py-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Song Library
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-900 md:text-6xl">
            Ocarina Tabs, Recorder Notes, and Tin Whistle Letter Notes
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700 md:text-lg">
            Browse melody pages built around letter notes, optional numbered notes, fingering charts, and switchable instrument views, with ocarina, recorder, and tin whistle search intent all covered on supported songs.
          </p>
        </div>
      </section>

      <section className="page-warm-container pt-0">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Browse Melody Pages</h2>
            <p className="text-sm text-stone-700">Find melody pages for folk songs, nursery rhymes, Christmas songs, and famous classical themes, with ocarina tabs, recorder notes, and tin whistle views where supported.</p>
          </div>
        </div>

        <LibraryBrowser songs={librarySongs} familyFilters={familyFilters} />

        <section className="page-warm-panel mt-10 p-6 md:p-7">
          <h2 className="text-2xl font-bold text-stone-900">About This Library</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
            This site focuses on the search terms real players use most often: ocarina tabs, recorder notes, tin whistle letter notes, easy melody pages, and optional numbered notes. Instead of staff notation, each page is optimized around readable note labels, practical fingering support, and a mobile-friendly layout, while supported songs can switch between ocarina, recorder, and tin whistle views without leaving the same page.
          </p>
        </section>
      </section>
    </main>
  )
}
