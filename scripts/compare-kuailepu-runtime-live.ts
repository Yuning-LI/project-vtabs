import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
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

chromium.use(stealthPlugin())

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
  localSemanticHash?: string
  liveSemanticHash?: string
  semanticMatch?: boolean
  semanticDiffs?: Array<{
    path: string
    local: unknown
    live: unknown
  }>
  normalizedMatch?: boolean
  firstDiffIndex?: number
  normalizedFirstDiffIndex?: number
  localDiffSnippet?: string
  liveDiffSnippet?: string
  normalizedLocalDiffSnippet?: string
  normalizedLiveDiffSnippet?: string
  state?: CompareState
}

type CompareTarget = {
  slug: string
  title: string
  songUuid: string
  instrumentId: PublicSongInstrumentId
  runtimeDefaultInstrumentId: string | null
  runtimeDefaultShowGraph: string | null
  runtimeControlPayload: {
    instrumentFingerings?: Array<{ instrument?: string | null }>
  }
}

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000'
const requestedSlugs = process.argv.slice(3)
const catalogBySlug = new Map(allSongCatalog.map(song => [song.slug, song]))
const compareSources = resolveCompareSources(requestedSlugs, catalogBySlug)

if (compareSources.length < 1) {
  console.error('No matching raw-backed songs with a live-comparable Kuailepu song_uuid were found.')
  process.exit(1)
}

const compareTargets: CompareTarget[] = compareSources.flatMap(source => {
  const supportedInstruments = getSupportedPublicSongInstruments(source.payload)

  return supportedInstruments.map(instrument => ({
    slug: source.slug,
    title: source.title,
    songUuid: source.payload.song_uuid,
    instrumentId: instrument.id,
    runtimeDefaultInstrumentId: source.payload.instrument ?? null,
    runtimeDefaultShowGraph: source.payload.show_graph ?? null,
    runtimeControlPayload: {
      instrumentFingerings: source.payload.instrumentFingerings
    }
  }))
})

const compareTargetGroups = groupCompareTargetsBySong(compareTargets)

const context = await launchKuailepuPersistentContext({ headless: true })
const localBrowser = await chromium.launch({ headless: true })
const localContext = await localBrowser.newContext({
  /**
   * 快乐谱 live 页当前在中国站环境下默认跑 `zh-CN`。
   *
   * 之前 compare 本地 capture 用的是一个干净浏览器页，默认 locale 是 `en-US`。
   * 这会让本地 runtime 走到不同的 i18n / 文本度量路径，导致像
   * `Over the Rainbow` 这类歌在本地和 live 出现正文布局漂移。
   *
   * 这里把本地 compare 页显式对齐到 `zh-CN`，继续保留“干净页、避免持久化 profile
   * 异常跳转”的好处，同时消除 locale 差异带来的假性 parity 失败。
   */
  locale: 'zh-CN'
})

