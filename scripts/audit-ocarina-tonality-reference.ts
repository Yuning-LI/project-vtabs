import fs from 'node:fs'
import path from 'node:path'
import { inferKuailepuOcarinaTonalityName } from '../src/lib/songbook/kuailepuIngest.ts'

type CliOptions = {
  includeLocal: boolean
  report?: string
}

type AuditMode = 'all' | 'authoritative'

type AuditMismatch = {
  file: string
  slug: string
  songCode: string
  keynote: string
  instrument: 'o6' | 'o12'
  fingering: string
  expected: string
  inferred: string
}

type AuditUncovered = {
  file: string
  slug: string
  songCode: string
  keynote: string
  instrument: 'o6' | 'o12'
  fingering: string
  expected: string
}

type ConflictEntry = {
  instrument: 'o6' | 'o12'
  keynote: string
  fingering: string
  tonalities: Array<{
    tonalityName: string
    count: number
    songs: string[]
  }>
}

type AuditSummary = {
  mode: AuditMode
  includeLocal: boolean
  totalSongs: number
  totalNonEmpty: number
  totalCovered: number
  exactMatches: number
  mismatchCount: number
  uncoveredCount: number
  exactMatchRate: number
  coveredMatchRate: number
}

type AuditReport = {
  generatedOn: string
  summary: {
    all: AuditSummary
    authoritative: AuditSummary
  }
  conflicts: {
    all: ConflictEntry[]
    authoritative: ConflictEntry[]
  }
  all: {
    mismatches: AuditMismatch[]
    uncovered: AuditUncovered[]
  }
  authoritative: {
    mismatches: AuditMismatch[]
    uncovered: AuditUncovered[]
  }
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/audit-ocarina-tonality-reference.ts [--include-local=true] [--report=exports/song-ingest/ocarina-tonality-audit.json]'

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const songsDir = path.resolve(process.cwd(), 'reference', 'songs')
const files = fs
  .readdirSync(songsDir)
  .filter(file => file.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right))

const allSongs = files.map(file => {
  const fullPath = path.join(songsDir, file)
  const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as Record<string, unknown>
  const slug = String(payload.slug || path.basename(file, '.json'))
  const songCode = String(payload.song_code || '')
  const keynote = typeof payload.keynote === 'string' ? payload.keynote : ''
  const instrumentFingerings = Array.isArray(payload.instrumentFingerings)
    ? payload.instrumentFingerings
    : []

  return {
    file,
    slug,
    songCode,
    keynote,
    isLocal: songCode.startsWith('local-'),
    instrumentFingerings
  }
})

const authoritativeSongs = allSongs.filter(song => !song.isLocal)

const allAudit = auditSongs(allSongs, 'all')
const authoritativeAudit = auditSongs(authoritativeSongs, 'authoritative')

const report: AuditReport = {
  generatedOn: new Date().toISOString(),
  summary: {
    all: allAudit.summary,
    authoritative: authoritativeAudit.summary
  },
  conflicts: {
    all: allAudit.conflicts,
    authoritative: authoritativeAudit.conflicts
  },
  all: {
    mismatches: allAudit.mismatches,
    uncovered: allAudit.uncovered
  },
  authoritative: {
    mismatches: authoritativeAudit.mismatches,
    uncovered: authoritativeAudit.uncovered
  }
}

