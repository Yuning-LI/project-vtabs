import { chromium } from 'playwright'

const input = process.argv[2]

if (!input) {
  console.error('Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/debug-kuailepu-context.ts <detail-url>')
  process.exit(1)
}

const sourceUrl = /^https?:\/\//i.test(input)
  ? input
  : `https://www.kuaiyuepu.com/jianpu/${input.replace(/\.html$/i, '')}.html`

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage()
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  const snapshot = await page.evaluate(() => {
    const context = globalThis.Kit?.context?.getContext?.()
    return {
      hasKit: Boolean(globalThis.Kit),
      hasContextApi: Boolean(globalThis.Kit?.context),
      contextType: typeof context,
      isNull: context === null,
      isArray: Array.isArray(context),
      keys:
        context && typeof context === 'object'
          ? Object.keys(context).slice(0, 40)
          : [],
      song_name:
        context && typeof context === 'object' && 'song_name' in context
          ? (context as Record<string, unknown>).song_name
          : null,
      song_uuid:
        context && typeof context === 'object' && 'song_uuid' in context
          ? (context as Record<string, unknown>).song_uuid
          : null,
      notationLength:
        context && typeof context === 'object' && 'notation' in context
          ? String((context as Record<string, unknown>).notation ?? '').length
          : 0,
      bodyTitle: document.querySelector('#song_name')?.getAttribute('value') ?? null
    }
  })

  console.log(JSON.stringify(snapshot, null, 2))
} finally {
  await browser.close()
}
