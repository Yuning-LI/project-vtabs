import fs from 'node:fs'
import path from 'node:path'
import { extractKuailepuNotationMetadata, parseKuailepuLyricBlocks } from '../src/lib/songbook/kuailepuImport.ts'

type CliOptions = {
  runtimeDir: string
  outJson: string
  outMd: string
}

type RuntimePayload = {
  song_name?: string
  alias_name?: string
  keynote?: string
  rhythm?: string
  instruments?: string
  fingerings?: string
  instrumentFingerings?: Array<{
    instrument?: string
    fingeringsList?: unknown[]
    fingeringSetList?: unknown[]
    graphList?: unknown[]
  }>
  notation?: string
  lyric?: string
  lyric_text?: string
}

type ComplexityBucket =
  | 'native-mvp-candidate'
  | 'native-common-candidate'
  | 'needs-repeat-support'
  | 'needs-group-support'
  | 'needs-lyric-support'
  | 'archived-fallback-required'

type RuntimeSyntaxEntry = {
  slug: string
  title: string
  aliasTitle: string | null
  keynote: string | null
  rhythm: string | null
  bucket: ComplexityBucket
  reasons: string[]
  features: {
    lineCount: number
    noteCount: number
    restCount: number
    barCount: number
    chordMarkerCount: number
    directiveCount: number
    lyricBlockCount: number
    lyricSlotEstimate: number
    instrumentCount: number
    fingeringCount: number
    repeatStartCount: number
    repeatEndCount: number
    numberedEndingCount: number
    playDirectiveCount: number
    sectionLabelCount: number
    dotCount: number
    underscoreCount: number
    equalsCount: number
    slashCount: number
    tupletHeadCount: number
    vMarkerCount: number
    dollarMarkerCount: number
    tildeMarkerCount: number
    accidentalCount: number
    upperOctaveCount: number
    lowerOctaveCount: number
    groupDirectiveCount: number
    nonChordDirectiveCount: number
    parenthesizedGroupCount: number
    graceLikeCount: number
  }
  samples: {
    notation: string
    lyric: string | null
  }
}

type InventoryReport = {
  generatedOn: string
  runtimeDir: string
  totalSongs: number
  bucketCounts: Record<ComplexityBucket, number>
  featureTotals: RuntimeSyntaxEntry['features']
  entries: RuntimeSyntaxEntry[]
}

const DEFAULT_RUNTIME_DIR = 'data/kuailepu-runtime'
const DEFAULT_OUT_JSON = 'tmp/public-runtime-syntax-inventory.json'
const DEFAULT_OUT_MD = 'tmp/public-runtime-syntax-inventory.md'

const BUCKETS: ComplexityBucket[] = [
  'native-mvp-candidate',
  'native-common-candidate',
  'needs-repeat-support',
  'needs-group-support',
  'needs-lyric-support',
  'archived-fallback-required'
]

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-public-runtime-syntax-inventory.ts [--runtime-dir=${DEFAULT_RUNTIME_DIR}] [--out-json=${DEFAULT_OUT_JSON}] [--out-md=${DEFAULT_OUT_MD}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const runtimeDir = path.resolve(process.cwd(), options.runtimeDir)
if (!fs.existsSync(runtimeDir)) {
  console.error(`Runtime directory not found: ${options.runtimeDir}`)
  process.exit(1)
}

const entries = fs
  .readdirSync(runtimeDir)
  .filter(file => file.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right))
  .map(file => analyzeRuntimeFile(path.join(runtimeDir, file)))

const report: InventoryReport = {
  generatedOn: new Date().toISOString(),
  runtimeDir: path.relative(process.cwd(), runtimeDir),
  totalSongs: entries.length,
  bucketCounts: countBuckets(entries),
  featureTotals: sumFeatures(entries),
  entries
}

writeJson(options.outJson, report)
writeMarkdown(options.outMd, report)

