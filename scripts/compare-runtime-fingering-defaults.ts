import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'

type CliOptions = {
  baseUrl: string
  pairs: Array<{
    imported: string
    reference: string
  }>
  report?: string
}

type GraphAuditSummary = {
  totalOutlineCount: number
  uniqueOutlineCount: number
  dominantOutlineRatio: number
  ambiguousExtremeOutlineCount: number
  ambiguousExtremeOutlineRatio: number
  topOutlineRefs: Array<[string, number]>
}

type InstrumentCompareEntry = {
  instrument: string
  imported: {
    keynote: string | null
    candidates: string[]
    defaultFingering: string | null
    defaultAudit: GraphAuditSummary | null
  }
  reference: {
    keynote: string | null
    candidates: string[]
    defaultFingering: string | null
    defaultAudit: GraphAuditSummary | null
  }
  comparison: {
    exactDefaultMatch: boolean
    defaultKeyTokenMatch: boolean
    referenceDefaultIndexInImported: number
    importedDefaultIndexInReference: number
  }
}

type PairCompareReport = {
  imported: string
  reference: string
  importedKeynote: string | null
  referenceKeynote: string | null
  instruments: InstrumentCompareEntry[]
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/compare-runtime-fingering-defaults.ts --base-url=http://127.0.0.1:3000 --pair=openewld-auld-lang-syne:auld-lang-syne [--pair=openewld-simple-gifts:simple-gifts] [--report=exports/song-ingest/runtime-default-compare.json]'

const options = parseArgs(process.argv.slice(2))
if (!options || options.pairs.length < 1) {
  console.error(usage)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(60000)

try {
  const reports: PairCompareReport[] = []

  for (const pair of options.pairs) {
    const importedPayload = loadPayload(pair.imported)
    const referencePayload = loadPayload(pair.reference)
    const instruments = ['o6', 'o12', 'r8b', 'r8g', 'w6']
    const entries: InstrumentCompareEntry[] = []

    for (const instrument of instruments) {
      const importedCandidates = getInstrumentCandidates(importedPayload, instrument)
      const referenceCandidates = getInstrumentCandidates(referencePayload, instrument)

      if (importedCandidates.length < 1 && referenceCandidates.length < 1) {
        continue
      }

      const importedDefault = importedCandidates[0] ?? null
      const referenceDefault = referenceCandidates[0] ?? null

      entries.push({
        instrument,
        imported: {
          keynote: typeof importedPayload.keynote === 'string' ? importedPayload.keynote : null,
          candidates: importedCandidates,
          defaultFingering: importedDefault,
          defaultAudit:
            importedDefault !== null
              ? await auditRuntimeGraph(page, options.baseUrl, pair.imported, instrument, 0)
              : null
        },
        reference: {
          keynote: typeof referencePayload.keynote === 'string' ? referencePayload.keynote : null,
          candidates: referenceCandidates,
          defaultFingering: referenceDefault,
          defaultAudit:
            referenceDefault !== null
              ? await auditRuntimeGraph(page, options.baseUrl, pair.reference, instrument, 0)
              : null
        },
        comparison: {
          exactDefaultMatch:
            importedDefault !== null &&
            referenceDefault !== null &&
            importedDefault === referenceDefault,
          defaultKeyTokenMatch:
            importedDefault !== null &&
            referenceDefault !== null &&
            extractKeyToken(importedDefault) === extractKeyToken(referenceDefault),
          referenceDefaultIndexInImported:
            referenceDefault !== null ? importedCandidates.indexOf(referenceDefault) : -1,
          importedDefaultIndexInReference:
            importedDefault !== null ? referenceCandidates.indexOf(importedDefault) : -1
        }
      })
    }

    reports.push({
      imported: pair.imported,
      reference: pair.reference,
      importedKeynote: typeof importedPayload.keynote === 'string' ? importedPayload.keynote : null,
      referenceKeynote:
        typeof referencePayload.keynote === 'string' ? referencePayload.keynote : null,
      instruments: entries
    })
  }

  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
    console.log(`Wrote compare report to ${path.relative(process.cwd(), reportPath)}`)
  }

  console.log(JSON.stringify(reports, null, 2))
} finally {
  await browser.close()
}

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string[]>()

  args.forEach(arg => {
    if (!arg.startsWith('--')) {
      return
    }

    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      const key = arg.slice(2)
      values.set(key, [...(values.get(key) ?? []), 'true'])
      return
    }

    values.set(match[1], [...(values.get(match[1]) ?? []), match[2]])
  })

  const pairValues = values.get('pair') ?? []
  const pairs = pairValues
    .map(value => {
      const [imported, reference] = value.split(':')
      if (!imported || !reference) {
        return null
      }
      return { imported, reference }
    })
    .filter((value): value is { imported: string; reference: string } => Boolean(value))

  return {
    baseUrl: values.get('base-url')?.[0] || 'http://127.0.0.1:3000',
    pairs,
    report: values.get('report')?.[0]
  }
}

function loadPayload(slug: string) {
  const filePath = resolveKuailepuRuntimeSongPath(slug)
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Runtime payload not found for ${slug}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuRuntimePayload
}

function getInstrumentCandidates(payload: KuailepuRuntimePayload, instrument: string) {
  const entry = (payload.instrumentFingerings ?? []).find(item => item.instrument === instrument)
  const setList = entry?.fingeringSetList ?? entry?.fingeringsList ?? []
  return setList
    .map(group => group[0]?.fingering ?? null)
    .filter((value): value is string => Boolean(value))
}

