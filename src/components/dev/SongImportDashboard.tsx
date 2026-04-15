'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import type { ImportDashboardCandidateRow, ImportDashboardGreySongRow, ImportDashboardSongRow, SongImportDashboardData } from '@/lib/songbook/importDashboard'

type SongImportDashboardProps = {
  data: SongImportDashboardData
}

type SongScope = 'all' | 'issues' | 'public' | 'imports' | 'pending'
type CandidateScope = 'all' | 'next' | 'open' | 'blocked' | 'imported'
type GreyScope = 'all' | 'local' | 'imported' | 'live'

export default function SongImportDashboard({ data }: SongImportDashboardProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SongScope>('issues')
  const [candidateScope, setCandidateScope] = useState<CandidateScope>('open')
  const [greyScope, setGreyScope] = useState<GreyScope>('local')
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()

  const filteredSongs = data.songs.filter(song => {
    if (scope === 'issues' && song.issueFlags.length === 0) {
      return false
    }
    if (scope === 'public' && !song.isPublic) {
      return false
    }
    if (scope === 'imports' && !song.isImportBacked) {
      return false
    }
    if (scope === 'pending' && song.reviewStatus === 'verified') {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return [
      song.slug,
      song.title,
      song.id,
      song.sourceSongUuid ?? '',
      song.family ?? '',
      song.issueFlags.join(' ')
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const filteredCandidates = data.candidatePool.rows.filter(candidate => {
    if (candidateScope === 'next' && candidate.workflowStatus !== 'queued') {
      return false
    }
    if (candidateScope === 'open' && candidate.workflowStatus !== 'queued' && candidate.workflowStatus !== 'hold') {
      return false
    }
    if (
      candidateScope === 'blocked' &&
      candidate.workflowStatus !== 'blocked' &&
      candidate.workflowStatus !== 'reference-only' &&
      candidate.workflowStatus !== 'duplicate'
    ) {
      return false
    }
    if (candidateScope === 'imported' && candidate.workflowStatus !== 'imported-public') {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return [
      candidate.songName,
      candidate.aliasName ?? '',
      candidate.searchResultTitle ?? '',
      candidate.currentSlug ?? '',
      candidate.publicTitle ?? '',
      candidate.recommendedTitle ?? '',
      candidate.recommendedSlug ?? '',
      candidate.status ?? '',
      candidate.workflowStatus,
      candidate.statusReason,
      candidate.rightsRisk ?? '',
      candidate.nextAction ?? '',
      candidate.notes ?? ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const filteredGreySongs = data.greySongs.rows.filter(song => {
    if (greyScope === 'local' && song.status !== 'committed-local') {
      return false
    }
    if (greyScope === 'imported' && song.status !== 'imported-only') {
      return false
    }
    if (greyScope === 'live' && song.status !== 'live') {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return [
      song.slug,
      song.title,
      song.status,
      song.batch ?? '',
      song.group ?? '',
      song.notes ?? ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })

  return (
    <div className="space-y-8">
      <section className="page-warm-hero px-6 py-7 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            Internal Tool
          </div>
          <Link href="/dev/kuailepu-preview" className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            Kuailepu Preview
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 md:text-5xl">
          Song Import Dashboard
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-700 md:text-base">
          Track import-backed songs, release readiness, missing manifest or SEO wiring, pending review status, and the current unpushed release queue without stitching together multiple JSON files by hand.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Public Songs" value={String(data.summary.publicSongs)} detail={`${data.summary.publicManifestEntries} manifest entries`} />
        <SummaryCard label="Import-Backed" value={String(data.summary.importBackedPublicSongs)} detail={`${data.summary.compactDocs} compact docs`} />
        <SummaryCard label="Deployable Raw" value={String(data.summary.runtimeRaw)} detail={`${data.summary.referenceRaw} local raw snapshots`} />
        <SummaryCard label="Pending Review" value={String(data.summary.pendingReview)} detail="Import docs still marked pending" tone="warn" />
        <SummaryCard label="Release Issues" value={String(data.summary.releaseIssues)} detail="Public-song consistency gaps" tone={data.summary.releaseIssues > 0 ? 'danger' : 'ok'} />
        <SummaryCard
          label="Grey Tracker"
          value={String(data.greySongs.rows.length)}
          detail={`${data.greySongs.statusSummary['committed-local'] ?? 0} local, ${data.greySongs.statusSummary.live ?? 0} live`}
          tone={(data.greySongs.statusSummary['committed-local'] ?? 0) > 0 ? 'warn' : 'ok'}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="page-warm-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Working Tree</h2>
              <p className="mt-1 text-sm text-stone-600">Live git status for this workspace.</p>
            </div>
            <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              {data.git.unpushedCommits.length} unpushed commits
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-stone-950 px-4 py-4 text-xs leading-6 text-stone-100">
            {data.git.statusShortBranch || 'No git status output.'}
          </pre>
          <div className="mt-4 space-y-2">
            {data.git.unpushedCommits.map(commit => (
              <div key={commit} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-800">
                {commit}
              </div>
            ))}
          </div>
        </section>

        <section className="page-warm-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Recent Imports</h2>
              <p className="mt-1 text-sm text-stone-600">Most recent import-backed songs by import date.</p>
            </div>
            <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              last {data.recentImports.length}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentImports.map(song => (
              <RecentImportRow key={song.slug} song={song} />
            ))}
          </div>
        </section>
      </section>

      <section className="page-warm-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Import Health</h2>
            <p className="mt-1 text-sm text-stone-600">Search and filter import-backed or public songs by release status.</p>
          </div>
          <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            {filteredSongs.length} rows
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by slug, title, source UUID, or issue"
            className="page-warm-input w-full md:max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            <ScopeButton active={scope === 'issues'} onClick={() => setScope('issues')} label="Needs Attention" />
            <ScopeButton active={scope === 'public'} onClick={() => setScope('public')} label="Public Only" />
            <ScopeButton active={scope === 'imports'} onClick={() => setScope('imports')} label="Import-Backed" />
            <ScopeButton active={scope === 'pending'} onClick={() => setScope('pending')} label="Pending Review" />
            <ScopeButton active={scope === 'all'} onClick={() => setScope('all')} label="All Rows" />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-stone-500">
                <th className="px-3 py-2">Song</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Assets</th>
                <th className="px-3 py-2">Review</th>
                <th className="px-3 py-2">Links</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map(song => (
                <SongRow key={song.slug} song={song} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-warm-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Grey Song Tracker</h2>
            <p className="mt-1 text-sm text-stone-600">
              Internal tracker for grey-song rollout batches. This helps separate local candidates, committed-but-unpushed songs, and already-live grey songs from the main public manifest.
            </p>
          </div>
          <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            {data.greySongs.updatedOn ?? 'No date'}
          </div>
        </div>

        {data.greySongs.notes ? (
          <div className="mt-4 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-700">
            {data.greySongs.notes}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(data.greySongs.statusSummary).map(([key, value]) => (
            <div key={key} className="page-warm-pill-muted px-3 py-1 text-sm">
              <span className="font-semibold text-stone-800">{humanizeKey(key)}:</span> {String(value)}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <ScopeButton active={greyScope === 'local'} onClick={() => setGreyScope('local')} label="Committed Local" />
            <ScopeButton active={greyScope === 'imported'} onClick={() => setGreyScope('imported')} label="Imported Only" />
            <ScopeButton active={greyScope === 'live'} onClick={() => setGreyScope('live')} label="Live" />
            <ScopeButton active={greyScope === 'all'} onClick={() => setGreyScope('all')} label="All Rows" />
          </div>

          <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            {filteredGreySongs.length} rows
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-stone-500">
                <th className="px-3 py-2">Grey Song</th>
                <th className="px-3 py-2">Tracker State</th>
                <th className="px-3 py-2">Assets</th>
                <th className="px-3 py-2">Visibility</th>
                <th className="px-3 py-2">Links</th>
              </tr>
            </thead>
            <tbody>
              {filteredGreySongs.map(song => (
                <GreySongRow key={song.slug} song={song} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-warm-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Western Candidate Pool Snapshot</h2>
            <p className="mt-1 text-sm text-stone-600">
              Current machine-readable pool from <code>data/songbook/kuailepu-western-candidate-pool.json</code>.
            </p>
          </div>
          <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            {data.candidatePool.generatedOn ?? 'No date'}
          </div>
        </div>

        {data.candidatePool.nextStep ? (
          <div className="mt-4 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-700">
            {data.candidatePool.nextStep}
          </div>
        ) : null}

        {data.candidatePool.summary ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.candidatePool.summary).map(([key, value]) => (
              <div key={key} className="page-warm-pill-muted px-3 py-1 text-sm">
                <span className="font-semibold text-stone-800">{humanizeKey(key)}:</span> {String(value)}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(data.candidatePool.workflowSummary).map(([key, value]) => (
            <div key={key} className="page-warm-pill px-3 py-1 text-sm font-semibold text-stone-800">
              {humanizeKey(key)}: {String(value)}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.candidatePool.reasonSummary).map(([key, value]) => (
            <div key={key} className="page-warm-pill-muted px-3 py-1 text-sm">
              <span className="font-semibold text-stone-800">{humanizeKey(key)}:</span> {String(value)}
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-[28px] bg-stone-50 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Next Import Queue</h3>
              <p className="mt-1 text-sm text-stone-600">Candidates explicitly marked ready for a China-network import run.</p>
            </div>
            <div className="page-warm-pill-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              {data.candidatePool.nextImportCandidates.length} ready
            </div>
          </div>

          {data.candidatePool.nextImportCandidates.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.candidatePool.nextImportCandidates.map(candidate => (
                <div key={candidate.href} className="rounded-3xl bg-white px-4 py-4 shadow-[0_10px_24px_rgba(84,58,32,0.06)]">
                  <div className="font-semibold text-stone-900">{candidate.recommendedTitle ?? candidate.songName}</div>
                  <div className="mt-1 text-sm text-stone-600">{candidate.recommendedSlug ?? 'No slug yet'}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatePill label={humanizeKey(candidate.workflowStatus)} tone="ok" />
                    <StatePill label={humanizeKey(candidate.statusReason)} tone={toneForCandidateReason(candidate.statusReason)} />
                    {candidate.supportsPublicInstruments === true ? <StatePill label="5 instruments ready" tone="ok" /> : null}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-stone-600">{candidate.notes ?? candidate.nextAction ?? 'No note.'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm leading-7 text-stone-600">
              No candidate is currently marked <code>queued</code>. The next expansion step is a fresh China-network discovery pass before another western-demand round.
            </div>
          )}
        </section>

        <div className="mt-5 overflow-x-auto">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <ScopeButton active={candidateScope === 'open'} onClick={() => setCandidateScope('open')} label="Open" />
              <ScopeButton active={candidateScope === 'next'} onClick={() => setCandidateScope('next')} label="Queued" />
              <ScopeButton active={candidateScope === 'blocked'} onClick={() => setCandidateScope('blocked')} label="Blocked" />
              <ScopeButton active={candidateScope === 'imported'} onClick={() => setCandidateScope('imported')} label="Imported" />
              <ScopeButton active={candidateScope === 'all'} onClick={() => setCandidateScope('all')} label="All Rows" />
            </div>

            <div className="page-warm-pill px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              {filteredCandidates.length} rows
            </div>
          </div>

          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-stone-500">
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Recommendation</th>
                <th className="px-3 py-2">Current Mapping</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map(candidate => (
                <CandidateRow key={candidate.href} candidate={candidate} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SummaryCard(props: {
  label: string
  value: string
  detail: string
  tone?: 'default' | 'warn' | 'danger' | 'ok'
}) {
  const toneClass =
    props.tone === 'danger'
      ? 'border-red-200 bg-red-50/90'
      : props.tone === 'warn'
        ? 'border-amber-200 bg-amber-50/90'
        : props.tone === 'ok'
          ? 'border-emerald-200 bg-emerald-50/90'
          : ''

  return (
    <section className={`page-warm-panel p-5 ${toneClass}`.trim()}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{props.label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-stone-900">{props.value}</div>
      <div className="mt-2 text-sm leading-6 text-stone-600">{props.detail}</div>
    </section>
  )
}

function ScopeButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={props.active ? 'page-warm-pill-active px-3 py-2 text-sm font-semibold' : 'page-warm-pill-muted px-3 py-2 text-sm font-semibold'}
    >
      {props.label}
    </button>
  )
}

function SongRow({ song }: { song: ImportDashboardSongRow }) {
  return (
    <tr className="rounded-3xl bg-white/88 shadow-[0_10px_24px_rgba(84,58,32,0.06)]">
      <td className="rounded-l-3xl px-3 py-4 align-top">
        <div className="font-semibold text-stone-900">{song.title}</div>
        <div className="mt-1 text-sm text-stone-600">{song.slug}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatePill label={song.isPublic ? 'Public' : 'Not Public'} tone={song.isPublic ? 'ok' : 'muted'} />
          <StatePill label={song.isImportBacked ? 'Import-backed' : 'Manual'} tone={song.isImportBacked ? 'accent' : 'muted'} />
          {song.family ? <StatePill label={song.family} tone="muted" /> : null}
          {song.sourceSongUuid ? <StatePill label={`UUID ${song.sourceSongUuid}`} tone="muted" /> : null}
        </div>
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          {song.issueFlags.length > 0 ? song.issueFlags.map(issue => <StatePill key={issue} label={issue} tone="danger" />) : <StatePill label="Ready" tone="ok" />}
        </div>
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatePill label={`Manifest ${song.hasManifest ? 'yes' : 'no'}`} tone={song.hasManifest ? 'ok' : 'danger'} />
          <StatePill label={`SEO ${song.hasSeoProfile ? 'yes' : 'no'}`} tone={song.hasSeoProfile ? 'ok' : 'danger'} />
          <StatePill label={`Runtime ${song.hasRuntimeRaw ? 'yes' : 'no'}`} tone={song.hasRuntimeRaw ? 'ok' : 'danger'} />
          <StatePill label={`Compact ${song.hasCompactDoc ? 'yes' : 'no'}`} tone={song.hasCompactDoc ? 'ok' : 'muted'} />
          <StatePill label={`Reference ${song.hasReferenceRaw ? 'yes' : 'no'}`} tone={song.hasReferenceRaw ? 'ok' : 'muted'} />
        </div>
      </td>
      <td className="px-3 py-4 align-top text-sm text-stone-700">
        <div>Status: <span className="font-semibold text-stone-900">{song.reviewStatus}</span></div>
        <div className="mt-1">Checked: {song.reviewCheckedOn ?? 'N/A'}</div>
        <div className="mt-1">Imported: {song.importedOn ?? 'N/A'}</div>
      </td>
      <td className="rounded-r-3xl px-3 py-4 align-top text-sm">
        <div className="flex flex-col gap-2">
          {song.isPublic ? (
            <Link href={`/song/${song.slug}`} className="font-semibold text-stone-900 underline underline-offset-4">
              Public page
            </Link>
          ) : null}
          {song.hasReferenceRaw ? (
            <Link href={`/dev/kuailepu-preview/${song.slug}`} className="font-semibold text-stone-900 underline underline-offset-4">
              Dev preview
            </Link>
          ) : null}
          {song.sourceUrl ? (
            <a href={song.sourceUrl} target="_blank" rel="noreferrer" className="text-stone-700 underline underline-offset-4">
              Kuailepu source
            </a>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function RecentImportRow({ song }: { song: ImportDashboardSongRow }) {
  return (
    <div className="rounded-[22px] bg-stone-50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-stone-900">{song.title}</div>
          <div className="mt-1 text-sm text-stone-600">{song.slug}</div>
        </div>
        <div className="page-warm-pill-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          {song.importedOn ?? 'No date'}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatePill label={song.reviewStatus} tone={song.reviewStatus === 'verified' ? 'ok' : song.reviewStatus === 'pending' ? 'warn' : 'muted'} />
        <StatePill label={song.hasManifest ? 'In manifest' : 'No manifest'} tone={song.hasManifest ? 'ok' : 'danger'} />
        <StatePill label={song.hasSeoProfile ? 'SEO ready' : 'SEO missing'} tone={song.hasSeoProfile ? 'ok' : 'danger'} />
      </div>
    </div>
  )
}

function CandidateRow({ candidate }: { candidate: ImportDashboardCandidateRow }) {
  return (
    <tr className="rounded-3xl bg-white/88 shadow-[0_10px_24px_rgba(84,58,32,0.06)]">
      <td className="rounded-l-3xl px-3 py-4 align-top">
        <div className="font-semibold text-stone-900">{candidate.songName}</div>
        <div className="mt-1 text-sm text-stone-600">{candidate.aliasName ?? 'No alias'}</div>
        {candidate.searchResultTitle ? <div className="mt-1 text-xs text-stone-500">{candidate.searchResultTitle}</div> : null}
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatePill label={humanizeKey(candidate.workflowStatus)} tone={toneForCandidateWorkflow(candidate.workflowStatus)} />
          <StatePill label={humanizeKey(candidate.statusReason)} tone={toneForCandidateReason(candidate.statusReason)} />
          {candidate.supportsPublicInstruments === true ? <StatePill label="5 instruments ready" tone="ok" /> : null}
          {candidate.supportsPublicInstruments === false ? <StatePill label="Instrument gap" tone="warn" /> : null}
          {candidate.rightsRisk ? <StatePill label={humanizeKey(candidate.rightsRisk)} tone={toneForRightsRisk(candidate.rightsRisk)} /> : null}
        </div>
        <div className="mt-3 text-sm leading-7 text-stone-600">{candidate.nextAction ?? candidate.status ?? 'No workflow note'}</div>
      </td>
      <td className="px-3 py-4 align-top text-sm text-stone-700">
        <div className="font-semibold text-stone-900">{candidate.recommendedTitle ?? 'No canonical title yet'}</div>
        <div className="mt-1 text-stone-600">{candidate.recommendedSlug ?? 'No slug yet'}</div>
        <div className="mt-1 text-stone-500">Checked: {candidate.lastCheckedOn ?? 'N/A'}</div>
      </td>
      <td className="px-3 py-4 align-top text-sm text-stone-700">
        <div>{candidate.currentSlug ?? 'Not mapped'}</div>
        <div className="mt-1 text-stone-500">{candidate.publicTitle ?? 'No public title'}</div>
        {candidate.isCurrentlyPublic ? <div className="mt-2"><StatePill label="Live public page" tone="ok" /></div> : null}
      </td>
      <td className="rounded-r-3xl px-3 py-4 align-top text-sm">
        <div className="flex flex-col gap-2">
          <a href={candidate.href} target="_blank" rel="noreferrer" className="font-semibold text-stone-900 underline underline-offset-4">
            Candidate source
          </a>
          {candidate.sourceSongUuid ? <div className="text-stone-500">UUID: {candidate.sourceSongUuid}</div> : null}
          {candidate.currentSlug ? (
            <Link href={`/song/${candidate.currentSlug}`} className="text-stone-700 underline underline-offset-4">
              Current public page
            </Link>
          ) : null}
          {candidate.notes ? <div className="text-stone-500">{candidate.notes}</div> : null}
        </div>
      </td>
    </tr>
  )
}

function GreySongRow({ song }: { song: ImportDashboardGreySongRow }) {
  return (
    <tr className="rounded-3xl bg-white/88 shadow-[0_10px_24px_rgba(84,58,32,0.06)]">
      <td className="rounded-l-3xl px-3 py-4 align-top">
        <div className="font-semibold text-stone-900">{song.title}</div>
        <div className="mt-1 text-sm text-stone-600">{song.slug}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatePill label={song.status === 'committed-local' ? 'Committed local' : song.status === 'imported-only' ? 'Imported only' : 'Live'} tone={song.status === 'live' ? 'ok' : song.status === 'committed-local' ? 'warn' : 'accent'} />
          {song.batch ? <StatePill label={`Batch ${song.batch}`} tone="muted" /> : null}
          {song.group ? <StatePill label={song.group} tone="muted" /> : null}
          {song.addedOn ? <StatePill label={song.addedOn} tone="muted" /> : null}
        </div>
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatePill label={song.isPublicOnOriginMain ? 'On origin/main' : 'Not on origin/main'} tone={song.isPublicOnOriginMain ? 'ok' : 'warn'} />
          <StatePill label={song.isPublicInLocalCatalog ? 'In local public view' : 'Not in local public view'} tone={song.isPublicInLocalCatalog ? 'ok' : 'muted'} />
        </div>
        {song.notes ? <div className="mt-3 text-sm leading-7 text-stone-600">{song.notes}</div> : null}
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatePill label={`SEO ${song.hasSeoProfile ? 'yes' : 'no'}`} tone={song.hasSeoProfile ? 'ok' : 'warn'} />
          <StatePill label={`Runtime ${song.hasRuntimeRaw ? 'yes' : 'no'}`} tone={song.hasRuntimeRaw ? 'ok' : 'warn'} />
          <StatePill label={`Compact ${song.hasCompactDoc ? 'yes' : 'no'}`} tone={song.hasCompactDoc ? 'ok' : 'warn'} />
        </div>
      </td>
      <td className="px-3 py-4 align-top text-sm text-stone-700">
        <div>Origin/main: <span className="font-semibold text-stone-900">{song.isPublicOnOriginMain ? 'live' : 'not live'}</span></div>
        <div className="mt-1">Local public: <span className="font-semibold text-stone-900">{song.isPublicInLocalCatalog ? 'yes' : 'no'}</span></div>
      </td>
      <td className="rounded-r-3xl px-3 py-4 align-top text-sm">
        <div className="flex flex-col gap-2">
          {song.sourceUrl ? (
            <a href={song.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-stone-900 underline underline-offset-4">
              Kuailepu source
            </a>
          ) : null}
          {song.hasRuntimeRaw ? (
            <Link href={`/dev/kuailepu-preview/${song.slug}`} className="text-stone-700 underline underline-offset-4">
              Dev preview
            </Link>
          ) : null}
          {song.isPublicInLocalCatalog ? (
            <Link href={`/song/${song.slug}`} className="text-stone-700 underline underline-offset-4">
              Local song page
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function StatePill(props: { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' | 'accent' }) {
  const className =
    props.tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : props.tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : props.tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-800'
          : props.tone === 'accent'
            ? 'border-sky-200 bg-sky-50 text-sky-800'
            : 'border-stone-200 bg-stone-100 text-stone-700'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}>
      {props.label}
    </span>
  )
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function toneForCandidateWorkflow(value: ImportDashboardCandidateRow['workflowStatus']) {
  if (value === 'queued' || value === 'imported-public') {
    return 'ok' as const
  }
  if (value === 'hold') {
    return 'warn' as const
  }
  if (value === 'blocked') {
    return 'danger' as const
  }
  if (value === 'reference-only') {
    return 'accent' as const
  }

  return 'muted' as const
}

function toneForCandidateReason(value: ImportDashboardCandidateRow['statusReason']) {
  if (value === 'already-public') {
    return 'ok' as const
  }
  if (value === 'ambiguous-identity' || value === 'unclear-identity' || value === 'no-public-instruments') {
    return 'warn' as const
  }
  if (value === 'traffic-reference-only') {
    return 'accent' as const
  }
  if (value === 'copyright-risk') {
    return 'danger' as const
  }

  return 'muted' as const
}

function toneForRightsRisk(value: string) {
  if (value === 'public-domain') {
    return 'ok' as const
  }
  if (value === 'unclear') {
    return 'warn' as const
  }
  if (value.includes('copyright')) {
    return 'danger' as const
  }

  return 'muted' as const
}
