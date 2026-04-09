import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { getPinterestPinPreset, pinterestFirstWavePresets } from '../src/lib/songbook/pinterestPins.ts'

type ExportArgs = {
  slugs: string[]
  outputDir: string
  baseUrl: string
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targets =
    args.slugs.length > 0
      ? args.slugs.map(slug => {
          const preset = getPinterestPinPreset(slug)
          if (!preset) {
            throw new Error(`Unknown Pinterest preset slug: ${slug}`)
          }
          return preset
        })
      : [...pinterestFirstWavePresets]

  const browser = await chromium.launch({ headless: true })

  try {
    fs.mkdirSync(path.resolve(process.cwd(), args.outputDir), { recursive: true })

    for (const preset of targets) {
      const page = await browser.newPage({
        viewport: { width: 1000, height: 1500 },
        deviceScaleFactor: 1
      })

      try {
        const url = `${args.baseUrl.replace(/\/$/, '')}/dev/pinterest/song/${preset.slug}`
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
        const runtime = page.frameLocator(`iframe[title="${preset.title} Kuailepu runtime"]`)
        await runtime.locator('svg.sheet-svg').waitFor({ timeout: 30000 })
        await page.locator('[data-runtime-loading="true"]').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})

        const outputPath = path.resolve(process.cwd(), args.outputDir, `${preset.slug}.png`)
        await page.screenshot({
          path: outputPath,
          clip: { x: 0, y: 0, width: 1000, height: 1500 }
        })

        console.log(`Exported Pinterest pin to ${outputPath}`)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
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
    baseUrl: values.get('base-url') ?? 'http://127.0.0.1:3000'
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
