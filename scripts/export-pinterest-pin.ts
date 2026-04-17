import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import type { Locator, Page } from 'playwright'
import {
  getPinterestPinBoardName,
  getPinterestPinDescription,
  getPinterestPinDestinationUrl,
  getPinterestPinPreset,
  getPinterestPinTitle,
  getPinterestPinTrackingUrl,
  pinterestFirstWavePresets
} from '../src/lib/songbook/pinterestPins.ts'

type ExportArgs = {
  slugs: string[]
  outputDir: string
  baseUrl: string
  manifestPath: string | null
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
    const resolvedOutputDir = path.resolve(process.cwd(), args.outputDir)
    fs.mkdirSync(resolvedOutputDir, { recursive: true })
    const manifestEntries: Array<Record<string, string>> = []

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

        const exportRoot = page.locator('[data-pinterest-export-root="true"]')
        await waitForStableExportHeight(page, exportRoot)

        const outputPath = path.resolve(resolvedOutputDir, `${preset.slug}.png`)
        await exportRoot.screenshot({
          path: outputPath
        })

        manifestEntries.push({
          slug: preset.slug,
          imagePath: outputPath,
          destinationUrl: getPinterestPinDestinationUrl(preset),
          trackingUrl: getPinterestPinTrackingUrl(preset),
          boardName: getPinterestPinBoardName(preset),
          pinTitle: getPinterestPinTitle(preset),
          pinDescription: getPinterestPinDescription(preset)
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
    manifestPath: values.get('manifest-path') ?? null
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
