import fs from 'node:fs'
import path from 'node:path'
import { listKuailepuRuntimeSongFiles, resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'
import {
  detectHappy123NotationFeatures,
  parseHappy123CompactNotation
} from '../src/lib/songbook/happy123Notation.ts'
import {
  extractKuailepuNotationMetadata,
  type KuailepuDirectiveCategory
} from '../src/lib/songbook/kuailepuImport.ts'
import { parseNotation } from '../src/lib/songbook/jianpu.ts'
import { generateKuailepuRuntimeCandidate } from '../src/lib/songbook/kuailepuIngest.ts'
import {
  closeMusicXmlExtractorSession,
  createMusicXmlExtractorSession,
  extractMusicXmlScore,
  readMusicXmlText
} from '../src/lib/songbook/musicXml.ts'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  parseKeynoteToMidi,
  type SongIngestDraft
} from '../src/lib/songbook/songIngestDraft.ts'

type CliOptions = {
  datasetDir: string
  templateSlug: string
  report?: string
  slugs: string[]
  limit?: number
}

type CompareMismatch = {
  index: number
  referenceToken: string | null
  generatedToken: string | null
  referenceMidi: number | null
  generatedMidi: number | null
  referenceSlots: number | null
  generatedSlots: number | null
}

type InstrumentComparison = {
  instrument: string
  referenceCandidates: string[]
  generatedCandidates: string[]
  exactCandidateListMatch: boolean
  defaultCandidateMatch: boolean
  referenceDefaultIndexInGenerated: number
  generatedDefaultIndexInReference: number
}

type OverlapCompareEntry = {
  slug: string
  xmlFile: string
  referenceRuntimeFile: string
  referenceSongUuid: string | null
  referenceKeynote: string | null
  generatedKeynote: string
  transposeToReference: number
  sourceWarnings: string[]
  sourceLyricPolicy: SongIngestDraft['metadata']['lyricPolicy']
  sourceLyricLanguage: SongIngestDraft['metadata']['lyricLanguage']
  referenceNotationFeatures: ReturnType<typeof detectHappy123NotationFeatures>
  referenceNotationProfile: {
    directiveCategories: KuailepuDirectiveCategory[]
    tempoValues: number[]
    keynoteHints: string[]
    repeatStats: {
      repeatStartCount: number
      repeatEndCount: number
      numberedEndingCount: number
      playDirectiveCount: number
      sectionLabelCount: number
    }
    rhythmMarkerStats: {
      dotCount: number
      underscoreCount: number
      equalsCount: number
      slashCount: number
      tupletHeadCount: number
      vMarkerCount: number
      dollarMarkerCount: number
      tildeMarkerCount: number
    }
    normalizedPreview: string[]
  }
  referenceSubsetSafe: boolean
  melody: {
    exact: boolean
    compareMode: 'simplified-kuailepu-vs-generated'
    referenceEventCount: number
    generatedEventCount: number
    referenceMeasureCount: number
    generatedMeasureCount: number
    mismatchCount: number
    mismatches: CompareMismatch[]
  }
  noteOnly: {
    exact: boolean
    referenceEventCount: number
    generatedEventCount: number
    mismatchCount: number
    mismatches: CompareMismatch[]
  }
  noteOnlyAligned: {
    exact: boolean
    bestReferenceStart: number
    bestGeneratedStart: number
    comparedCount: number
    mismatchCount: number
    overlapRatio: number
    mismatchRatio: number
    mismatches: CompareMismatch[]
  }
  trainingFit: {
    level: 'strong' | 'partial' | 'weak'
    reason: string
  }
  sampleUsefulness: {
    level:
      | 'converter-training'
      | 'structure-variant'
      | 'notation-sample'
      | 'low-value'
    reason: string
    signals: string[]
  }
  rests: {
    referenceLeadingRestSlots: number
    generatedLeadingRestSlots: number
    referenceTotalRestSlots: number
    generatedTotalRestSlots: number
  }
  lyrics: {
    referenceVisible: boolean
    generatedVisible: boolean
    normalizedExactMatch: boolean
    referencePreview: string
    generatedPreview: string
  }
  chords: {
    referenceCount: number
    generatedCount: number
    exactSequenceMatch: boolean
    referencePreview: string[]
    generatedPreview: string[]
  }
  instruments: InstrumentComparison[]
}

