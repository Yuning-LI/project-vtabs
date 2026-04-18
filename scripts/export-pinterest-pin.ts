import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import type { Locator, Page } from 'playwright'
import {
  getPinterestPinBoardName,
  getPinterestPinDescription,
  getPinterestPinDestinationUrl,
  getPinterestPinPreset,
  getPinterestPinTitle,
  pinterestFirstWavePresets
} from '../src/lib/songbook/pinterestPins.ts'
import { songCatalogBySlug } from '../src/lib/songbook/catalog.ts'
import { buildSongPageHref } from '../src/lib/songbook/publicInstruments.ts'
import { siteUrl } from '../src/lib/site.ts'

type ExportArgs = {
  slugs: string[]
  outputDir: string
  baseUrl: string
  manifestPath: string | null
  viewportWidth: number
  viewportHeight: number
  deviceScaleFactor: number
  maxOutputHeight: number | null
  targetRatio: {
    width: number
    height: number
  } | null
  instrument: string | null
  noteLabelMode: 'letter' | 'number' | null
  showGraph: string | null
  showLyric: 'on' | 'off' | null
  showMeasureNum: 'on' | 'off' | null
  measureLayout: 'compact' | 'mono' | null
  sheetScale: string | null
  watermark: 'on' | 'off' | null
  captureMode: 'canvas' | 'page'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targets: ExportTarget[] =
    args.slugs.length > 0
      ? args.slugs.map(slug => buildExportTarget(slug, args))
      : [...pinterestFirstWavePresets].map(preset => buildExportTarget(preset.slug, args))

  const browser = await chromium.launch({ headless: true })

  try {
    const resolvedOutputDir = path.resolve(process.cwd(), args.outputDir)
    fs.mkdirSync(resolvedOutputDir, { recursive: true })
    const manifestEntries: Array<Record<string, string>> = []

    for (const preset of targets) {
      const page = await browser.newPage({
        viewport: { width: args.viewportWidth, height: args.viewportHeight },
        deviceScaleFactor: args.deviceScaleFactor
      })

      try {
        const outputPath = path.resolve(
          resolvedOutputDir,
          buildOutputFilename(preset, args)
        )
        const finalSearchParams = new URLSearchParams(preset.searchParams.toString())
        let finalWorkbenchUrl = ''

        const initialSheetScale = parseOptionalInteger(finalSearchParams.get('sheet_scale'))
        const canAutoReduceScale =
          args.maxOutputHeight !== null &&
          args.captureMode === 'canvas' &&
          initialSheetScale !== null
        let currentSheetScale = initialSheetScale
        const minSheetScale = 6

        for (;;) {
          finalWorkbenchUrl = buildWorkbenchUrl(args.baseUrl, {
            ...preset,
            searchParams: finalSearchParams
          })
          await page.goto(finalWorkbenchUrl, { waitUntil: 'networkidle', timeout: 45000 })
          const runtimeFrame = page.locator('[data-pinterest-export-root="true"] iframe').first()
          await runtimeFrame.waitFor({ state: 'visible', timeout: 30000 })
          const runtime = page.frameLocator('[data-pinterest-export-root="true"] iframe')
          await runtime.locator('svg.sheet-svg').waitFor({ timeout: 30000 })
          await page
            .locator('[data-runtime-loading="true"]')
            .waitFor({ state: 'detached', timeout: 30000 })
            .catch(() => {})

          const exportRoot = page.locator('[data-pinterest-export-root="true"]')
          await waitForStableExportHeight(page, exportRoot)

          if (args.captureMode === 'page') {
            await page.screenshot({
              path: outputPath,
              fullPage: true,
              scale: 'device'
            })
          } else {
            await exportRoot.screenshot({
              path: outputPath,
              scale: 'device'
            })
          }

          const removableGap = await detectRemovableTitleGap(page, exportRoot)
          await postProcessExportImage(outputPath, {
            deviceScaleFactor: args.deviceScaleFactor,
            removableGap
          })

          const imageSize = readImageSize(outputPath)
          if (
            !canAutoReduceScale ||
            args.maxOutputHeight === null ||
            imageSize.height <= args.maxOutputHeight ||
            currentSheetScale === null ||
            currentSheetScale <= minSheetScale
          ) {
            break
          }

          currentSheetScale -= 1
          finalSearchParams.set('sheet_scale', String(currentSheetScale))
        }

        manifestEntries.push({
          slug: preset.slug,
          imagePath: outputPath,
          destinationUrl: buildPublicDestinationUrl(preset.slug, finalSearchParams),
          trackingUrl: buildTrackingUrl(
            buildPublicDestinationUrl(preset.slug, finalSearchParams),
            preset.slug,
            finalSearchParams.get('instrument')
          ),
          boardName: preset.boardName,
          pinTitle: preset.pinTitle,
          pinDescription: preset.pinDescription,
          workbenchUrl: finalWorkbenchUrl
        })

        console.log(`Exported Pinterest pin to ${outputPath}`)
      } finally {
        await page.close()
      }
    }

    const manifestPath = path.resolve(
      process.cwd(),
      args.manifestPath ?? path.join(args.outputDir, 'manifest.json')
    )
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifestEntries, null, 2)}\n`, 'utf8')
    console.log(`Wrote Pinterest manifest to ${manifestPath}`)
  } finally {
    await browser.close()
  }
}

async function waitForStableExportHeight(page: Page, exportRoot: Locator) {
  let stableCount = 0
  let previousHeight = 0

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForTimeout(200)
    const currentHeight = await exportRoot
      .evaluate(node => {
        const rootRect = node.getBoundingClientRect()
        const marker = node.querySelector('[data-pinterest-export-end="true"]')
        if (marker) {
          const markerRect = marker.getBoundingClientRect()
          return Math.ceil(Math.max(markerRect.bottom - rootRect.top, 1))
        }

        return Math.ceil(Math.max(node.scrollHeight, rootRect.height))
      })
      .catch(() => 1500)

    if (currentHeight === previousHeight && currentHeight > 0) {
      stableCount += 1
      if (stableCount >= 2) {
        return currentHeight
      }
    } else {
      stableCount = 0
      previousHeight = currentHeight
    }
  }

  return previousHeight > 0 ? previousHeight : 1500
}

async function detectRemovableTitleGap(
  page: Page,
  exportRoot: Locator
) {
  const gap = await exportRoot
    .evaluate(node => {
      const iframe = node.querySelector('iframe')
      const rootRect = node.getBoundingClientRect()
      if (!(iframe instanceof HTMLIFrameElement)) {
        return null
      }

      const iframeRect = iframe.getBoundingClientRect()
      const doc = iframe.contentDocument
      if (!doc) {
        return null
      }

      const svg = doc.querySelector('#sheet svg, #sheet .sheet-svg')
      if (!(svg instanceof SVGSVGElement)) {
        return null
      }

      const titleCandidates = Array.from(svg.querySelectorAll('text')).filter(node => {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim()
        if (!text) {
          return false
        }

        if (
          /(?:Composer|Lyricist|Arranger|Notation|Play order|fingering|ocarina|recorder|tin whistle|xun|hulusi|xiao|bamboo flute)/i.test(
            text
          )
        ) {
          return false
        }

        const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null
        if (!rect || rect.height <= 0) {
          return false
        }

        const fontSize = Number(node.getAttribute('font-size') || 0)
        return rect.top >= 0 && rect.top <= 140 && rect.width >= 120 && fontSize >= 14
      })

      const primaryTitle = titleCandidates
        .sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0]
      if (!(primaryTitle instanceof SVGTextElement)) {
        return null
      }

      const chartCandidates = Array.from(svg.querySelectorAll('use')).filter(node => {
        const href = node.getAttribute('xlink:href') || node.getAttribute('href') || ''
        return /(?:tdo12Outline|do12Outline|o12Outline|tdo6Outline|do6Outline|outline)/i.test(href)
      })

      const firstChart = chartCandidates
        .map(node => ({
          node,
          rect: typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null
        }))
        .filter(
          (entry): entry is { node: SVGUseElement; rect: DOMRect } =>
            entry.node instanceof SVGUseElement &&
            Boolean(entry.rect) &&
            (entry.rect?.height ?? 0) > 0
        )
        .sort((left, right) => left.rect.top - right.rect.top)[0]
      if (!firstChart) {
        return null
      }

      const titleRect = primaryTitle.getBoundingClientRect()
      const gapStart = iframeRect.top - rootRect.top + titleRect.bottom + 6
      const gapEnd = iframeRect.top - rootRect.top + firstChart.rect.top - 6
      const gapHeight = gapEnd - gapStart
      if (!Number.isFinite(gapStart) || !Number.isFinite(gapEnd) || gapHeight < 16) {
        return null
      }

      return {
        startCssPx: Math.max(0, gapStart),
        endCssPx: Math.max(0, gapEnd)
      }
    })
    .catch(() => null)

  if (!gap) {
    return null
  }

  return gap
}

async function postProcessExportImage(
  imagePath: string,
  options: {
    deviceScaleFactor: number
    removableGap:
      | {
          startCssPx: number
          endCssPx: number
        }
      | null
  }
) {
  const pythonScript = `
