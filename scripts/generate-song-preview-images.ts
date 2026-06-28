import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-extra'
import type { Page } from 'playwright'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
  O12_FINGERING_DICT,
  O12_MIDI_TO_NAME
} from '../src/lib/runtime-core/visual/o12FingeringData.ts'
import {
  PUBLIC_O12_FINGERING_VISUAL_SPEC,
  type PublicO12HoleId
} from '../src/lib/runtime-core/visual/o12PublicVisualSpec.ts'
import { songCatalog, songCatalogBySlug } from '../src/lib/songbook/catalog.ts'
import { parseNotation } from '../src/lib/songbook/jianpu.ts'
import { getSongPresentation } from '../src/lib/songbook/presentation.ts'
import {
  SONG_PREVIEW_IMAGE_HEIGHT,
  SONG_PREVIEW_IMAGE_WIDTH
} from '../src/lib/songbook/songPreviewImages.ts'

chromium.use(stealthPlugin())

type GenerateArgs = {
  slugs: string[]
  force: boolean
}

type PreviewModel = {
  slug: string
  title: string
  notes: PreviewNote[]
}

type PreviewNote = {
  midi: number
  label: string
}

const outputRoot = path.resolve(process.cwd(), 'public/static/song-previews')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const songs =
    args.slugs.length > 0
      ? args.slugs.map(slug => {
          const song = songCatalogBySlug[slug]
          if (!song) {
            throw new Error(`Unknown public song slug: ${slug}`)
          }
          return song
        })
      : songCatalog

  fs.mkdirSync(outputRoot, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: SONG_PREVIEW_IMAGE_WIDTH, height: SONG_PREVIEW_IMAGE_HEIGHT },
    deviceScaleFactor: 1
  })

  try {
    for (const song of songs) {
      const outputPath = path.join(outputRoot, `${song.slug}.jpg`)

      if (!args.force && fs.existsSync(outputPath)) {
        continue
      }

      const model = buildPreviewModel(song.slug)
      await renderPreview(page, model, {
        width: SONG_PREVIEW_IMAGE_WIDTH,
        height: SONG_PREVIEW_IMAGE_HEIGHT,
        outputPath
      })

      console.log(`Generated preview image for ${song.slug}`)
    }
  } finally {
    await page.close()
    await browser.close()
  }
}

function parseArgs(argv: string[]): GenerateArgs {
  const slugs: string[] = []
  let force = false

  for (const arg of argv) {
    if (arg === '--force') {
      force = true
    } else if (arg.startsWith('--slug=')) {
      slugs.push(arg.slice('--slug='.length))
    } else if (arg.length > 0) {
      slugs.push(arg)
    }
  }

  return { slugs, force }
}

function buildPreviewModel(slug: string): PreviewModel {
  const song = songCatalogBySlug[slug]
  if (!song) {
    throw new Error(`Unknown public song slug: ${slug}`)
  }

  const presentation = getSongPresentation(song)
  return {
    slug,
    title: presentation.title,
    notes: extractPreviewNotes(song.notation, song.tonicMidi)
  }
}

function extractPreviewNotes(notation: string[], tonicMidi: number) {
  const notes: PreviewNote[] = []
  const seen = new Set<number>()

  for (const token of parseNotation(notation, tonicMidi).flat()) {
    if (token.kind !== 'note' || seen.has(token.midi) || !O12_FINGERING_DICT[token.midi]) {
      continue
    }
    const noteName = O12_MIDI_TO_NAME[token.midi]
    if (!noteName) {
      continue
    }

    seen.add(token.midi)
    notes.push({
      midi: token.midi,
      label: noteName.letter
    })

    if (notes.length >= 4) {
      return notes
    }
  }

  const fallbackMidis = [60, 62, 64, 67, 69]
  for (const midi of fallbackMidis) {
    if (notes.length >= 4) {
      break
    }
    if (seen.has(midi)) {
      continue
    }
    const noteName = O12_MIDI_TO_NAME[midi]
    if (!noteName) {
      continue
    }
    notes.push({
      midi,
      label: noteName.letter
    })
  }

  return notes
}

async function renderPreview(
  page: Page,
  model: PreviewModel,
  options: {
    width: number
    height: number
    outputPath: string
  }
) {
  await page.setViewportSize({ width: options.width, height: options.height })
  await page.setContent(renderPreviewHtml(model, options), {
    waitUntil: 'domcontentloaded'
  })
  await page.screenshot({
    path: options.outputPath,
    type: 'jpeg',
    quality: options.width >= SONG_PREVIEW_IMAGE_WIDTH ? 84 : 82,
    fullPage: false
  })
}

