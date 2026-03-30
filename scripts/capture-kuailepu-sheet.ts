import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import {
  dismissKuailepuLoginOverlay,
  getPrimaryPage,
  launchKuailepuPersistentContext
} from './kuailepuAuth.ts'

type CaptureState = {
  instrument?: string | null
  instrument_label?: string | null
  fingering?: string | null
  fingering_label?: string | null
  show_graph?: string | null
  show_lyric?: string | null
  show_measure_num?: string | null
  measure_layout?: string | null
  sheet_scale?: string | number | null
}

type CaptureOptions = {
  slug: string
  sourceUrl: string
  instrument: string | null
  fingering: string | null
  showGraph: string | null
  showLyric: string | null
  showMeasureNum: string | null
  measureLayout: string | null
  sheetScale: string | null
  viewports: number[]
}

const DEFAULT_VIEWPORTS = [1440, 1024, 768, 430]

const args = process.argv.slice(2)
const sourceInput = args[0] || 'jyz9m1QbT'
const optionMap = parseOptionMap(args.slice(1))
const sourceUrl = normalizeDetailUrl(sourceInput)
const sourceId = getSongIdFromSource(sourceInput)
const slug = optionMap.slug || sourceId || 'kuailepu-song'
const options: CaptureOptions = {
  slug,
  sourceUrl,
  instrument: optionMap.instrument ?? 'o12',
  fingering: optionMap.fingering ?? null,
  showGraph: optionMap['show-graph'] ?? 'on',
  showLyric: optionMap['show-lyric'] ?? 'on',
  showMeasureNum: optionMap['show-measure-num'] ?? 'off',
  measureLayout: optionMap['measure-layout'] ?? 'compact',
  sheetScale: optionMap['sheet-scale'] ?? '10',
  viewports: parseViewportList(optionMap.viewports)
}

const generatedDir = path.resolve(process.cwd(), 'reference', 'generated-svg', slug)
const compareDir = path.resolve(process.cwd(), 'reference', 'compare')

await fs.promises.mkdir(generatedDir, { recursive: true })
await fs.promises.mkdir(compareDir, { recursive: true })

const context = await launchKuailepuPersistentContext({ headless: true })