from PIL import Image
import sys

image_path = sys.argv[1]
gap_start = int(sys.argv[2])
gap_end = int(sys.argv[3])

img = Image.open(image_path)
img.load()

def normalize_rgb(pixel):
    if isinstance(pixel, int):
        return (pixel, pixel, pixel)
    if len(pixel) >= 3:
        return pixel[:3]
    return (255, 255, 255)

def row_is_near_blank(image, y, base_rgb):
    width = image.width
    sample_points = 48
    tolerance = 16
    blank_hits = 0
    for index in range(sample_points):
        x = min(width - 1, round(index * (width - 1) / max(sample_points - 1, 1)))
        rgb = normalize_rgb(image.getpixel((x, y)))
        if (
            abs(rgb[0] - base_rgb[0]) <= tolerance and
            abs(rgb[1] - base_rgb[1]) <= tolerance and
            abs(rgb[2] - base_rgb[2]) <= tolerance
        ):
            blank_hits += 1
    return blank_hits / sample_points >= 0.94

base_rgb = normalize_rgb(img.getpixel((min(8, img.width - 1), min(8, img.height - 1))))

band_start = gap_start
band_end = gap_end

if not (0 <= band_start < band_end <= img.height):
    search_top = max(40, round(img.height * 0.08))
    search_bottom = min(img.height - 40, round(img.height * 0.42))
    best = None
    current_start = None
    for y in range(search_top, search_bottom):
        if row_is_near_blank(img, y, base_rgb):
            if current_start is None:
                current_start = y
        else:
            if current_start is not None:
                current_height = y - current_start
                if current_height >= 18 and (best is None or current_height > best[1] - best[0]):
                    best = (current_start, y)
                current_start = None
    if current_start is not None:
        current_height = search_bottom - current_start
        if current_height >= 18 and (best is None or current_height > best[1] - best[0]):
            best = (current_start, search_bottom)
    if best is not None:
        band_start, band_end = best