type OverlapCompareReport = {
  generatedOn: string
  datasetDir: string
  templateSlug: string
  summary: {
    overlapCount: number
    comparedCount: number
    exactMelodyCount: number
    referenceSubsetSafeCount: number
    exactMelodyWithinSubsetSafeCount: number
    exactLyricTextCount: number
    exactChordSequenceCount: number
    fitCounts: {
      strong: number
      partial: number
      weak: number
    }
    sampleUsefulnessCounts: {
      'converter-training': number
      'structure-variant': number
      'notation-sample': number
      'low-value': number
    }
    strongSlugs: string[]
    partialSlugs: string[]
  }
  skipped: Array<{
    slug: string
    reason: string
  }>
  entries: OverlapCompareEntry[]
}

const DEFAULT_DATASET_DIR = 'private/openewld/dataset'
const DEFAULT_TEMPLATE_SLUG = 'happy-birthday-to-you'
const DEFAULT_REPORT =
  'reference/song-publish-candidates/review-notes/openewld-overlap-regression.json'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/compare-song-ingest-overlap.ts [--dataset-dir=${DEFAULT_DATASET_DIR}] [--template=${DEFAULT_TEMPLATE_SLUG}] [--slug=happy-birthday-to-you --slug=auld-lang-syne] [--limit=10] [--report=${DEFAULT_REPORT}]`

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
  const entries: OverlapCompareEntry[] = []
  const skipped: OverlapCompareReport['skipped'] = []

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

    const xmlFile = xmlMatches[0]!
    const referenceKeynote =
      typeof referencePayload.keynote === 'string' && referencePayload.keynote.trim()
        ? referencePayload.keynote.trim()
        : null
    if (!referenceKeynote) {
      skipped.push({ slug, reason: 'Reference runtime payload is missing keynote.' })
      continue
    }

    try {
      const xmlText = await readMusicXmlText(xmlFile)
      const extract = await extractMusicXmlScore(xmlText, undefined, session)
      const draft = buildSongIngestDraftFromMusicXmlExtract(extract)
      const transposeToReference =
        parseKeynoteToMidi(referenceKeynote) - draft.metadata.recommendedTonicMidi
      const generated = generateKuailepuRuntimeCandidate({
        draft,
        template,
        slug: `overlap-${slug}`,
        title: draft.metadata.title,
        keynote: referenceKeynote,
        transpose: transposeToReference,
        scrubRuntimeCache: true
      })

      const referenceNotation = String(referencePayload.notation ?? '')
      const generatedNotation = String(generated.runtimePayload.notation ?? '')
      const referenceNotationMetadata = extractKuailepuNotationMetadata(referenceNotation)
      const referenceSimplifiedLines = referenceNotationMetadata.simplifiedNotationLines
      const referenceParsed = parseSimplifiedNotationToComparableEvents(
        referenceSimplifiedLines,
        parseKeynoteToMidi(referenceKeynote)
      )
      const generatedParsed = parseHappy123CompactNotation(
        generatedNotation,
        parseKeynoteToMidi(referenceKeynote)
      )
      const melody = compareEvents(referenceParsed.events, generatedParsed.events)
      const noteOnly = compareEvents(
        referenceParsed.events.filter(event => event.kind === 'note'),
        generatedParsed.events.filter(event => event.kind === 'note')
      )
      const noteOnlyAligned = compareNoteEventsWithBestOffset(
        referenceParsed.events.filter(event => event.kind === 'note'),
        generatedParsed.events.filter(event => event.kind === 'note')
      )
      const referenceFeatures = detectHappy123NotationFeatures(referenceNotation)
      const referenceLyricText = String(referencePayload.lyric_text ?? '')
      const generatedLyricText = String(generated.runtimePayload.lyric_text ?? '')
      const referenceChords = referenceParsed.chordMarkers
      const generatedChords = generatedParsed.chordMarkers
      const trainingFit = classifyTrainingFit(noteOnlyAligned)
      const sampleUsefulness = classifySampleUsefulness({
        trainingFit,
        noteOnlyAligned,
        referenceFeatures,
        referenceNotationProfile: {
          directiveCategories: unique(
            referenceNotationMetadata.directives.map(directive => directive.category)
          ),
          tempoValues: uniqueNumbers(
            referenceNotationMetadata.tempoDirectives.map(directive => directive.bpm)
          ),
          keynoteHints: unique(
            referenceNotationMetadata.keynoteHints.map(hint => hint.value)
          ),
          repeatStats: referenceNotationMetadata.repeatStats,
          rhythmMarkerStats: referenceNotationMetadata.rhythmMarkerStats,
          normalizedPreview: referenceNotationMetadata.normalizedLines.slice(0, 4)
        }
      })

      entries.push({
        slug,
        xmlFile: path.relative(process.cwd(), xmlFile),
        referenceRuntimeFile: path.relative(process.cwd(), runtimePath),
        referenceSongUuid: songUuid,
        referenceKeynote,
        generatedKeynote: generated.targetKeynote,
        transposeToReference,
        sourceWarnings: draft.warnings,
        sourceLyricPolicy: draft.metadata.lyricPolicy,
        sourceLyricLanguage: draft.metadata.lyricLanguage,
        referenceNotationFeatures: referenceFeatures,
        referenceNotationProfile: sampleUsefulness.referenceNotationProfile,
        referenceSubsetSafe: isReferenceSubsetSafe(referenceFeatures),
        melody: {
          exact:
            melody.mismatchCount === 0 && referenceParsed.measures === generatedParsed.measures,
          compareMode: 'simplified-kuailepu-vs-generated',
          referenceEventCount: referenceParsed.events.length,
          generatedEventCount: generatedParsed.events.length,
          referenceMeasureCount: referenceParsed.measures,
          generatedMeasureCount: generatedParsed.measures,
          mismatchCount:
            melody.mismatchCount + Math.abs(referenceParsed.measures - generatedParsed.measures),
          mismatches: melody.mismatches
        },
        noteOnly: {
          exact: noteOnly.mismatchCount === 0,
          referenceEventCount: referenceParsed.events.filter(event => event.kind === 'note').length,
          generatedEventCount: generatedParsed.events.filter(event => event.kind === 'note').length,
          mismatchCount: noteOnly.mismatchCount,
          mismatches: noteOnly.mismatches
        },
        noteOnlyAligned: {
          exact: noteOnlyAligned.mismatchCount === 0,
          bestReferenceStart: noteOnlyAligned.bestReferenceStart,
          bestGeneratedStart: noteOnlyAligned.bestGeneratedStart,
          comparedCount: noteOnlyAligned.comparedCount,
          mismatchCount: noteOnlyAligned.mismatchCount,
          overlapRatio: noteOnlyAligned.overlapRatio,
          mismatchRatio: noteOnlyAligned.mismatchRatio,
          mismatches: noteOnlyAligned.mismatches
        },
        trainingFit,
        sampleUsefulness: {
          level: sampleUsefulness.level,
          reason: sampleUsefulness.reason,
          signals: sampleUsefulness.signals
        },
        rests: {
          referenceLeadingRestSlots: countLeadingRestSlots(referenceParsed.events),
          generatedLeadingRestSlots: countLeadingRestSlots(generatedParsed.events),
          referenceTotalRestSlots: sumRestSlots(referenceParsed.events),
          generatedTotalRestSlots: sumRestSlots(generatedParsed.events)
        },
        lyrics: {
          referenceVisible: normalizeText(referenceLyricText).length > 0,
          generatedVisible: normalizeText(generatedLyricText).length > 0,
          normalizedExactMatch:
            normalizeText(referenceLyricText) === normalizeText(generatedLyricText),
          referencePreview: previewText(referenceLyricText),
          generatedPreview: previewText(generatedLyricText)
        },
        chords: {
          referenceCount: referenceChords.length,
          generatedCount: generatedChords.length,
          exactSequenceMatch: JSON.stringify(referenceChords) === JSON.stringify(generatedChords),
          referencePreview: referenceChords.slice(0, 8),
          generatedPreview: generatedChords.slice(0, 8)
        },
        instruments: compareInstrumentCandidates(referencePayload, generated.runtimePayload)
      })
    } catch (error) {
      skipped.push({
        slug,
        reason: error instanceof Error ? error.message : 'Unknown overlap compare failure.'
      })
    }
  }

  const report: OverlapCompareReport = {
    generatedOn: new Date().toISOString(),
    datasetDir: path.relative(process.cwd(), datasetDir),
    templateSlug: options.templateSlug,
    summary: {
      overlapCount: selectedSlugs.length,
      comparedCount: entries.length,
      exactMelodyCount: entries.filter(entry => entry.melody.exact).length,
      referenceSubsetSafeCount: entries.filter(entry => entry.referenceSubsetSafe).length,
      exactMelodyWithinSubsetSafeCount: entries.filter(
        entry => entry.referenceSubsetSafe && entry.melody.exact
      ).length,
      exactLyricTextCount: entries.filter(entry => entry.lyrics.normalizedExactMatch).length,
      exactChordSequenceCount: entries.filter(entry => entry.chords.exactSequenceMatch).length,
      fitCounts: {
        strong: entries.filter(entry => entry.trainingFit.level === 'strong').length,
        partial: entries.filter(entry => entry.trainingFit.level === 'partial').length,
        weak: entries.filter(entry => entry.trainingFit.level === 'weak').length
      },
      sampleUsefulnessCounts: {
        'converter-training': entries.filter(
          entry => entry.sampleUsefulness.level === 'converter-training'
        ).length,
        'structure-variant': entries.filter(
          entry => entry.sampleUsefulness.level === 'structure-variant'
        ).length,
        'notation-sample': entries.filter(
          entry => entry.sampleUsefulness.level === 'notation-sample'
        ).length,
        'low-value': entries.filter(entry => entry.sampleUsefulness.level === 'low-value').length
      },
      strongSlugs: entries
        .filter(entry => entry.trainingFit.level === 'strong')
        .map(entry => entry.slug),
      partialSlugs: entries
        .filter(entry => entry.trainingFit.level === 'partial')
        .map(entry => entry.slug)
    },
    skipped,
    entries
  }

  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`Wrote overlap compare report to ${path.relative(process.cwd(), reportPath)}`)
  }

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

function compareEvents(
  referenceEvents: Array<{
    kind: 'note' | 'rest'
    token: string
    midi: number | null
    slotCount: number
  }>,
  generatedEvents: ReturnType<typeof parseHappy123CompactNotation>['events']
) {
  const overlap = Math.min(referenceEvents.length, generatedEvents.length)
  const mismatches: CompareMismatch[] = []
  let mismatchCount = Math.abs(referenceEvents.length - generatedEvents.length)

  for (let index = 0; index < overlap; index += 1) {
    const reference = referenceEvents[index]!
    const generated = generatedEvents[index]!
    if (
      reference.kind !== generated.kind ||
      reference.midi !== generated.midi ||
      reference.slotCount !== generated.slotCount
    ) {
      mismatchCount += 1
      if (mismatches.length < 12) {
        mismatches.push({
          index,
          referenceToken: reference.token,
          generatedToken: generated.token,
          referenceMidi: reference.midi,
          generatedMidi: generated.midi,
          referenceSlots: reference.slotCount,
          generatedSlots: generated.slotCount
        })
      }
    }
  }

  if (referenceEvents.length !== generatedEvents.length && mismatches.length < 12) {
    const longer = referenceEvents.length > generatedEvents.length ? referenceEvents : generatedEvents
    const referenceIsLonger = referenceEvents.length > generatedEvents.length
    for (let index = overlap; index < longer.length && mismatches.length < 12; index += 1) {
      const event = longer[index]!
      mismatches.push({
        index,
        referenceToken: referenceIsLonger ? event.token : null,
        generatedToken: referenceIsLonger ? null : event.token,
        referenceMidi: referenceIsLonger ? event.midi : null,
        generatedMidi: referenceIsLonger ? null : event.midi,
        referenceSlots: referenceIsLonger ? event.slotCount : null,
        generatedSlots: referenceIsLonger ? null : event.slotCount
      })
    }
  }

  return {
    mismatchCount,
    mismatches
  }
}

function countLeadingRestSlots(
  events: Array<{
    kind: 'note' | 'rest'
    slotCount: number
  }>
) {
  let slots = 0
  for (const event of events) {
    if (event.kind !== 'rest') {
      break
    }
    slots += event.slotCount
  }
  return slots
}

function sumRestSlots(
  events: Array<{
    kind: 'note' | 'rest'
    slotCount: number
  }>
) {
  return events.reduce((sum, event) => sum + (event.kind === 'rest' ? event.slotCount : 0), 0)
}

function compareNoteEventsWithBestOffset(
  referenceEvents: Array<{
    kind: 'note' | 'rest'
    token: string
    midi: number | null
    slotCount: number
  }>,
  generatedEvents: Array<{
    kind: 'note' | 'rest'
    token: string
    midi: number | null
    slotCount: number
  }>
) {
  const maxOffset = Math.min(24, Math.max(referenceEvents.length, generatedEvents.length))
  let best:
    | {
        bestReferenceStart: number
        bestGeneratedStart: number
        comparedCount: number
        mismatchCount: number
        overlapRatio: number
        mismatchRatio: number
        mismatches: CompareMismatch[]
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
      const mismatches: CompareMismatch[] = []

      for (let index = 0; index < overlap; index += 1) {
        const reference = referenceEvents[referenceStart + index]!
        const generated = generatedEvents[generatedStart + index]!
        if (reference.midi !== generated.midi || reference.slotCount !== generated.slotCount) {
          mismatchCount += 1
          if (mismatches.length < 12) {
            mismatches.push({
              index,
              referenceToken: reference.token,
              generatedToken: generated.token,
              referenceMidi: reference.midi,
              generatedMidi: generated.midi,
              referenceSlots: reference.slotCount,
              generatedSlots: generated.slotCount
            })
          }
        }
      }

      const overlapRatio = overlap / Math.max(referenceEvents.length, generatedEvents.length)
      const mismatchRatio = mismatchCount / overlap
      const candidate = {
        bestReferenceStart: referenceStart,
        bestGeneratedStart: generatedStart,
        comparedCount: overlap,
        mismatchCount,
        overlapRatio,
        mismatchRatio,
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
      bestReferenceStart: 0,
      bestGeneratedStart: 0,
      comparedCount: 0,
      mismatchCount: 0,
      overlapRatio: 0,
      mismatchRatio: 0,
      mismatches: []
    }
  )
}

function classifyTrainingFit(noteOnlyAligned: {
  comparedCount: number
  overlapRatio: number
  mismatchRatio: number
}) {
  if (noteOnlyAligned.comparedCount === 0) {
    return {
      level: 'weak' as const,
      reason: 'No overlapping note sequence could be aligned.'
    }
  }

  if (noteOnlyAligned.overlapRatio >= 0.8 && noteOnlyAligned.mismatchRatio <= 0.1) {
    return {
      level: 'strong' as const,
      reason: 'High overlap with low mismatch after note-only offset alignment.'
    }
  }

  if (noteOnlyAligned.overlapRatio >= 0.6 && noteOnlyAligned.mismatchRatio <= 0.25) {
    return {
      level: 'partial' as const,
      reason: 'Usable overlap exists, but version/arrangement differences remain.'
    }
  }

  return {
    level: 'weak' as const,
    reason: 'Likely a different version, arrangement, or melody treatment.'
  }
}

function classifySampleUsefulness(input: {
  trainingFit: ReturnType<typeof classifyTrainingFit>
  noteOnlyAligned: {
    comparedCount: number
    overlapRatio: number
    mismatchRatio: number
    bestReferenceStart: number
    bestGeneratedStart: number
  }
  referenceFeatures: ReturnType<typeof detectHappy123NotationFeatures>
  referenceNotationProfile: OverlapCompareEntry['referenceNotationProfile']
}) {
  const { trainingFit, noteOnlyAligned, referenceFeatures, referenceNotationProfile } = input
  const offsetGap = Math.abs(
    noteOnlyAligned.bestReferenceStart - noteOnlyAligned.bestGeneratedStart
  )
  const hasStructuralGrammar =
    referenceNotationProfile.repeatStats.repeatStartCount > 0 ||
    referenceNotationProfile.repeatStats.repeatEndCount > 0 ||
    referenceNotationProfile.repeatStats.numberedEndingCount > 0 ||
    referenceNotationProfile.repeatStats.playDirectiveCount > 0 ||
    referenceNotationProfile.repeatStats.sectionLabelCount > 0
  const hasHeavySurfaceNoise =
    referenceFeatures.usesGraceLike ||
    referenceFeatures.usesTupletLike ||
    referenceFeatures.usesSlurLike ||
    referenceNotationProfile.directiveCategories.some(category => category !== 'bpm')
  const signals = buildSampleUsefulnessSignals({
    trainingFit,
    noteOnlyAligned,
    referenceFeatures,
    referenceNotationProfile,
    hasStructuralGrammar,
    hasHeavySurfaceNoise,
    offsetGap
  })

  if (trainingFit.level === 'strong' || trainingFit.level === 'partial') {
    if (
      trainingFit.level === 'partial' &&
      noteOnlyAligned.comparedCount >= 32 &&
      noteOnlyAligned.mismatchRatio <= 0.05 &&
      noteOnlyAligned.overlapRatio < 0.7
    ) {
      return {
        level: 'structure-variant' as const,
        reason:
          'Aligned note content is close, but the sample is dominated by structural expansion differences rather than converter-note errors.',
        signals,
        referenceNotationProfile
      }
    }

    return {
      level: 'converter-training' as const,
      reason: 'Low-noise overlap sample suitable for converter rule work.',
      signals,
      referenceNotationProfile
    }
  }

  if (
    noteOnlyAligned.comparedCount >= 24 &&
    noteOnlyAligned.mismatchRatio <= 0.12 &&
    noteOnlyAligned.overlapRatio >= 0.3 &&
    (offsetGap >= 8 || hasStructuralGrammar)
  ) {
    return {
      level: 'structure-variant' as const,
      reason:
        'Large aligned subsequence with low local mismatch, but structural expansion or offset differences dominate.',
      signals,
      referenceNotationProfile
    }
  }

  if (
    noteOnlyAligned.comparedCount >= 32 &&
    noteOnlyAligned.mismatchRatio <= 0.05 &&
    noteOnlyAligned.overlapRatio >= 0.3
  ) {
    return {
      level: 'structure-variant' as const,
      reason:
        'A long low-noise aligned subsequence exists, but whole-song length/section coverage differs too much to use as direct converter truth.',
      signals,
      referenceNotationProfile
    }
  }

  if (
    noteOnlyAligned.comparedCount >= 16 &&
    (hasHeavySurfaceNoise || hasStructuralGrammar)
  ) {
    return {
      level: 'notation-sample' as const,
      reason:
        'Best used as a Kuailepu grammar/surface sample rather than direct converter truth.',
      signals,
      referenceNotationProfile
    }
  }

  return {
    level: 'low-value' as const,
    reason: 'Low overlap and high mismatch make this sample low-yield for current converter work.',
    signals,
    referenceNotationProfile
  }
}

function buildSampleUsefulnessSignals(input: {
  trainingFit: ReturnType<typeof classifyTrainingFit>
  noteOnlyAligned: {
    comparedCount: number
    overlapRatio: number
    mismatchRatio: number
    bestReferenceStart: number
    bestGeneratedStart: number
  }
  referenceFeatures: ReturnType<typeof detectHappy123NotationFeatures>
  referenceNotationProfile: OverlapCompareEntry['referenceNotationProfile']
  hasStructuralGrammar: boolean
  hasHeavySurfaceNoise: boolean
  offsetGap: number
}) {
  const {
    trainingFit,
    noteOnlyAligned,
    referenceFeatures,
    referenceNotationProfile,
    hasStructuralGrammar,
    hasHeavySurfaceNoise,
    offsetGap
  } = input

  const signals: string[] = []

  if (trainingFit.level === 'strong') {
    signals.push('high-overlap')
  }
  if (trainingFit.level === 'partial') {
    signals.push('partial-fit')
  }
  if (noteOnlyAligned.mismatchRatio <= 0.05 && noteOnlyAligned.comparedCount >= 24) {
    signals.push('low-local-mismatch')
  }
  if (noteOnlyAligned.overlapRatio < 0.7) {
    signals.push('low-global-overlap')
  }
  if (offsetGap >= 8) {
    signals.push('offset-gap')
  }
  if (hasStructuralGrammar) {
    signals.push('repeat-driven')
  }
  if (
    noteOnlyAligned.comparedCount >= 24 &&
    noteOnlyAligned.mismatchRatio <= 0.05 &&
    noteOnlyAligned.overlapRatio < 0.7
  ) {
    signals.push('tail-expansion')
  }
  if (referenceFeatures.usesTupletLike || referenceFeatures.usesSlurLike) {
    signals.push('advanced-rhythm-surface')
  }
  if (referenceFeatures.usesGraceLike) {
    signals.push('directive-like-surface')
  }
  if (referenceNotationProfile.directiveCategories.some(category => category !== 'bpm')) {
    signals.push('non-bpm-directives')
  }
  if (referenceNotationProfile.rhythmMarkerStats.vMarkerCount > 0) {
    signals.push('low-confidence-rhythm-markers')
  }
  if (hasHeavySurfaceNoise) {
    signals.push('notation-noise')
  }
  if (
    noteOnlyAligned.comparedCount < 20 &&
    noteOnlyAligned.overlapRatio < 0.3 &&
    noteOnlyAligned.mismatchRatio > 0.2
  ) {
    signals.push('low-evidence')
  }

  return unique(signals)
}

function parseSimplifiedNotationToComparableEvents(lines: string[], tonicMidi: number) {
  const parsedLines = parseNotation(lines, tonicMidi)
  const sourceLines = lines.map(line => line.trim())
  const events: Array<{
    kind: 'note' | 'rest'
    token: string
    midi: number | null
    slotCount: number
  }> = []
  let measures = 0

  parsedLines.forEach((line, lineIndex) => {
    const rawTokens = sourceLines[lineIndex]?.split(/\s+/).filter(Boolean) ?? []
    let rawTokenIndex = 0
    let pendingEvent:
      | {
          kind: 'note' | 'rest'
          token: string
          midi: number | null
          slotCount: number
        }
      | null = null

    const flushPending = () => {
      if (!pendingEvent) {
        return
      }
      events.push(pendingEvent)
      pendingEvent = null
    }

    line.forEach(token => {
      if (token.kind === 'bar') {
        flushPending()
        measures += 1
        if (rawTokens[rawTokenIndex] === '|') {
          rawTokenIndex += 1
        }
        return
      }

      if (token.kind === 'hold') {
        if (pendingEvent) {
          pendingEvent.slotCount += 1
        }
        if (rawTokens[rawTokenIndex] === '-') {
          rawTokenIndex += 1
        }
        return
      }

      if (
        pendingEvent &&
        token.kind === 'rest' &&
        pendingEvent.kind === 'rest'
      ) {
        pendingEvent.slotCount += 1
        return
      }

      flushPending()
      const sourceToken = rawTokens[rawTokenIndex] ?? token.token
      rawTokenIndex += 1
      pendingEvent =
        token.kind === 'rest'
          ? {
              kind: 'rest',
              token: sourceToken,
              midi: null,
              slotCount: 1
            }
          : {
              kind: 'note',
              token: sourceToken,
              midi: token.midi,
              slotCount: 1
            }
    })

    flushPending()
  })

  return {
    events,
    measures,
    chordMarkers: [] as string[]
  }
}

function isReferenceSubsetSafe(features: ReturnType<typeof detectHappy123NotationFeatures>) {
  return (
    !features.usesRepeats &&
    !features.usesGraceLike &&
    !features.usesTupletLike &&
    !features.usesSlurLike
  )
}

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim().toLowerCase()
}

function previewText(input: string) {
  return normalizeText(input).slice(0, 120)
}

function compareInstrumentCandidates(
  referencePayload: KuailepuRuntimePayload,
  generatedPayload: KuailepuRuntimePayload
) {
  const instruments = ['o6', 'o12', 'r8b', 'r8g', 'w6']
  return instruments.map(instrument => {
    const referenceCandidates = getInstrumentCandidates(referencePayload, instrument)
    const generatedCandidates = getInstrumentCandidates(generatedPayload, instrument)
    return {
      instrument,
      referenceCandidates,
      generatedCandidates,
      exactCandidateListMatch:
        JSON.stringify(referenceCandidates) === JSON.stringify(generatedCandidates),
      defaultCandidateMatch:
        (referenceCandidates[0] ?? null) !== null &&
        referenceCandidates[0] === generatedCandidates[0],
      referenceDefaultIndexInGenerated:
        referenceCandidates[0] ? generatedCandidates.indexOf(referenceCandidates[0]) : -1,
      generatedDefaultIndexInReference:
        generatedCandidates[0] ? referenceCandidates.indexOf(generatedCandidates[0]) : -1
    }
  })
}

function getInstrumentCandidates(payload: KuailepuRuntimePayload, instrument: string) {
  const entry = (payload.instrumentFingerings ?? []).find(item => item.instrument === instrument)
  const setList = entry?.fingeringSetList ?? entry?.fingeringsList ?? []
  return setList
    .map(group => group[0]?.fingering ?? null)
    .filter((value): value is string => Boolean(value))
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)]
}
