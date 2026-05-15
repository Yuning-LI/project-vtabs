import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { parseKeynoteToMidi } from '../src/lib/songbook/songIngestDraft.ts'
import { getKuailepuOcarinaReferencePriority } from '../src/lib/songbook/kuailepuIngest.ts'
import {
  resolveKuailepuRuntimeMutationSourcePath,
  resolveKuailepuRuntimeWriteTargets
} from '../src/lib/kuailepu/sourceFiles.ts'
import type { KuailepuRuntimePayload } from '../src/lib/kuailepu/runtime.ts'
import {
  mergeSongIngestRuntimeMetadata,
  SONG_INGEST_RUNTIME_FINGERING_RULES_VERSION
} from '../src/lib/songbook/songIngestRuntimeMetadata.ts'

type CliOptions = {
  slugs: string[]
  baseUrl: string
  instruments?: string[]
  dryRun: boolean
  report?: string
}

type FingeringSetOption = {
  fingering?: string
  fingeringName?: string
  tonalityName?: string
  match?: number
}

type GraphAuditSummary = {
  totalOutlineCount: number
  uniqueOutlineCount: number
  dominantOutlineRef: string | null
  dominantOutlineCount: number
  dominantOutlineRatio: number
  dominantOutlineSharedLabelCount: number
  dominantOutlineFilledCircleCount: number
  dominantOutlineOpenCircleCount: number
  dominantOutlineAllClosed: boolean
  dominantOutlineAllOpen: boolean
  ambiguousOutlineCount: number
  ambiguousOutlineRatio: number
  totalExtremeOutlineCount: number
  totalExtremeOutlineRatio: number
  totalAllClosedOutlineCount: number
  totalAllOpenOutlineCount: number
  ambiguousExtremeOutlineCount: number
  ambiguousExtremeOutlineRatio: number
  ambiguousAllClosedOutlineCount: number
  ambiguousAllOpenOutlineCount: number
  maxAmbiguousExtremeOutlineLabelCount: number
  maxAmbiguousAllClosedOutlineLabelCount: number
  maxAmbiguousAllOpenOutlineLabelCount: number
  ambiguousOutlines: Array<{
    ref: string
    count: number
    labels: string[]
    allClosed: boolean
    allOpen: boolean
  }>
  ambiguousExtremeOutlines: Array<{
    ref: string
    count: number
    labels: string[]
    allClosed: boolean
    allOpen: boolean
  }>
  topOutlineRefs: Array<[string, number]>
}

type RankedCandidate = {
  originalIndex: number
  instrument: string
  fingeringSet: FingeringSetOption[]
  firstFingering: string | null
  shift: number | null
  exact: boolean
  octaveAligned: boolean
  absShift: number
  pitchClassDistance: number
  referencePriority: number
  qualityTier: 0 | 1 | 2
  audit: GraphAuditSummary
}

