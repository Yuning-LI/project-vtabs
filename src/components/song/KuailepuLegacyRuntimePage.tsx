import Link from 'next/link'
import type { LearnGuideCard, LearnSongCard } from '@/lib/learn/content'
import type { SongPresentation } from '@/lib/songbook/presentation'
import type {
  PublicSongPageQueryState,
  PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import KuailepuRuntimeInteractiveShell, {
  type KuailepuRuntimeControlPayload
} from './KuailepuRuntimeInteractiveShell'

type KuailepuLegacyRuntimePageProps = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
  runtimeControlPayload: KuailepuRuntimeControlPayload
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultShowGraph: string | null
  hasLyricToggle: boolean
  relatedSongs: LearnSongCard[]
  relatedGuides: LearnGuideCard[]
}

/**
 * This server component keeps the below-the-fold SEO shell out of the song page
 * client bundle. The small client shell above still owns controls, analytics,
 * and the runtime iframe lifecycle.
 */
export default function KuailepuLegacyRuntimePage({
  songId,
  supportedInstruments,
  queryState,
  presentationByInstrument,
  runtimeControlPayload,
  runtimeDefaultInstrumentId,
  runtimeDefaultShowGraph,
  hasLyricToggle,
  relatedSongs,
  relatedGuides
}: KuailepuLegacyRuntimePageProps) {
  const seo = resolveInitialPresentation(songId, queryState, presentationByInstrument)
  const title = seo.title

  return (
    <main className="page-warm-shell">
      <div className="page-warm-container">
        <KuailepuRuntimeInteractiveShell
          songId={songId}
          supportedInstruments={supportedInstruments}
          queryState={queryState}
          presentationByInstrument={presentationByInstrument}
          runtimeControlPayload={runtimeControlPayload}
          runtimeDefaultInstrumentId={runtimeDefaultInstrumentId}
          runtimeDefaultShowGraph={runtimeDefaultShowGraph}
          hasLyricToggle={hasLyricToggle}
        />

        <article className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="page-warm-panel p-6 md:p-7">
            <h2 className="text-2xl font-bold text-stone-900">About {title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.overview}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.background}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.practiceNotes}</p>
          </section>

          <div className="grid gap-6">
            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">What This Page Includes</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-700">
                {seo.includes.map(item => (
                  <li key={item} className="rounded-2xl bg-[rgba(255,247,237,0.85)] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">FAQ</h2>
              <div className="mt-4 grid gap-4">
                {seo.faqs.map(item => (
                  <div
                    key={item.question}
                    className="rounded-2xl bg-[rgba(255,247,237,0.82)] px-4 py-4"
                  >
                    <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-warm-panel-soft p-6">
              <h2 className="text-xl font-bold text-stone-900">How To Use This Page</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                Use the default letter-note view for fast reading, switch to numbered notes only
                when you want a backup reference, and keep the fingering chart visible as you work
                through each phrase. The layout is built so you can land on the melody and start
                playing quickly.
              </p>
            </section>
          </div>
        </article>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">More Songs to Explore</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
                Keep moving through songs with a similar feel or learning pattern instead of
                bouncing back to the full library after every tune.
              </p>
            </div>
            <Link
              href="/"
              className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Open full library
            </Link>
          </div>
          <div className="mt-6">
            <StaticSongCardGrid songs={relatedSongs} />
          </div>
        </section>

        <section className="page-warm-panel mt-8 p-6 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Related Guides</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
                These topic pages answer broader beginner and instrument questions, then route
                visitors back into the same public song experience.
              </p>
            </div>
            <Link
              href="/learn"
              className="page-warm-pill-muted inline-flex items-center px-4 py-2 text-sm font-semibold"
            >
              Browse learn section
            </Link>
          </div>
          <div className="mt-6">
            <StaticGuideCardGrid guides={relatedGuides} />
          </div>
        </section>
      </div>
    </main>
  )
}

function resolveInitialPresentation(
  songId: string,
  queryState: PublicSongPageQueryState,
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
) {
  return (
    (queryState.instrumentId ? presentationByInstrument[queryState.instrumentId] : null) ??
    presentationByInstrument['o12'] ??
    Object.values(presentationByInstrument)[0] ?? {
      title: songId,
      aliases: [],
      metaTitle: null,
      subtitle: null,
      familyLabel: 'Melody Page',
      difficultyLabel: 'Unknown',
      keyLabel: '',
      meterLabel: '',
      tempoLabel: '',
      overview: '',
      background: '',
      practiceNotes: '',
      includes: [],
      faqs: [],
      metaDescription: ''
    }
  )
}

function StaticSongCardGrid({ songs }: { songs: LearnSongCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {songs.map(song => (
        <Link
          key={song.slug}
          href={song.href}
          className="page-warm-card-link flex h-full flex-col p-5"
        >
          <div className="flex flex-wrap gap-2">
            <span className="page-warm-pill-muted px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
              {song.familyLabel}
            </span>
            {song.hasPublicLyrics ? (
              <span className="page-warm-pill px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
                Lyrics Available
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-xl font-bold leading-tight text-stone-900">{song.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            {song.difficultyLabel} · {song.keyLabel} · {song.meterLabel}
          </p>
          <div className="mt-5 text-sm font-semibold text-stone-900">Open song page →</div>
        </Link>
      ))}
    </div>
  )
}

function StaticGuideCardGrid({ guides }: { guides: LearnGuideCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {guides.map(guide => (
        <Link
          key={guide.slug}
          href={`/learn/${guide.slug}`}
          className="page-warm-card-link flex h-full flex-col p-5"
        >
          <div className="page-warm-pill-muted w-fit px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]">
            {guide.kind === 'hub' ? 'Topic Guide' : 'Learning Guide'}
          </div>
          <h3 className="mt-4 text-xl font-bold leading-tight text-stone-900">{guide.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">{guide.description}</p>
          <div className="mt-5 text-sm font-semibold text-stone-900">Open guide →</div>
        </Link>
      ))}
    </div>
  )
}
