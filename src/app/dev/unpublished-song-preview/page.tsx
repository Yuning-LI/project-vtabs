import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import type { SongDoc } from '@/lib/songbook/types'
import type { PublicSongManifestEntry } from '@/lib/songbook/publicManifest'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Unpublished Song Candidates',
  description: 'Internal local preview index for unpublished song candidates.',
  robots: {
    index: false,
    follow: false
  }
}

type ProcessingStatusRow = {
  rank?: number
  title?: string
  source?: string
  status?: string
  sanity?: string | null
  outputs?: {
    runtime?: string
  } | null
}

type CandidateCard = {
  slug: string
  title: string
  description: string
  reviewStatus: string
  reviewNote: string
  rank: number | null
  source: string | null
  pipelineStatus: string | null
  sanity: string | null
}

const dataSongDocDir = path.resolve(process.cwd(), 'data', 'kuailepu')
const localRuntimeDir = path.resolve(process.cwd(), 'reference', 'songs')
const manifestPath = path.resolve(process.cwd(), 'data', 'songbook', 'public-song-manifest.json')
const processingStatusPath = path.resolve(
  process.cwd(),
  'reference',
  'song-publish-candidates',
  'public-domain-global-processing-status.json'
)

export default function UnpublishedSongPreviewPage() {
  const publishedSlugs = loadPublishedSlugSet()
  const processingBySlug = loadProcessingStatusBySlug()
  const candidates = collectUnpublishedCandidates(publishedSlugs, processingBySlug)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7ecd8_0%,#efe0c4_44%,#e7d3b4_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_48px_rgba(84,58,32,0.08)]">
          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            Internal Candidate Preview
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
            Unpublished Song Candidates
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
            This page lists local preview songs that are stored in the repo workspace, can be opened
            in the runtime preview route, but are not part of the public published catalog.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dev/kuailepu-preview"
              className="inline-flex items-center rounded-full border border-stone-300 bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              Open Full Preview Index
            </Link>
            <Link
              href="/dev/song-import-dashboard"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-50"
            >
              Open Song Import Dashboard
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <SummaryCard label="Unpublished candidates" value={String(candidates.length)} />
            <SummaryCard
              label="Ranked queue matches"
              value={String(candidates.filter(candidate => candidate.rank !== null).length)}
            />
            <SummaryCard
              label="Sanity review needed"
              value={String(candidates.filter(candidate => candidate.sanity === 'review').length)}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map(candidate => (
            <Link
              key={candidate.slug}
              href={`/dev/kuailepu-preview/${candidate.slug}`}
              className="rounded-[24px] border border-stone-200 bg-white/90 p-5 shadow-[0_14px_28px_rgba(84,58,32,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(84,58,32,0.1)]"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-stone-500">
                <span>Preview</span>
                {candidate.rank !== null ? (
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-700">
                    Rank {candidate.rank}
                  </span>
                ) : null}
                {candidate.source ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                    {candidate.source}
                  </span>
                ) : null}
                {candidate.sanity ? (
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      candidate.sanity === 'review'
                        ? 'bg-rose-100 text-rose-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    sanity {candidate.sanity}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-lg font-semibold text-stone-900">{candidate.title}</div>
              <div className="mt-2 text-sm text-stone-600">{candidate.description}</div>
              <div className="mt-3 text-xs text-stone-500">slug: {candidate.slug}</div>
              {candidate.pipelineStatus ? (
                <div className="mt-1 text-xs text-stone-500">pipeline: {candidate.pipelineStatus}</div>
              ) : null}
              <div className="mt-3 text-xs leading-6 text-stone-600">
                review: {candidate.reviewStatus}
              </div>
              <div className="mt-1 text-xs leading-6 text-stone-500">{candidate.reviewNote}</div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-stone-900">{value}</div>
    </div>
  )
}

function loadPublishedSlugSet() {
  if (!fs.existsSync(manifestPath)) {
    return new Set<string>()
  }

  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PublicSongManifestEntry[]
  return new Set(parsed.filter(entry => entry.published).map(entry => entry.slug))
}

function loadProcessingStatusBySlug() {
  if (!fs.existsSync(processingStatusPath)) {
    return new Map<string, ProcessingStatusRow>()
  }

  const parsed = JSON.parse(fs.readFileSync(processingStatusPath, 'utf8')) as ProcessingStatusRow[]
  return new Map(
    parsed
      .map(entry => {
        const runtimePath = entry.outputs?.runtime
        const slug = typeof runtimePath === 'string' ? path.basename(runtimePath, '.json') : null
        return slug ? [slug, entry] : null
      })
      .filter((entry): entry is [string, ProcessingStatusRow] => Boolean(entry))
  )
}

function collectUnpublishedCandidates(
  publishedSlugs: Set<string>,
  processingBySlug: Map<string, ProcessingStatusRow>
) {
  if (!fs.existsSync(dataSongDocDir) || !fs.existsSync(localRuntimeDir)) {
    return [] as CandidateCard[]
  }

  const runtimeFiles = new Set(fs.readdirSync(localRuntimeDir).filter(file => file.endsWith('.json')))

  const candidates: CandidateCard[] = []

  for (const file of fs.readdirSync(dataSongDocDir).filter(file => file.endsWith('.json'))) {
    const slug = path.basename(file, '.json')
    if (!runtimeFiles.has(`${slug}.json`) || publishedSlugs.has(slug)) {
      continue
    }

    const songDoc = JSON.parse(
      fs.readFileSync(path.join(dataSongDocDir, `${slug}.json`), 'utf8')
    ) as SongDoc
    if (songDoc.published !== false) {
      continue
    }

    const processing = processingBySlug.get(slug) ?? null
    candidates.push({
      slug,
      title: songDoc.title,
      description: songDoc.description,
      reviewStatus: songDoc.review?.status ?? 'pending',
      reviewNote: songDoc.review?.note ?? 'No review note.',
      rank: typeof processing?.rank === 'number' ? processing.rank : null,
      source: processing?.source ?? inferCandidateSource(songDoc),
      pipelineStatus: processing?.status ?? null,
      sanity: processing?.sanity ?? null
    })
  }

  candidates.sort((left, right) => {
    const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER
    const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }
    return left.slug.localeCompare(right.slug)
  })

  return candidates
}

function inferCandidateSource(songDoc: SongDoc) {
  const note = songDoc.source?.note?.toLowerCase() ?? ''
  if (note.includes('not imported from kuailepu')) {
    return 'local-ingest'
  }
  if (note.includes('kuailepu')) {
    return 'kuailepu'
  }
  return null
}
