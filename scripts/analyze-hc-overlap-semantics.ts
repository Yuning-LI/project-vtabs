import fs from 'node:fs'
import path from 'node:path'
import { analyzeHcNotation, type HcMainMelodyEvent } from '../src/lib/songbook/hcNotation.ts'
import { listKuailepuRuntimeSongFiles, resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import {
  closeMusicXmlExtractorSession,
  createMusicXmlExtractorSession,
  extractMusicXmlScore,
  readMusicXmlText
} from '../src/lib/songbook/musicXml.ts'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  parseKeynoteToMidi
} from '../src/lib/songbook/songIngestDraft.ts'

type CliOptions = {
  datasetDir: string
  templateSlug: string
  report: string
  slugs: string[]
  limit?: number
}

type HcMismatch = {
  index: number
  referenceKind: 'note' | 'rest' | null
  generatedKind: 'note' | 'rest' | null
  referenceMidi: number | null
  generatedMidi: number | null
  referenceDuration: number | null
  generatedDuration: number | null
}

type Entry = {
  slug: string
  xmlFile: string
  referenceRuntimeFile: string
  referenceSongUuid: string | null
  referenceKeynote: string
  transposeToReference: number
  referenceParseOk: boolean
  generatedParseOk: boolean
  referenceMeasureCount: number | null
  generatedMeasureCount: number | null
  referenceUnitDuration: number
  generatedUnitDuration: number
  referenceEventCount: number
  generatedEventCount: number
  exactSemantic: boolean
  fullSequence: {
    mismatchCount: number
    mismatches: HcMismatch[]
  }
  pitchOnlyAligned: {
    comparedCount: number
    mismatchCount: number
    overlapRatio: number
    mismatchRatio: number
    bestReferenceStart: number
    bestGeneratedStart: number
    mismatches: HcMismatch[]
  }
  noteOnlyAligned: {
    comparedCount: number
    mismatchCount: number
    overlapRatio: number
    mismatchRatio: number
    bestReferenceStart: number
    bestGeneratedStart: number
    mismatches: HcMismatch[]
  }
  hcFit: {
    level: 'strong' | 'partial' | 'weak'
    reason: string
  }
}

type Report = {
  generatedOn: string
  datasetDir: string
  templateSlug: string
  summary: {
    overlapCount: number
    comparedCount: number
    exactSemanticCount: number
    pitchStrongCount: number
    pitchPartialCount: number
    fitCounts: {
      strong: number
      partial: number
      weak: number
    }
    strongSlugs: string[]
    partialSlugs: string[]
  }
  skipped: Array<{
    slug: string
    reason: string
  }>
  entries: Entry[]
}

const DEFAULT_DATASET_DIR = 'private/openewld/dataset'
const DEFAULT_TEMPLATE_SLUG = 'happy-birthday-to-you'
const DEFAULT_REPORT =
  'reference/song-publish-candidates/review-notes/hc-overlap-semantic-analysis-2026-05-13.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-hc-overlap-semantics.ts [--dataset-dir=${DEFAULT_DATASET_DIR}] [--template=${DEFAULT_TEMPLATE_SLUG}] [--slug=joy-to-the-world] [--limit=10] [--report=${DEFAULT_REPORT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const datasetDir = path.resolve(process.cwd(), options.datasetDir)
if (!fs.existsSync(datasetDir)) {
  console.error(`Dataset directory not found: ${options.datasetDir}`)
  process.exit(1)
}

const templatePath = path.resolve(
  process.cwd(),
  'data',
  'kuailepu-runtime',
  `${options.templateSlug}.json`
)
if (!fs.existsSync(templatePath)) {
  console.error(`Template runtime not found: data/kuailepu-runtime/${options.templateSlug}.json`)
  process.exit(1)
}

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8')) as Record<string, unknown>
const datasetIndex = buildDatasetIndex(datasetDir)
const selectedSlugs = resolveSelectedSlugs(options, datasetIndex)
const session = await createMusicXmlExtractorSession()