try {
  const livePage = await getPrimaryPage(context)
  const localPage = await localContext.newPage()
  await localPage.route('**/*', route => {
    const request = route.request()
    const requestUrl = request.url()
    const isMainFrameNavigation =
      request.isNavigationRequest() && request.frame() === localPage.mainFrame()

    if (isMainFrameNavigation && !requestUrl.startsWith(baseUrl)) {
      return route.abort()
    }

    return route.continue()
  })
  const compareResults: CompareResult[] = []

  for (const group of compareTargetGroups) {
    const liveUrl = `https://www.kuaiyuepu.com/jianpu/${group.songUuid}.html`
    let livePrepared = false

    for (const target of group.targets) {
      /**
       * compare 时强制把本地 runtime 切回 `note_label_mode=number`。
       *
       * 这是当前发布流程里的硬规则：
       * - parity 校验比对的是“快乐谱原谱真相”
       * - 字母谱属于我们自己的显示层变换
       * - 所以发布 gate 必须回到原始 number 视图
       */
      const localUrl = buildLocalCompareUrl(baseUrl, target)

      try {
        const localCapture = await captureLocalRuntime(localPage, localUrl)
        if (!livePrepared) {
          await prepareLiveRuntimePage(livePage, liveUrl)
          livePrepared = true
        }
        const liveCapture = await captureLiveRuntimeFromPreparedPage(livePage, localCapture.state)
        const normalizedMatch = localCapture.normalizedHash === liveCapture.normalizedHash
        const semanticMatch = localCapture.semanticHash === liveCapture.semanticHash
        const semanticDiffs = semanticMatch
          ? undefined
          : diffNormalizedRuntimeContexts(
              localCapture.semanticContext,
              liveCapture.semanticContext
            )
        const firstDiffIndex = findFirstDiffIndex(localCapture.rawSvg, liveCapture.rawSvg)
        const normalizedFirstDiffIndex = findFirstDiffIndex(
          localCapture.normalizedSvg,
          liveCapture.normalizedSvg
        )
        const localDiffSnippet = buildDiffSnippet(localCapture.rawSvg, firstDiffIndex)
        const liveDiffSnippet = buildDiffSnippet(liveCapture.rawSvg, firstDiffIndex)
        const normalizedLocalDiffSnippet = buildDiffSnippet(
          localCapture.normalizedSvg,
          normalizedFirstDiffIndex
        )
        const normalizedLiveDiffSnippet = buildDiffSnippet(
          liveCapture.normalizedSvg,
          normalizedFirstDiffIndex
        )

        compareResults.push({
          slug: target.slug,
          title: target.title,
          songUuid: target.songUuid,
          instrumentId: target.instrumentId,
          liveUrl,
          localUrl,
          ok: semanticMatch,
          reason: semanticMatch ? undefined : 'svg semantic mismatch',
          localHash: localCapture.hash,
          liveHash: liveCapture.hash,
          localNormalizedHash: localCapture.normalizedHash,
          liveNormalizedHash: liveCapture.normalizedHash,
          localSemanticHash: localCapture.semanticHash,
          liveSemanticHash: liveCapture.semanticHash,
          semanticMatch,
          semanticDiffs,
          normalizedMatch,
          firstDiffIndex: normalizedMatch ? undefined : firstDiffIndex,
          localDiffSnippet: normalizedMatch ? undefined : localDiffSnippet ?? undefined,
          liveDiffSnippet: normalizedMatch ? undefined : liveDiffSnippet ?? undefined,
          normalizedFirstDiffIndex: normalizedMatch ? undefined : normalizedFirstDiffIndex,
          normalizedLocalDiffSnippet: normalizedMatch
            ? undefined
            : normalizedLocalDiffSnippet ?? undefined,
          normalizedLiveDiffSnippet: normalizedMatch
            ? undefined
            : normalizedLiveDiffSnippet ?? undefined,
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
  await localContext.close()
  await localBrowser.close()
  await context.close()
}

async function captureLocalRuntime(page: Page, url: string) {
  await page.setViewportSize({ width: 1280, height: 1600 })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('svg.sheet-svg', { timeout: 30000 })
  await sleep(randomBetween(1100, 1900))

  const payload = await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg.sheet-svg')
    const pageGlobals = globalThis as typeof globalThis & {
      Kit?: {
        context?: {
          getContext?: () => unknown
        }
      }
    }
    const context = pageGlobals.Kit?.context?.getContext?.() ?? null
    const getValue = (selector: string) =>
      document.querySelector<HTMLSelectElement>(selector)?.value ?? null
    return {
      svgHtml: svg?.outerHTML ?? '',
      runtimeContext: context,
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
    normalizedSvg: normalizeSvgForHash(payload.svgHtml),
    semanticContext: normalizeRuntimeContext(payload.runtimeContext),
    semanticHash: sha256(buildRuntimeContextFingerprint(payload.runtimeContext)),
    semanticSvg: buildRuntimeContextFingerprint(payload.runtimeContext),
    state: payload.state as CompareState
  }
}

function resolveCompareSources(
  requested: string[],
  catalogBySlug: Map<string, { title: string }>
) {
  const sourceSlugs = requested.length > 0 ? requested : allSongCatalog.map(song => song.slug)
  const sources: Array<{
    slug: string
    title: string
    payload: {
      song_uuid: string
      instrument?: string
      show_graph?: string
      instrumentFingerings?: Array<{ instrument?: string | null }>
    }
  }> = []

  for (const slug of sourceSlugs) {
    const filePath = resolveKuailepuRuntimeSongPath(slug)
    if (!filePath || !fs.existsSync(filePath)) {
      continue
    }

    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      song_uuid?: string
      song_name?: string
      title?: string
      instrument?: string
      show_graph?: string
      instrumentFingerings?: Array<{ instrument?: string | null }>
    }

    const songUuid = payload.song_uuid
    if (!isLiveComparableSongUuid(songUuid)) {
      continue
    }

    sources.push({
      slug,
      title: resolveCompareTitle(slug, payload, catalogBySlug),
      payload: {
        song_uuid: songUuid,
        instrument: payload.instrument,
        show_graph: payload.show_graph,
        instrumentFingerings: payload.instrumentFingerings
      }
    })
  }

  return sources
}

function resolveCompareTitle(
  slug: string,
  payload: {
    song_name?: string
    title?: string
  },
  catalogBySlug: Map<string, { title: string }>
) {
  const catalogTitle = catalogBySlug.get(slug)?.title
  if (catalogTitle) {
    return catalogTitle
  }

  const candidateSongDocTitle = readCandidateSongDocTitle(slug)
  if (candidateSongDocTitle) {
    return candidateSongDocTitle
  }

  return payload.song_name?.trim() || payload.title?.trim() || slug
}

function readCandidateSongDocTitle(slug: string) {
  const candidatePaths = [
    path.resolve(process.cwd(), 'reference', 'kuailepu-candidates', 'songdocs', `${slug}.json`),
    path.resolve(process.cwd(), 'reference', 'song-publish-candidates', 'songdocs', `${slug}.json`)
  ]

  for (const candidatePath of candidatePaths) {
    if (!fs.existsSync(candidatePath)) {
      continue
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as { title?: string }
      if (typeof parsed.title === 'string' && parsed.title.trim().length > 0) {
        return parsed.title.trim()
      }
    } catch {
      // Fall through to other title sources.
    }
  }

  return null
}

async function prepareLiveRuntimePage(page: Page, url: string) {
  await page.setViewportSize({ width: 1280, height: 1600 })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(randomBetween(700, 1400))
  await dismissKuailepuLoginOverlay(page)
  await page.waitForSelector('svg.sheet-svg', { timeout: 30000 })
}

async function captureLiveRuntimeFromPreparedPage(page: Page, state: CompareState) {
  await applyContextState(page, state)

  const svgHtml = await page
    .locator('svg.sheet-svg')
    .evaluate(node => {
      const svg = node as SVGSVGElement
      const pageGlobals = globalThis as typeof globalThis & {
        Kit?: {
          context?: {
            getContext?: () => unknown
          }
        }
      }

      return {
        svgHtml: svg.outerHTML,
        runtimeContext: pageGlobals.Kit?.context?.getContext?.() ?? null
      }
    })

  if (!svgHtml.svgHtml) {
    throw new Error('live runtime svg missing')
  }

  return {
    rawSvg: svgHtml.svgHtml,
    hash: sha256(svgHtml.svgHtml),
    normalizedHash: sha256(normalizeSvgForHash(svgHtml.svgHtml)),
    normalizedSvg: normalizeSvgForHash(svgHtml.svgHtml),
    semanticContext: normalizeRuntimeContext(svgHtml.runtimeContext),
    semanticHash: sha256(buildRuntimeContextFingerprint(svgHtml.runtimeContext)),
    semanticSvg: buildRuntimeContextFingerprint(svgHtml.runtimeContext)
  }
}

function groupCompareTargetsBySong(targets: CompareTarget[]) {
  const groups = new Map<
    string,
    {
      slug: string
      title: string
      songUuid: string
      targets: CompareTarget[]
    }
  >()

  targets.forEach(target => {
    const existing = groups.get(target.slug)
    if (existing) {
      existing.targets.push(target)
      return
    }

    groups.set(target.slug, {
      slug: target.slug,
      title: target.title,
      songUuid: target.songUuid,
      targets: [target]
    })
  })

  return Array.from(groups.values())
}

async function applyContextState(page: Page, state: CompareState) {
  await page
    .evaluate(
      state => {
        const pageGlobals = globalThis as typeof globalThis & {
          Kit?: {
            context?: {
              getContext?: () => unknown
            }
          }
          Song?: {
            draw?: () => void
          }
        }
        const ctx = pageGlobals.Kit?.context?.getContext?.()
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
        if (pageGlobals.Song && typeof pageGlobals.Song.draw === 'function') {
          pageGlobals.Song.draw()
        }
      },
      state
    )
    .catch(() => undefined)
  await sleep(randomBetween(900, 1700))
}

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function buildRuntimeContextFingerprint(input: unknown) {
  return JSON.stringify(normalizeRuntimeContext(input))
}

function diffNormalizedRuntimeContexts(left: unknown, right: unknown, path = '') {
  const diffs: Array<{
    path: string
    local: unknown
    live: unknown
  }> = []

  collectDiffs(left, right, path)
  return diffs

  function collectDiffs(currentLeft: unknown, currentRight: unknown, currentPath: string) {
    if (diffs.length >= 12) {
      return
    }

    if (Object.is(currentLeft, currentRight)) {
      return
    }

    if (Array.isArray(currentLeft) && Array.isArray(currentRight)) {
      const maxLength = Math.max(currentLeft.length, currentRight.length)
      for (let index = 0; index < maxLength; index += 1) {
        const nextPath = `${currentPath}[${index}]`
        if (index >= currentLeft.length) {
          diffs.push({ path: nextPath, local: undefined, live: currentRight[index] })
        } else if (index >= currentRight.length) {
          diffs.push({ path: nextPath, local: currentLeft[index], live: undefined })
        } else {
          collectDiffs(currentLeft[index], currentRight[index], nextPath)
        }

        if (diffs.length >= 12) {
          return
        }
      }
      return
    }

    if (isPlainObject(currentLeft) && isPlainObject(currentRight)) {
      const keys = new Set([...Object.keys(currentLeft), ...Object.keys(currentRight)])
      for (const key of keys) {
        const nextPath = currentPath ? `${currentPath}.${key}` : key
        if (!(key in currentLeft)) {
          diffs.push({ path: nextPath, local: undefined, live: currentRight[key] })
        } else if (!(key in currentRight)) {
          diffs.push({ path: nextPath, local: currentLeft[key], live: undefined })
        } else {
          collectDiffs(currentLeft[key], currentRight[key], nextPath)
        }

        if (diffs.length >= 12) {
          return
        }
      }
      return
    }

    diffs.push({ path: currentPath || '(root)', local: currentLeft, live: currentRight })
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRuntimeContext(input: unknown): unknown {
  if (input === null || input === undefined) {
    return null
  }

  if (Array.isArray(input)) {
    return input.map(item => normalizeRuntimeContext(item))
  }

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>
    const keys = [
      'song_uuid',
      'song_name',
      'alias_name',
      'song_pinyin',
      'song_code',
      'keynote',
      'rhythm',
      'lyric',
      'lyric_text',
      'instrument',
      'fingering',
      'fingering_index',
      'show_graph',
      'show_lyric',
      'show_measure_num',
      'measure_layout',
      'sheet_scale'
    ]

    const picked = keys.reduce<Record<string, unknown>>((acc, key) => {
      const value = record[key]
      if (value === undefined || typeof value === 'function') {
        return acc
      }

      if (key === 'fingering_index' || key === 'sheet_scale') {
        acc[key] = normalizeComparableNumericValue(value)
        return acc
      }

      acc[key] = normalizeRuntimeContext(value)
      return acc
    }, {})

    return picked
  }

  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null
  }

  if (typeof input === 'string') {
    return input.trim()
  }

  if (typeof input === 'boolean') {
    return input
  }

  return String(input)
}

function normalizeComparableNumericValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const numeric = Number(String(value).trim())
  return Number.isFinite(numeric) ? numeric : String(value).trim()
}

function normalizeSvgForHash(input: string) {
  const normalized = input
    .replace(/\s+height="[^"]*"/g, '')
    .replace(/\s+viewBox="[^"]*"/g, '')
    .replace(/\s+textLength="[^"]*"/g, '')
    .replace(/\s+lengthAdjust="[^"]*"/g, '')
    .replace(/\s+x="[^"]*"/g, '')
    .replace(/\s+x1="[^"]*"/g, '')
    .replace(/\s+x2="[^"]*"/g, '')
    .replace(/\s+y="[^"]*"/g, '')
    .replace(/\s+y1="[^"]*"/g, '')
    .replace(/\s+y2="[^"]*"/g, '')
    .replace(/\s+cx="[^"]*"/g, '')
    .replace(/(?<![A-Za-z_#])(-?\d+(?:\.\d+)?)/g, value => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) {
        return value
      }

      return String(Math.round(numeric / 20) * 20)
    })
    .replace(/\s+role="img"/g, '')
    .replace(/\s+focusable="false"/g, '')
    .replace(/\s+aria-labelledby="[^"]*"/g, '')
    .replace(/\s+aria-hidden="true"/g, '')
    .replace(/\s+data-vtabs-a11y="[^"]*"/g, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/gi, '')
    /**
     * compare gate 关注的是“谱面主体与指法图主体是否仍与快乐谱 live 页一致”，
     * 而不是顶部 header metadata 的逐字符一致。
     *
     * 已知某些页（如 Yesterday）在 live 与本地 runtime 之间会出现：
     * - 顶部 `作曲` 等标签是否单独成节点
     * - 乐器 / 指法标题行中英文本差异
     *
     * 这些差异位于谱面头部说明区，不影响 number 模式下的旋律、节拍骨架、
     * 指法图主体和主谱面结构。因此 compare 归一化时统一忽略顶部 metadata 区：
     * - 继续忽略顶部 text / use / circle / line 节点
     * - 额外忽略根 svg 的 height / viewBox，因为头部行高变化会把整张 svg 的
     *   总高度一起带偏，但这不等于谱面主体回归失败
     *
     * 2026-04-19 进一步确认：
     * - 某些歌（如 Take Me Home, Country Roads）live 与 local 的 play-order /
     *   乐器标题行会因为本地 header 英文化和行高差异，落在 `y≈223-263`
     * - 原先只忽略 `y < 230` 会导致 local 去掉了 header、live 保留了 header，
     *   形成假性 mismatch
     *
     * 这里把阈值放宽到 `y < 280`，仍然避开正文首行（当前抽查样本正文首行 >= 318）。
     */
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, '')
    .replace(
      /<use\b([^>]*?)\by="([0-9.]+)"([^>]*)\/?>/gi,
      (match, beforeY, y, afterY) =>
        Number(y) < 280 ? '' : `<use${beforeY}y="${y}"${afterY}/>`
    )
    .replace(
      /<circle\b([^>]*?)\bcy="([0-9.]+)"([^>]*)\/?>/gi,
      (match, beforeCy, cy, afterCy) =>
        Number(cy) < 280 ? '' : `<circle${beforeCy}cy="${cy}"${afterCy}/>`
    )
    .replace(
      /<line\b([^>]*?)\by1="([0-9.]+)"([^>]*?)\by2="([0-9.]+)"([^>]*)\/?>/gi,
      (match, beforeY1, y1, between, y2, afterY2) =>
        Number(y1) < 280 && Number(y2) < 280
          ? ''
          : `<line${beforeY1}y1="${y1}"${between}y2="${y2}"${afterY2}/>`
    )
    .replace(
      /<rect\b([^>]*?)\by="([0-9.]+)"([^>]*)\/?>/gi,
      (match, beforeY, y, afterY) =>
        Number(y) < 280 ? '' : `<rect${beforeY}y="${y}"${afterY}/>`
    )
    .replace(/>\s+</g, '><')
    .trim()

  return normalizeSvgVerticalOffset(normalized)
}

function normalizeSvgVerticalOffset(input: string) {
  const anchor = findFirstAbsoluteVerticalAnchor(input)
  if (anchor === null || !Number.isFinite(anchor)) {
    return input
  }

  return input
    .replace(/(\b(?:y|y1|y2|cy|dy)=")(-?\d+(?:\.\d+)?)(?=")/gi, (match, prefix, value) => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) {
        return match
      }

      return `${prefix}${formatNormalizedNumber(numeric - anchor)}`
    })
    .replace(/(\bpoints=")([^"]*)(")/gi, (match, prefix, value, suffix) => {
      const shifted = shiftPointsAttribute(value, anchor)
      return shifted === null ? match : `${prefix}${shifted}${suffix}`
    })
    .replace(/(\btransform="[^"]*translate\(\s*[-+]?\d*\.?\d+(?:e[-+]?\d+)?\s*,\s*)(-?\d+(?:\.\d+)?)(\s*[^"]*")/gi, (match, prefix, value, suffix) => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) {
        return match
      }

      return `${prefix}${formatNormalizedNumber(numeric - anchor)}${suffix}`
    })
    .replace(/(\bd=")([^"]+)(")/gi, (match, prefix, value, suffix) => {
      const shifted = shiftPathData(value, anchor)
      return shifted === null ? match : `${prefix}${shifted}${suffix}`
    })
}

