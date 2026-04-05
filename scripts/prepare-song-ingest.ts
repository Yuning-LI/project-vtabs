import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import {
  buildSongIngestDraftFromMusicXmlExtract,
  type BuildSongIngestDraftOptions,
  type ExtractedMusicXmlScore,
  type SongIngestLyricPolicy
} from '../src/lib/songbook/songIngestDraft.ts'
import type { PublicSongFamily } from '../src/lib/songbook/types.ts'

type CliOptions = BuildSongIngestDraftOptions & {
  input: string
  out?: string
}

const usage =
  'Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/prepare-song-ingest.ts <input.musicxml> [--title="My Song"] [--slug=my-song] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--out=reference/song-ingest-drafts/my-song.json]'

const options = parseArgs(process.argv.slice(2))

if (!options) {
  console.error(usage)
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), options.input)
const inputExt = path.extname(inputPath).toLowerCase()

if (!['.musicxml', '.xml'].includes(inputExt)) {
  console.error(`Unsupported input type: ${inputExt || '(no extension)'}`)
  console.error('Current internal tool supports uncompressed MusicXML only.')
  process.exit(1)
}

const stats = await fs.promises.stat(inputPath).catch(() => null)
if (!stats?.isFile()) {
  console.error(`Input file not found: ${options.input}`)
  process.exit(1)
}

const xmlText = await fs.promises.readFile(inputPath, 'utf8')
const extract = await extractMusicXmlScore(xmlText, options.partId)
const draft = buildSongIngestDraftFromMusicXmlExtract(extract, options)
const outputJson = JSON.stringify(draft, null, 2) + '\n'

if (options.out) {
  const outPath = path.resolve(process.cwd(), options.out)
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await fs.promises.writeFile(outPath, outputJson, 'utf8')
  console.log(`Wrote song ingest draft to ${path.relative(process.cwd(), outPath)}`)
}

console.log(outputJson)

function parseArgs(args: string[]): CliOptions | null {
  if (args.length === 0) return null

  const positional: string[] = []
  const options: Partial<CliOptions> = {}

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length)
      return
    }
    if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length)
      return
    }
    if (arg.startsWith('--family=')) {
      options.family = parseFamily(arg.slice('--family='.length))
      return
    }
    if (arg.startsWith('--part=')) {
      options.partId = arg.slice('--part='.length)
      return
    }
    if (arg.startsWith('--voice=')) {
      options.voice = arg.slice('--voice='.length)
      return
    }
    if (arg.startsWith('--keynote=')) {
      options.keynote = arg.slice('--keynote='.length)
      return
    }
    if (arg.startsWith('--lyric-policy=')) {
      options.lyricPolicy = parseLyricPolicy(arg.slice('--lyric-policy='.length))
      return
    }
    if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length)
      return
    }

    positional.push(arg)
  })

  const input = positional[0]
  if (!input) return null

  return {
    input,
    ...options
  }
}

function parseFamily(value: string): PublicSongFamily {
  const normalized = value.trim() as PublicSongFamily
  if (
    normalized !== 'nursery' &&
    normalized !== 'folk' &&
    normalized !== 'classical' &&
    normalized !== 'holiday' &&
    normalized !== 'hymn' &&
    normalized !== 'march' &&
    normalized !== 'dance' &&
    normalized !== 'song'
  ) {
    throw new Error(`Unsupported family: ${value}`)
  }

  return normalized
}

function parseLyricPolicy(value: string): SongIngestLyricPolicy {
  const normalized = value.trim() as SongIngestLyricPolicy
  if (
    normalized !== 'show-publicly' &&
    normalized !== 'hide-by-default' &&
    normalized !== 'do-not-expose-toggle' &&
    normalized !== 'no-lyrics'
  ) {
    throw new Error(`Unsupported lyric policy: ${value}`)
  }

  return normalized
}