try {
  const entries: Entry[] = []
  const skipped: Report['skipped'] = []

  for (const slug of selectedSlugs) {
    const runtimePath = resolveKuailepuRuntimeSongPath(slug)
    if (!runtimePath) {
      skipped.push({ slug, reason: 'Runtime payload not found.' })
      continue
    }

    const referencePayload = JSON.parse(fs.readFileSync(runtimePath, 'utf8')) as KuailepuRuntimePayload
    const songUuid =
      typeof referencePayload.song_uuid === 'string' ? referencePayload.song_uuid : null
    if (!songUuid || songUuid.startsWith('synthetic-')) {
      skipped.push({ slug, reason: 'Runtime payload is synthetic, not a Kuailepu-imported truth source.' })
      continue
    }

    const xmlMatches = datasetIndex.get(slug) ?? []
    if (xmlMatches.length < 1) {
      skipped.push({ slug, reason: 'No matching OpenEWLD MusicXML file found.' })
      continue
    }

    const referenceKeynote =
      typeof referencePayload.keynote === 'string' && referencePayload.keynote.trim()
        ? referencePayload.keynote.trim()
        : null
    if (!referenceKeynote) {
      skipped.push({ slug, reason: 'Reference runtime payload is missing keynote.' })
      continue
    }

    try {
      const xmlFile = xmlMatches[0]!
      const xmlText = await readMusicXmlText(xmlFile)
      const extract = await extractMusicXmlScore(xmlText, undefined, session)
      const draft = buildSongIngestDraftFromMusicXmlExtract(extract)
      const transposeToReference =
        parseKeynoteToMidi(referenceKeynote) - draft.metadata.recommendedTonicMidi
      const generated = generateKuailepuRuntimeCandidate({
        draft,
        template,
        slug: `hc-overlap-${slug}`,
        title: draft.metadata.title,
        keynote: referenceKeynote,
        transpose: transposeToReference,
        scrubRuntimeCache: true
      })

      const referenceAnalysis = analyzeHcNotation(String(referencePayload.notation ?? ''))
      const generatedAnalysis = analyzeHcNotation(String(generated.runtimePayload.notation ?? ''))
      const referenceDurationUnit = detectDurationUnit(referenceAnalysis.events)
      const generatedDurationUnit = detectDurationUnit(generatedAnalysis.events)
      const fullSequence = compareHcEvents(
        referenceAnalysis.events,
        generatedAnalysis.events,
        referenceDurationUnit,
        generatedDurationUnit
      )
      const pitchOnlyAligned = compareHcEventsWithBestOffset(
        referenceAnalysis.events.filter(event => event.kind === 'note'),
        generatedAnalysis.events.filter(event => event.kind === 'note'),
        {
          compareDuration: false,
          referenceDurationUnit,
          generatedDurationUnit
        }
      )
      const noteOnlyAligned = compareHcEventsWithBestOffset(
        referenceAnalysis.events.filter(event => event.kind === 'note'),
        generatedAnalysis.events.filter(event => event.kind === 'note'),
        {
          compareDuration: true,
          referenceDurationUnit,
          generatedDurationUnit
        }
      )
      const hcFit = classifyHcFit(noteOnlyAligned)

      entries.push({
        slug,
        xmlFile: path.relative(process.cwd(), xmlFile),
        referenceRuntimeFile: path.relative(process.cwd(), runtimePath),
        referenceSongUuid: songUuid,
        referenceKeynote,
        transposeToReference,
        referenceParseOk: referenceAnalysis.parseOk,
        generatedParseOk: generatedAnalysis.parseOk,
        referenceMeasureCount: referenceAnalysis.totalMeasures,
        generatedMeasureCount: generatedAnalysis.totalMeasures,
        referenceUnitDuration: referenceDurationUnit,
        generatedUnitDuration: generatedDurationUnit,
        referenceEventCount: referenceAnalysis.mainEventCount,
        generatedEventCount: generatedAnalysis.mainEventCount,
        exactSemantic:
          referenceAnalysis.parseOk &&
          generatedAnalysis.parseOk &&
          referenceAnalysis.totalMeasures === generatedAnalysis.totalMeasures &&
          fullSequence.mismatchCount === 0,
        fullSequence,
        pitchOnlyAligned,
        noteOnlyAligned,
        hcFit
      })
    } catch (error) {
      skipped.push({
        slug,
        reason: error instanceof Error ? error.message : 'Unknown HC overlap analysis failure.'
      })
    }
  }

  const report: Report = {
    generatedOn: new Date().toISOString(),
    datasetDir: path.relative(process.cwd(), datasetDir),
    templateSlug: options.templateSlug,
    summary: {
      overlapCount: selectedSlugs.length,
      comparedCount: entries.length,
      exactSemanticCount: entries.filter(entry => entry.exactSemantic).length,
      pitchStrongCount: entries.filter(entry => classifyHcFit(entry.pitchOnlyAligned).level === 'strong').length,
      pitchPartialCount: entries.filter(entry => classifyHcFit(entry.pitchOnlyAligned).level === 'partial').length,
      fitCounts: {
        strong: entries.filter(entry => entry.hcFit.level === 'strong').length,
        partial: entries.filter(entry => entry.hcFit.level === 'partial').length,
        weak: entries.filter(entry => entry.hcFit.level === 'weak').length
      },
      strongSlugs: entries.filter(entry => entry.hcFit.level === 'strong').map(entry => entry.slug),
      partialSlugs: entries.filter(entry => entry.hcFit.level === 'partial').map(entry => entry.slug)
    },
    skipped,
    entries
  }

  const markdown = buildMarkdown(report)
  const outPath = path.resolve(process.cwd(), options.report)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, markdown, 'utf8')
  console.log(`Wrote HC overlap semantic analysis to ${path.relative(process.cwd(), outPath)}`)
  console.log(JSON.stringify(report.summary, null, 2))
} finally {
  await closeMusicXmlExtractorSession(session)
}

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string[]>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      return
    }

    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      values.set(arg.slice(2), [...(values.get(arg.slice(2)) ?? []), 'true'])
      return
    }

    values.set(match[1], [...(values.get(match[1]) ?? []), match[2]])
  })

  return {
    datasetDir: values.get('dataset-dir')?.[0] || DEFAULT_DATASET_DIR,
    templateSlug: values.get('template')?.[0] || DEFAULT_TEMPLATE_SLUG,
    report: values.get('report')?.[0] || DEFAULT_REPORT,
    slugs: values.get('slug') ?? [],
    limit: values.get('limit')?.[0] ? Number(values.get('limit')?.[0]) : undefined
  }
}