function findFirstAbsoluteVerticalAnchor(input: string) {
  const tagRegex = /<(path|line|circle|rect|use|polyline|polygon)\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(input))) {
    const tag = match[0]

    const attrMatch = tag.match(/\b(?:y|y1|y2|cy|dy)="(-?\d+(?:\.\d+)?)"/i)
    if (attrMatch) {
      const numeric = Number(attrMatch[1])
      if (Number.isFinite(numeric)) {
        return numeric
      }
    }

    const pathMatch = tag.match(/\bd="([^"]+)"/i)
    if (pathMatch) {
      const anchor = findFirstPathAbsoluteVerticalAnchor(pathMatch[1])
      if (anchor !== null) {
        return anchor
      }
    }
  }

  return null
}

function findFirstPathAbsoluteVerticalAnchor(pathData: string) {
  const groups = parseSvgPathData(pathData)
  for (const group of groups) {
    if (group.command === 'm' || group.command === 'M') {
      if (group.values.length >= 2) {
        return group.values[1] ?? null
      }
      continue
    }

    const segmentSize = getSvgPathSegmentSize(group.command)
    if (segmentSize === 0 || group.values.length < segmentSize) {
      continue
    }

    if (group.command === 'h' || group.command === 'H') {
      continue
    }

    if (group.command === 'v' || group.command === 'V') {
      return group.values[0] ?? null
    }

    if (group.command === 'a' || group.command === 'A') {
      return group.values[6] ?? null
    }

    for (let index = 1; index < group.values.length; index += segmentSize) {
      const yIndex = getSvgPathVerticalValueIndex(group.command, index)
      if (yIndex !== null && group.values[yIndex] !== undefined) {
        return group.values[yIndex] ?? null
      }
    }
  }

  return null
}