if 0 <= band_start < band_end <= img.height:
    removable = max(0, band_end - band_start - 14)
    if removable > 0:
        keep_top = band_start + 7
        keep_bottom = band_end - 7
        top = img.crop((0, 0, img.width, keep_top))
        bottom = img.crop((0, keep_bottom, img.width, img.height))
        merged = Image.new(img.mode, (img.width, top.height + bottom.height), img.getpixel((0, 0)))
        merged.paste(top, (0, 0))
        merged.paste(bottom, (0, top.height))
        img = merged

img.save(image_path)
`

  const dpr = options.deviceScaleFactor > 0 ? options.deviceScaleFactor : 1
  const gapStart = options.removableGap
    ? Math.max(0, Math.round(options.removableGap.startCssPx * dpr))
    : -1
  const gapEnd = options.removableGap
    ? Math.max(0, Math.round(options.removableGap.endCssPx * dpr))
    : -1

  execFileSync(
    'python3',
    ['-c', pythonScript, imagePath, String(gapStart), String(gapEnd)],
    {
      stdio: 'pipe'
    }
  )
}

type ExportTarget = {
  slug: string
  title: string
  boardName: string
  pinTitle: string
  pinDescription: string
  destinationUrl: string
  trackingUrl: string
  searchParams: URLSearchParams
}

function buildExportTarget(slug: string, args: ExportArgs): ExportTarget {
  const preset = getPinterestPinPreset(slug)
  const song = songCatalogBySlug[slug]
  if (!song) {
    throw new Error(`Unknown public song slug: ${slug}`)
  }

  const searchParams = new URLSearchParams()
  if (args.instrument) {
    searchParams.set('instrument', args.instrument)
  } else if (preset?.instrumentId && preset.instrumentId !== 'o12') {
    searchParams.set('instrument', preset.instrumentId)
  }

  if (args.noteLabelMode) {
    if (args.noteLabelMode === 'number') {
      searchParams.set('note_label_mode', 'number')
    }
  } else if (preset?.noteLabelMode === 'number') {
    searchParams.set('note_label_mode', 'number')
  }

  if (args.showGraph) {
    searchParams.set('show_graph', args.showGraph)
  }
  if (args.showLyric) {
    searchParams.set('show_lyric', args.showLyric)
  }
  if (args.showMeasureNum) {
    searchParams.set('show_measure_num', args.showMeasureNum)
  } else if (preset?.showMeasureNum === 'on') {
    searchParams.set('show_measure_num', 'on')
  }
  if (args.measureLayout) {
    if (args.measureLayout !== 'compact') {
      searchParams.set('measure_layout', args.measureLayout)
    }
  } else if (preset?.measureLayout && preset.measureLayout !== 'compact') {
    searchParams.set('measure_layout', preset.measureLayout)
  }
  if (args.sheetScale) {
    searchParams.set('sheet_scale', args.sheetScale)
  } else if (preset?.sheetScale) {
    searchParams.set('sheet_scale', preset.sheetScale)
  }
  if (args.watermark) {
    if (args.watermark === 'off') {
      searchParams.set('watermark', 'off')
    }
  }

  const destinationUrl = buildDestinationUrl(slug, preset, args)

  return {
    slug,
    title: preset?.title ?? song.title,
    boardName: preset ? getPinterestPinBoardName(preset) : 'Pinterest Workbench Exports',
    pinTitle: preset ? getPinterestPinTitle(preset) : `${song.title} Letter Notes`,
    pinDescription:
      preset
        ? getPinterestPinDescription(preset)
        : `Play ${song.title} with letter notes, fingering charts, and optional numbered notes on Play By Fingering.`,
    destinationUrl,
    trackingUrl: buildTrackingUrl(destinationUrl, slug, args.instrument ?? preset?.instrumentId ?? null),
    searchParams
  }
}

function buildWorkbenchUrl(baseUrl: string, target: ExportTarget) {
  const root = `${baseUrl.replace(/\/$/, '')}/dev/pinterest/song/${target.slug}`
  const query = target.searchParams.toString()
  return query ? `${root}?${query}` : root
}

function buildDestinationUrl(
  slug: string,
  preset: ReturnType<typeof getPinterestPinPreset>,
  args: ExportArgs
) {
  if (preset && !args.instrument && !args.noteLabelMode && !args.showGraph && !args.showLyric && !args.showMeasureNum && !args.measureLayout && !args.sheetScale) {
    return getPinterestPinDestinationUrl(preset)
  }

  const href = buildSongPageHref({
    songId: slug,
    instrumentId: normalizeInstrumentForPublicHref(args.instrument ?? preset?.instrumentId ?? null),
    noteLabelMode: args.noteLabelMode === 'number' ? 'number' : null,
    showGraph: args.showGraph,
    showLyric: args.showLyric,
    showMeasureNum: args.showMeasureNum,
    measureLayout: args.measureLayout,
    sheetScale: args.sheetScale
  })

  return `${siteUrl}${href}`
}

function normalizeInstrumentForPublicHref(value: string | null) {
  if (!value || value === 'o12') {
    return null
  }

  return value
}

function buildTrackingUrl(destinationUrl: string, slug: string, instrumentId: string | null) {
  const url = new URL(destinationUrl)
  url.searchParams.set('utm_source', 'pinterest')
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', 'pinterest-workbench')
  url.searchParams.set('utm_content', instrumentId ? `${slug}-${instrumentId}` : slug)
  return url.toString()
}

function buildPublicDestinationUrl(songSlug: string, searchParams: URLSearchParams) {
  const href = buildSongPageHref({
    songId: songSlug,
    instrumentId: normalizeInstrumentForPublicHref(searchParams.get('instrument')),
    noteLabelMode: searchParams.get('note_label_mode') === 'number' ? 'number' : null,
    showGraph: searchParams.get('show_graph'),
    showLyric: normalizeToggleValue(searchParams.get('show_lyric')),
    showMeasureNum: normalizeToggleValue(searchParams.get('show_measure_num')),
    measureLayout: normalizeMeasureLayoutValue(searchParams.get('measure_layout')),
    sheetScale: searchParams.get('sheet_scale')
  })

  return `${siteUrl}${href}`
}

function buildOutputFilename(target: ExportTarget, args: ExportArgs) {
  const parts = [
    target.slug,
    `${args.viewportWidth}x${args.viewportHeight}`,
    `dpr${String(args.deviceScaleFactor).replace('.', '_')}`,
    args.captureMode
  ]

  const instrument = target.searchParams.get('instrument')
  if (instrument) {
    parts.push(instrument)
  }

  const noteMode = target.searchParams.get('note_label_mode')
  if (noteMode) {
    parts.push(noteMode)
  }

  if (args.targetRatio) {
    parts.push(`ratio${args.targetRatio.width}x${args.targetRatio.height}`)
  }

  return `${parts.join('__')}.png`
}

function readImageSize(imagePath: string) {
  const pythonScript = `
