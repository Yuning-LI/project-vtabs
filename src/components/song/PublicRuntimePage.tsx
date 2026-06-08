'use client'
import Link from 'next/link'
import type { LearnGuideCard, LearnSongCard } from '@/lib/learn/content'
import type { SongPresentation } from '@/lib/songbook/presentation'
import type {
  PublicSongPageQueryState,
  PublicSongInstrument
} from '@/lib/songbook/publicInstruments'
import PublicRuntimeInteractiveShell, {
  type PublicRuntimeControlPayload
} from './PublicRuntimeInteractiveShell'

type PublicRuntimePageProps = {
  songId: string
  supportedInstruments: PublicSongInstrument[]
  queryState: PublicSongPageQueryState
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
  runtimeControlPayload: PublicRuntimeControlPayload
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultFingeringIndex: string | number | null
  runtimeDefaultShowGraph: string | null
  hasLyricToggle: boolean
  relatedSongs: LearnSongCard[]
  relatedGuides: LearnGuideCard[]
  pageBasePath?: string
  runtimeApiBasePath?: string
  backHref?: string
  backLabel?: string
}

export default function PublicRuntimePage({
  songId,
  supportedInstruments,
  queryState,
  presentationByInstrument,
  runtimeControlPayload,
  runtimeDefaultInstrumentId,
  runtimeDefaultFingeringIndex,
  runtimeDefaultShowGraph,
  hasLyricToggle,
  relatedSongs,
  relatedGuides,
  pageBasePath,
  runtimeApiBasePath,
  backHref,
  backLabel
}: PublicRuntimePageProps) {
  const seo = resolveInitialPresentation(songId, queryState, presentationByInstrument)
  const title = seo.title
  const primaryPillButtonClassName =
    'inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,47,34,0.16)] bg-[rgba(255,251,245,0.88)] px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 shadow-[0_10px_22px_rgba(61,47,34,0.08)] transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:border-stone-900 md:bg-stone-900 md:px-4 md:py-2.5 md:text-sm md:text-stone-50 md:shadow-[0_14px_30px_rgba(61,47,34,0.18)] md:hover:bg-stone-800 md:hover:shadow-[0_18px_36px_rgba(61,47,34,0.24)]'
  const subtlePillButtonClassName =
    'inline-flex items-center gap-1.5 rounded-full border border-[rgba(154,126,91,0.18)] bg-white/75 px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:px-4 md:py-2.5 md:text-sm'

  return (
    <main className="page-warm-shell">
      <div className="page-warm-container page-warm-song-container">
        <PublicRuntimeInteractiveShell
          songId={songId}
          supportedInstruments={supportedInstruments}
          queryState={queryState}
          presentationByInstrument={presentationByInstrument}
          runtimeControlPayload={runtimeControlPayload}
          runtimeDefaultInstrumentId={runtimeDefaultInstrumentId}
          runtimeDefaultFingeringIndex={runtimeDefaultFingeringIndex}
          runtimeDefaultShowGraph={runtimeDefaultShowGraph}
          hasLyricToggle={hasLyricToggle}
          pageBasePath={pageBasePath}
          runtimeApiBasePath={runtimeApiBasePath}
          backHref={backHref}
          backLabel={backLabel}
        />

        {relatedSongs.length > 0 ? (
          <section className="page-below-fold-defer page-warm-panel mt-6 p-6 md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Play Next</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
                  Finish {title}? Then play the next song that matches the same feel or practice
                  pattern.
                </p>
              </div>
              <Link href="/" className={primaryPillButtonClassName}>
                <span aria-hidden="true" className="text-[0.95rem] leading-none md:text-base">
                  ←
                </span>
                <span>Browse Song Library</span>
              </Link>
            </div>
            <div className="mt-6">
              <StaticSongCardGrid songs={relatedSongs} />
            </div>
          </section>
        ) : null}

        <article className="page-below-fold-defer mt-8 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="page-warm-panel p-6 md:p-7">
            <h2 className="text-2xl font-bold text-stone-900">About {title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.overview}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.background}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.practiceNotes}</p>
          </section>

          <div className="grid gap-6">
            {relatedGuides.length > 0 ? (
              <section className="page-warm-panel-soft p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-stone-900">Related Guides</h2>
                  <Link href="/learn" className={`${subtlePillButtonClassName} shrink-0`}>
                    <span>Browse learn section→</span>
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-7 text-stone-700">
                  These topic pages answer broader beginner and instrument questions.
                </p>
                <div className="mt-6">
                  <StaticGuideCardGrid guides={relatedGuides} />
                </div>
              </section>
            ) : null}
          </div>
        </article>

        <details className="page-below-fold-defer page-warm-panel mt-8 p-6 md:p-7">
          <summary className="page-warm-details-summary flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-bold text-stone-900">
            <span>More details</span>
            <span aria-hidden="true" className="text-lg leading-none text-stone-500">
              ▾
            </span>
          </summary>
          <div className="mt-6 grid gap-6">
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
                through each phrase. If the page offers more than one setup for the same
                instrument, keep the one that matches the instrument in your hand. The layout is
                built so you can land on the melody and start playing quickly.
              </p>
            </section>
          </div>
        </details>
      </div>
    </main>
  )
}