try {
  const page = await getPrimaryPage(context)
  const captureResults = []
  const initialViewport = options.viewports[0] ?? DEFAULT_VIEWPORTS[0]

  await openSheetPage(page, initialViewport, options)

  for (const viewport of options.viewports) {
    console.error(`[capture] viewport ${viewport}`)
    const result = await captureViewport(page, viewport)
    captureResults.push(result)

    const htmlPath = path.join(generatedDir, `${viewport}.html`)
    const metaPath = path.join(generatedDir, `${viewport}.json`)
    const pageShotPath = path.join(compareDir, `${slug}-kuailepu-live-${viewport}.png`)
    const sheetShotPath = path.join(compareDir, `${slug}-kuailepu-sheet-${viewport}.png`)

    await fs.promises.writeFile(htmlPath, result.html, 'utf8')
    await fs.promises.writeFile(
      metaPath,
      JSON.stringify(
        {
          viewport,
          width: result.width,
          height: result.height,
          renderedWidth: result.renderedWidth,
          renderedHeight: result.renderedHeight,
          state: result.state,
          sourceUrl,
          songUuid: result.songUuid ?? sourceId ?? null,
          songName: result.songName ?? null,
          capturedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    )
    await page.screenshot({
      path: pageShotPath,
      fullPage: false
    })
    await page.locator('svg.sheet-svg').screenshot({
      path: sheetShotPath
    })
  }

  const primaryCapture = captureResults[0]
  await fs.promises.writeFile(
    path.resolve(process.cwd(), 'reference', 'generated-svg', `${slug}.html`),
    primaryCapture.html,
    'utf8'
  )
  await fs.promises.writeFile(
    path.resolve(process.cwd(), 'reference', 'generated-svg', `${slug}.meta.json`),
    JSON.stringify(
      {
        width: primaryCapture.width,
        height: primaryCapture.height,
        renderedWidth: primaryCapture.renderedWidth,
        renderedHeight: primaryCapture.renderedHeight,
        state: primaryCapture.state,
        sourceUrl,
        songUuid: primaryCapture.songUuid ?? sourceId ?? null,
        songName: primaryCapture.songName ?? null,
        capturedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf8'
  )

  console.log(
    JSON.stringify(
      {
        slug,
        sourceUrl,
        songUuid: primaryCapture.songUuid ?? sourceId ?? null,
        songName: primaryCapture.songName ?? null,
        viewports: captureResults.map(result => ({
          viewport: result.viewport,
          width: result.width,
          height: result.height,
          renderedWidth: result.renderedWidth,
          renderedHeight: result.renderedHeight,
          state: result.state
        })),
        generatedDir: path.relative(process.cwd(), generatedDir),
        compareDir: path.relative(process.cwd(), compareDir)
      },
      null,
      2
    )
  )
} finally {
  await context.close()
}

async function captureViewport(page: Page, viewport: number) {
  await page.setViewportSize({ width: viewport, height: Math.max(1600, Math.round(viewport * 1.45)) })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(900)

  const payload = await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg.sheet-svg')
    const rect = svg?.getBoundingClientRect()
    const getSelect = (selector: string) => document.querySelector<HTMLSelectElement>(selector)
    const getSelectedLabel = (selector: string) => {
      const select = getSelect(selector)
      const option = select?.selectedOptions?.[0]
      return option?.textContent?.trim() ?? null
    }
    const context = globalThis.Kit?.context?.getContext?.()

    return {
      html: svg?.outerHTML ?? '',
      width: Number(svg?.getAttribute('width') ?? 0) || rect?.width || 0,
      height: Number(svg?.getAttribute('height') ?? 0) || rect?.height || 0,
      renderedWidth: rect?.width ?? 0,
      renderedHeight: rect?.height ?? 0,
      songUuid:
        context && typeof context === 'object' && 'song_uuid' in context
          ? String((context as Record<string, unknown>).song_uuid ?? '')
          : null,
      songName:
        context && typeof context === 'object' && 'song_name' in context
          ? String((context as Record<string, unknown>).song_name ?? '')
          : null,
      state: {
        instrument: getSelect('#which-instrument')?.value ?? null,
        instrument_label: getSelectedLabel('#which-instrument'),
        fingering: getSelect('#fingerings-wrapper')?.value ?? null,
        fingering_label: getSelectedLabel('#fingerings-wrapper'),
        show_graph: getSelect('#show-graph')?.value ?? null,
        show_lyric: getSelect('#show-lyric')?.value ?? null,
        show_measure_num: getSelect('#show-measure-num')?.value ?? null,
        measure_layout: getSelect('#measure-layout')?.value ?? null,
        sheet_scale: getSelect('#sheet-scale')?.value ?? null
      }
    }
  })

  if (!payload.html.trim() || !payload.width || !payload.height) {
    throw new Error(`Failed to capture sheet SVG for viewport ${viewport}`)
  }

  return {
    viewport,
    html: payload.html,
    width: payload.width,
    height: payload.height,
    renderedWidth: payload.renderedWidth,
    renderedHeight: payload.renderedHeight,
    songUuid: payload.songUuid,
    songName: payload.songName,
    state: payload.state as CaptureState
  }
}

async function openSheetPage(page: Page, viewport: number, options: CaptureOptions) {
  await page.setViewportSize({ width: viewport, height: Math.max(1600, Math.round(viewport * 1.45)) })
  await page.goto(options.sourceUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  })
  await page.waitForTimeout(900)
  await dismissKuailepuLoginOverlay(page)
  await page.waitForSelector('svg.sheet-svg', { timeout: 30000 })
  await applySheetState(page, options)
}

async function applySheetState(page: Page, options: CaptureOptions) {
  if (options.instrument) {
    await page.selectOption('#which-instrument', options.instrument)
    await page.waitForFunction(() => {
      const select = document.querySelector<HTMLSelectElement>('#which-instrument')
      return select?.value && select.value !== 'none'
    })
    await confirmVisibleKuailepuModal(page)
    await page.waitForTimeout(500)
  }

  if (options.fingering) {
    await page.waitForFunction(() => {
      const select = document.querySelector<HTMLSelectElement>('#fingerings-wrapper')
      return Boolean(select && select.options.length > 0)
    })
    await page.selectOption('#fingerings-wrapper', options.fingering)
    await page.waitForTimeout(300)
  } else {
    await page.waitForFunction(() => {
      const instrument = document.querySelector<HTMLSelectElement>('#which-instrument')
      if (!instrument || instrument.value === 'none') {
        return true
      }

      const fingering = document.querySelector<HTMLSelectElement>('#fingerings-wrapper')
      return Boolean(fingering && fingering.options.length > 0)
    })
  }

  await setSelectValue(page, '#show-graph', options.showGraph)
  await setSelectValue(page, '#show-lyric', options.showLyric)
  await setSelectValue(page, '#show-measure-num', options.showMeasureNum)
  await setSelectValue(page, '#measure-layout', options.measureLayout)
  await setSelectValue(page, '#sheet-scale', options.sheetScale)
  await page.waitForTimeout(800)
}

async function setSelectValue(page: Page, selector: string, value: string | null) {
  if (!value) {
    return
  }

  await page.selectOption(selector, value).catch(() => undefined)
  await page.waitForTimeout(180)
}

async function confirmVisibleKuailepuModal(page: Page) {
  const buttons = page.locator('a.modal-action.modal-close', { hasText: '确定' })
  const count = await buttons.count().catch(() => 0)

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index)
    const visible = await button.isVisible().catch(() => false)
    if (!visible) {
      continue
    }

    await button.click().catch(() => undefined)
    await page.waitForTimeout(400)
  }
}

function parseOptionMap(rawArgs: string[]) {
  const optionMap: Record<string, string> = {}

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) {
      continue
    }

    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const value = rawValue.join('=').trim()
    if (!key || !value) {
      continue
    }

    optionMap[key] = value
  }

  return optionMap
}

function normalizeDetailUrl(input: string) {
  if (/^https?:\/\//i.test(input)) {
    return input
  }

  const songId = input.replace(/\.html$/i, '')
  return `https://www.kuaiyuepu.com/jianpu/${songId}.html`
}

function getSongIdFromSource(input: string) {
  if (!input) {
    return ''
  }

  const match = input.match(/\/jianpu\/([^/.]+)(?:\.html)?/i)
  if (match?.[1]) {
    return match[1]
  }

  return input.replace(/\.html$/i, '')
}

function parseViewportList(raw: string | undefined) {
  if (!raw) {
    return DEFAULT_VIEWPORTS
  }

  const values = raw
    .split(',')
    .map(part => Number(part.trim()))
    .filter(value => Number.isFinite(value) && value > 0)

  return values.length > 0 ? values : DEFAULT_VIEWPORTS
}
