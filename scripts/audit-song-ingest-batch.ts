import fs from 'node:fs'
import path from 'node:path'
import {
  HAPPY123_GENERATOR_COVERAGE,
  detectHappy123NotationFeatures,
  parseHappy123CompactNotation
} from '../src/lib/songbook/happy123Notation.ts'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import {
  closeMusicXmlExtractorSession,
  createMusicXmlExtractorSession,
  extractMusicXmlScore,
  readMusicXmlText
} from '../src/lib/songbook/musicXml.ts'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  type BuildSongIngestDraftOptions,
  type SongIngestDraft
} from '../src/lib/songbook/songIngestDraft.ts'

type CliOptions = BuildSongIngestDraftOptions & {
  inputs: string[]
  templateSlug: string
  autoTransposeInstrument?: string
  limit?: number
  report?: string
  graceMode: 'source-only' | 'payload-metadata'
}

type AuditIssue = {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

type AuditEntry = {
  file: string
  slug: string
  title: string
  partId: string
  voice: string
  warningCategories: string[]
  issues: AuditIssue[]
  stats: SongIngestDraft['stats']
  generation: {
    sourceKeynote: string
    targetKeynote: string
    transpose: number
  }
  roundTrip: {
    exact: boolean
    sourceEventCount: number
    generatedEventCount: number
    mismatchCount: number
    totalSourceSlots: number
    totalGeneratedSlots: number
  }
  featureUsage: ReturnType<typeof detectHappy123NotationFeatures>
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/audit-song-ingest-batch.ts [path ...] [--template=happy-birthday-to-you] [--auto-transpose=o12] [--grace-mode=source-only|payload-metadata] [--part=P1] [--voice=1] [--limit=50] [--report=exports/song-ingest/batch-audit.json]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const files = collectInputFiles(options.inputs.length > 0 ? options.inputs : ['private/openewld/dataset'])
const selectedFiles = typeof options.limit === 'number' ? files.slice(0, options.limit) : files

if (selectedFiles.length === 0) {
  console.error('No MusicXML files found.')
  process.exit(1)
}

const templatePath = path.resolve(process.cwd(), 'data', 'kuailepu-runtime', `${options.templateSlug}.json`)
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8')) as Record<string, unknown>
const session = await createMusicXmlExtractorSession()
const entries: AuditEntry[] = []

try {
  for (const file of selectedFiles) {
    const relativeFile = path.relative(process.cwd(), file)

    try {
      const xmlText = await readMusicXmlText(file)
      const extract = await extractMusicXmlScore(xmlText, options.partId, session)
      const draft = buildSongIngestDraftFromMusicXmlExtract(extract, {
        partId: options.partId,
        voice: options.voice
      })
      const sourceCategories = collectSourceCategories(extract)
      const slug = draft.metadata.slug
      const generated = generateKuailepuRuntimeCandidate({
        draft,
        template,
        slug,
        autoTransposeInstrument: options.autoTransposeInstrument,
        scrubRuntimeCache: true,
        graceMode: options.graceMode
      })
      const sourceParsed = parseHappy123CompactNotation(
        draft.happi123Draft.notationText,
        draft.metadata.recommendedTonicMidi
      )
      const generatedParsed = parseHappy123CompactNotation(
        String(generated.runtimePayload.notation ?? ''),
        generated.targetTonicMidi
      )
      const roundTrip = compareParsedNotation(
        sourceParsed.events,
        generatedParsed.events,
        generated.selectedTranspose
      )
      const issues = buildIssues(draft, roundTrip, sourceCategories)

      entries.push({
        file: relativeFile,
        slug,
        title: draft.metadata.title,
        partId: draft.source.partId,
        voice: draft.source.voice,
        warningCategories: sourceCategories,
        issues,
        stats: draft.stats,
        generation: {
          sourceKeynote: generated.sourceKeynote,
          targetKeynote: generated.targetKeynote,
          transpose: generated.selectedTranspose
        },
        roundTrip,
        featureUsage: detectHappy123NotationFeatures(String(generated.runtimePayload.notation ?? ''))
      })
    } catch (error) {
      entries.push({
        file: relativeFile,
        slug: path.basename(relativeFile, path.extname(relativeFile)).toLowerCase(),
        title: path.basename(relativeFile, path.extname(relativeFile)),
        partId: options.partId ?? '',
        voice: options.voice ?? '',
        warningCategories: [],
        issues: [
          {
            code: 'audit-crash',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Unknown audit failure.'
          }
        ],
        stats: {
          measures: 0,
          noteCount: 0,
          restCount: 0,
          lyricNoteCount: 0,
          chordCount: 0,
          graceNoteCount: 0,
          durationUnit: 0
        },
        generation: {
          sourceKeynote: '',
          targetKeynote: '',
          transpose: 0
        },
        roundTrip: {
          exact: false,
          sourceEventCount: 0,
          generatedEventCount: 0,
          mismatchCount: 1,
          totalSourceSlots: 0,
          totalGeneratedSlots: 0
        },
        featureUsage: detectHappy123NotationFeatures('')
      })
    }
  }
} finally {
  await closeMusicXmlExtractorSession(session)
}

const report = {
  generatedOn: new Date().toISOString(),
  inputCount: selectedFiles.length,
  templateSlug: options.templateSlug,
  autoTransposeInstrument: options.autoTransposeInstrument ?? null,
  graceMode: options.graceMode,
  generatorCoverage: HAPPY123_GENERATOR_COVERAGE,
  summary: summarizeEntries(entries),
  entries
}

if (options.report) {
  const reportPath = path.resolve(process.cwd(), options.report)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote batch audit report to ${path.relative(process.cwd(), reportPath)}`)
}

console.log(JSON.stringify(report.summary, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const positional: string[] = []
  const values = new Map<string, string>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      positional.push(arg)
      return
    }

    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      values.set(arg.slice(2), 'true')
      return
    }

    values.set(match[1], match[2])
  })

  return {
    inputs: positional,
    templateSlug: values.get('template') || 'happy-birthday-to-you',
    autoTransposeInstrument: values.get('auto-transpose'),
    partId: values.get('part'),
    voice: values.get('voice'),
    limit: values.has('limit') ? Number(values.get('limit')) : undefined,
    report: values.get('report'),
    graceMode:
      values.get('grace-mode') === 'payload-metadata' ? 'payload-metadata' : 'source-only'
  }
}

function collectInputFiles(inputs: string[]) {
  return inputs
    .flatMap(input => {
      const resolved = path.resolve(process.cwd(), input)
      if (!fs.existsSync(resolved)) {
        return []
      }

      const stats = fs.statSync(resolved)
      if (stats.isFile()) {
        return isMusicXmlFile(resolved) ? [resolved] : []
      }

      return walkMusicXmlFiles(resolved)
    })
    .sort((left, right) => left.localeCompare(right))
}

function walkMusicXmlFiles(root: string): string[] {
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

      if (entry.isFile() && isMusicXmlFile(fullPath)) {
        output.push(fullPath)
      }
    })
  }

  return output
}

function isMusicXmlFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.xml' || ext === '.musicxml' || ext === '.mxl'
}

function compareParsedNotation(
  sourceEvents: ReturnType<typeof parseHappy123CompactNotation>['events'],
  generatedEvents: ReturnType<typeof parseHappy123CompactNotation>['events'],
  transpose: number
) {
  const overlap = Math.min(sourceEvents.length, generatedEvents.length)
  let mismatchCount = Math.abs(sourceEvents.length - generatedEvents.length)

  for (let index = 0; index < overlap; index += 1) {
    const source = sourceEvents[index]!
    const generated = generatedEvents[index]!
    const expectedMidi = source.midi === null ? null : source.midi + transpose

    if (
      source.kind !== generated.kind ||
      source.slotCount !== generated.slotCount ||
      expectedMidi !== generated.midi
    ) {
      mismatchCount += 1
    }
  }

  return {
    exact: mismatchCount === 0,
    sourceEventCount: sourceEvents.length,
    generatedEventCount: generatedEvents.length,
    mismatchCount,
    totalSourceSlots: sourceEvents.reduce((sum, event) => sum + event.slotCount, 0),
    totalGeneratedSlots: generatedEvents.reduce((sum, event) => sum + event.slotCount, 0)
  }
}

function buildIssues(
  draft: SongIngestDraft,
  roundTrip: AuditEntry['roundTrip'],
  sourceCategories: string[]
): AuditIssue[] {
  const issues: AuditIssue[] = []

  sourceCategories.forEach(category => {
    issues.push({
      code: category,
      severity:
        category === 'grace-notes' || category === 'multi-voice' || category === 'chord-stack'
          ? 'warning'
          : 'info',
      message: category
    })
  })

  if (!roundTrip.exact) {
    issues.push({
      code: 'roundtrip-mismatch',
      severity: 'error',
      message: `Round-trip mismatch count ${roundTrip.mismatchCount}.`
    })
  }

  return issues
}

function classifyWarnings(warnings: string[]) {
  return Array.from(
    new Set(
      warnings.map(warning => {
        if (/grace/i.test(warning)) return 'grace-notes'
        if (/tuplet|time modifications/i.test(warning)) return 'tuplets'
        if (/multiple voices|backup\/forward/i.test(warning)) return 'multi-voice'
        if (/multiple parts/i.test(warning)) return 'multi-part'
        if (/chord-stacked/i.test(warning)) return 'chord-stack'
        if (/harmony offsets/i.test(warning)) return 'harmony-offset'
        if (/no usable lyric/i.test(warning)) return 'missing-lyrics'
        return 'other-warning'
      })
    )
  )
}

function collectSourceCategories(
  extract: Awaited<ReturnType<typeof extractMusicXmlScore>>
) {
  const categories = new Set<string>(classifyWarnings(extract.warnings))

  extract.measures.forEach(measure => {
    measure.events.forEach(event => {
      if (event.sourceFeatures?.timeModification) {
        categories.add('tuplets')
      }
      if ((event.sourceFeatures?.leadingGraceNotes?.length ?? 0) > 0) {
        categories.add('grace-notes')
      }
    })
  })

  return Array.from(categories)
}

function summarizeEntries(entries: AuditEntry[]) {
  const featureKeys = Object.keys(detectHappy123NotationFeatures('')) as Array<
    keyof ReturnType<typeof detectHappy123NotationFeatures>
  >
  const featureUsage = Object.fromEntries(featureKeys.map(key => [key, 0])) as Record<string, number>
  const sourceCategoryCounts = new Map<string, number>()
  let exactRoundTripCount = 0
  let errorCount = 0
  let warningCount = 0

  entries.forEach(entry => {
    if (entry.roundTrip.exact) {
      exactRoundTripCount += 1
    }

    entry.warningCategories.forEach(category => {
      sourceCategoryCounts.set(category, (sourceCategoryCounts.get(category) ?? 0) + 1)
    })

    entry.issues.forEach(issue => {
      if (issue.severity === 'error') errorCount += 1
      if (issue.severity === 'warning') warningCount += 1
    })

    featureKeys.forEach(key => {
      if (entry.featureUsage[key]) {
        featureUsage[key] += 1
      }
    })
  })

  return {
    total: entries.length,
    exactRoundTripCount,
    exactRoundTripRate: entries.length > 0 ? Number((exactRoundTripCount / entries.length).toFixed(4)) : 0,
    songsWithErrors: entries.filter(entry => entry.issues.some(issue => issue.severity === 'error')).length,
    songsWithWarnings: entries.filter(entry => entry.issues.some(issue => issue.severity === 'warning')).length,
    errorCount,
    warningCount,
    sourceCategoryCounts: Object.fromEntries(
      [...sourceCategoryCounts.entries()].sort((left, right) => right[1] - left[1])
    ),
    generatedFeatureUsage: featureUsage
  }
}