function resolveSelectedSlugs(options: CliOptions, datasetIndex: Map<string, string[]>) {
  const explicit = options.slugs.map(slug => slug.trim()).filter(Boolean)
  const allRuntimeSlugs = listKuailepuRuntimeSongFiles().map(file => file.replace(/\.json$/i, ''))
  const overlaps = allRuntimeSlugs.filter(slug => datasetIndex.has(slug)).sort((left, right) => left.localeCompare(right))
  const selected = explicit.length > 0 ? explicit.filter(slug => datasetIndex.has(slug)) : overlaps
  return typeof options.limit === 'number' ? selected.slice(0, options.limit) : selected
}

function buildDatasetIndex(datasetDir: string) {
  const files = walkMusicXmlFiles(datasetDir)
  const index = new Map<string, string[]>()

  files.forEach(file => {
    const base = path.basename(file, path.extname(file))
    const slug = normalizeToSlug(base)
    if (!slug) {
      return
    }
    index.set(slug, [...(index.get(slug) ?? []), file])
  })

  return index
}

function walkMusicXmlFiles(root: string) {
  const output: string[] = []
  const queue = [root]

  while (queue.length > 0) {
    const current = queue.shift()!
    const entries = fs.readdirSync(current, { withFileTypes: true })

    entries.forEach(entry => {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(fullPath)
        return
      }

      if (entry.isFile() && /\.(xml|musicxml|mxl)$/i.test(entry.name)) {
        output.push(fullPath)
      }
    })
  }

  return output.sort((left, right) => left.localeCompare(right))
}

