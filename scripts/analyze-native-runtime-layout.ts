import fs from 'node:fs'
import path from 'node:path'
import { buildNativeMelodyLayout } from '../src/lib/native-renderer/layout.ts'
import { buildSongIrFromRuntimePayload } from '../src/lib/native-renderer/fromRuntimeNotation.ts'
import type { PublicRuntimePayload } from '../src/lib/runtime-core/runtimeTypes.ts'

type CliOptions = {
  slugs: string[]
  runtimeDir: string
  outJson: string
  limit: number | null
}

const DEFAULT_RUNTIME_DIR = 'data/kuailepu-runtime'
const DEFAULT_OUT_JSON = 'tmp/native-runtime-layout-summary.json'
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
  const layout = buildNativeMelodyLayout(song, { measureLayout: 'compact' })
  const rowWidths = layout.rows.map(row => Number(row.widthRem.toFixed(2)))
  const measureWidths = layout.rows.flatMap(row =>
    row.measures.map(measure => Number(measure.widthRem.toFixed(2)))
  )

  return {
    slug,
    title: song.metadata.title,
    rowCount: layout.rows.length,
    measureCount: song.stats.measureCount,
    eventCount: song.stats.eventCount,
    maxRowWidthRem: rowWidths.length > 0 ? Math.max(...rowWidths) : 0,
    maxMeasureWidthRem: measureWidths.length > 0 ? Math.max(...measureWidths) : 0,
    rowWidths,
    unsupported: song.unsupported
  }
})

const sortedByMaxRowWidth = [...summaries].sort(
  (left, right) =>
    right.maxRowWidthRem - left.maxRowWidthRem ||
    right.maxMeasureWidthRem - left.maxMeasureWidthRem ||
    left.slug.localeCompare(right.slug)
)
const sortedByMaxMeasureWidth = [...summaries].sort(
  (left, right) =>
    right.maxMeasureWidthRem - left.maxMeasureWidthRem ||
    right.maxRowWidthRem - left.maxRowWidthRem ||
    left.slug.localeCompare(right.slug)
)

const report = {
  generatedOn: new Date().toISOString(),
  runtimeDir: options.runtimeDir,
  count: summaries.length,
  maxRowWidthRem: sortedByMaxRowWidth[0]?.maxRowWidthRem ?? 0,
  maxMeasureWidthRem: sortedByMaxMeasureWidth[0]?.maxMeasureWidthRem ?? 0,
  topMaxRowWidth: sortedByMaxRowWidth.slice(0, 30),
  topMaxMeasureWidth: sortedByMaxMeasureWidth.slice(0, 30),
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
      maxRowWidthRem: report.maxRowWidthRem,
      maxMeasureWidthRem: report.maxMeasureWidthRem,
      topMaxRowWidth: report.topMaxRowWidth.slice(0, 10).map(summary => ({
        slug: summary.slug,
        rowCount: summary.rowCount,
        measureCount: summary.measureCount,
        eventCount: summary.eventCount,
        maxRowWidthRem: summary.maxRowWidthRem,
        maxMeasureWidthRem: summary.maxMeasureWidthRem
      })),
      topMaxMeasureWidth: report.topMaxMeasureWidth.slice(0, 10).map(summary => ({
        slug: summary.slug,
        rowCount: summary.rowCount,
        measureCount: summary.measureCount,
        eventCount: summary.eventCount,
        maxRowWidthRem: summary.maxRowWidthRem,
        maxMeasureWidthRem: summary.maxMeasureWidthRem
      }))
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