const KUAILEPU_OCARINA_REFERENCE_SHIFT_TIE_THRESHOLD = 12
const PUBLIC_WIND_INSTRUMENTS_WITH_EXTREME_OUTLINE_GUARD = new Set([
  'o12',
  'o6',
  'r8b',
  'r8g',
  'w6'
])
const PUBLIC_RECORDER_WHISTLE_INSTRUMENTS = new Set([
  'r8b',
  'r8g',
  'w6'
])

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/optimize-runtime-fingerings.ts <slug...> [--base-url=http://127.0.0.1:3000] [--instruments=o12,o6,r8b,r8g,w6] [--report=exports/song-ingest/runtime-fingering-optimize.json] [--dry-run=true]'

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
  let hasSongErrors = false

  for (const slug of options.slugs) {
    const filePath = resolveKuailepuRuntimeMutationSourcePath(slug)
    const writeTargets = resolveKuailepuRuntimeWriteTargets(slug)

    try {
      if (!filePath) {
        hasSongErrors = true
        reports.push({ slug, error: 'Runtime payload not found.' })
        continue
      }

      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuRuntimePayload
      const targetTonicMidi = parseKeynoteToMidi(String(payload.keynote || '1=C'))
      const nextInstrumentFingerings = [...(payload.instrumentFingerings ?? [])]
      const selectedInstruments = (options.instruments ?? ['o12', 'o6', 'r8b', 'r8g', 'w6']).filter(
        instrument =>
          nextInstrumentFingerings.some(option => option.instrument === instrument)
      )

      const perInstrumentReports = []

      for (const instrument of selectedInstruments) {
        const instrumentIndex = nextInstrumentFingerings.findIndex(option => option.instrument === instrument)
        if (instrumentIndex < 0) {
          continue
        }

        const entry = nextInstrumentFingerings[instrumentIndex]!
        const sourceSetList = cloneSetList(entry.fingeringSetList ?? entry.fingeringsList ?? [])
        const ranked: RankedCandidate[] = []
        for (let fingeringIndex = 0; fingeringIndex < sourceSetList.length; fingeringIndex += 1) {
          const audit = await auditRuntimeGraph(page, options.baseUrl, slug, instrument, fingeringIndex)
          const firstFingering = sourceSetList[fingeringIndex]?.[0]?.fingering ?? null
          const shift = firstFingering ? parseMidiFromFingering(firstFingering) - targetTonicMidi : null
          const absShift = shift === null ? Number.POSITIVE_INFINITY : Math.abs(shift)
          ranked.push({
            originalIndex: fingeringIndex,
            instrument,
            fingeringSet: sourceSetList[fingeringIndex] ?? [],
            firstFingering,
            shift,
            exact: shift === 0,
            octaveAligned: shift !== null && shift % 12 === 0,
            absShift,
            pitchClassDistance:
              shift === null ? Number.POSITIVE_INFINITY : Math.min(((shift % 12) + 12) % 12, (12 - (((shift % 12) + 12) % 12)) % 12),
            referencePriority:
              firstFingering === null
                ? Number.POSITIVE_INFINITY
                : getKuailepuOcarinaReferencePriority(instrument, firstFingering),
            qualityTier: classifyGraphQualityForInstrument(instrument, audit),
            audit
          })
        }

        const sorted = [...ranked].sort(compareRankedCandidates)
        const viableCandidates = sorted.filter(candidate => candidate.qualityTier !== 2)
        /**
         * 对竖笛 / 哨笛再加一层公开偏好：
         * - 如果已经存在“极端边界轮廓最多只对应 1 个音高”的可用候选，
         *   就不要再公开“同一个边界轮廓对应 2 个音高”的候选。
         * - 只有在不存在这种更干净的候选时，才退而接受 2 音高版本。
         *
         * 这里仍然只影响公开曝光，不影响生成层召回。
         */
        const recorderWhistleSinglePitchEdgeViableCandidates =
          PUBLIC_RECORDER_WHISTLE_INSTRUMENTS.has(instrument)
            ? viableCandidates.filter(
                candidate =>
                  Math.max(
                    candidate.audit.maxAmbiguousAllClosedOutlineLabelCount,
                    candidate.audit.maxAmbiguousAllOpenOutlineLabelCount
                  ) <= 1
              )
            : []
        const exposureViableCandidates =
          recorderWhistleSinglePitchEdgeViableCandidates.length > 0
            ? recorderWhistleSinglePitchEdgeViableCandidates
            : viableCandidates
        /**
         * 极端轻重吹扩展（全按+轻吹 / 全开+重吹）仍然可以作为公开页上的备选指法，
         * 但它不应该抢到默认位。
         *
         * 所以公开层的顺序应该是：
         * 1. 非极端 clean
         * 2. 非极端 acceptable
         * 3. 极端 clean
         * 4. 极端 acceptable
         *
         * 这样用户仍然可以在下拉列表里看到靠轻重吹扩展音域的候选，
         * 但默认首先落到不依赖这类扩展的更稳妥指法。
         */
        const nonExtremeViableCandidates = exposureViableCandidates.filter(
          candidate => candidate.audit.totalExtremeOutlineCount === 0
        )
        const extremeViableCandidates = exposureViableCandidates.filter(
          candidate => candidate.audit.totalExtremeOutlineCount > 0
        )
        const cleanNonExtremeCandidates = nonExtremeViableCandidates.filter(
          candidate => candidate.qualityTier === 0
        )
        const acceptableNonExtremeCandidates = nonExtremeViableCandidates.filter(
          candidate => candidate.qualityTier === 1
        )
        const cleanExtremeCandidates = extremeViableCandidates.filter(
          candidate => candidate.qualityTier === 0
        )
        const acceptableExtremeCandidates = extremeViableCandidates.filter(
          candidate => candidate.qualityTier === 1
        )
        /**
         * 公开页不要再把明确判成“不适合公开候选”的指法兜底塞回去。
         *
         * 如果一个乐器在当前歌曲上没有任何 viable 候选，
         * 就应该直接隐藏该乐器，而不是为了“至少有得选”把坏候选重新暴露出去。
         */
        const finalCandidates = [
          ...cleanNonExtremeCandidates,
          ...acceptableNonExtremeCandidates,
          ...cleanExtremeCandidates,
          ...acceptableExtremeCandidates
        ].slice(0, 4)

        entry.fingeringSetList = finalCandidates.map(candidate => candidate.fingeringSet)
        if (entry.fingeringsList) {
          entry.fingeringsList = finalCandidates.map(candidate => candidate.fingeringSet)
        }

        perInstrumentReports.push({
          instrument,
          before: ranked.map(candidate => describeCandidate(candidate)),
          after: finalCandidates.map(candidate => describeCandidate(candidate))
        })
      }

      payload.instrumentFingerings = nextInstrumentFingerings.filter(option => {
        if (option.instrument === 'none') {
          return true
        }
        const fingeringSetList = option.fingeringSetList ?? option.fingeringsList ?? []
        return fingeringSetList.length > 0
      })
      payload.fingerings = buildFingeringsField(nextInstrumentFingerings)
      payload.fingering_index = 0

      mergeSongIngestRuntimeMetadata(payload, {
        runtimeFingeringAudit: {
          status: 'optimized',
          rulesVersion: SONG_INGEST_RUNTIME_FINGERING_RULES_VERSION,
          optimizedAt: new Date().toISOString(),
          baseUrl: options.baseUrl,
          instrumentCount: payload.instrumentFingerings.filter(
            option => option.instrument !== 'none'
          ).length
        }
      })

      if (!options.dryRun) {
        if (writeTargets.length < 1) {
          throw new Error(`No writable runtime target found for ${slug}.`)
        }

        for (const targetPath of writeTargets) {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
        }
      }

      reports.push({
        slug,
        file: path.relative(process.cwd(), filePath),
        writtenFiles: writeTargets.map(targetPath => path.relative(process.cwd(), targetPath)),
        dryRun: options.dryRun,
        instruments: perInstrumentReports
      })
    } catch (error) {
      hasSongErrors = true
      reports.push({
        slug,
        file: filePath ? path.relative(process.cwd(), filePath) : null,
        dryRun: options.dryRun,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8')
    console.log(`Wrote fingering optimization report to ${path.relative(process.cwd(), reportPath)}`)
  }

  console.log(JSON.stringify(reports, null, 2))
  if (hasSongErrors) {
    process.exitCode = 1
  }
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
    instruments: values.get('instruments')?.split(',').map(item => item.trim()).filter(Boolean),
    dryRun: values.get('dry-run') === 'true',
    report: values.get('report')
  }
}

async function auditRuntimeGraph(
  page: Awaited<ReturnType<typeof chromium.launch>> extends infer _Browser
    ? import('playwright').Page
    : never,
  baseUrl: string,
  slug: string,
  instrument: string,
  fingeringIndex: number
) {
  const params = new URLSearchParams({
    instrument,
    fingering_index: String(fingeringIndex)
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
    const outlineStates = new Map<
      string,
      {
        filledCircleCount: number
        openCircleCount: number
        allClosed: boolean
        allOpen: boolean
      }
    >()

    counts.forEach((_count, ref) => {
      const symbol = document.querySelector(`#sheet svg symbol[id="${ref.replace(/^#/, '')}"]`)
      const circleFills = Array.from(symbol?.querySelectorAll('circle') ?? []).map(
        circle => (circle.getAttribute('fill') || '').trim().toLowerCase()
      )
      const filledCircleCount = circleFills.filter(fill => fill === '#000' || fill === '#000000').length
      const openCircleCount = circleFills.filter(fill => fill === '#fff' || fill === '#ffffff').length
      outlineStates.set(ref, {
        filledCircleCount,
        openCircleCount,
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

    function parsePitchLabelToMidi(label) {
      const normalized = String(label || '').trim()
      const match = normalized.match(/^([A-Ga-g])([#b]?)(\d+)$/)
      if (!match) {
        return null
      }

      const note = match[1].toUpperCase()
      const accidental = match[2]
      const octave = Number.parseInt(match[3], 10)
      const basePitchClasses = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11
      }
      const basePitchClass = basePitchClasses[note]
      if (typeof basePitchClass !== 'number') {
        return null
      }

      const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
      return (octave + 1) * 12 + basePitchClass + accidentalOffset
    }

    const noteRows = groupRows(noteLabels)
    const outlineRows = groupRows(outlineNodes)
    const outlineLabelMap = new Map<
      string,
      {
        count: number
        labels: Set<string>
        labelCounts: Map<string, number>
      }
    >()
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
        if (!ref) {
          continue
        }

        const entry =
          outlineLabelMap.get(ref) ??
          (() => {
            const next = {
              count: 0,
              labels: new Set<string>(),
              labelCounts: new Map<string, number>()
            }
            outlineLabelMap.set(ref, next)
            return next
          })()

        entry.count += 1
        if (label && label.toUpperCase() !== 'R') {
          entry.labels.add(label)
          entry.labelCounts.set(label, (entry.labelCounts.get(label) || 0) + 1)
        }
      }
    }

    const dominantState = dominantRef ? outlineStates.get(dominantRef) : null
    const dominantLabelCount = dominantRef ? outlineLabelMap.get(dominantRef)?.labels.size ?? 0 : 0
    let ambiguousOutlineCount = 0
    let totalExtremeOutlineCount = 0
    let totalAllClosedOutlineCount = 0
    let totalAllOpenOutlineCount = 0
    let ambiguousExtremeOutlineCount = 0
    let ambiguousAllClosedOutlineCount = 0
    let ambiguousAllOpenOutlineCount = 0
    let maxAmbiguousExtremeOutlineLabelCount = 0
    let maxAmbiguousAllClosedOutlineLabelCount = 0
    let maxAmbiguousAllOpenOutlineLabelCount = 0
    const ambiguousOutlines: GraphAuditSummary['ambiguousOutlines'] = []
    const ambiguousExtremeOutlines: GraphAuditSummary['ambiguousExtremeOutlines'] = []
    counts.forEach((count, ref) => {
      const state = outlineStates.get(ref)
      if (!state) {
        return
      }
      if (state.allClosed) {
        totalAllClosedOutlineCount += count
      }
      if (state.allOpen) {
        totalAllOpenOutlineCount += count
      }

      const outlineLabels = outlineLabelMap.get(ref)
      const nonRestLabelCount = outlineLabels?.labels.size ?? 0
      const labelMidis = Array.from(outlineLabels?.labels ?? [])
        .map(label => ({ label, midi: parsePitchLabelToMidi(label) }))
        .filter(item => Number.isFinite(item.midi))
        .sort((left, right) => left.midi - right.midi)
      const baseExtremeMidi =
        state.allClosed
          ? labelMidis[labelMidis.length - 1]?.midi ?? null
          : state.allOpen
            ? labelMidis[0]?.midi ?? null
            : null
      const extensionLabels = new Set(
        labelMidis
          .filter(item =>
            state.allClosed
              ? baseExtremeMidi !== null && item.midi < baseExtremeMidi
              : state.allOpen
                ? baseExtremeMidi !== null && item.midi > baseExtremeMidi
                : false
          )
          .map(item => item.label)
      )
      const extensionCount = Array.from(extensionLabels).reduce(
        (sum, label) => sum + (outlineLabels?.labelCounts.get(label) || 0),
        0
      )
      if ((state.allClosed || state.allOpen) && extensionCount > 0) {
        totalExtremeOutlineCount += extensionCount
      }
      if (nonRestLabelCount > 1) {
        ambiguousOutlineCount += count
        ambiguousOutlines.push({
          ref,
          count,
          labels: Array.from(outlineLabels?.labels ?? []),
          allClosed: state.allClosed,
          allOpen: state.allOpen
        })
      }
      if ((state.allClosed || state.allOpen) && nonRestLabelCount > 1) {
        if (state.allClosed) {
          maxAmbiguousAllClosedOutlineLabelCount = Math.max(
            maxAmbiguousAllClosedOutlineLabelCount,
            nonRestLabelCount
          )
        }
        if (state.allOpen) {
          maxAmbiguousAllOpenOutlineLabelCount = Math.max(
            maxAmbiguousAllOpenOutlineLabelCount,
            nonRestLabelCount
          )
        }
      }
      if ((state.allClosed || state.allOpen) && nonRestLabelCount > 1 && extensionCount > 0) {
        ambiguousExtremeOutlineCount += extensionCount
        maxAmbiguousExtremeOutlineLabelCount = Math.max(
          maxAmbiguousExtremeOutlineLabelCount,
          nonRestLabelCount
        )
        if (state.allClosed) {
          ambiguousAllClosedOutlineCount += extensionCount
        }
        if (state.allOpen) {
          ambiguousAllOpenOutlineCount += extensionCount
        }
        ambiguousExtremeOutlines.push({
          ref,
          count,
          labels: Array.from(outlineLabels?.labels ?? []),
          allClosed: state.allClosed,
          allOpen: state.allOpen
        })
      }
    })

    return {
      totalOutlineCount: refs.length,
      uniqueOutlineCount: new Set(refs).size,
      dominantOutlineRef: dominantRef,
      dominantOutlineCount: dominantCount,
      dominantOutlineRatio: refs.length > 0 ? dominantCount / refs.length : 0,
      dominantOutlineSharedLabelCount: dominantLabelCount,
      dominantOutlineFilledCircleCount: dominantState?.filledCircleCount ?? 0,
      dominantOutlineOpenCircleCount: dominantState?.openCircleCount ?? 0,
      dominantOutlineAllClosed: dominantState?.allClosed ?? false,
      dominantOutlineAllOpen: dominantState?.allOpen ?? false,
      ambiguousOutlineCount,
      ambiguousOutlineRatio: refs.length > 0 ? ambiguousOutlineCount / refs.length : 0,
      totalExtremeOutlineCount,
      totalExtremeOutlineRatio: refs.length > 0 ? totalExtremeOutlineCount / refs.length : 0,
      totalAllClosedOutlineCount,
      totalAllOpenOutlineCount,
      ambiguousExtremeOutlineCount,
      ambiguousExtremeOutlineRatio:
        refs.length > 0 ? ambiguousExtremeOutlineCount / refs.length : 0,
      ambiguousAllClosedOutlineCount,
      ambiguousAllOpenOutlineCount,
      maxAmbiguousExtremeOutlineLabelCount,
      maxAmbiguousAllClosedOutlineLabelCount,
      maxAmbiguousAllOpenOutlineLabelCount,
      ambiguousOutlines: ambiguousOutlines.sort((left, right) => right.count - left.count),
      ambiguousExtremeOutlines: ambiguousExtremeOutlines.sort((left, right) => right.count - left.count),
      topOutlineRefs: ranked.slice(0, 8)
    } satisfies GraphAuditSummary
  })
}

function classifyGraphQuality(audit: GraphAuditSummary): 0 | 1 | 2 {
  if (audit.uniqueOutlineCount <= 1) {
    return 2
  }

  if (audit.ambiguousOutlineRatio >= 0.55) {
    return 2
  }

  if (audit.ambiguousExtremeOutlineRatio >= 0.55) {
    return 2
  }

  if (audit.uniqueOutlineCount <= 2 && audit.dominantOutlineRatio >= 0.85) {
    return 2
  }

  if (
    audit.dominantOutlineSharedLabelCount >= 3 &&
    audit.dominantOutlineRatio >= 0.25 &&
    (audit.dominantOutlineAllClosed || audit.dominantOutlineAllOpen)
  ) {
    return 2
  }

  if (
    (audit.dominantOutlineAllClosed || audit.dominantOutlineAllOpen) &&
    audit.dominantOutlineRatio >= 0.9 &&
    audit.uniqueOutlineCount <= 3
  ) {
    return 2
  }

  if (audit.totalExtremeOutlineRatio >= 0.45) {
    return 2
  }

  if (audit.ambiguousOutlineRatio >= 0.25) {
    return 1
  }

  if (audit.uniqueOutlineCount <= 3) {
    return 1
  }

  if (audit.totalExtremeOutlineRatio >= 0.2) {
    return 1
  }

  if (audit.ambiguousExtremeOutlineRatio >= 0.25) {
    return 1
  }

  if (audit.dominantOutlineRatio >= 0.85) {
    return 1
  }

  if (audit.ambiguousExtremeOutlineCount >= 12) {
    return 1
  }

  return 0
}

function classifyGraphQualityForInstrument(
  instrument: string,
  audit: GraphAuditSummary
): 0 | 1 | 2 {
  const baseTier = classifyGraphQuality(audit)

  if (PUBLIC_WIND_INSTRUMENTS_WITH_EXTREME_OUTLINE_GUARD.has(instrument)) {
    /**
     * 公开风类乐器统一更严格：
     * - 如果同一个极端按孔（全按 / 全开）被复用于超过 2 个不同音高，
     *   这基本就是在靠轻重吹硬撑音域，不适合作为公开候选。
     *
     * 这条规则不只适用于陶笛。对竖笛 / 哨笛也一样：
     * 如果一个候选需要反复依赖全按 / 全开 + 轻重吹去覆盖多个音高，
     * 用户感知上同样会很差，公开页应该直接放弃这个候选。
     */
    if (
      Math.max(
        audit.maxAmbiguousAllClosedOutlineLabelCount,
        audit.maxAmbiguousAllOpenOutlineLabelCount
      ) > 2
    ) {
      return 2
    }

    if (audit.ambiguousExtremeOutlineCount > 0) {
      return Math.max(baseTier, 1) as 0 | 1 | 2
    }
  }

  return baseTier
}

function compareRankedCandidates(left: RankedCandidate, right: RankedCandidate) {
  if (left.qualityTier !== right.qualityTier) {
    return left.qualityTier - right.qualityTier
  }

  if (left.audit.ambiguousOutlineRatio !== right.audit.ambiguousOutlineRatio) {
    return left.audit.ambiguousOutlineRatio - right.audit.ambiguousOutlineRatio
  }

  if (left.audit.ambiguousExtremeOutlineRatio !== right.audit.ambiguousExtremeOutlineRatio) {
    return left.audit.ambiguousExtremeOutlineRatio - right.audit.ambiguousExtremeOutlineRatio
  }

  if (left.audit.totalExtremeOutlineRatio !== right.audit.totalExtremeOutlineRatio) {
    return left.audit.totalExtremeOutlineRatio - right.audit.totalExtremeOutlineRatio
  }

  if (left.audit.uniqueOutlineCount !== right.audit.uniqueOutlineCount) {
    return right.audit.uniqueOutlineCount - left.audit.uniqueOutlineCount
  }

  if (left.audit.dominantOutlineRatio !== right.audit.dominantOutlineRatio) {
    return left.audit.dominantOutlineRatio - right.audit.dominantOutlineRatio
  }

  if (left.pitchClassDistance !== right.pitchClassDistance) {
    return left.pitchClassDistance - right.pitchClassDistance
  }

  const leftExact = left.exact ? 0 : 1
  const rightExact = right.exact ? 0 : 1
  if (leftExact !== rightExact) {
    return leftExact - rightExact
  }

  if (
    Math.abs(left.absShift - right.absShift) <= KUAILEPU_OCARINA_REFERENCE_SHIFT_TIE_THRESHOLD &&
    left.referencePriority !== right.referencePriority
  ) {
    return left.referencePriority - right.referencePriority
  }

  if (left.absShift !== right.absShift) {
    return left.absShift - right.absShift
  }

  return left.originalIndex - right.originalIndex
}

function describeCandidate(candidate: RankedCandidate) {
  return {
    originalIndex: candidate.originalIndex,
    fingeringSet: candidate.fingeringSet.map(item => item.fingering),
    shift: candidate.shift,
    referencePriority:
      Number.isFinite(candidate.referencePriority) ? candidate.referencePriority : null,
    qualityTier: candidate.qualityTier,
    uniqueOutlineCount: candidate.audit.uniqueOutlineCount,
    dominantOutlineRatio: candidate.audit.dominantOutlineRatio,
    dominantOutlineSharedLabelCount: candidate.audit.dominantOutlineSharedLabelCount,
    ambiguousOutlineCount: candidate.audit.ambiguousOutlineCount,
    ambiguousOutlineRatio: candidate.audit.ambiguousOutlineRatio,
    totalExtremeOutlineRatio: candidate.audit.totalExtremeOutlineRatio,
    totalAllClosedOutlineCount: candidate.audit.totalAllClosedOutlineCount,
    totalAllOpenOutlineCount: candidate.audit.totalAllOpenOutlineCount,
    ambiguousOutlines: candidate.audit.ambiguousOutlines,
    ambiguousExtremeOutlineCount: candidate.audit.ambiguousExtremeOutlineCount,
    ambiguousExtremeOutlineRatio: candidate.audit.ambiguousExtremeOutlineRatio,
    maxAmbiguousExtremeOutlineLabelCount: candidate.audit.maxAmbiguousExtremeOutlineLabelCount,
    maxAmbiguousAllClosedOutlineLabelCount: candidate.audit.maxAmbiguousAllClosedOutlineLabelCount,
    maxAmbiguousAllOpenOutlineLabelCount: candidate.audit.maxAmbiguousAllOpenOutlineLabelCount,
    ambiguousExtremeOutlines: candidate.audit.ambiguousExtremeOutlines,
    dominantOutlineRef: candidate.audit.dominantOutlineRef,
    topOutlineRefs: candidate.audit.topOutlineRefs
  }
}

function parseMidiFromFingering(fingering: string) {
  const match = fingering.match(/^([#b]?)([A-G])(\d+)$/i)
  if (!match) {
    return Number.NaN
  }

  const baseMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }
  const pitchClass =
    (baseMap[match[2]!.toUpperCase()] ?? 0) +
    (match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0)
  const octave = Number.parseInt(match[3]!, 10)
  return (octave + 1) * 12 + ((pitchClass + 12) % 12)
}

function cloneSetList(setList: FingeringSetOption[][]) {
  return setList.map(group => group.map(item => ({ ...item })))
}

function buildFingeringsField(
  instrumentFingerings: NonNullable<KuailepuRuntimePayload['instrumentFingerings']>
) {
  return instrumentFingerings
    .filter(option => option.instrument !== 'none')
    .flatMap(option =>
      (option.fingeringSetList ?? option.fingeringsList ?? []).flatMap(set =>
        set.map(item => `${option.instrument}-${extractKeyToken(item.fingering ?? '')}`)
      )
    )
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(',')
}

function extractKeyToken(fingering: string) {
  const match = fingering.match(/^([#b]?[A-G])\d+$/i)
  return match?.[1] ?? fingering
}