function normalizeToSlug(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['".!?()[\]{}]/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function compareHcEvents(
  referenceEvents: HcMainMelodyEvent[],
  generatedEvents: HcMainMelodyEvent[],
  referenceDurationUnit: number,
  generatedDurationUnit: number
) {
  const overlap = Math.min(referenceEvents.length, generatedEvents.length)
  const mismatches: HcMismatch[] = []
  let mismatchCount = Math.abs(referenceEvents.length - generatedEvents.length)

  for (let index = 0; index < overlap; index += 1) {
    const reference = referenceEvents[index]!
    const generated = generatedEvents[index]!
    if (
      reference.kind !== generated.kind ||
      reference.midi !== generated.midi ||
      !sameDurationUnits(reference.duration, generated.duration, referenceDurationUnit, generatedDurationUnit)
    ) {
      mismatchCount += 1
      if (mismatches.length < 12) {
        mismatches.push({
          index,
          referenceKind: reference.kind,
          generatedKind: generated.kind,
          referenceMidi: reference.midi,
          generatedMidi: generated.midi,
          referenceDuration: reference.duration,
          generatedDuration: generated.duration
        })
      }
    }
  }

  return {
    mismatchCount,
    mismatches
  }
}

function compareHcEventsWithBestOffset(
  referenceEvents: HcMainMelodyEvent[],
  generatedEvents: HcMainMelodyEvent[],
  options: {
    compareDuration: boolean
    referenceDurationUnit: number
    generatedDurationUnit: number
  }
) {
  const maxOffset = Math.min(24, Math.max(referenceEvents.length, generatedEvents.length))
  let best:
    | {
        comparedCount: number
        mismatchCount: number
        overlapRatio: number
        mismatchRatio: number
        bestReferenceStart: number
        bestGeneratedStart: number
        mismatches: HcMismatch[]
      }
    | null = null

  for (let referenceStart = 0; referenceStart <= maxOffset; referenceStart += 1) {
    for (let generatedStart = 0; generatedStart <= maxOffset; generatedStart += 1) {
      const overlap = Math.min(
        referenceEvents.length - referenceStart,
        generatedEvents.length - generatedStart
      )
      if (overlap <= 0) {
        continue
      }

      let mismatchCount = 0
      const mismatches: HcMismatch[] = []

      for (let index = 0; index < overlap; index += 1) {
        const reference = referenceEvents[referenceStart + index]!
        const generated = generatedEvents[generatedStart + index]!
        if (
          reference.midi !== generated.midi ||
          (options.compareDuration &&
            !sameDurationUnits(
              reference.duration,
              generated.duration,
              options.referenceDurationUnit,
              options.generatedDurationUnit
            ))
        ) {
          mismatchCount += 1
          if (mismatches.length < 12) {
            mismatches.push({
              index,
              referenceKind: reference.kind,
              generatedKind: generated.kind,
              referenceMidi: reference.midi,
              generatedMidi: generated.midi,
              referenceDuration: reference.duration,
              generatedDuration: generated.duration
            })
          }
        }
      }

      const overlapRatio = overlap / Math.max(referenceEvents.length, generatedEvents.length)
      const mismatchRatio = mismatchCount / overlap
      const candidate = {
        comparedCount: overlap,
        mismatchCount,
        overlapRatio,
        mismatchRatio,
        bestReferenceStart: referenceStart,
        bestGeneratedStart: generatedStart,
        mismatches
      }

      if (!best) {
        best = candidate
        continue
      }

      if (candidate.mismatchRatio !== best.mismatchRatio) {
        if (candidate.mismatchRatio < best.mismatchRatio) {
          best = candidate
        }
        continue
      }

      if (candidate.overlapRatio !== best.overlapRatio) {
        if (candidate.overlapRatio > best.overlapRatio) {
          best = candidate
        }
        continue
      }

      if (candidate.mismatchCount < best.mismatchCount) {
        best = candidate
      }
    }
  }

  return (
    best ?? {
      comparedCount: 0,
      mismatchCount: 0,
      overlapRatio: 0,
      mismatchRatio: 0,
      bestReferenceStart: 0,
      bestGeneratedStart: 0,
      mismatches: []
    }
  )
}

function classifyHcFit(noteOnlyAligned: {
  comparedCount: number
  overlapRatio: number
  mismatchRatio: number
}) {
  if (noteOnlyAligned.comparedCount === 0) {
    return {
      level: 'weak' as const,
      reason: 'No overlapping HC main-note sequence could be aligned.'
    }
  }

  if (noteOnlyAligned.overlapRatio >= 0.8 && noteOnlyAligned.mismatchRatio <= 0.1) {
    return {
      level: 'strong' as const,
      reason: 'HC main melody interpretation matches closely after offset alignment.'
    }
  }

  if (noteOnlyAligned.overlapRatio >= 0.6 && noteOnlyAligned.mismatchRatio <= 0.25) {
    return {
      level: 'partial' as const,
      reason: 'HC main melody shows usable overlap, but arrangement or structure differences remain.'
    }
  }

  return {
    level: 'weak' as const,
    reason: 'HC main melody still diverges too much for direct converter training.'
  }
}

function sameDuration(left: number, right: number) {
  return Math.abs(left - right) <= 0.000001
}

function sameDurationUnits(
  referenceDuration: number,
  generatedDuration: number,
  referenceDurationUnit: number,
  generatedDurationUnit: number
) {
  const referenceUnits = Math.round(referenceDuration / Math.max(referenceDurationUnit, 0.000001))
  const generatedUnits = Math.round(generatedDuration / Math.max(generatedDurationUnit, 0.000001))
  return referenceUnits === generatedUnits
}

function detectDurationUnit(events: HcMainMelodyEvent[]) {
  const durations = events
    .map(event => event.duration)
    .filter(duration => Number.isFinite(duration) && duration > 0)
    .sort((left, right) => left - right)

  return durations[0] ?? 1
}

function buildMarkdown(report: Report) {
  const topEntries = [...report.entries]
    .sort((left, right) => {
      const fitOrder = compareFit(left.hcFit.level, right.hcFit.level)
      if (fitOrder !== 0) {
        return fitOrder
      }
      if (left.noteOnlyAligned.mismatchRatio !== right.noteOnlyAligned.mismatchRatio) {
        return left.noteOnlyAligned.mismatchRatio - right.noteOnlyAligned.mismatchRatio
      }
      return right.noteOnlyAligned.overlapRatio - left.noteOnlyAligned.overlapRatio
    })
    .slice(0, 12)

  const entryLines = topEntries
    .map(entry => {
      const pitchFit = classifyHcFit(entry.pitchOnlyAligned).level
      return `- ${entry.slug}: pitchFit=${pitchFit}, fullFit=${entry.hcFit.level}, exact=${entry.exactSemantic}, pitchOverlap=${entry.pitchOnlyAligned.comparedCount}, pitchMismatchRatio=${entry.pitchOnlyAligned.mismatchRatio.toFixed(3)}, fullOverlap=${entry.noteOnlyAligned.comparedCount}, fullMismatchRatio=${entry.noteOnlyAligned.mismatchRatio.toFixed(3)}, units=${entry.referenceUnitDuration}/${entry.generatedUnitDuration}, measures=${entry.referenceMeasureCount}/${entry.generatedMeasureCount}`
    })
    .join('\n')

  return `# HC Overlap Semantic Analysis (${report.generatedOn.slice(0, 10)})

- Dataset: \`${report.datasetDir}\`
- Template slug: \`${report.templateSlug}\`
- Goal: compare reference Kuailepu songs and generated MusicXML candidates using \`hc.parse().mpn\` main-melody semantics instead of only our local lightweight parser.

## Summary

- Overlap candidates considered: ${report.summary.overlapCount}
- Compared successfully: ${report.summary.comparedCount}
- Exact HC semantic matches: ${report.summary.exactSemanticCount}
- Pitch-only strong HC-fit: ${report.summary.pitchStrongCount}
- Pitch-only partial HC-fit: ${report.summary.pitchPartialCount}
- Strong HC-fit: ${report.summary.fitCounts.strong}
- Partial HC-fit: ${report.summary.fitCounts.partial}
- Weak HC-fit: ${report.summary.fitCounts.weak}

Strong:
${report.summary.strongSlugs.length > 0 ? report.summary.strongSlugs.map(slug => `- ${slug}`).join('\n') : '- none'}

Partial:
${report.summary.partialSlugs.length > 0 ? report.summary.partialSlugs.map(slug => `- ${slug}`).join('\n') : '- none'}

## Interpretation

- This report answers a narrower question than lyric/SEO/runtime-field parity: after the original HC engine interprets both notations, how close are the resulting main-melody timelines?
- If a song looks much better here than in our old lightweight compare, that means part of the earlier mismatch was caused by our reference-side simplifier, not by the XML generator itself.
- If a song still looks bad here, the remaining problem is more likely real converter drift: timeline reconstruction, register choice, or source-version mismatch.
- If \`pitch-only\` is strong but full HC-fit is weak, the melody pitch path is probably already usable and the remaining gap is mostly rhythm/timeline rebuilding.

## Best Samples

${entryLines || '- none'}

## Skipped

${report.skipped.length > 0 ? report.skipped.map(item => `- ${item.slug}: ${item.reason}`).join('\n') : '- none'}
`
}

function compareFit(left: 'strong' | 'partial' | 'weak', right: 'strong' | 'partial' | 'weak') {
  const order = { strong: 0, partial: 1, weak: 2 }
  return order[left] - order[right]
}
