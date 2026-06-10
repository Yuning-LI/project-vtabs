import fs from 'node:fs'
import path from 'node:path'
import { buildSongIrFromRuntimePayload } from '../src/lib/native-renderer/fromRuntimeNotation.ts'
import { auditSongIrPlaybackSequence } from '../src/lib/native-renderer/playbackSequence.ts'
import { expandSongIrPlayOrder } from '../src/lib/native-renderer/playOrder.ts'
import { buildSongIrSemanticQa } from '../src/lib/native-renderer/semanticQa.ts'
import { summarizeSongIr } from '../src/lib/native-renderer/songIr.ts'
import { evaluateNativeRendererSupport } from '../src/lib/native-renderer/support.ts'
import type { PublicRuntimePayload } from '../src/lib/runtime-core/runtimeTypes.ts'

type CliOptions = {
  slugs: string[]
  runtimeDir: string
  outJson: string
  limit: number | null
}

const DEFAULT_RUNTIME_DIR = 'data/kuailepu-runtime'
const DEFAULT_OUT_JSON = 'tmp/native-runtime-song-ir-summary.json'
const options = parseArgs(process.argv.slice(2))
const runtimeDirPath = path.resolve(process.cwd(), options.runtimeDir)
const slugs =
  options.slugs.length > 0
    ? options.slugs
    : fs
        .readdirSync(runtimeDirPath)
        .filter(fileName => fileName.endsWith('.json'))
        .map(fileName => fileName.replace(/\.json$/i, ''))
        .sort()
        .slice(0, options.limit ?? undefined)

const summaries = slugs.map(slug => {
  const filePath = path.resolve(runtimeDirPath, `${slug}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Runtime payload not found: ${path.relative(process.cwd(), filePath)}`)
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PublicRuntimePayload
  const song = buildSongIrFromRuntimePayload(slug, payload)
  const summary = summarizeSongIr(song)
  const support = evaluateNativeRendererSupport(slug, song, { mode: 'runtime-probe' })
  const semanticQa = buildSongIrSemanticQa(song)
  const playOrderExpansion = expandSongIrPlayOrder(song)
  const playbackSequenceAudit = auditSongIrPlaybackSequence(song)
  return {
    ...summary,
    support,
    semanticQa,
    playOrderExpansion: {
      hasExplicitPlayOrder: playOrderExpansion.hasExplicitPlayOrder,
      sectionRangeCount: playOrderExpansion.sectionRanges.length,
      resolvedStepCount:
        playOrderExpansion.steps.length - playOrderExpansion.unresolvedSteps.length,
      unresolvedStepCount: playOrderExpansion.unresolvedSteps.length,
      unresolvedLabels: playOrderExpansion.unresolvedSteps.map(step => step.label),
      expandedMeasureCount: playOrderExpansion.expandedMeasureCount,
      uniqueExpandedMeasureCount: playOrderExpansion.uniqueExpandedMeasureCount
    },
    playbackSequenceAudit: {
      complexity: playbackSequenceAudit.complexity,
      canUseMeasureSequenceForPlayback:
        playbackSequenceAudit.canUseMeasureSequenceForPlayback,
      blockers: playbackSequenceAudit.blockers,
      repeatExpansionStatus: playbackSequenceAudit.repeatExpansionStatus,
      repeatSegmentCount: playbackSequenceAudit.repeatSegmentCount,
      sequenceMeasureCount: playbackSequenceAudit.sequenceMeasureCount,
      uniqueMeasureCount: playbackSequenceAudit.uniqueMeasureCount
    }
  }
})

const unsupportedReasonCounts = new Map<string, number>()
summaries.forEach(summary => {
  summary.unsupported.forEach(reason => {
    const count = unsupportedReasonCounts.get(reason) ?? 0
    unsupportedReasonCounts.set(reason, count + 1)
  })
})

const fallbackReasonCounts = new Map<string, number>()
summaries.forEach(summary => {
  summary.support.reasons.forEach(reason => {
    const count = fallbackReasonCounts.get(reason) ?? 0
    fallbackReasonCounts.set(reason, count + 1)
  })
})
const playbackComplexityCounts = new Map<string, number>()
summaries.forEach(summary => {
  const count = playbackComplexityCounts.get(summary.playbackSequenceAudit.complexity) ?? 0
  playbackComplexityCounts.set(summary.playbackSequenceAudit.complexity, count + 1)
})
const repeatExpansionStatusCounts = new Map<string, number>()
summaries.forEach(summary => {
  const count =
    repeatExpansionStatusCounts.get(summary.playbackSequenceAudit.repeatExpansionStatus) ?? 0
  repeatExpansionStatusCounts.set(summary.playbackSequenceAudit.repeatExpansionStatus, count + 1)
})

