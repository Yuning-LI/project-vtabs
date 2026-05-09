import { chromium } from 'playwright'
import { loadKuailepuSongPayload } from '../src/lib/kuailepu/runtime.ts'

type CliOptions = {
  slugs: string[]
  baseUrl: string
  instruments?: string[]
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/audit-runtime-graphs.ts <slug...> [--base-url=http://127.0.0.1:3000] [--instruments=o12,r8b,w6]'

const options = parseArgs(process.argv.slice(2))
if (!options || options.slugs.length < 1) {
  console.error(usage)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(60000)

try {
  const reports = []

  for (const slug of options.slugs) {
    const payload = loadKuailepuSongPayload(slug)
    if (!payload) {
      reports.push({
        slug,
        error: 'Runtime payload not found.'
      })
      continue
    }

    const selectedInstruments = (options.instruments ?? ['o12', 'o6', 'r8b', 'r8g', 'w6']).filter(
      instrument =>
        (payload.instrumentFingerings ?? []).some(option => option.instrument === instrument)
    )

    const instrumentReports = []

    for (const instrument of selectedInstruments) {
      const option =
        (payload.instrumentFingerings ?? []).find(entry => entry.instrument === instrument) ?? null
      const fingeringSetList = option?.fingeringSetList ?? option?.fingeringsList ?? []

      for (let fingeringIndex = 0; fingeringIndex < fingeringSetList.length; fingeringIndex += 1) {
        const params = new URLSearchParams({
          instrument,
          fingering_index: String(fingeringIndex)
        })
        const url = `${options.baseUrl}/api/kuailepu-runtime/${slug}?${params.toString()}`

        await page.goto(url, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#sheet svg')

        const summary = await page.evaluate(() => {
          function groupRows<T extends { y: number }>(items: T[], tolerance = 8) {
            const rows: Array<{ y: number; items: T[] }> = []

            items.forEach(item => {
              const row = rows.find(candidate => Math.abs(candidate.y - item.y) < tolerance)
              if (row) {
                row.items.push(item)
                return
              }

              rows.push({
                y: item.y,
                items: [item]
              })
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
          const dominantRef = ranked[0]?.[0] ?? null
          const dominantCount = ranked[0]?.[1] ?? 0
          const symbol = dominantRef
            ? document.querySelector(
                `#sheet svg symbol[id="${dominantRef.replace(/^#/, '')}"]`
              )
            : null
          const circleFills = Array.from(symbol?.querySelectorAll('circle') ?? []).map(circle =>
            (circle.getAttribute('fill') || '').trim().toLowerCase()
          )
          const filledCircleCount = circleFills.filter(
            fill => fill === '#000' || fill === '#000000'
          ).length
          const openCircleCount = circleFills.filter(
            fill => fill === '#fff' || fill === '#ffffff'
          ).length

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
          const rowCount = Math.min(noteRows.length, outlineRows.length)

          for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            const notes = [...(noteRows[rowIndex]?.items ?? [])]
              .filter(item => {
                const label = item.label.trim().toUpperCase()
                return label !== 'R' && label !== '-' && label !== 'HOLD' && label !== 'PAUSE'
              })
              .sort((left, right) => left.x - right.x)
            const outlines = [...(outlineRows[rowIndex]?.items ?? [])].sort(
              (left, right) => left.x - right.x
            )
            const alignedCount = Math.min(notes.length, outlines.length)

            for (let index = 0; index < alignedCount; index += 1) {
              const label = notes[index]?.label?.trim() ?? ''
              const ref = outlines[index]?.href ?? ''
              if (!label || label.toUpperCase() === 'R' || !ref) {
                continue
              }
              const entry = outlineLabelMap.get(ref) ?? new Set<string>()
              entry.add(label)
              outlineLabelMap.set(ref, entry)
            }
          }

          return {
            totalOutlineCount: refs.length,
            uniqueOutlineCount: new Set(refs).size,
            dominantOutlineRef: dominantRef,
            dominantOutlineCount: dominantCount,
            dominantOutlineRatio: refs.length > 0 ? dominantCount / refs.length : 0,
            dominantOutlineFilledCircleCount: filledCircleCount,
            dominantOutlineOpenCircleCount: openCircleCount,
            dominantOutlineAllClosed: circleFills.length > 0 && filledCircleCount === circleFills.length,
            dominantOutlineAllOpen: circleFills.length > 0 && openCircleCount === circleFills.length,
            outlineLabels: Object.fromEntries(
              Array.from(outlineLabelMap.entries()).map(([ref, labels]) => [ref, Array.from(labels)])
            ),
            topOutlineRefs: ranked.slice(0, 8)
          }
        })

        instrumentReports.push({
          instrument,
          fingeringIndex,
          fingeringSet: fingeringSetList[fingeringIndex]?.map(item => item.fingering) ?? [],
          ...summary
        })
      }
    }

    reports.push({
      slug,
      keynote: payload.keynote ?? null,
      reports: instrumentReports
    })
  }

  console.log(JSON.stringify(reports, null, 2))
} finally {
  await browser.close()
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
    instruments: values.get('instruments')?.split(',').map(item => item.trim()).filter(Boolean)
  }
}