function shiftPointsAttribute(points: string, offset: number) {
  const tokens = points.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length % 2 !== 0) {
    return null
  }

  const output: string[] = []
  for (let index = 0; index < tokens.length; index += 2) {
    const x = Number(tokens[index])
    const y = Number(tokens[index + 1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null
    }

    output.push(formatNormalizedNumber(x), formatNormalizedNumber(y - offset))
  }

  return output.join(' ')
}

type SvgPathGroup = {
  command: string
  values: number[]
}

function parseSvgPathData(pathData: string) {
  const groups: SvgPathGroup[] = []
  const tokenRegex = /([AaCcHhLlMmQqSsTtVvZz])|([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi
  let currentGroup: SvgPathGroup | null = null
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(pathData))) {
    if (match[1]) {
      currentGroup = { command: match[1], values: [] }
      groups.push(currentGroup)
      continue
    }

    if (!currentGroup) {
      continue
    }

    const numeric = Number(match[2])
    if (!Number.isFinite(numeric)) {
      continue
    }

    currentGroup.values.push(numeric)
  }

  return groups
}

function shiftPathData(pathData: string, offset: number) {
  const groups = parseSvgPathData(pathData)
  if (groups.length === 0) {
    return null
  }

  const output: string[] = []

  for (const group of groups) {
    const segmentSize = getSvgPathSegmentSize(group.command)
    if (segmentSize === 0) {
      output.push(group.command)
      continue
    }

    if (group.command === 'M' || group.command === 'm') {
      const firstPair = group.values.slice(0, 2)
      if (firstPair.length < 2) {
        return null
      }

      const firstY = group.command === 'M' ? firstPair[1]! - offset : firstPair[1]!

      output.push(
        `${group.command} ${formatNormalizedNumber(firstPair[0]!)} ${formatNormalizedNumber(
          firstY
        )}`
      )

      const trailingPairs = group.values.slice(2)
      const trailingCommand = group.command === 'M' ? 'L' : 'l'
      for (let index = 0; index < trailingPairs.length; index += 2) {
        const x = trailingPairs[index]
        const y = trailingPairs[index + 1]
        if (x === undefined || y === undefined) {
          return null
        }

        const shiftedY = trailingCommand === 'L' ? y - offset : y
        output.push(
          `${trailingCommand} ${formatNormalizedNumber(x)} ${formatNormalizedNumber(shiftedY)}`
        )
      }

      continue
    }

    for (let index = 0; index < group.values.length; index += segmentSize) {
      const segment = group.values.slice(index, index + segmentSize)
      if (segment.length < segmentSize) {
        return null
      }

      const shiftedSegment = segment.map((value, valueIndex) => {
        const shouldShiftVertical =
          isAbsoluteSvgPathCommand(group.command) &&
          getSvgPathVerticalValueIndex(group.command, valueIndex) !== null
        const shiftedValue = shouldShiftVertical ? value - offset : value
        return isSvgPathControlPointY(group.command, valueIndex)
          ? roundToGrid(shiftedValue, 40)
          : shiftedValue
      })

      output.push(`${group.command} ${shiftedSegment.map(formatNormalizedNumber).join(' ')}`)
    }
  }

  return output.join(' ')
}

