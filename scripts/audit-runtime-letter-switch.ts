import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'

type CliOptions = {
  slugs: string[]
  baseUrl: string
  instruments?: string[]
  report?: string
}

type LetterSnapshot = {
  index: number
  tonic: string | null
  signature: string
  preview: string[]
  labelCount: number
}

type InstrumentReport = {
  instrument: string
  status: 'pass' | 'skip' | 'fail'
  reason?: string
  snapshots: LetterSnapshot[]
  issues: string[]
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/audit-runtime-letter-switch.ts <slug...> [--base-url=http://127.0.0.1:3000] [--instruments=o12,o6,r8b,r8g,w6] [--report=exports/song-ingest/runtime-letter-switch.json]'

const options = parseArgs(process.argv.slice(2))
if (!options || options.slugs.length < 1) {
  console.error(usage)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(60000)

let hasFailure = false

try {
  const reports = []

  for (const slug of options.slugs) {
    const filePath = resolveKuailepuRuntimeSongPath(slug)
    if (!filePath) {
      hasFailure = true
      reports.push({
        slug,
        error: 'Runtime payload not found.'
      })
      continue
    }

    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuRuntimePayload
    const selectedInstruments = (options.instruments ?? ['o12', 'o6', 'r8b', 'r8g', 'w6']).filter(
      instrument => (payload.instrumentFingerings ?? []).some(option => option.instrument === instrument)
    )

    const instrumentReports: InstrumentReport[] = []

    for (const instrument of selectedInstruments) {
      const entry = (payload.instrumentFingerings ?? []).find(option => option.instrument === instrument)
      const fingeringSets = entry?.fingeringSetList ?? entry?.fingeringsList ?? []
      if (fingeringSets.length < 2) {
        instrumentReports.push({
          instrument,
          status: 'skip',
          reason: 'Less than two fingering sets.',
          snapshots: [],
          issues: []
        })
        continue
      }

      const snapshots: LetterSnapshot[] = []
      const issues: string[] = []

      for (let index = 0; index < fingeringSets.length; index += 1) {
        const tonic = normalizeTonic(fingeringSets[index]?.[0]?.fingering)
        const params = new URLSearchParams({
          instrument,
          fingering_index: String(index)
        })

        await page.goto(`${options.baseUrl}/api/kuailepu-runtime/${slug}?${params.toString()}`, {
          waitUntil: 'domcontentloaded'
        })
        await page.waitForSelector(
          '#sheet svg [data-vtabs-letter-track="label"]:not([data-vtabs-letter-track-kind="grace"])'
        )

        const labels = await page.evaluate(() =>
          Array.from(
            document.querySelectorAll(
              '#sheet svg [data-vtabs-letter-track="label"]:not([data-vtabs-letter-track-kind="grace"])'
            )
          )
            .map(node => node.textContent?.trim() ?? '')
            .filter(Boolean)
        )

        snapshots.push({
          index,
          tonic,
          signature: labels.join('|'),
          preview: labels.slice(0, 12),
          labelCount: labels.length
        })
      }

      const distinctTonics = new Set(
        snapshots.map(snapshot => snapshot.tonic).filter((value): value is string => Boolean(value))
      )
      const distinctSignatures = new Set(snapshots.map(snapshot => snapshot.signature))

      if (distinctTonics.size < 2) {
        instrumentReports.push({
          instrument,
          status: 'skip',
          reason: 'No multiple tonic groups to compare.',
          snapshots,
          issues
        })
        continue
      }

      if (distinctSignatures.size < 2) {
        issues.push('All rendered letter signatures are identical despite multiple tonic groups.')
      }

      const signatureMap = new Map<string, LetterSnapshot[]>()
      snapshots.forEach(snapshot => {
        const current = signatureMap.get(snapshot.signature) ?? []
        current.push(snapshot)
        signatureMap.set(snapshot.signature, current)
      })

      signatureMap.forEach(group => {
        const tonicSet = new Set(group.map(item => item.tonic).filter(Boolean))
        if (group.length > 1 && tonicSet.size > 1) {
          issues.push(
            `Different tonic groups rendered the same signature: ${group
              .map(item => `${item.index}:${item.tonic ?? '?'}`)
              .join(', ')}`
          )
        }
      })

      if (issues.length > 0) {
        hasFailure = true
      }

      instrumentReports.push({
        instrument,
        status: issues.length > 0 ? 'fail' : 'pass',
        snapshots,
        issues
      })
    }

    reports.push({
      slug,
      file: path.relative(process.cwd(), filePath),
      instruments: instrumentReports
    })
  }

  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
    console.log(`Wrote runtime letter-switch report to ${path.relative(process.cwd(), reportPath)}`)
  }

  console.log(JSON.stringify(reports, null, 2))
} finally {
  await browser.close()
}

if (hasFailure) {
  process.exitCode = 1
}

function parseArgs(args: string[]): CliOptions | null {
  const slugs: string[] = []
  const values = new Map<string, string>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      slugs.push(arg)
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
    slugs,
    baseUrl: values.get('base-url') || 'http://127.0.0.1:3000',
    instruments: values.get('instruments')?.split(',').map(item => item.trim()).filter(Boolean),
    report: values.get('report')
  }
}

function normalizeTonic(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^([#b]?[A-Ga-g])(\d+)?$/)
  if (!match) {
    return value.trim()
  }

  return `${match[1]}${match[2] ?? ''}`
}