const report = {
  generatedOn: new Date().toISOString(),
  runtimeDir: options.runtimeDir,
  count: summaries.length,
  unsupportedCount: summaries.filter(summary => summary.unsupported.length > 0).length,
  supportCount: summaries.filter(summary => summary.support.status === 'supported').length,
  semanticIssueCount: summaries.filter(
    summary =>
      summary.semanticQa.missingO12FingeringCount > 0 ||
      summary.semanticQa.eventCount !== summary.eventCount ||
      summary.semanticQa.noteCount !== summary.noteCount ||
      summary.semanticQa.restCount !== summary.restCount ||
      summary.semanticQa.measureCount !== summary.measureCount
  ).length,
  parenthesizedGroupSongCount: summaries.filter(summary => summary.parenthesizedGroupCount > 0).length,
  repeatMarkerSongCount: summaries.filter(summary => summary.repeatMarkerCount > 0).length,
  endingMarkerSongCount: summaries.filter(summary => summary.endingMarkerCount > 0).length,
  sectionSongCount: summaries.filter(summary => summary.sectionCount > 0).length,
  playOrderSongCount: summaries.filter(summary => summary.playOrderStepCount > 0).length,
  playOrderFullyResolvedSongCount: summaries.filter(
    summary =>
      summary.playOrderStepCount > 0 &&
      summary.playOrderExpansion.unresolvedStepCount === 0
  ).length,
  playOrderUnresolvedSongCount: summaries.filter(
    summary => summary.playOrderExpansion.unresolvedStepCount > 0
  ).length,
  playbackSequenceCandidateCount: summaries.filter(
    summary => summary.playbackSequenceAudit.canUseMeasureSequenceForPlayback
  ).length,
  playbackComplexityCounts: Object.fromEntries(
    [...playbackComplexityCounts.entries()].sort(sortCountEntries)
  ),
  repeatExpansionStatusCounts: Object.fromEntries(
    [...repeatExpansionStatusCounts.entries()].sort(sortCountEntries)
  ),
  reasonCounts: {
    unsupported: Object.fromEntries([...unsupportedReasonCounts.entries()].sort(sortCountEntries)),
    fallback: Object.fromEntries([...fallbackReasonCounts.entries()].sort(sortCountEntries))
  },
  summaries
}

const outPath = path.resolve(process.cwd(), options.outJson)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  JSON.stringify(
    {
      generatedOn: report.generatedOn,
      runtimeDir: report.runtimeDir,
      outJson: path.relative(process.cwd(), outPath),
      count: report.count,
      unsupportedCount: report.unsupportedCount,
      supportCount: report.supportCount,
      semanticIssueCount: report.semanticIssueCount,
      parenthesizedGroupSongCount: report.parenthesizedGroupSongCount,
      repeatMarkerSongCount: report.repeatMarkerSongCount,
      endingMarkerSongCount: report.endingMarkerSongCount,
      sectionSongCount: report.sectionSongCount,
      playOrderSongCount: report.playOrderSongCount,
      playOrderFullyResolvedSongCount: report.playOrderFullyResolvedSongCount,
      playOrderUnresolvedSongCount: report.playOrderUnresolvedSongCount,
      playbackSequenceCandidateCount: report.playbackSequenceCandidateCount,
      playbackComplexityCounts: report.playbackComplexityCounts,
      repeatExpansionStatusCounts: report.repeatExpansionStatusCounts,
      topUnsupportedReasons: Object.entries(report.reasonCounts.unsupported).slice(0, 30),
      topFallbackReasons: Object.entries(report.reasonCounts.fallback).slice(0, 30),
      supportedSamples: summaries
        .filter(summary => summary.support.status === 'supported')
        .slice(0, 30)
        .map(summary => summary.slug)
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions {
  const slugs: string[] = []
  let runtimeDir = DEFAULT_RUNTIME_DIR
  let outJson = DEFAULT_OUT_JSON
  let limit: number | null = null

  args.forEach(arg => {
    if (arg.startsWith('--runtime-dir=')) {
      runtimeDir = arg.slice('--runtime-dir='.length)
      return
    }
    if (arg.startsWith('--out-json=')) {
      outJson = arg.slice('--out-json='.length)
      return
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length))
      limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
      return
    }
    if (arg.startsWith('--slug=')) {
      slugs.push(arg.slice('--slug='.length))
    }
  })

  return {
    slugs,
    runtimeDir,
    outJson,
    limit
  }
}

function sortCountEntries(left: [string, number], right: [string, number]) {
  return right[1] - left[1] || left[0].localeCompare(right[0])
}