if (options.report) {
  const reportPath = path.resolve(process.cwd(), options.report)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Wrote ocarina tonality audit report to ${path.relative(process.cwd(), reportPath)}`)
}

const output = options.includeLocal
  ? {
      all: report.summary.all,
      authoritative: report.summary.authoritative,
      localConflictCount: report.conflicts.all.length - report.conflicts.authoritative.length
    }
  : {
      authoritative: report.summary.authoritative,
      skippedLocalSongs: allSongs.length - authoritativeSongs.length,
      authoritativeConflictCount: report.conflicts.authoritative.length
    }

console.log(JSON.stringify(output, null, 2))

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
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
    includeLocal: values.get('include-local') === 'true',
    report: values.get('report')
  }
}

function auditSongs(
  songs: Array<{
    file: string
    slug: string
    songCode: string
    keynote: string
    isLocal: boolean
    instrumentFingerings: unknown[]
  }>,
  mode: AuditMode
) {
  const mismatches: AuditMismatch[] = []
  const uncovered: AuditUncovered[] = []
  const conflictMap = new Map<
    string,
    {
      instrument: 'o6' | 'o12'
      keynote: string
      fingering: string
      tonalities: Map<string, { count: number; songs: Set<string> }>
    }
  >()

  let totalNonEmpty = 0

  songs.forEach(song => {
    song.instrumentFingerings.forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        return
      }

      const instrument = (entry as { instrument?: string }).instrument
      if (instrument !== 'o6' && instrument !== 'o12') {
        return
      }

      const setList =
        (entry as { fingeringSetList?: Array<Array<Record<string, unknown>>> }).fingeringSetList ?? []

      setList.forEach(set => {
        const item = set?.[0]
        if (!item || typeof item !== 'object') {
          return
        }

        const fingering = String(item.fingering || '')
        const tonalityName = String(item.tonalityName || '')
        if (!fingering || !tonalityName) {
          return
        }

        totalNonEmpty += 1

        const inferred = inferKuailepuOcarinaTonalityName(instrument, fingering, song.keynote) ?? ''
        if (!inferred) {
          uncovered.push({
            file: song.file,
            slug: song.slug,
            songCode: song.songCode,
            keynote: song.keynote,
            instrument,
            fingering,
            expected: tonalityName
          })
        } else if (inferred !== tonalityName) {
          mismatches.push({
            file: song.file,
            slug: song.slug,
            songCode: song.songCode,
            keynote: song.keynote,
            instrument,
            fingering,
            expected: tonalityName,
            inferred
          })
        }

        const conflictKey = `${instrument}\t${song.keynote}\t${fingering}`
        const bucket =
          conflictMap.get(conflictKey) ??
          (() => {
            const next = {
              instrument,
              keynote: song.keynote,
              fingering,
              tonalities: new Map<string, { count: number; songs: Set<string> }>()
            }
            conflictMap.set(conflictKey, next)
            return next
          })()

        const tonalityBucket =
          bucket.tonalities.get(tonalityName) ??
          (() => {
            const next = {
              count: 0,
              songs: new Set<string>()
            }
            bucket.tonalities.set(tonalityName, next)
            return next
          })()

        tonalityBucket.count += 1
        tonalityBucket.songs.add(song.slug)
      })
    })
  })

  const conflicts = [...conflictMap.values()]
    .filter(entry => entry.tonalities.size > 1)
    .map(entry => ({
      instrument: entry.instrument,
      keynote: entry.keynote,
      fingering: entry.fingering,
      tonalities: [...entry.tonalities.entries()]
        .map(([tonalityName, info]) => ({
          tonalityName,
          count: info.count,
          songs: [...info.songs].sort((left, right) => left.localeCompare(right))
        }))
        .sort((left, right) => right.count - left.count || left.tonalityName.localeCompare(right.tonalityName))
    }))
    .sort((left, right) => {
      const leftCount = left.tonalities.reduce((sum, item) => sum + item.count, 0)
      const rightCount = right.tonalities.reduce((sum, item) => sum + item.count, 0)
      return (
        rightCount - leftCount ||
        left.instrument.localeCompare(right.instrument) ||
        left.keynote.localeCompare(right.keynote) ||
        left.fingering.localeCompare(right.fingering)
      )
    })

  const totalCovered = totalNonEmpty - uncovered.length
  const exactMatches = totalCovered - mismatches.length

  return {
    summary: {
      mode,
      includeLocal: mode === 'all',
      totalSongs: songs.length,
      totalNonEmpty,
      totalCovered,
      exactMatches,
      mismatchCount: mismatches.length,
      uncoveredCount: uncovered.length,
      exactMatchRate: ratio(exactMatches, totalNonEmpty),
      coveredMatchRate: ratio(exactMatches, totalCovered)
    } satisfies AuditSummary,
    conflicts,
    mismatches,
    uncovered
  }
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }

  return Number((numerator / denominator).toFixed(4))
}
