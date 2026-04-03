import fs from 'node:fs'
import path from 'node:path'
import { songCatalog } from '../src/lib/songbook/catalog.ts'

type RuntimeInstrumentOption = {
  instrument?: string
  instrumentName?: string
  fingeringSetList?: Array<
    Array<{
      fingeringName?: string
      fingering?: string
    }>
  >
  fingeringsList?: Array<
    Array<{
      fingeringName?: string
      fingering?: string
    }>
  >
}

type RuntimePayload = {
  instrumentFingerings?: RuntimeInstrumentOption[]
}

type InstrumentAuditSummary = {
  id: string
  label: string
  supportedSongs: number
  topFingeringLayouts: Array<{
    count: number
    labels: string[]
  }>
}

const runtimeDir = path.resolve(process.cwd(), 'data', 'kuailepu-runtime')
const publicSongs = songCatalog.map(song => ({
  id: song.id,
  slug: song.slug,
  title: song.title
}))

const labelByInstrument = new Map<string, string>()
const songsByInstrument = new Map<string, string[]>()
const fingeringLayoutsByInstrument = new Map<string, Map<string, number>>()

for (const song of publicSongs) {
  const filePath = path.join(runtimeDir, `${song.slug}.json`)
  if (!fs.existsSync(filePath)) {
    continue
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RuntimePayload
  const options = payload.instrumentFingerings ?? []

  for (const option of options) {
    const instrumentId = option.instrument?.trim()
    if (!instrumentId) {
      continue
    }

    if (!songsByInstrument.has(instrumentId)) {
      songsByInstrument.set(instrumentId, [])
    }
    songsByInstrument.get(instrumentId)?.push(song.slug)

    if (option.instrumentName?.trim()) {
      labelByInstrument.set(instrumentId, option.instrumentName.trim())
    }

    const labels = getFingeringLabels(option)
    const key = JSON.stringify(labels)
    if (!fingeringLayoutsByInstrument.has(instrumentId)) {
      fingeringLayoutsByInstrument.set(instrumentId, new Map())
    }
    const layouts = fingeringLayoutsByInstrument.get(instrumentId)
    layouts?.set(key, (layouts.get(key) ?? 0) + 1)
  }
}

const launchPriority = [
  'o12',
  'o6',
  'r8b',
  'r8g',
  'w6',
  'o3',
  'b6',
  'x8',
  'x10',
  'hx',
  'p8',
  'h7',
  'h9',
  'sn',
  'a6',
  'none'
] as const

const summary: InstrumentAuditSummary[] = [...songsByInstrument.entries()]
  .map(([id, songs]) => {
    const layouts = [...(fingeringLayoutsByInstrument.get(id)?.entries() ?? [])]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([labels, count]) => ({
        count,
        labels: JSON.parse(labels) as string[]
      }))

    return {
      id,
      label: labelByInstrument.get(id) ?? id,
      supportedSongs: songs.length,
      topFingeringLayouts: layouts
    }
  })
  .sort((left, right) => {
    const leftRank = launchPriority.indexOf(left.id as (typeof launchPriority)[number])
    const rightRank = launchPriority.indexOf(right.id as (typeof launchPriority)[number])

    if (leftRank !== -1 || rightRank !== -1) {
      return (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) -
        (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank)
    }

    return left.id.localeCompare(right.id)
  })

const launchRecommendation = {
  recommendedNow: ['o12', 'o6', 'r8b', 'r8g', 'w6'],
  recommendedNext: [],
  holdForNow: ['o3', 'a6', 'b6', 'x8', 'x10', 'hx', 'p8', 'h7', 'h9', 'sn', 'none']
}

console.log(
  JSON.stringify(
    {
      totalPublicSongs: publicSongs.length,
      summary,
      launchRecommendation
    },
    null,
    2
  )
)

function getFingeringLabels(option: RuntimeInstrumentOption) {
  const sets = option.fingeringSetList ?? option.fingeringsList ?? []

  return sets
    .map(group =>
      group
        .map(item => item.fingeringName?.trim() || item.fingering?.trim() || '')
        .filter(Boolean)
        .join(' | ')
    )
    .filter(Boolean)
}