function getSvgPathSegmentSize(command: string) {
  switch (command.toLowerCase()) {
    case 'z':
      return 0
    case 'h':
    case 'v':
      return 1
    case 'm':
    case 'l':
    case 't':
      return 2
    case 's':
    case 'q':
      return 4
    case 'c':
      return 6
    case 'a':
      return 7
    default:
      return 0
  }
}

function getSvgPathVerticalValueIndex(command: string, valueIndex: number) {
  switch (command.toLowerCase()) {
    case 'm':
    case 'l':
    case 't':
      return valueIndex % 2 === 1 ? valueIndex : null
    case 'q':
      return valueIndex === 1 || valueIndex === 3 ? valueIndex : null
    case 's':
      return valueIndex === 1 || valueIndex === 3 ? valueIndex : null
    case 'c':
      return valueIndex === 1 || valueIndex === 3 || valueIndex === 5 ? valueIndex : null
    case 'a':
      return valueIndex === 6 ? valueIndex : null
    case 'v':
      return valueIndex === 0 ? valueIndex : null
    default:
      return null
  }
}

function isAbsoluteSvgPathCommand(command: string) {
  return command === command.toUpperCase()
}

function formatNormalizedNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  const rounded = Math.abs(value) < 1e-9 ? 0 : value
  const text = Number(rounded.toFixed(3)).toString()
  return text === '-0' ? '0' : text
}

