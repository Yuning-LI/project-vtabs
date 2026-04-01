import crypto from 'node:crypto'
import fs from 'node:fs'
import type { Page } from 'playwright'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import {
  dismissKuailepuLoginOverlay,
  getPrimaryPage,
  launchKuailepuPersistentContext
} from './kuailepuAuth.ts'

type CompareState = {
  instrument: string | null
  fingering: string | null
  fingering_index: string | number | null
  show_graph: string | null
  show_lyric: string | null
  show_measure_num: string | null
  measure_layout: string | null
  sheet_scale: string | null
  no_preference_instrument?: boolean | null
  preference_instrument?: string | null
}

type CompareResult = {
  slug: string
  title: string
  songUuid: string
  liveUrl: string
  localUrl: string
  ok: boolean
  reason?: string
  localHash?: string
  liveHash?: string
  state?: CompareState
}

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000'
const requestedSlugs = process.argv.slice(3)

/**
 * 发布前 compare 必须基于 `allSongCatalog`，而不是只看已经公开的 `songCatalog`。
 *
 * 原因：
 * - 这个脚本最重要的用途就是给“准备上线的新歌”做 parity gate
 * - 如果只遍历已公开歌曲，就会漏掉 `published: false` 的待发布候选
 */
const candidates = allSongCatalog.filter(song => {
  if (requestedSlugs.length > 0 && !requestedSlugs.includes(song.slug)) {
    return false
  }

  const filePath = resolveKuailepuRuntimeSongPath(song.slug)
  if (!filePath || !fs.existsSync(filePath)) {
    return false
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { song_uuid?: string }
  return typeof payload.song_uuid === 'string' && payload.song_uuid.trim().length > 0
})

if (candidates.length < 1) {
  console.error('No matching raw-backed songs with a Kuailepu song_uuid were found.')
  process.exit(1)
}

const context = await launchKuailepuPersistentContext({ headless: true })

try {
  const page = await getPrimaryPage(context)
  const compareResults: CompareResult[] = []

  for (const song of candidates) {
    const filePath = resolveKuailepuRuntimeSongPath(song.slug)
    if (!filePath) {
      compareResults.push({
        slug: song.slug,
        title: song.title,
        songUuid: '',
        liveUrl: '',
        localUrl: `${baseUrl}/api/kuailepu-runtime/${song.slug}?note_label_mode=number`,
        ok: false,
        reason: 'missing deployable Kuailepu raw JSON'
      })
      continue
    }
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { song_uuid: string }
    const songUuid = payload.song_uuid
    /**
     * compare 时强制把本地 runtime 切回 `note_label_mode=number`。
     *
     * 这是当前发布流程里的硬规则：
     * - parity 校验比对的是“快乐谱原谱真相”
     * - 字母谱属于我们自己的显示层变换
     * - 所以发布 gate 必须回到原始 number 视图
     */
    const localUrl = `${baseUrl}/api/kuailepu-runtime/${song.slug}?note_label_mode=number`
    const liveUrl = `https://www.kuaiyuepu.com/jianpu/${songUuid}.html`

    try {
      const localCapture = await captureLocalRuntime(page, localUrl)
      const liveCapture = await captureLiveRuntime(page, liveUrl, localCapture.state)

      compareResults.push({
        slug: song.slug,
        title: song.title,
        songUuid,
        liveUrl,
        localUrl,
        ok: localCapture.hash === liveCapture.hash,
        reason: localCapture.hash === liveCapture.hash ? undefined : 'svg hash mismatch',
        localHash: localCapture.hash,
        liveHash: liveCapture.hash,
        state: localCapture.state
      })
    } catch (error) {
      compareResults.push({
        slug: song.slug,
        title: song.title,
        songUuid,
        liveUrl,
        localUrl,
        ok: false,
        reason: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const failed = compareResults.filter(result => !result.ok)
  console.log(
    JSON.stringify(
      {
        baseUrl,
        checked: compareResults.length,
        failed: failed.length,
        results: compareResults
      },
      null,
      2
    )
  )

  if (failed.length > 0) {
    process.exit(1)
  }
} finally {
  await context.close()
}

async function captureLocalRuntime(page: Page, url: string) {
  await page.setViewportSize({ width: 1440, height: 1600 })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('svg.sheet-svg', { timeout: 30000 })
  await page.waitForTimeout(1500)

  const payload = await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg.sheet-svg')
    const context = globalThis.Kit?.context?.getContext?.() ?? null
    const getValue = (selector: string) =>
      document.querySelector<HTMLSelectElement>(selector)?.value ?? null

    return {
      svgHtml: svg?.outerHTML ?? '',
      state: {
        instrument:
          context && typeof context === 'object' && 'instrument' in context
            ? String((context as Record<string, unknown>).instrument ?? '')
            : getValue('#which-instrument'),
        fingering:
          context && typeof context === 'object' && 'fingering' in context
            ? String((context as Record<string, unknown>).fingering ?? '')
            : getValue('#fingerings-wrapper'),
        fingering_index:
          context && typeof context === 'object' && 'fingering_index' in context
            ? ((context as Record<string, unknown>).fingering_index as string | number | null)
            : null,
        show_graph:
          context && typeof context === 'object' && 'show_graph' in context
            ? ((context as Record<string, unknown>).show_graph as string | null)
            : getValue('#show-graph'),
        show_lyric:
          context && typeof context === 'object' && 'show_lyric' in context
            ? ((context as Record<string, unknown>).show_lyric as string | null)
            : getValue('#show-lyric'),
        show_measure_num:
          context && typeof context === 'object' && 'show_measure_num' in context
            ? ((context as Record<string, unknown>).show_measure_num as string | null)
            : getValue('#show-measure-num'),
        measure_layout:
          context && typeof context === 'object' && 'measure_layout' in context
            ? ((context as Record<string, unknown>).measure_layout as string | null)
            : getValue('#measure-layout'),
        sheet_scale:
          context && typeof context === 'object' && 'sheet_scale' in context
            ? ((context as Record<string, unknown>).sheet_scale as string | number | null)
            : getValue('#sheet-scale'),
        no_preference_instrument:
          context && typeof context === 'object' && 'no_preference_instrument' in context
            ? Boolean((context as Record<string, unknown>).no_preference_instrument)
            : null,
        preference_instrument:
          context && typeof context === 'object' && 'preference_instrument' in context
            ? String((context as Record<string, unknown>).preference_instrument ?? '')
            : null
      }
    }
  })

  if (!payload.svgHtml) {
    throw new Error('local runtime svg missing')
  }

  return {
    hash: sha256(payload.svgHtml),
    state: payload.state as CompareState
  }
}

async function captureLiveRuntime(page: Page, url: string, state: CompareState) {
  await page.setViewportSize({ width: 1440, height: 1600 })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(800)
  await dismissKuailepuLoginOverlay(page)
  await page.waitForSelector('svg.sheet-svg', { timeout: 30000 })
  await applyContextState(page, state)

  const svgHtml = await page
    .locator('svg.sheet-svg')
    .evaluate(node => (node as SVGSVGElement).outerHTML)

  if (!svgHtml) {
    throw new Error('live runtime svg missing')
  }

  return {
    hash: sha256(svgHtml)
  }
}

async function applyContextState(page: Page, state: CompareState) {
  await page
    .evaluate(
      state => {
        const ctx = globalThis.Kit?.context?.getContext?.()
        if (!ctx) {
          return
        }

        Object.assign(ctx, state)

        const selectPairs: Array<[string, string | number | null | undefined]> = [
          ['#which-instrument', state.instrument],
          ['#fingerings-wrapper', state.fingering_index],
          ['#show-graph', state.show_graph],
          ['#show-lyric', state.show_lyric],
          ['#show-measure-num', state.show_measure_num],
          ['#measure-layout', state.measure_layout],
          ['#sheet-scale', state.sheet_scale]
        ]

        selectPairs.forEach(([selector, value]) => {
          if (value === null || value === undefined || value === '') {
            return
          }

          const select = document.querySelector<HTMLSelectElement>(selector)
          if (!select) {
            return
          }

          const targetValue = String(value)
          const hasOption = Array.from(select.options).some(option => option.value === targetValue)
          if (!hasOption) {
            return
          }

          select.value = targetValue
          select.dispatchEvent(new Event('change', { bubbles: true }))
        })
        if (globalThis.Song && typeof globalThis.Song.draw === 'function') {
          globalThis.Song.draw()
        }
      },
      state
    )
    .catch(() => undefined)
  await page.waitForTimeout(1200)
}

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}