from PIL import Image
import sys

with Image.open(sys.argv[1]) as img:
    print(f"{img.width} {img.height}")
`

  const output = execFileSync('python3', ['-c', pythonScript, imagePath], {
    encoding: 'utf8',
    stdio: 'pipe'
  }).trim()
  const [widthText, heightText] = output.split(/\s+/)
  const width = Number.parseInt(widthText ?? '', 10)
  const height = Number.parseInt(heightText ?? '', 10)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Failed to read image size for ${imagePath}`)
  }

  return { width, height }
}

function parseArgs(argv: string[]): ExportArgs {
  const values = new Map<string, string>()
  const slugs: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index]
    if (part === '--slug') {
      const next = argv[index + 1]
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --slug')
      }
      slugs.push(next)
      index += 1
      continue
    }

    if (!part.startsWith('--')) {
      continue
    }

    const key = part.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      values.set(key, 'true')
      continue
    }
    values.set(key, next)
    index += 1
  }

  return {
    slugs,
    outputDir: values.get('output-dir') ?? 'exports/pinterest-first-wave',
    baseUrl: values.get('base-url') ?? 'http://127.0.0.1:3000',
    manifestPath: values.get('manifest-path') ?? null,
    viewportWidth: parsePositiveInt(values.get('width'), 1000, '--width'),
    viewportHeight: parsePositiveInt(values.get('height'), 1500, '--height'),
    deviceScaleFactor: parsePositiveNumber(values.get('dpr'), 2, '--dpr'),
    maxOutputHeight: parseOptionalPositiveInt(values.get('max-output-height'), '--max-output-height'),
    targetRatio: parseRatio(values.get('target-ratio')),
    instrument: values.get('instrument') ?? null,
    noteLabelMode: parseEnum(values.get('note-label-mode'), ['letter', 'number'], '--note-label-mode'),
    showGraph: values.get('show-graph') ?? null,
    showLyric: parseEnum(values.get('show-lyric'), ['on', 'off'], '--show-lyric'),
    showMeasureNum: parseEnum(values.get('show-measure-num'), ['on', 'off'], '--show-measure-num'),
    measureLayout: parseEnum(values.get('measure-layout'), ['compact', 'mono'], '--measure-layout'),
    sheetScale: values.get('sheet-scale') ?? null,
    watermark: parseEnum(values.get('watermark'), ['on', 'off'], '--watermark'),
    captureMode: parseEnum(values.get('capture'), ['canvas', 'page'], '--capture') ?? 'canvas'
  }
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  flagName: string
) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`)
  }

  return parsed
}

function parseOptionalPositiveInt(value: string | undefined, flagName: string) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`)
  }

  return parsed
}

function parseOptionalInteger(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

function normalizeToggleValue(value: string | null) {
  if (value === 'on' || value === 'off') {
    return value
  }

  return null
}

function normalizeMeasureLayoutValue(value: string | null) {
  if (value === 'compact' || value === 'mono') {
    return value
  }

  return null
}

function parseRatio(value: string | undefined) {
  if (!value) {
    return null
  }

  const match = value.match(/^(\d+):(\d+)$/)
  if (!match) {
    throw new Error(`Invalid value for --target-ratio: ${value}`)
  }

  const width = Number.parseInt(match[1] ?? '', 10)
  const height = Number.parseInt(match[2] ?? '', 10)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid value for --target-ratio: ${value}`)
  }

  return { width, height }
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
  flagName: string
) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`)
  }

  return parsed
}

function parseEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  flagName: string
): T[number] | null {
  if (!value) {
    return null
  }

  if ((allowed as readonly string[]).includes(value)) {
    return value as T[number]
  }

  throw new Error(`Invalid value for ${flagName}: ${value}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
