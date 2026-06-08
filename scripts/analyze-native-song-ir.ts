import fs from 'node:fs'
import path from 'node:path'
import { buildSongIrFromMusicXmlDraft } from '../src/lib/native-renderer/fromMusicXmlDraft.ts'
import { summarizeSongIr } from '../src/lib/native-renderer/songIr.ts'
import type { SongIngestDraft } from '../src/lib/songbook/songIngestDraft.ts'

type CliOptions = {
  slugs: string[]
  draftDir: string
  outJson: string
}

const DEFAULT_DRAFT_DIR = 'reference/song-publish-candidates/drafts'
const DEFAULT_OUT_JSON = 'tmp/native-song-ir-summary.json'
const DEFAULT_SEEDS = [
  'on-top-of-old-smoky',
  'the-coventry-carol',
  'good-christian-men-rejoice',
  'beautiful-isle-of-somewhere',
  'quartermasters-store',
  'camptown-races',
  'give-my-regards-to-broadway',
  'drink-to-me-only-with-thine-eyes',
  'careless-love',
  'over-there',
  'for-hes-a-jolly-good-fellow',
  'polly-wolly-doodle',
  'sometimes-i-feel-like-a-motherless-child',
  'waltzing-matilda',
  'the-bells-of-st-marys'
]

const options = parseArgs(process.argv.slice(2))
const summaries = options.slugs.map(slug => {
  const draftPath = path.resolve(process.cwd(), options.draftDir, `${slug}.json`)
  if (!fs.existsSync(draftPath)) {
    throw new Error(`Draft not found: ${path.relative(process.cwd(), draftPath)}`)
  }
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8')) as SongIngestDraft
  const summary = summarizeSongIr(buildSongIrFromMusicXmlDraft(draft))
  return {
    ...summary,
    draft: {
      measureCount: draft.stats.measures,
      noteCount: draft.stats.noteCount,
      restCount: draft.stats.restCount,
      chordCount: draft.stats.chordCount
    },
    deltas: {
      measureCount: summary.measureCount - draft.stats.measures,
      noteCount: summary.noteCount - draft.stats.noteCount,
      restCount: summary.restCount - draft.stats.restCount,
      chordCount: summary.chordCount - draft.stats.chordCount
    }
  }
})

const report = {
  generatedOn: new Date().toISOString(),
  draftDir: options.draftDir,
  count: summaries.length,
  unsupportedCount: summaries.filter(summary => summary.unsupported.length > 0).length,
  mismatchCount: summaries.filter(summary =>
    Object.values(summary.deltas).some(delta => delta !== 0)
  ).length,
  summaries
}

const outPath = path.resolve(process.cwd(), options.outJson)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))

function parseArgs(args: string[]): CliOptions {
  const slugs: string[] = []
  let draftDir = DEFAULT_DRAFT_DIR
  let outJson = DEFAULT_OUT_JSON

  args.forEach(arg => {
    if (arg.startsWith('--draft-dir=')) {
      draftDir = arg.slice('--draft-dir='.length)
      return
    }
    if (arg.startsWith('--out-json=')) {
      outJson = arg.slice('--out-json='.length)
      return
    }
    if (arg.startsWith('--slug=')) {
      slugs.push(arg.slice('--slug='.length))
    }
  })

  return {
    slugs: slugs.length > 0 ? slugs : DEFAULT_SEEDS,
    draftDir,
    outJson
  }
}