async function extractMusicXmlScore(
  xmlText: string,
  preferredPartId?: string
): Promise<ExtractedMusicXmlScore> {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    return await page.evaluate(
      ({ xmlText, preferredPartId }) => {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
        const parserError = doc.querySelector('parsererror')
        if (parserError) {
          throw new Error(parserError.textContent || 'Failed to parse MusicXML')
        }

        const warnings = new Set<string>()
        const scorePartNodes = Array.from(doc.getElementsByTagName('score-part'))
        const parts = scorePartNodes.map(node => ({
          id: node.getAttribute('id') || '',
          name: getText(node, 'part-name')
        }))
        const selectedPartId =
          preferredPartId && parts.some(part => part.id === preferredPartId)
            ? preferredPartId
            : parts[0]?.id || ''

        if (preferredPartId && preferredPartId !== selectedPartId) {
          warnings.add(`Requested part ${preferredPartId} was not found; fell back to ${selectedPartId}.`)
        }

        const partNode = Array.from(doc.getElementsByTagName('part')).find(
          node => node.getAttribute('id') === selectedPartId
        )

        if (!partNode) {
          throw new Error('Unable to locate a playable part in MusicXML input')
        }

        let currentDivisions = 1
        let currentFifths = 0
        let currentBeats: number | null = null
        let currentBeatType: number | null = null

        const measures = Array.from(partNode.children)
          .filter(node => node.tagName === 'measure')
          .map(measureNode => {
            let newSystem = false
            const events: Array<{
              voice: string
              duration: number
              midi: number | null
              isRest: boolean
              lyric: string | null
              tieStart: boolean
              tieStop: boolean
            }> = []

            Array.from(measureNode.children).forEach(child => {
              if (child.tagName === 'print' && child.getAttribute('new-system') === 'yes') {
                newSystem = true
                return
              }

              if (child.tagName === 'attributes') {
                const divisions = Number(getText(child, 'divisions') || currentDivisions)
                const fifthsText = getText(child, 'fifths')
                const beatsText = getText(child, 'beats')
                const beatTypeText = getText(child, 'beat-type')

                currentDivisions = Number.isFinite(divisions) && divisions > 0 ? divisions : currentDivisions
                currentFifths = fifthsText !== null ? Number(fifthsText) : currentFifths
                currentBeats = beatsText !== null ? Number(beatsText) : currentBeats
                currentBeatType = beatTypeText !== null ? Number(beatTypeText) : currentBeatType
                return
              }

              if (child.tagName === 'backup' || child.tagName === 'forward') {
                warnings.add('MusicXML backup/forward elements were ignored; verify multi-voice rhythm manually.')
                return
              }

              if (child.tagName !== 'note') {
                return
              }

              if (child.getElementsByTagName('grace').length > 0) {
                warnings.add('Grace notes were skipped in the ingest draft.')
                return
              }

              if (child.getElementsByTagName('chord').length > 0) {
                warnings.add('Chord-stacked notes were collapsed to the leading melody note only.')
                return
              }

              if (child.getElementsByTagName('time-modification').length > 0) {
                warnings.add('Tuplet time modifications were flattened to raw MusicXML durations.')
              }

              const duration = Number(getText(child, 'duration') || '0')
              const voice = getText(child, 'voice') || '1'
              const isRest = child.getElementsByTagName('rest').length > 0
              const tieNodes = Array.from(child.getElementsByTagName('tie'))
              const tieStart = tieNodes.some(node => node.getAttribute('type') === 'start')
              const tieStop = tieNodes.some(node => node.getAttribute('type') === 'stop')
              const lyric = getFirstLyricText(child)

              events.push({
                voice,
                duration: Number.isFinite(duration) && duration > 0 ? duration : currentDivisions,
                midi: isRest ? null : buildMidiFromNote(child),
                isRest,
                lyric,
                tieStart,
                tieStop
              })
            })

            return {
              number: measureNode.getAttribute('number'),
              newSystem,
              divisions: currentDivisions,
              fifths: Number.isFinite(currentFifths) ? currentFifths : null,
              beats: Number.isFinite(currentBeats) ? currentBeats : null,
              beatType: Number.isFinite(currentBeatType) ? currentBeatType : null,
              events
            }
          })

        const allVoices = new Set(measures.flatMap(measure => measure.events.map(event => event.voice)))
        if (allVoices.size > 1) {
          warnings.add(`Multiple voices detected (${Array.from(allVoices).join(', ')}); the draft will keep only one voice.`)
        }

        if (parts.length > 1) {
          warnings.add(`Multiple parts detected (${parts.map(part => part.id).join(', ')}); the draft uses ${selectedPartId}.`)
        }

        return {
          sourceKind: 'musicxml',
          title:
            getText(doc, 'movement-title') ||
            getText(doc, 'work-title') ||
            getText(doc, 'credit-words'),
          composer:
            Array.from(doc.getElementsByTagName('creator')).find(
              node => (node.getAttribute('type') || '').toLowerCase() === 'composer'
            )?.textContent?.trim() || null,
          parts,
          selectedPartId,
          measures,
          warnings: Array.from(warnings)
        }

        function getText(root: ParentNode, tagName: string) {
          return (
            Array.from(root.getElementsByTagName(tagName))[0]?.textContent?.replace(/\s+/g, ' ').trim() ||
            null
          )
        }

        function getFirstLyricText(note: Element) {
          const lyricNode = Array.from(note.getElementsByTagName('lyric'))[0]
          if (!lyricNode) return null
          const textNode = Array.from(lyricNode.getElementsByTagName('text'))[0]
          return textNode?.textContent?.replace(/\s+/g, ' ').trim() || null
        }

        function buildMidiFromNote(note: Element) {
          const pitchNode = Array.from(note.getElementsByTagName('pitch'))[0]
          if (!pitchNode) return null

          const step = getText(pitchNode, 'step')
          const octave = Number(getText(pitchNode, 'octave') || '4')
          const alter = Number(getText(pitchNode, 'alter') || '0')
          const offsets: Record<string, number> = {
            C: 0,
            D: 2,
            E: 4,
            F: 5,
            G: 7,
            A: 9,
            B: 11
          }

          if (!step || !(step in offsets)) {
            return null
          }

          return (octave + 1) * 12 + offsets[step] + alter
        }
      },
      { xmlText, preferredPartId: preferredPartId?.trim() || null }
    )
  } finally {
    await browser.close()
  }
}