async function auditRuntimeGraph(
  page: import('playwright').Page,
  baseUrl: string,
  slug: string,
  instrument: string,
  fingeringIndex: number
) {
  const params = new URLSearchParams({
    instrument,
    fingering_index: String(fingeringIndex),
    note_label_mode: 'letter'
  })
  await page.goto(`${baseUrl}/api/kuailepu-runtime/${slug}?${params.toString()}`, {
    waitUntil: 'domcontentloaded'
  })
  await page.waitForSelector('#sheet svg [data-vtabs-letter-track="label"]')

  return page.evaluate(() => {
    function groupRows<T extends { y: number }>(items: T[], tolerance = 8) {
      const rows: Array<{ y: number; items: T[] }> = []
      items.forEach(item => {
        const row = rows.find(candidate => Math.abs(candidate.y - item.y) < tolerance)
        if (row) {
          row.items.push(item)
          return
        }
        rows.push({ y: item.y, items: [item] })
      })
      rows.sort((left, right) => left.y - right.y)
      return rows
    }

    const refs = Array.from(document.querySelectorAll('#sheet svg use'))
      .map(element => element.getAttribute('href') || element.getAttribute('xlink:href') || '')
      .filter(href => /Outline|outline/i.test(href))

    const counts = new Map<string, number>()
    refs.forEach(ref => counts.set(ref, (counts.get(ref) || 0) + 1))
    const ranked = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])

    const outlineStates = new Map<string, { allClosed: boolean; allOpen: boolean }>()
    counts.forEach((_count, ref) => {
      const symbol = document.querySelector(`#sheet svg symbol[id="${ref.replace(/^#/, '')}"]`)
      const circleFills = Array.from(symbol?.querySelectorAll('circle') ?? []).map(
        circle => (circle.getAttribute('fill') || '').trim().toLowerCase()
      )
      const filledCircleCount = circleFills.filter(fill => fill === '#000' || fill === '#000000').length
      const openCircleCount = circleFills.filter(fill => fill === '#fff' || fill === '#ffffff').length
      outlineStates.set(ref, {
        allClosed: circleFills.length > 0 && filledCircleCount === circleFills.length,
        allOpen: circleFills.length > 0 && openCircleCount === circleFills.length
      })
    })

    const noteLabels = Array.from(
      document.querySelectorAll(
        '#sheet svg [data-vtabs-letter-track="label"]:not([data-vtabs-letter-track-kind="grace"])'
      )
    ).map(element => ({
      label: (element.textContent || '').trim(),
      x: Number.parseFloat(element.getAttribute('x') || '0'),
      y: Number.parseFloat(element.getAttribute('y') || '0')
    }))

    const outlineNodes = Array.from(document.querySelectorAll('#sheet svg use'))
      .map(element => ({
        href: element.getAttribute('href') || element.getAttribute('xlink:href') || '',
        x: Number.parseFloat(element.getAttribute('x') || '0'),
        y: Number.parseFloat(element.getAttribute('y') || '0')
      }))
      .filter(item => /Outline|outline/i.test(item.href))

    const noteRows = groupRows(noteLabels)
    const outlineRows = groupRows(outlineNodes)
    const outlineLabelMap = new Map<string, Set<string>>()
    const alignedRowCount = Math.min(noteRows.length, outlineRows.length)

    for (let rowIndex = 0; rowIndex < alignedRowCount; rowIndex += 1) {
      const notes = [...(noteRows[rowIndex]?.items ?? [])]
        .filter(item => {
          const label = item.label.trim().toUpperCase()
          return label !== 'R' && label !== '-' && label !== 'HOLD' && label !== 'PAUSE'
        })
        .sort((left, right) => left.x - right.x)
      const outlines = [...(outlineRows[rowIndex]?.items ?? [])].sort((left, right) => left.x - right.x)
      const alignedCount = Math.min(notes.length, outlines.length)

      for (let index = 0; index < alignedCount; index += 1) {
        const label = notes[index]?.label?.trim() ?? ''
        const ref = outlines[index]?.href ?? ''
        if (!label || !ref) {
          continue
        }
        const entry = outlineLabelMap.get(ref) ?? new Set<string>()
        entry.add(label)
        outlineLabelMap.set(ref, entry)
      }
    }

    let ambiguousExtremeOutlineCount = 0
    counts.forEach((count, ref) => {
      const state = outlineStates.get(ref)
      const labels = outlineLabelMap.get(ref)
      if (!state || !labels) {
        return
      }
      if ((state.allClosed || state.allOpen) && labels.size > 1) {
        ambiguousExtremeOutlineCount += count
      }
    })

    return {
      totalOutlineCount: refs.length,
      uniqueOutlineCount: new Set(refs).size,
      dominantOutlineRatio: refs.length > 0 ? (ranked[0]?.[1] ?? 0) / refs.length : 0,
      ambiguousExtremeOutlineCount,
      ambiguousExtremeOutlineRatio: refs.length > 0 ? ambiguousExtremeOutlineCount / refs.length : 0,
      topOutlineRefs: ranked.slice(0, 8)
    } satisfies GraphAuditSummary
  })
}

function extractKeyToken(fingering: string) {
  const match = fingering.match(/^([#b]?[A-G])\d+$/i)
  return match?.[1] ?? fingering
}