function roundToGrid(value: number, gridSize: number) {
  if (!Number.isFinite(value) || gridSize <= 0) {
    return value
  }

  return Math.round(value / gridSize) * gridSize
}

function isSvgPathControlPointY(command: string, valueIndex: number) {
  switch (command.toLowerCase()) {
    case 'c':
      return valueIndex === 1 || valueIndex === 3
    case 's':
    case 'q':
      return valueIndex === 1
    default:
      return false
  }
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
  target: {
    slug: string
    instrumentId: PublicSongInstrumentId
    runtimeDefaultInstrumentId: string | null
    runtimeDefaultShowGraph: string | null
    runtimeControlPayload: {
      instrumentFingerings?: Array<{ instrument?: string | null }>
    }
  }
) {
  const params = new URLSearchParams()
  params.set('note_label_mode', 'number')
  /**
   * compare gate 的目标是验证“本地兼容 runtime 能否复现快乐谱原版 number 模式主体谱面”，
   * 因此这里应优先走 `full-template`，避免公开页最小脚本集对 parity 判断造成额外噪音。
   *
   * 公开 `/song/<slug>` 继续默认使用 `public-song` profile；
   * 但 compare / preflight 的 fidelity gate 更接近“调试 / 对照 / 恢复入口”。
   */
  params.set('runtime_asset_profile', 'full-template')
  params.set('runtime_compare_mode', '1')
  const hasNonStandardRuntimeDefaultInstrument =
    Boolean(target.runtimeDefaultInstrumentId) &&
    target.runtimeDefaultInstrumentId !== 'none' &&
    target.runtimeDefaultInstrumentId !== 'o12'
  if (target.instrumentId !== 'o12' || hasNonStandardRuntimeDefaultInstrument) {
    params.set('instrument', target.instrumentId)
  }

  const publicGraphDefault =
    getPreferredPublicGraphValue(
      target.instrumentId,
      target.runtimeControlPayload.instrumentFingerings
    ) ?? null
  if (
    hasNonStandardRuntimeDefaultInstrument &&
    target.instrumentId === target.runtimeDefaultInstrumentId &&
    publicGraphDefault &&
    publicGraphDefault !== target.runtimeDefaultShowGraph
  ) {
    params.set('show_graph', publicGraphDefault)
  }

  return `${baseUrl}/api/kuailepu-runtime/${target.slug}?${params.toString()}`
}

function getPreferredPublicGraphValue(
  instrumentId: PublicSongInstrumentId,
  instrumentFingerings:
    | Array<{
        instrument?: string | null
        graphList?: Array<{
          name?: string
          value?: string
        }>
      }>
    | undefined
) {
  const graphList =
    instrumentFingerings?.find(option => option.instrument === instrumentId)?.graphList ?? []
  const available = graphList.filter(
    (item): item is { name?: string; value: string } =>
      typeof item.value === 'string' && item.value.trim().length > 0
  )
  if (available.length === 0) {
    return null
  }

  if (instrumentId !== 'r8b' && instrumentId !== 'r8g' && instrumentId !== 'w6') {
    return available[0]!.value.trim()
  }

  const upward = available.find(item => {
    const normalizedName = item.name?.replace(/\s+/g, '') ?? ''
    return normalizedName.includes('吹口在上') || /mouthpiece\s*up/i.test(item.name ?? '')
  })

  return upward?.value.trim() ?? available[0]!.value.trim()
}

function isLiveComparableSongUuid(songUuid: string | undefined): songUuid is string {
  return (
    typeof songUuid === 'string' &&
    songUuid.trim().length > 0 &&
    !songUuid.startsWith('synthetic-')
  )
}
