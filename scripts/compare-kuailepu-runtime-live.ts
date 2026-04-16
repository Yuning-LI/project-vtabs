import crypto from 'node:crypto'
import fs from 'node:fs'
import type { Page } from 'playwright'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import { allSongCatalog } from '../src/lib/songbook/catalog.ts'
import {
  getSupportedPublicSongInstruments,
  type PublicSongInstrumentId
} from '../src/lib/songbook/publicInstruments.ts'
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
  instrumentId: PublicSongInstrumentId
  liveUrl: string
  localUrl: string
  ok: boolean
  reason?: string
  localHash?: string
  liveHash?: string
  localNormalizedHash?: string
  liveNormalizedHash?: string
  normalizedMatch?: boolean
  firstDiffIndex?: number
  localDiffSnippet?: string
  liveDiffSnippet?: string
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

const compareTargets = candidates.flatMap(song => {
  const filePath = resolveKuailepuRuntimeSongPath(song.slug)
  if (!filePath) {
    return []
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    song_uuid: string
    instrumentFingerings?: Array<{ instrument?: string | null }>
  }
  const supportedInstruments = getSupportedPublicSongInstruments(payload)

  return supportedInstruments.map(instrument => ({
    slug: song.slug,
    title: song.title,
    songUuid: payload.song_uuid,
    instrumentId: instrument.id
  }))
})

const context = await launchKuailepuPersistentContext({ headless: true })

try {
  const page = await getPrimaryPage(context)
  const compareResults: CompareResult[] = []

  for (const target of compareTargets) {
    /**
     * compare 时强制把本地 runtime 切回 `note_label_mode=number`。
     *
     * 这是当前发布流程里的硬规则：
     * - parity 校验比对的是“快乐谱原谱真相”
     * - 字母谱属于我们自己的显示层变换
     * - 所以发布 gate 必须回到原始 number 视图
     */
    const localUrl = buildLocalCompareUrl(baseUrl, target.slug, target.instrumentId)
    const liveUrl = `https://www.kuaiyuepu.com/jianpu/${target.songUuid}.html`

    try {
      const localCapture = await captureLocalRuntime(page, localUrl)
      const liveCapture = await captureLiveRuntime(page, liveUrl, localCapture.state)
      const normalizedMatch = localCapture.normalizedHash === liveCapture.normalizedHash
      const firstDiffIndex = findFirstDiffIndex(localCapture.rawSvg, liveCapture.rawSvg)
      const localDiffSnippet = buildDiffSnippet(localCapture.rawSvg, firstDiffIndex)
      const liveDiffSnippet = buildDiffSnippet(liveCapture.rawSvg, firstDiffIndex)

      compareResults.push({
        slug: target.slug,
        title: target.title,
        songUuid: target.songUuid,
        instrumentId: target.instrumentId,
        liveUrl,
        localUrl,
        ok: normalizedMatch,
        reason: normalizedMatch ? undefined : 'svg hash mismatch',
        localHash: localCapture.hash,
        liveHash: liveCapture.hash,
        localNormalizedHash: localCapture.normalizedHash,
        liveNormalizedHash: liveCapture.normalizedHash,
        normalizedMatch,
        firstDiffIndex: normalizedMatch ? undefined : firstDiffIndex,
        localDiffSnippet: normalizedMatch ? undefined : localDiffSnippet ?? undefined,
        liveDiffSnippet: normalizedMatch ? undefined : liveDiffSnippet ?? undefined,
        state: localCapture.state
      })
    } catch (error) {
      compareResults.push({
        slug: target.slug,
        title: target.title,
        songUuid: target.songUuid,
        instrumentId: target.instrumentId,
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
    rawSvg: payload.svgHtml,
    hash: sha256(payload.svgHtml),
    normalizedHash: sha256(normalizeSvgForHash(payload.svgHtml)),
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
    rawSvg: svgHtml,
    hash: sha256(svgHtml),
    normalizedHash: sha256(normalizeSvgForHash(svgHtml))
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

        /**
         * 注意这里不要再强行驱动 `#which-instrument` / `#fingerings-wrapper`。
         *
         * 原因：
         * - `w6` 这类快乐谱隐藏乐器在 live 页下拉里可能根本不存在
         * - 继续把本地 `fingering_index` 套到 live 页可见下拉，会把隐藏乐器状态误投到
         *   别的可见乐器选项上，造成假性 parity 失败
         *
         * 更稳妥的方式是：
         * - 直接回放 local runtime 已解析好的 context 字段
         * - 再只用 live 页里确实存在的非乐器 UI 开关做补充同步
         */
        const selectPairs: Array<[string, string | number | null | undefined]> = [
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

function normalizeSvgForHash(input: string) {
  return input
    .replace(/\s+role="img"/g, '')
    .replace(/\s+focusable="false"/g, '')
    .replace(/\s+aria-labelledby="[^"]*"/g, '')
    .replace(/\s+aria-hidden="true"/g, '')
    .replace(/\s+data-vtabs-a11y="[^"]*"/g, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/gi, '')
    .replace(/>\s+</g, '><')
    .trim()
}

function findFirstDiffIndex(left: string, right: string) {
  const limit = Math.min(left.length, right.length)
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) {
      return index
    }
  }

  return left.length === right.length ? -1 : limit
}

function buildDiffSnippet(input: string, diffIndex: number) {
  if (diffIndex < 0) {
    return null
  }

  const start = Math.max(0, diffIndex - 160)
  const end = Math.min(input.length, diffIndex + 200)
  return input.slice(start, end)
}

function buildLocalCompareUrl(
  baseUrl: string,
  slug: string,
  instrumentId: PublicSongInstrumentId
) {
  const params = new URLSearchParams()
  params.set('note_label_mode', 'number')
  if (instrumentId !== 'o12') {
    params.set('instrument', instrumentId)
  }

  return `${baseUrl}/api/kuailepu-runtime/${slug}?${params.toString()}`
}