console.log(
  JSON.stringify(
    {
      generatedOn: report.generatedOn,
      totalSongs: report.totalSongs,
      bucketCounts: report.bucketCounts,
      outJson: options.outJson,
      outMd: options.outMd
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) continue
    values.set(match[1], match[2])
  }

  return {
    runtimeDir: values.get('runtime-dir') || DEFAULT_RUNTIME_DIR,
    outJson: values.get('out-json') || DEFAULT_OUT_JSON,
    outMd: values.get('out-md') || DEFAULT_OUT_MD
  }
}

function analyzeRuntimeFile(filePath: string): RuntimeSyntaxEntry {
  const slug = path.basename(filePath, '.json')
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RuntimePayload
  const notation = String(payload.notation ?? '')
  const metadata = extractKuailepuNotationMetadata(notation)
  const lyricBlocks = parseKuailepuLyricBlocks(payload.lyric).filter(Boolean)
  const lyricText = String(payload.lyric_text ?? '').trim()
  const lyricSlotEstimate = lyricBlocks.join('\n').match(/[^\s|]+/g)?.length ?? 0
  const rawWithoutDirectives = notation.replace(/\{[^}]*\}/g, ' ')
  const chordMarkers = notation.match(/\{cn:[^}]+\}/gi) ?? []
  const allDirectives = notation.match(/\{[^}]*\}/g) ?? []
  const nonChordDirectives = allDirectives.filter(value => !/^\{cn:/i.test(value))
  const groupDirectiveCount = allDirectives.filter(value => /^\{\/?group\b/i.test(value)).length
  const runtimeInstrumentFingerings = Array.isArray(payload.instrumentFingerings)
    ? payload.instrumentFingerings
    : []
  const runtimeFingeringCount = runtimeInstrumentFingerings.reduce((total, option) => {
    const fingeringSetCount = Array.isArray(option.fingeringSetList)
      ? option.fingeringSetList.length
      : 0
    const fingeringListCount = Array.isArray(option.fingeringsList) ? option.fingeringsList.length : 0
    const graphListCount = Array.isArray(option.graphList) ? option.graphList.length : 0
    return total + Math.max(fingeringSetCount, fingeringListCount, graphListCount)
  }, 0)
  const noteTokens = rawWithoutDirectives.match(/[#bn]?[1-7][',dg]*[#bn]?/gi) ?? []
  const restTokens = rawWithoutDirectives.match(/(?:^|[^0-9])0(?![0-9])/g) ?? []
  const barTokens = notation.match(/\|\|\||:\|:|:\||\|:|\|\||\|/g) ?? []
  const parenthesizedGroups = notation.match(/\([^)]*[1-7][^)]*\)/g) ?? []
  const graceLike = notation.match(/@\(|\{[>~=\-+][^}]*[>~=\-+]\}|\{\{[^}]+\}\}/g) ?? []
  const accidentals = noteTokens.filter(token => /[#bn]/i.test(token))
  const upperOctaves = noteTokens.filter(token => /[g']/i.test(token))
  const lowerOctaves = noteTokens.filter(token => /[d,]/i.test(token))

  const features: RuntimeSyntaxEntry['features'] = {
    lineCount: metadata.rawLines.length,
    noteCount: noteTokens.length,
    restCount: restTokens.length,
    barCount: barTokens.length,
    chordMarkerCount: chordMarkers.length,
    directiveCount: allDirectives.length,
    lyricBlockCount: lyricBlocks.length || (lyricText ? 1 : 0),
    lyricSlotEstimate,
    instrumentCount: Math.max(splitCsv(payload.instruments).length, runtimeInstrumentFingerings.length),
    fingeringCount: Math.max(splitCsv(payload.fingerings).length, runtimeFingeringCount),
    repeatStartCount: metadata.repeatStats.repeatStartCount,
    repeatEndCount: metadata.repeatStats.repeatEndCount,
    numberedEndingCount: metadata.repeatStats.numberedEndingCount,
    playDirectiveCount: metadata.repeatStats.playDirectiveCount,
    sectionLabelCount: metadata.repeatStats.sectionLabelCount,
    dotCount: metadata.rhythmMarkerStats.dotCount,
    underscoreCount: metadata.rhythmMarkerStats.underscoreCount,
    equalsCount: metadata.rhythmMarkerStats.equalsCount,
    slashCount: metadata.rhythmMarkerStats.slashCount,
    tupletHeadCount: metadata.rhythmMarkerStats.tupletHeadCount,
    vMarkerCount: metadata.rhythmMarkerStats.vMarkerCount,
    dollarMarkerCount: metadata.rhythmMarkerStats.dollarMarkerCount,
    tildeMarkerCount: metadata.rhythmMarkerStats.tildeMarkerCount,
    accidentalCount: accidentals.length,
    upperOctaveCount: upperOctaves.length,
    lowerOctaveCount: lowerOctaves.length,
    groupDirectiveCount,
    nonChordDirectiveCount: nonChordDirectives.length,
    parenthesizedGroupCount: parenthesizedGroups.length,
    graceLikeCount: graceLike.length
  }

  const classification = classifyEntry(features)

  return {
    slug,
    title: String(payload.song_name ?? slug),
    aliasTitle: payload.alias_name ? String(payload.alias_name) : null,
    keynote: payload.keynote ? String(payload.keynote) : null,
    rhythm: payload.rhythm ? String(payload.rhythm) : null,
    bucket: classification.bucket,
    reasons: classification.reasons,
    features,
    samples: {
      notation: sampleText(notation),
      lyric: lyricBlocks[0] ? sampleText(lyricBlocks[0]) : lyricText ? sampleText(lyricText) : null
    }
  }
}

function classifyEntry(features: RuntimeSyntaxEntry['features']): {
  bucket: ComplexityBucket
  reasons: string[]
} {
  const reasons: string[] = []
  const repeatFeatureCount =
    features.repeatStartCount +
    features.repeatEndCount +
    features.numberedEndingCount +
    features.playDirectiveCount +
    features.sectionLabelCount
  const groupFeatureCount =
    features.groupDirectiveCount +
    features.parenthesizedGroupCount +
    features.tupletHeadCount +
    features.graceLikeCount
  const advancedRhythmCount =
    features.dotCount +
    features.underscoreCount +
    features.equalsCount +
    features.slashCount +
    features.dollarMarkerCount +
    features.tildeMarkerCount

  if (features.noteCount < 1 || features.nonChordDirectiveCount > 12 || features.fingeringCount < 1) {
    if (features.noteCount < 1) reasons.push('没有可识别旋律音符')
    if (features.nonChordDirectiveCount > 12) reasons.push('非和弦 directive 过多')
    if (features.fingeringCount < 1) reasons.push('缺少指法候选')
    return { bucket: 'archived-fallback-required', reasons }
  }

  if (repeatFeatureCount > 0) {
    if (features.repeatStartCount > 0 || features.repeatEndCount > 0) reasons.push('包含 repeat bar')
    if (features.numberedEndingCount > 0) reasons.push('包含 numbered ending')
    if (features.playDirectiveCount > 0) reasons.push('包含 play 顺序 directive')
    if (features.sectionLabelCount > 0) reasons.push('包含 section label')
    return { bucket: 'needs-repeat-support', reasons }
  }

  if (groupFeatureCount > 0) {
    if (features.groupDirectiveCount > 0) reasons.push('包含 group directive')
    if (features.parenthesizedGroupCount > 0) reasons.push('包含括号音组')
    if (features.tupletHeadCount > 0) reasons.push('包含 tuplet head')
    if (features.graceLikeCount > 0) reasons.push('包含 ornament/grace-like 结构')
    return { bucket: 'needs-group-support', reasons }
  }

  if (features.lyricBlockCount > 0 && features.lyricSlotEstimate > 0) {
    reasons.push('包含歌词对齐需求')
    if (features.noteCount > 96 || advancedRhythmCount > 0) {
      reasons.push('歌词歌同时包含较长旋律或复杂节奏')
      return { bucket: 'needs-lyric-support', reasons }
    }
  }

  if (features.noteCount <= 96 && advancedRhythmCount === 0 && features.nonChordDirectiveCount <= 2) {
    reasons.push('旋律短、无 repeat/group、节奏标记简单')
    return { bucket: 'native-mvp-candidate', reasons }
  }

  if (advancedRhythmCount > 0) {
    reasons.push('包含点/下划线/等号/斜线等复杂节奏标记')
  }
  if (features.noteCount > 96) {
    reasons.push('旋律较长')
  }

  return {
    bucket: 'native-common-candidate',
    reasons: reasons.length > 0 ? reasons : ['无 repeat/group，但复杂度高于 MVP 首批']
  }
}

function countBuckets(entries: RuntimeSyntaxEntry[]) {
  const counts = Object.fromEntries(BUCKETS.map(bucket => [bucket, 0])) as Record<
    ComplexityBucket,
    number
  >
  for (const entry of entries) {
    counts[entry.bucket] += 1
  }
  return counts
}

function sumFeatures(entries: RuntimeSyntaxEntry[]) {
  const totals = createEmptyFeatureTotals()
  for (const entry of entries) {
    for (const key of Object.keys(totals) as Array<keyof RuntimeSyntaxEntry['features']>) {
      totals[key] += entry.features[key]
    }
  }
  return totals
}

function createEmptyFeatureTotals(): RuntimeSyntaxEntry['features'] {
  return {
    lineCount: 0,
    noteCount: 0,
    restCount: 0,
    barCount: 0,
    chordMarkerCount: 0,
    directiveCount: 0,
    lyricBlockCount: 0,
    lyricSlotEstimate: 0,
    instrumentCount: 0,
    fingeringCount: 0,
    repeatStartCount: 0,
    repeatEndCount: 0,
    numberedEndingCount: 0,
    playDirectiveCount: 0,
    sectionLabelCount: 0,
    dotCount: 0,
    underscoreCount: 0,
    equalsCount: 0,
    slashCount: 0,
    tupletHeadCount: 0,
    vMarkerCount: 0,
    dollarMarkerCount: 0,
    tildeMarkerCount: 0,
    accidentalCount: 0,
    upperOctaveCount: 0,
    lowerOctaveCount: 0,
    groupDirectiveCount: 0,
    nonChordDirectiveCount: 0,
    parenthesizedGroupCount: 0,
    graceLikeCount: 0
  }
}

function splitCsv(value: string | undefined) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function sampleText(value: string, maxLength = 260) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}…`
}

function writeJson(out: string, report: InventoryReport) {
  const outPath = path.resolve(process.cwd(), out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

function writeMarkdown(out: string, report: InventoryReport) {
  const outPath = path.resolve(process.cwd(), out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, buildMarkdown(report), 'utf8')
}

function buildMarkdown(report: InventoryReport) {
  const bucketSummary = BUCKETS.map(bucket => `- ${bucket}: ${report.bucketCounts[bucket]}`).join('\n')
  const featureSummary = Object.entries(report.featureTotals)
    .filter(([, total]) => total > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 22)
    .map(([key, total]) => `- ${key}: ${total}`)
    .join('\n')
  const bucketSections = BUCKETS.map(bucket => buildBucketSection(bucket, report.entries)).join('\n\n')

  return `# Public Runtime Syntax Inventory

- Generated on: ${report.generatedOn}
- Runtime dir: \`${report.runtimeDir}\`
- Total songs: ${report.totalSongs}

This report is a read-only Phase 5 input. It does not change public rendering.

## Bucket Summary

${bucketSummary}

## Feature Totals

${featureSummary}

## Buckets

${bucketSections}
`
}

function buildBucketSection(bucket: ComplexityBucket, entries: RuntimeSyntaxEntry[]) {
  const bucketEntries = entries
    .filter(entry => entry.bucket === bucket)
    .sort((left, right) => {
      if (left.features.noteCount !== right.features.noteCount) {
        return left.features.noteCount - right.features.noteCount
      }
      return left.slug.localeCompare(right.slug)
    })
  const preview = bucketEntries
    .slice(0, 24)
    .map(entry => {
      const reasons = entry.reasons.join('; ')
      return `- \`${entry.slug}\` (${entry.features.noteCount} notes, ${entry.features.barCount} bars): ${reasons}`
    })
    .join('\n')
  const more =
    bucketEntries.length > 24 ? `\n- ... ${bucketEntries.length - 24} more in JSON report` : ''

  return `### ${bucket} (${bucketEntries.length})

${preview || '- none'}${more}`
}
