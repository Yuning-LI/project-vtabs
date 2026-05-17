import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium, type Browser, type Page } from 'playwright'
import type { ExtractedMusicXmlGraceNote, ExtractedMusicXmlScore } from './songIngestDraft.ts'

export type MusicXmlExtractorSession = {
  browser: Browser
  page: Page
}

export async function readMusicXmlText(inputPath: string) {
  const inputExt = inputPath.slice(inputPath.lastIndexOf('.')).toLowerCase()

  if (inputExt === '.mxl') {
    const extracted = readCompressedMusicXml(inputPath)
    if (!extracted) {
      throw new Error(`Unable to locate XML payload inside compressed MusicXML: ${inputPath}`)
    }

    return extracted
  }

  return fs.promises.readFile(inputPath, 'utf8')
}

export async function createMusicXmlExtractorSession(): Promise<MusicXmlExtractorSession> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  return { browser, page }
}

export async function closeMusicXmlExtractorSession(session: MusicXmlExtractorSession) {
  await session.browser.close()
}

export async function extractMusicXmlScore(
  xmlText: string,
  preferredPartId?: string,
  session?: MusicXmlExtractorSession
): Promise<ExtractedMusicXmlScore> {
  if (session) {
    return evaluateMusicXmlScore(session.page, xmlText, preferredPartId)
  }

  const ownedSession = await createMusicXmlExtractorSession()

  try {
    return await evaluateMusicXmlScore(ownedSession.page, xmlText, preferredPartId)
  } finally {
    await closeMusicXmlExtractorSession(ownedSession)
  }
}

function readCompressedMusicXml(inputPath: string) {
  const pythonScript = `
import sys
import zipfile
from xml.etree import ElementTree as ET

path = sys.argv[1]
with zipfile.ZipFile(path) as archive:
    candidates = []
    try:
        container = archive.read('META-INF/container.xml')
        root = ET.fromstring(container)
        namespace = {'c': 'urn:oasis:names:tc:opendocument:xmlns:container'}
        rootfile = root.find('.//c:rootfile', namespace) or root.find('.//rootfile')
        if rootfile is not None:
            full_path = rootfile.attrib.get('full-path')
            if full_path:
                candidates.append(full_path)
    except Exception:
        pass
    for name in archive.namelist():
        if name.lower().endswith('.xml') and name not in candidates:
            candidates.append(name)
    for candidate in candidates:
        try:
            data = archive.read(candidate)
        except KeyError:
            continue
        if b'<score-partwise' in data or b'<score-timewise' in data:
            sys.stdout.buffer.write(data)
            raise SystemExit(0)
    for candidate in candidates:
        try:
            data = archive.read(candidate)
        except KeyError:
            continue
        if candidate.lower().endswith('.xml'):
            sys.stdout.buffer.write(data)
            raise SystemExit(0)
    raise SystemExit(1)
`

  const result = spawnSync('python3', ['-c', pythonScript, inputPath], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  })

  if (result.status !== 0 || !result.stdout) {
    return null
  }

  return result.stdout
}