function resolveInitialPresentation(
  songId: string,
  queryState: PublicSongPageQueryState,
  presentationByInstrument: Partial<Record<PublicSongInstrument['id'], SongPresentation>>
) {
  const requestedInstrumentId = queryState.instrumentId ?? null
  if (requestedInstrumentId && presentationByInstrument[requestedInstrumentId]) {
    return presentationByInstrument[requestedInstrumentId]!
  }

  if (presentationByInstrument.o12) {
    return presentationByInstrument.o12
  }

  return Object.values(presentationByInstrument)[0] ?? {
    title: songId,
    aliases: [],
    metaTitle: null,
    subtitle: null,
    metaDescription: '',
    overview: '',
    background: '',
    practiceNotes: '',
    includes: [],
    faqs: [],
    keyLabel: '',
    meterLabel: '',
    tempoLabel: '',
    familyLabel: 'Melody Page',
    difficultyLabel: 'Unknown'
  }
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
          <h3 className="text-xl font-bold leading-tight text-stone-900">{song.title}</h3>
          <div className="mt-3 flex flex-1 flex-col">
            <p className="text-sm leading-7 text-stone-700">{buildFollowUpCopy(song)}</p>
            <div className="mt-auto pt-5">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(154,126,91,0.18)] bg-white/75 px-3 py-1.5 text-[0.8rem] font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:bg-white md:gap-2 md:px-4 md:py-2.5 md:text-sm">
                <span>Open song page</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function buildFollowUpCopy(song: LearnSongCard) {
  const difficulty = song.difficultyLabel.toLowerCase()
  const familyLine = resolveFamilyLine(song.familyLabel)

  if (song.hasPublicLyrics) {
    return `${song.title} keeps the same singable feel, and is a ${difficulty} ${familyLine}.`
  }

  return `${song.title} keeps the same practice rhythm, and is a ${difficulty} ${familyLine}.`
}

function resolveFamilyLine(familyLabel: string) {
  switch (familyLabel) {
    case 'Holiday Song':
      return 'holiday follow-up'
    case 'Folk Song':
      return 'folk follow-up'
    case 'Classical Melody':
      return 'classical follow-up'
    case 'Nursery Rhyme':
      return 'familiar tune follow-up'
    case 'Hymn or Spiritual':
      return 'calm lyrical follow-up'
    case 'March or Parade Tune':
      return 'march-style follow-up'
    case 'Dance Melody':
      return 'dance-style follow-up'
    case 'Film, TV & Game Theme':
      return 'theme follow-up'
    case 'Pop & Standard Melody':
      return 'standard follow-up'
    default:
      return 'next-step follow-up'
  }
}

function StaticGuideCardGrid({ guides }: { guides: LearnGuideCard[] }) {
  return (
    <div className="grid gap-4">
      {guides.map(guide => (
        <Link
          key={guide.slug}
          href={`/learn/${guide.slug}`}
          className="page-warm-card-link flex h-full flex-col p-5"
        >
          <h3 className="text-xl font-bold leading-tight text-stone-900">{guide.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-700">{guide.description}</p>
          <div className="mt-5 text-sm font-semibold text-stone-900">Open guide →</div>
        </Link>
      ))}
    </div>
  )
}
