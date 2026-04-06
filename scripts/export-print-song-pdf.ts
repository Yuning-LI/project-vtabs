import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

type ExportArgs = {
  slug: string
  output: string
  baseUrl: string
  instrument?: string
  paper: 'portrait' | 'landscape'
  noteLabelMode?: string
  showGraph?: string
  showLyric?: string
  showMeasureNum?: string
  measureLayout?: string
  sheetScale?: string
}

async function main() {
  /**
   * 这里导出的 PDF 来自内部打印页，而内部打印页本身仍然复用
   * `/api/kuailepu-runtime/<slug>` 的原始 runtime 渲染链。
   *
   * 也就是说：
   * - 这不是截图拼接
   * - 也不是第二套本地 renderer
   * - 只是把当前 runtime-backed 谱面放进受控打印壳后交给 Chromium 输出 PDF
   */
  const args = parseArgs(process.argv.slice(2))
  const search = new URLSearchParams()
  search.set('paper', args.paper)
  if (args.instrument) {
    search.set('instrument', args.instrument)
  }
  if (args.noteLabelMode) {
    search.set('note_label_mode', args.noteLabelMode)
  }
  if (args.showGraph) {
    search.set('show_graph', args.showGraph)
  }
  if (args.showLyric) {
    search.set('show_lyric', args.showLyric)
  }
  if (args.showMeasureNum) {
    search.set('show_measure_num', args.showMeasureNum)
  }
  if (args.measureLayout) {
    search.set('measure_layout', args.measureLayout)
  }
  if (args.sheetScale) {
    search.set('sheet_scale', args.sheetScale)
  }

  const url = `${args.baseUrl.replace(/\/$/, '')}/dev/print/song/${args.slug}?${search.toString()}`
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: args.paper === 'landscape' ? { width: 1600, height: 1100 } : { width: 1280, height: 1600 }
    })
    await page.goto(url, { waitUntil: 'networkidle' })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('#sheet svg, #sheet .sheet-svg').first().waitFor({ timeout: 30000 })
    await page.locator('[data-runtime-loading="true"]').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
    await page.emulateMedia({ media: 'print' })

    const outputPath = path.resolve(process.cwd(), args.output)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: args.paper === 'landscape',
      printBackground: true,
      preferCSSPageSize: true
    })

    console.log(`Exported PDF to ${outputPath}`)
  } finally {
    await browser.close()
  }
}

function parseArgs(argv: string[]): ExportArgs {
  const values = new Map<string, string>()

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index]
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

  const slug = values.get('slug')
  if (!slug) {
    throw new Error('Missing required --slug <song-slug>')
  }

  return {
    slug,
    output: values.get('output') ?? `exports/print-pdf/${slug}.pdf`,
    baseUrl: values.get('base-url') ?? 'http://127.0.0.1:3000',
    instrument: values.get('instrument'),
    paper: values.get('paper') === 'landscape' ? 'landscape' : 'portrait',
    // CLI 继续用 kebab-case，页面 query 再转换为 runtime 需要的 snake_case。
    noteLabelMode: values.get('note-label-mode'),
    showGraph: values.get('show-graph'),
    showLyric: values.get('show-lyric'),
    showMeasureNum: values.get('show-measure-num'),
    measureLayout: values.get('measure-layout'),
    sheetScale: values.get('sheet-scale')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