async function evaluateMusicXmlScore(
  page: Page,
  xmlText: string,
  preferredPartId?: string
): Promise<ExtractedMusicXmlScore> {
  return page.evaluate(
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

      const availableLyricNumbers = collectLyricNumbers(partNode)
      const preferredLyricNumber = detectPreferredLyricNumber(availableLyricNumbers)
      let strippedLyricPrefixCount = 0
      let strippedLyricPunctuationNoiseCount = 0
      let skippedNonPreferredLyricCount = 0
      let skippedMismatchedVersePrefixCount = 0
      let suppressedPreferredLyricContinuationCount = 0
      let suppressPreferredLyricContinuation = false

      let currentDivisions = 1
      let currentFifths = 0
      let currentBeats: number | null = null
      let currentBeatType: number | null = null
      let currentTempoBpm: number | null = null

      const measures = Array.from(partNode.children)
        .filter(node => node.tagName === 'measure')
        .map(measureNode => {
          let newSystem = false
          const events: Array<{
            voice: string
            offset: number
            duration: number
            midi: number | null
            isRest: boolean
            lyric: string | null
            tieStart: boolean
            tieStop: boolean
            sourceFeatures?: {
              hasGrace: boolean
              hasChordStack: boolean
              leadingGraceNotes?: ExtractedMusicXmlGraceNote[]
              lyric?: {
                number: string | null
                syllabic: 'single' | 'begin' | 'middle' | 'end' | null
                extends: boolean
                hadText: boolean
              }
              timeModification: {
                actualNotes: number | null
                normalNotes: number | null
              } | null
            }
          }> = []
          const harmonies: Array<{
            offset: number
            name: string
            root: string
            kind: string | null
            bass: string | null
          }> = []
          let cursor = 0
          const pendingGraceByVoice = new Map<string, ExtractedMusicXmlGraceNote[]>()

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

            if (child.tagName === 'direction') {
              const soundTempo = Number(child.getElementsByTagName('sound')[0]?.getAttribute('tempo') || '0')
              const metronomeTempo = Number(
                Array.from(child.getElementsByTagName('per-minute'))[0]?.textContent?.trim() || '0'
              )
              const nextTempo =
                Number.isFinite(soundTempo) && soundTempo > 0
                  ? soundTempo
                  : Number.isFinite(metronomeTempo) && metronomeTempo > 0
                    ? metronomeTempo
                    : null

              if (nextTempo) {
                currentTempoBpm = nextTempo
              }
              return
            }

            if (child.tagName === 'backup' || child.tagName === 'forward') {
              warnings.add('MusicXML backup/forward elements were applied for timing only; verify multi-voice rhythm manually.')
              const duration = Number(getText(child, 'duration') || '0')
              if (Number.isFinite(duration) && duration > 0) {
                cursor += child.tagName === 'forward' ? duration : -duration
                cursor = Math.max(0, cursor)
              }
              return
            }

            if (child.tagName === 'harmony') {
              const harmony = buildHarmonyFromNode(child, cursor)
              if (harmony) {
                harmonies.push(harmony)
              }
              return
            }

            if (child.tagName !== 'note') {
              return
            }

            const hasGrace = child.getElementsByTagName('grace').length > 0
            const hasChordStack = child.getElementsByTagName('chord').length > 0
            const timeModificationNode = Array.from(child.getElementsByTagName('time-modification'))[0]
            const timeModification = timeModificationNode
              ? {
                  actualNotes: Number(getText(timeModificationNode, 'actual-notes') || '0') || null,
                  normalNotes: Number(getText(timeModificationNode, 'normal-notes') || '0') || null
                }
              : null

            if (hasGrace) {
              const graceVoice = getText(child, 'voice') || '1'
              const graceNotes = pendingGraceByVoice.get(graceVoice) ?? []
              graceNotes.push({
                midi: buildMidiFromNote(child),
                slash: child.getElementsByTagName('grace')[0]?.getAttribute('slash') === 'yes',
                voice: graceVoice
              })
              pendingGraceByVoice.set(graceVoice, graceNotes)
              return
            }

            if (hasChordStack) {
              warnings.add('Chord-stacked notes were collapsed to the leading melody note only.')
              return
            }

            const duration = Number(getText(child, 'duration') || '0')
            const voice = getText(child, 'voice') || '1'
            const isRest = child.getElementsByTagName('rest').length > 0
            const tieNodes = Array.from(child.getElementsByTagName('tie'))
            const tieStart = tieNodes.some(node => node.getAttribute('type') === 'start')
            const tieStop = tieNodes.some(node => node.getAttribute('type') === 'stop')
            const lyricData = getPreferredLyricData(child)
            const lyric = lyricData.text

            const leadingGraceNotes = pendingGraceByVoice.get(voice) ?? []
            if (leadingGraceNotes.length > 0) {
              pendingGraceByVoice.delete(voice)
            }

            events.push({
              voice,
              offset: cursor,
              duration: Number.isFinite(duration) && duration > 0 ? duration : currentDivisions,
              midi: isRest ? null : buildMidiFromNote(child),
                isRest,
                lyric,
                tieStart,
                tieStop,
                sourceFeatures: {
                  hasGrace,
                  hasChordStack,
                  ...(leadingGraceNotes.length > 0 ? { leadingGraceNotes } : {}),
                  lyric: {
                    number: lyricData.number,
                    syllabic: lyricData.syllabic,
                    extends: lyricData.extends,
                    hadText: lyricData.hadText
                  },
                  timeModification
                }
              })

            cursor += Number.isFinite(duration) && duration > 0 ? duration : currentDivisions
          })

          pendingGraceByVoice.forEach((_notes, voice) => {
            warnings.add(`Grace notes for voice ${voice} could not be attached to a following main note in measure ${measureNode.getAttribute('number') || '?'}.`)
          })

          return {
            number: measureNode.getAttribute('number'),
            newSystem,
            divisions: currentDivisions,
            fifths: Number.isFinite(currentFifths) ? currentFifths : null,
            beats: Number.isFinite(currentBeats) ? currentBeats : null,
            beatType: Number.isFinite(currentBeatType) ? currentBeatType : null,
            tempoBpm: Number.isFinite(currentTempoBpm) ? currentTempoBpm : null,
            harmonies,
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

      if (availableLyricNumbers.length > 1 && preferredLyricNumber) {
        warnings.add(
          `Multiple lyric verses detected; lyric track ${preferredLyricNumber} was preferred for extraction.`
        )
      }

      if (skippedNonPreferredLyricCount > 0) {
        warnings.add(
          `${skippedNonPreferredLyricCount} note(s) had lyrics only on non-preferred verses and were blanked in the extracted lyric track.`
        )
      }

      if (skippedMismatchedVersePrefixCount > 0) {
        warnings.add(
          `${skippedMismatchedVersePrefixCount} lyric token(s) carried a different verse-number prefix inside the preferred lyric track and were blanked.`
        )
      }

      if (suppressedPreferredLyricContinuationCount > 0) {
        warnings.add(
          `${suppressedPreferredLyricContinuationCount} lyric token(s) immediately following a mismatched verse prefix were blanked as continuation residue.`
        )
      }

      if (strippedLyricPrefixCount > 0) {
        warnings.add(
          `${strippedLyricPrefixCount} lyric token(s) had leading verse-number prefixes stripped during extraction.`
        )
      }

      if (strippedLyricPunctuationNoiseCount > 0) {
        warnings.add(
          `${strippedLyricPunctuationNoiseCount} lyric token(s) had leading punctuation noise stripped during extraction.`
        )
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
        const nodeListOwner = root as Document | Element
        const first = Array.from(nodeListOwner.getElementsByTagName(tagName))[0]
        return first?.textContent?.replace(/\s+/g, ' ').trim() || null
      }

      function collectLyricNumbers(root: Element) {
        return [
          ...new Set(
            Array.from(root.getElementsByTagName('lyric'))
              .map(node => (node.getAttribute('number') || '').trim())
              .filter(Boolean)
          )
        ]
      }

      function detectPreferredLyricNumber(lyricNumbers: string[]) {
        if (lyricNumbers.length === 0) {
          return null
        }

        if (lyricNumbers.includes('1')) {
          return '1'
        }

        const numericNumbers = lyricNumbers.filter(value => /^\d+$/.test(value))
        if (numericNumbers.length > 0) {
          return numericNumbers
            .map(value => Number(value))
            .sort((left, right) => left - right)[0]
            ?.toString() ?? null
        }

        return [...new Set(lyricNumbers)].sort()[0] ?? null
      }

      function getPreferredLyricData(note: Element) {
        const lyricNodes = Array.from(note.getElementsByTagName('lyric'))
        if (lyricNodes.length === 0) {
          return {
            text: null,
            number: null,
            syllabic: null,
            extends: false,
            hadText: false
          }
        }

        const preferredNode =
          (preferredLyricNumber
            ? lyricNodes.find(node => (node.getAttribute('number') || '').trim() === preferredLyricNumber)
            : null) ??
          lyricNodes.find(node => !(node.getAttribute('number') || '').trim()) ??
          (preferredLyricNumber ? null : lyricNodes[0])

        if (!preferredNode) {
          skippedNonPreferredLyricCount += 1
          return {
            text: null,
            number: null,
            syllabic: null,
            extends: false,
            hadText: false
          }
        }

        const rawText = Array.from(preferredNode.getElementsByTagName('text'))
          .map(node => node.textContent?.replace(/\s+/g, ' ').trim() || '')
          .filter(Boolean)
          .join(' ')
          .trim()
        const syllabic =
          (Array.from(preferredNode.getElementsByTagName('syllabic'))[0]?.textContent?.trim().toLowerCase() as
            | 'single'
            | 'begin'
            | 'middle'
            | 'end'
            | undefined) ?? null
        const hasExtend = preferredNode.getElementsByTagName('extend').length > 0
        const lyricNumber = (preferredNode.getAttribute('number') || '').trim() || null

        if (!rawText) {
          return {
            text: null,
            number: lyricNumber,
            syllabic,
            extends: hasExtend,
            hadText: false
          }
        }

        const versePrefixMatch = rawText.match(/^\(?(\d+)\)?\s*[\.\):]?\s+/)
        const versePrefixNumber = versePrefixMatch?.[1] ?? null
        if (versePrefixNumber && preferredLyricNumber && versePrefixNumber === preferredLyricNumber) {
          suppressPreferredLyricContinuation = false
        }
        if (
          versePrefixNumber &&
          preferredLyricNumber &&
          versePrefixNumber !== preferredLyricNumber
        ) {
          suppressPreferredLyricContinuation = true
          skippedMismatchedVersePrefixCount += 1
          return {
            text: null,
            number: lyricNumber,
            syllabic,
            extends: hasExtend,
            hadText: true
          }
        }
        if (suppressPreferredLyricContinuation && !versePrefixNumber) {
          suppressedPreferredLyricContinuationCount += 1
          return {
            text: null,
            number: lyricNumber,
            syllabic,
            extends: hasExtend,
            hadText: true
          }
        }

        const prefixStrippedText = rawText
          .replace(/^\(?\d+\)?\s*[\.\):]\s*/g, '')
          .replace(/^\(?\d+\)?\s+/g, '')
        const cleanedText = prefixStrippedText
          .replace(/^[“”"`.,;:!?()[\]{}<>_-]+(?=[A-Za-z0-9\u3400-\u9fff])/g, '')
          .trim()

        if (cleanedText !== rawText) {
          if (prefixStrippedText !== rawText) {
            strippedLyricPrefixCount += 1
          }
          if (cleanedText !== prefixStrippedText) {
            strippedLyricPunctuationNoiseCount += 1
          }
        }

        const punctuationFree = cleanedText.replace(/["“”‘’'`.,;:!?()\[\]{}<>_\-]/g, '').trim()

        return {
          text:
            cleanedText && /[A-Za-z0-9\u3400-\u9fff]/.test(punctuationFree)
              ? cleanedText
              : null,
          number: lyricNumber,
          syllabic,
          extends: hasExtend,
          hadText: true
        }
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

      function buildHarmonyFromNode(node: Element, cursor: number) {
        const rootNode = Array.from(node.getElementsByTagName('root'))[0]
        if (!rootNode) return null

        const root = buildPitchName(
          getText(rootNode, 'root-step'),
          Number(getText(rootNode, 'root-alter') || '0')
        )
        if (!root) return null

        const kindNode = Array.from(node.getElementsByTagName('kind'))[0]
        const rawKind = kindNode?.textContent?.replace(/\s+/g, ' ').trim() || null
        const kindText = kindNode?.getAttribute('text')?.replace(/\s+/g, ' ').trim() || null
        const suffix = normalizeHarmonyKind(kindText, rawKind)
        const bassNode = Array.from(node.getElementsByTagName('bass'))[0]
        const bass = bassNode
          ? buildPitchName(
              getText(bassNode, 'bass-step'),
              Number(getText(bassNode, 'bass-alter') || '0')
            )
          : null
        const offset = Number(getText(node, 'offset') || '0')
        const absoluteOffset = cursor + (Number.isFinite(offset) ? offset : 0)
        const name = `${root}${suffix}${bass ? `/${bass}` : ''}`

        return {
          offset: Math.max(0, absoluteOffset),
          name,
          root,
          kind: rawKind,
          bass
        }
      }

      function buildPitchName(step: string | null, alter: number) {
        if (!step || !/^[A-G]$/.test(step)) return null

        if (alter === 1) return `${step}#`
        if (alter === -1) return `${step}b`
        if (alter === 2) return `${step}##`
        if (alter === -2) return `${step}bb`

        return step
      }

      function normalizeHarmonyKind(kindText: string | null, rawKind: string | null) {
        const source = (kindText || rawKind || '').trim()
        const normalized = source.toLowerCase()
        const mapped: Record<string, string> = {
          major: '',
          none: '',
          minor: 'm',
          augmented: 'aug',
          diminished: 'dim',
          dominant: '7',
          'major-seventh': 'maj7',
          'minor-seventh': 'm7',
          'diminished-seventh': 'dim7',
          'augmented-seventh': 'aug7',
          'half-diminished': 'm7b5',
          'major-minor': 'mMaj7',
          'major-sixth': '6',
          'minor-sixth': 'm6',
          'dominant-ninth': '9',
          'major-ninth': 'maj9',
          'minor-ninth': 'm9',
          'suspended-fourth': 'sus4',
          'suspended-second': 'sus2'
        }

        if (normalized in mapped) return mapped[normalized]
        if (/^[a-z0-9#b+\-()/]{1,12}$/i.test(source)) return source

        return ''
      }
    },
    { xmlText, preferredPartId: preferredPartId?.trim() || null }
  )
}
