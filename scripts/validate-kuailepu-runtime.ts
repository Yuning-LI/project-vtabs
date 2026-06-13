import { chromium } from 'playwright'
import { resolveKuailepuRuntimeSongPath } from '../src/lib/kuailepu/sourceFiles.ts'
import { songCatalog } from '../src/lib/songbook/catalog.ts'

type RuntimeValidationResult = {
  slug: string
  title: string
  pageUrl: string
  ok: boolean
  reason?: string
  containerCount?: number
  svgCount?: number
  overlayCount?: number
  hostHeight?: string | null
}

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000'

const candidates = songCatalog.filter(song => Boolean(resolveKuailepuRuntimeSongPath(song.slug)))

if (candidates.length < 1) {
  console.error('No published songs with matching deployable Kuailepu raw JSON were found.')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 430, height: 2200 } })
const results: RuntimeValidationResult[] = []

async function inspectRuntimePage(pageUrl: string) {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(5000)

  const container = page.locator('[data-public-runtime-container-host="active"]').first()
  const containerCount = await page.locator('[data-public-runtime-container-host="active"]').count()
  if (containerCount < 1) {
    return {
      containerCount,
      svgCount: 0,
      overlayCount: 0,
      hostHeight: null
    }
  }

  const svgCount = await container.locator('#sheet .sheet-svg, #sheet svg').count().catch(() => 0)
  const overlayCount = await container
    .locator('.lean-overlay,.overlay,#overlay,#materialbox-overlay,#sidenav-overlay')
    .count()
    .catch(() => 0)
  const hostHeight = await container
    .evaluate(el => getComputedStyle(el).height)
    .catch(() => null)

  return {
    containerCount,
    svgCount,
    overlayCount,
    hostHeight
  }
}

try {
  for (const song of candidates) {
    const pageUrl = `${baseUrl}/song/${song.slug}`

    try {
      let inspection = await inspectRuntimePage(pageUrl)

      // Next 开发态首开某个详情页时，偶发会遇到编译尚未完成、短时间内容器/svg 还没挂上的情况。
      // 这里对“缺容器”或“缺 svg”做一次重试，避免把冷启动抖动误报成真实失败。
      if (inspection.containerCount < 1 || inspection.svgCount < 1) {
        await page.waitForTimeout(2000)
        inspection = await inspectRuntimePage(pageUrl)
      }

      results.push({
        slug: song.slug,
        title: song.title,
        pageUrl,
        ok: inspection.svgCount > 0 && inspection.overlayCount === 0,
        reason:
          inspection.containerCount < 1
            ? 'no container runtime host found'
            : inspection.svgCount < 1
            ? 'sheet svg missing'
            : inspection.overlayCount > 0
              ? 'overlay still visible'
              : undefined,
        containerCount: inspection.containerCount,
        svgCount: inspection.svgCount,
        overlayCount: inspection.overlayCount,
        hostHeight: inspection.hostHeight
      })
    } catch (error) {
      results.push({
        slug: song.slug,
        title: song.title,
        pageUrl,
        ok: false,
        reason: error instanceof Error ? error.message : String(error)
      })
    }
  }
} finally {
  await browser.close()
}

const failed = results.filter(result => !result.ok)
console.log(JSON.stringify({ baseUrl, checked: results.length, failed: failed.length, results }, null, 2))

if (failed.length > 0) {
  process.exit(1)
}