function renderPreviewHtml(
  model: PreviewModel,
  options: {
    width: number
    height: number
  }
) {
  const compact = options.width < 700
  const noteCards = model.notes.slice(0, 4)
  const titleSize = compact ? fitTitleSize(model.title, 27, 17) : fitTitleSize(model.title, 58, 34)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${options.width}px;
    height: ${options.height}px;
    overflow: hidden;
    background: #fff7ec;
    color: #231c18;
    font-family: Arial, sans-serif;
  }
  .frame {
    width: 100%;
    height: 100%;
    padding: ${compact ? 16 : 38}px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 54%),
      linear-gradient(135deg, #fff8ef 0%, #f0dcc0 100%);
    display: grid;
    grid-template-columns: ${compact ? '138px 1fr' : '315px 1fr'};
    gap: ${compact ? 12 : 30}px;
    align-items: stretch;
  }
  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  h1 {
    margin: 0;
    font-size: ${titleSize}px;
    line-height: 1;
    letter-spacing: 0;
    font-family: Georgia, "Times New Roman", serif;
    text-wrap: balance;
  }
  .chart {
    min-width: 0;
    height: 100%;
    border-radius: ${compact ? 14 : 28}px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,252,247,0.95)),
      repeating-linear-gradient(180deg, transparent 0, transparent ${compact ? 30 : 56}px, rgba(77,60,44,0.11) ${compact ? 31 : 57}px, transparent ${compact ? 32 : 58}px);
    border: 1px solid rgba(118,89,56,0.2);
    box-shadow: 0 ${compact ? 9 : 24}px ${compact ? 18 : 44}px rgba(67, 45, 25, 0.16);
    padding: ${compact ? 10 : 24}px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .note-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${compact ? 7 : 18}px;
  }
  .note-card {
    min-width: 0;
    min-height: ${compact ? 74 : 230}px;
    border-radius: ${compact ? 10 : 22}px;
    background: #fffaf4;
    border: 1px solid rgba(118,89,56,0.17);
    padding: ${compact ? 8 : 20}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fingering-svg {
    width: 100%;
    max-width: ${compact ? 88 : 250}px;
    height: auto;
    display: block;
    overflow: visible;
  }
</style>
</head>
<body>
  <main class="frame">
    <section class="copy">
      <h1>${escapeHtml(model.title)}</h1>
    </section>
    <aside class="chart" aria-label="Letter notes and 12-hole ocarina finger chart preview">
      <div class="note-grid">
        ${noteCards
          .map((note, index) => renderNoteCard(note, index))
          .join('')}
      </div>
    </aside>
  </main>
</body>
</html>`
}

function renderNoteCard(note: PreviewNote, index: number) {
  return `<div class="note-card">
    ${renderO12FingeringSvg(note, index)}
  </div>`
}

function renderO12FingeringSvg(note: PreviewNote, index: number) {
  const state = O12_FINGERING_DICT[note.midi]
  if (!state) {
    return ''
  }

  const visualSpec = PUBLIC_O12_FINGERING_VISUAL_SPEC
  const gradientId = `o12-preview-gradient-${note.midi}-${index}`
  const stops = visualSpec.gradient.stops
    .map(stop => `<stop offset="${stop.offset}" stop-color="${stop.color}" />`)
    .join('')
  const holes = visualSpec.holeOrder
    .map((id, holeIndex) => {
      const hole = visualSpec.holes[id as PublicO12HoleId]
      const closed = state[holeIndex] === 1
      const style = closed ? visualSpec.closedHole : visualSpec.openHole

      return `<circle cx="${hole.cx}" cy="${hole.cy}" r="${hole.r}" fill="${closed ? '#000000' : '#ffffff'}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" />`
    })
    .join('')

  return `<svg class="fingering-svg" viewBox="${visualSpec.viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${gradientId}" cx="${visualSpec.gradient.cx}" cy="${visualSpec.gradient.cy}" r="${visualSpec.gradient.r}" fx="${visualSpec.gradient.fx}" fy="${visualSpec.gradient.fy}">
        ${stops}
      </radialGradient>
    </defs>
    <g transform="${visualSpec.visualTransform}">
      <path d="${visualSpec.bodyPath}" fill="url(#${gradientId})" stroke="${visualSpec.bodyStroke}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" />
      ${holes}
    </g>
  </svg>`
}

function fitTitleSize(title: string, max: number, min: number) {
  if (title.length <= 18) {
    return max
  }
  if (title.length <= 32) {
    return Math.max(min, max - 8)
  }
  if (title.length <= 48) {
    return Math.max(min, max - 16)
  }
  return min
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
