import { parseNotation } from './jianpu.ts'
import {
  buildRuntimeHappy123NotationFromCompactBody,
  midiToHappy123PitchToken,
  stripHappy123TempoDirective
} from './happy123Notation.ts'
import { chooseBestRangeShift } from './rangeFit.ts'
import { parseKeynoteToMidi } from './songIngestDraft.ts'
import type { ParsedToken, SongDoc } from './types.ts'
import type { SongIngestDraft } from './songIngestDraft.ts'
import type { KuailepuRuntimePayload } from '../kuailepu/runtime.ts'
import type { PublicSongInstrumentId } from './publicInstruments.ts'
import {
  mergeSongIngestRuntimeMetadata,
  SONG_INGEST_RUNTIME_FINGERING_RULES_VERSION,
  type SongIngestRuntimeTempoResolution
} from './songIngestRuntimeMetadata.ts'

export type RuntimeInstrumentProfile = {
  id: string
  label: string
  range: [number, number]
  preferredOctaveShiftsFirst: boolean
}

export const PUBLIC_RUNTIME_INSTRUMENT_PROFILES: RuntimeInstrumentProfile[] = [
  {
    id: 'o12',
    label: '12-Hole Ocarina',
    range: [57, 77],
    preferredOctaveShiftsFirst: true
  },
  {
    id: 'o6',
    label: '6-Hole Ocarina',
    range: [60, 76],
    preferredOctaveShiftsFirst: true
  },
  {
    id: 'r8b',
    label: 'Recorder (Baroque fingering)',
    range: [60, 84],
    preferredOctaveShiftsFirst: true
  },
  {
    id: 'r8g',
    label: 'Recorder (German fingering)',
    range: [60, 84],
    preferredOctaveShiftsFirst: true
  },
  {
    id: 'w6',
    label: 'Tin Whistle',
    range: [62, 86],
    preferredOctaveShiftsFirst: true
  }
]

type GeneratedInstrumentFingeringItem = {
  instrument: string
  fingering: string
  fingeringName: string
  tonalityName: string
  match: number
}

type GeneratedInstrumentPreset = {
  instrument: string
  instrumentName: string
  graphList: Array<{
    name: string
    value: string
  }>
  allowedKeyTokens: string[]
  fingerings: GeneratedInstrumentFingeringItem[]
}

type OcarinaReferenceEntry = {
  acKeynote: string
  fingeringName: string
  referencePriority: number
}

const KUAILEPU_OCARINA_REFERENCE_REGISTER_TIE_THRESHOLD = 6

const KUAILEPU_OCARINA_AC_REFERENCE: Record<'o6' | 'o12', Record<string, OcarinaReferenceEntry>> = {
  o6: buildOcarinaReferenceTable(['F4', 'G4', 'bB4', 'C5', 'D5', 'F5', 'G5']),
  o12: buildOcarinaReferenceTable(['F4', 'G4', 'bB4', 'C5', 'D5', 'F5', 'G5', 'bB5', 'C6'])
}

const KUAILEPU_OCARINA_TONALITY_REFERENCE: Record<
  'o6' | 'o12',
  Record<string, Record<string, string>>
> = {
  o6: {
    C5: { '': 'AC', C: 'AC', D: 'AC' },
    F5: { '': 'AG', C: 'AG', D: 'AG', F: 'AC', bB: 'AF' },
    G5: { '': 'AF', C: 'AF', D: 'AG', G: 'AC' },
    bA5: { bA: 'AC', bE: 'AG' },
    bB: { bB: 'AC' },
    bB4: { bB: 'AC' },
    bB5: { F: 'AG', bE: 'AF' },
    bE5: { bB: 'AG', bE: 'AC' },
    bG5: { B: 'AF' },
    C: { C: 'AC' },
    D5: { D: 'AC' },
    F: { bB: 'AF' },
    G: { G: 'AC' },
  },
  o12: {
    A4: { D: 'SF' },
    A5: { A: 'BC', D: 'AF' },
    B4: { E: 'SF' },
    bA5: { bA: 'AC', bE: 'AG' },
    bB: { bB: 'AC' },
    bB4: { F: 'SG', bB: 'AC', bB3: 'BC' },
    bB5: { A: 'BC', F: 'AG', bB: 'BC' },
    bD5: { bA: 'SG' },
    bE4: { bB: 'SG', bE: 'SC' },
    bE5: { bA: 'SF', bB: 'AG', bE: 'AC' },
    bG5: { B: 'AF' },
    C: { C: 'AC' },
    C5: { '': 'AC', C: 'AC', D: 'AC', F: 'SF', G: 'SG' },
    C6: { '': 'BC', C: 'BC', F: 'AF', G: 'AG' },
    D4: { D: 'SC' },
    D5: { A: 'AG', D: 'AC', G: 'SF' },
    E4: { E: 'SC' },
    E5: { A: 'AF', B: 'AG', E: 'AC' },
    F: { C: 'AG', bB: 'AF' },
    F4: { '': 'SG', C: 'SG', F: 'SC', bB: 'SF' },
    F5: { '': 'AG', C: 'AG', D: 'AG', F: 'AC', bB: 'AF', C6: 'SG' },
    G: { G: 'AC' },
    G4: { '': 'SF', C: 'SF', D: 'SG' },
    G5: { '': 'AF', C: 'AF', D: 'AG', G: 'AC', C6: 'SF' }
  }
}

const GENERATED_PUBLIC_INSTRUMENT_PRESETS: GeneratedInstrumentPreset[] = [
  {
    instrument: 'o6',
    instrumentName: '六孔陶笛',
    graphList: [{ name: '吹口在下（推荐）', value: '1d' }],
    allowedKeyTokens: ['C', 'D', 'F', 'G', 'bB'],
    fingerings: buildGeneratedOcarinaFingerings('o6')
  },
  {
    instrument: 'o12',
    instrumentName: '十二孔陶笛',
    graphList: [{ name: '吹口在下（推荐）', value: '1d' }],
    allowedKeyTokens: ['C', 'D', 'F', 'G', 'bB'],
    fingerings: buildGeneratedOcarinaFingerings('o12')
  },
  {
    instrument: 'r8b',
    instrumentName: '英式八孔竖笛',
    graphList: [
      { name: '吹口在下（推荐）', value: '1d' },
      { name: '吹口在上', value: '1u' }
    ],
    allowedKeyTokens: ['C', 'D', 'F', 'G', 'bB'],
    fingerings: [
      { instrument: 'r8b', fingering: 'F4', fingeringName: 'F调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'G4', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'bB4', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'C5', fingeringName: 'C调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'D5', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'F5', fingeringName: 'F调指法', tonalityName: 'Soprano', match: 2 },
      { instrument: 'r8b', fingering: 'G5', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'bB5', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'C6', fingeringName: 'C调指法', tonalityName: 'Alto', match: 2 },
      { instrument: 'r8b', fingering: 'D6', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'r8b', fingering: 'F6', fingeringName: 'F调指法', tonalityName: 'Tenor', match: 2 },
      { instrument: 'r8b', fingering: 'G6', fingeringName: 'G调指法', tonalityName: '', match: 2 }
    ]
  },
  {
    instrument: 'r8g',
    instrumentName: '德式八孔竖笛',
    graphList: [
      { name: '吹口在下（推荐）', value: '1d' },
      { name: '吹口在上', value: '1u' }
    ],
    allowedKeyTokens: ['C', 'D', 'F', 'G', 'bB'],
    fingerings: [
      { instrument: 'r8g', fingering: 'F4', fingeringName: 'F调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'G4', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'bB4', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'C5', fingeringName: 'C调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'D5', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'F5', fingeringName: 'F调指法', tonalityName: 'Soprano', match: 2 },
      { instrument: 'r8g', fingering: 'G5', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'bB5', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'C6', fingeringName: 'C调指法', tonalityName: 'Alto', match: 2 },
      { instrument: 'r8g', fingering: 'D6', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'r8g', fingering: 'F6', fingeringName: 'F调指法', tonalityName: 'Tenor', match: 2 },
      { instrument: 'r8g', fingering: 'G6', fingeringName: 'G调指法', tonalityName: '', match: 2 }
    ]
  },
  {
    instrument: 'w6',
    instrumentName: '爱尔兰哨笛',
    graphList: [
      { name: '吹口在下（推荐）', value: '1d' },
      { name: '吹口在上', value: '1u' }
    ],
    allowedKeyTokens: ['C', 'D', 'F', 'G', 'bA', 'bB', 'bE'],
    fingerings: [
      { instrument: 'w6', fingering: 'F3', fingeringName: 'F调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'G3', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bB3', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'C3', fingeringName: 'C调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'D4', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bE4', fingeringName: 'bE调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bA4', fingeringName: 'bA调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'F4', fingeringName: 'F调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'G4', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bB4', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'C5', fingeringName: 'C调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'D5', fingeringName: 'D调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bE5', fingeringName: 'bE调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bA5', fingeringName: 'bA调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'F5', fingeringName: 'F调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'G5', fingeringName: 'G调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'bB5', fingeringName: 'bB调指法', tonalityName: '', match: 2 },
      { instrument: 'w6', fingering: 'C6', fingeringName: 'C调指法', tonalityName: '', match: 2 }
    ]
  }
]

function buildOcarinaReferenceTable(fingerings: string[]) {
  return Object.fromEntries(
    fingerings.map((fingering, index) => [
      fingering,
      {
        acKeynote: `1=${fingering}`,
        fingeringName: `${parseFingeringKeyToken(fingering)}调指法`,
        referencePriority: index
      }
    ])
  ) as Record<string, OcarinaReferenceEntry>
}

function buildGeneratedOcarinaFingerings(instrument: 'o6' | 'o12') {
  const referenceTable = KUAILEPU_OCARINA_AC_REFERENCE[instrument]
  return Object.entries(referenceTable)
    .sort((left, right) => left[1].referencePriority - right[1].referencePriority)
    .map(([fingering, reference]) => ({
      instrument,
      fingering,
      fingeringName: reference.fingeringName,
      tonalityName: '',
      match: 2
    }))
}

export type KuailepuGenerationOptions = {
  draft: SongIngestDraft
  template: Record<string, unknown>
  slug: string
  title?: string
  keynote?: string
  transpose?: number | null
  autoTransposeInstrument?: string
  tempoBpm?: number | null
  scrubRuntimeCache?: boolean
  graceMode?: 'source-only' | 'payload-metadata'
}

type RangeFitResult = {
  instrumentId: string
  label: string
  range: [number, number]
  recommendedShift: number
  afterRecommendedShiftOutOfRangeCount: number
}

type AutoTransposeSelection = {
  instrumentId: string
  label: string
  recommendedShift: number
}

export function generateKuailepuRuntimeCandidate(options: KuailepuGenerationOptions) {
  const {
    draft,
    template,
    slug,
    title: requestedTitle,
    keynote,
    transpose,
    autoTransposeInstrument,
    tempoBpm,
    scrubRuntimeCache = true,
    graceMode = 'source-only'
  } = options

  const title = requestedTitle ?? draft.metadata.title
  const sourceKeynote = draft.metadata.recommendedKeynote
  const sourceTonicMidi = parseKeynoteToMidi(sourceKeynote)
  const sourceNoteMidis = parseNotation(draft.notation.lines, sourceTonicMidi)
    .flat()
    .filter((token): token is ParsedToken & { kind: 'note' } => token.kind === 'note')
    .map(token => token.midi)
  const rangeReport = buildRangeReport(sourceNoteMidis, autoTransposeInstrument)
  const selectedTranspose = transpose ?? rangeReport.selectedAutoTranspose?.recommendedShift ?? 0
  const targetKeynote = keynote ?? transposeKeynote(sourceKeynote, selectedTranspose)
  const targetTonicMidi = parseKeynoteToMidi(targetKeynote)
  const runtimeTempoResolution = resolveRuntimeTempoBpm(template, draft, tempoBpm)
  const runtimeTempoBpm = runtimeTempoResolution.bpm
  const notationLines = transposeNotationLines(
    draft.notation.lines,
    sourceTonicMidi,
    targetTonicMidi,
    selectedTranspose
  )
  const compactNotationBody = transposeCompactNotationBody(
    draft.happi123Draft.notationText,
    sourceTonicMidi,
    targetTonicMidi,
    selectedTranspose
  )
  const rawNotation = ensureNotationTempoDirective(
    buildRuntimeHappy123NotationFromCompactBody(compactNotationBody),
    runtimeTempoBpm
  )
  const extractedAlignedLyrics = draft.lyrics.alignedLines.filter(
    line => !isPlaceholderLyricLine(line)
  )
  const exposesLyricsPublicly =
    draft.metadata.lyricPolicy === 'show-publicly' ||
    draft.metadata.lyricPolicy === 'hide-by-default'
  const alignedLyrics = exposesLyricsPublicly ? extractedAlignedLyrics : []
  const lyricText = alignedLyrics.length > 0 ? alignedLyrics.join('\n') : ''
  const templatePayload = scrubRuntimeCache ? scrubTemplateRuntimeCache(template) : template
  const generatedNoteMidis = sourceNoteMidis.map(midi => midi + selectedTranspose)
  const generatedInstrumentFingerings = buildGeneratedInstrumentFingerings(
    targetKeynote,
    generatedNoteMidis,
    targetTonicMidi
  )
  const generatedFingerings = buildGeneratedFingeringsField(generatedInstrumentFingerings)
  const runtimePayload = {
    ...templatePayload,
    song_uuid: `synthetic-${slug}`,
    song_name: title,
    alias_name: '',
    song_pinyin: slug.replace(/-/g, ''),
    keynote: targetKeynote,
    rhythm: draft.metadata.meter ?? String(template.rhythm ?? '4/4'),
    bpm: runtimeTempoBpm,
    music_composer: draft.metadata.composer ?? '',
    lyric: lyricText ? JSON.stringify([lyricText]) : '[]',
    lyric_text: lyricText,
    notation: rawNotation,
    show_lyric:
      lyricText && draft.metadata.lyricPolicy === 'show-publicly' ? 'on' : 'off',
    fingerings: generatedFingerings,
    instrument: 'none',
    fingering: '',
    fingering_index: 0,
    show_graph: '',
    instrumentFingerings: generatedInstrumentFingerings
  }

  mergeSongIngestRuntimeMetadata(runtimePayload, {
    sourceKind: 'musicxml',
    graceMode,
    graceAttachments:
      graceMode === 'payload-metadata' && draft.ornaments.graceAttachments.length > 0
        ? draft.ornaments.graceAttachments
        : undefined,
    tempoResolution: runtimeTempoResolution,
    runtimeFingeringAudit: {
      status: 'pending',
      rulesVersion: SONG_INGEST_RUNTIME_FINGERING_RULES_VERSION,
      optimizedAt: null,
      instrumentCount: generatedInstrumentFingerings.filter(option => option.instrument !== 'none')
        .length
    }
  })

  const songDoc: SongDoc = {
    id: slug,
    slug,
    title,
    description: `${title} candidate generated from a MusicXML ingest draft for runtime compatibility testing.`,
    published: false,
    alignedLyrics: alignedLyrics.length > 0 ? alignedLyrics : undefined,
    source: {
      title: `${title} MusicXML ingest draft`,
      url: '',
      rights: 'Candidate generated for local compatibility testing; review source rights before publication.',
      note: 'Generated from SongIngestDraft, not imported from Kuailepu.'
    },
    meta: {
      key: formatKeynoteLabel(targetKeynote),
      tempo: runtimeTempoBpm,
      meter: draft.metadata.meter ?? String(template.rhythm ?? '4/4')
    },
    review: {
      status: 'pending',
      checkedOn: new Date().toISOString().slice(0, 10),
      note: 'Synthetic runtime compatibility candidate. Compare against the source MusicXML and an existing verified song before publication.'
    },
    tonicMidi: targetTonicMidi,
    notation: notationLines
  }

  const ingestReport = {
    version: 1,
    slug,
    title,
    source: {
      kind: draft.source.kind,
      partId: draft.source.partId,
      voice: draft.source.voice
    },
    generation: {
      sourceKeynote,
      targetKeynote,
      selectedTranspose,
      selectedTransposeSource:
        transpose !== null && transpose !== undefined
          ? 'manual'
          : autoTransposeInstrument
            ? 'auto'
            : 'none',
      runtimeTempoResolution,
      scrubbedTemplateRuntimeCache: scrubRuntimeCache,
      graceMode
    },
    stats: {
      ...draft.stats,
      chordNames: draft.chords?.names ?? []
    },
    sourceNoteRange: summarizeNoteRange(sourceNoteMidis),
    generatedNoteRange: summarizeNoteRange(generatedNoteMidis),
    rangeFit: rangeReport.fits.map(fit => ({
      ...fit,
      afterSelectedTransposeOutOfRangeCount: countOutOfRange(
        generatedNoteMidis,
        fit.range
      )
    })),
    warnings: [
      ...draft.warnings,
      ...(scrubRuntimeCache
        ? ['Template runtime caches were removed so the runtime regenerates sheet/chord/playback data from the generated notation.']
        : ['Template runtime caches were kept; verify mpn/music_list do not contain stale data before using this candidate.'])
    ]
  }

  return {
    runtimePayload,
    songDoc,
    ingestReport,
    sourceKeynote,
    targetKeynote,
    sourceTonicMidi,
    targetTonicMidi,
    selectedTranspose,
    notationLines
  }
}

export function transposeNotationLines(
  lines: string[],
  sourceTonicMidi: number,
  targetTonicMidi: number,
  transpose: number
) {
  return lines.map(line =>
    tokenizeGeneratedNotationLine(line)
      .map(token => renderToken(token, sourceTonicMidi, targetTonicMidi, transpose))
      .join(' ')
      .replace(/\s+\|/g, ' |')
      .replace(/\|\s+\|/g, '| |')
      .trim()
  )
}

export function transposeCompactNotationBody(
  notationBody: string,
  sourceTonicMidi: number,
  targetTonicMidi: number,
  transpose: number
) {
  return String(notationBody || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line =>
      tokenizeCompactGeneratedNotationLine(line)
        .map(token => renderCompactToken(token, sourceTonicMidi, targetTonicMidi, transpose))
        .join('')
        .trim()
    )
    .join('\n')
}

export function buildRangeReport(noteMidis: number[], autoTransposeInstrument: string | undefined) {
  const fits: RangeFitResult[] = PUBLIC_RUNTIME_INSTRUMENT_PROFILES.map(profile => {
    const recommendedShift = chooseBestRangeShift(noteMidis, profile.range, {
      preferredOctaveShiftsFirst: profile.preferredOctaveShiftsFirst
    })

    return {
      instrumentId: profile.id,
      label: profile.label,
      range: profile.range,
      recommendedShift,
      afterRecommendedShiftOutOfRangeCount: countOutOfRange(
        noteMidis.map(midi => midi + recommendedShift),
        profile.range
      )
    }
  })
  const selectedAutoTranspose = resolveAutoTransposeSelection(noteMidis, fits, autoTransposeInstrument)

  if (autoTransposeInstrument && !selectedAutoTranspose) {
    throw new Error(
      `Unsupported auto-transpose mode: ${autoTransposeInstrument}. Expected one of ${['coverage', ...PUBLIC_RUNTIME_INSTRUMENT_PROFILES.map(profile => profile.id)].join(', ')}.`
    )
  }

  return {
    selectedAutoTranspose,
    fits
  }
}

export function buildGeneratedPublicInstrumentFingerings(
  targetKeynote: string,
  sourceNoteMidis: number[],
  sourceTonicMidi: number
) {
  return buildGeneratedInstrumentFingerings(targetKeynote, sourceNoteMidis, sourceTonicMidi)
}

export function buildGeneratedPublicFingeringsField(
  instrumentFingerings: Array<{
    instrument: string
    fingeringSetList?: Array<Array<{ fingering: string }>>
  }>
) {
  return buildGeneratedFingeringsField(instrumentFingerings)
}

export function buildSyntheticRuntimePayloadForInstrument(
  payload: KuailepuRuntimePayload,
  instrumentId: PublicSongInstrumentId
) {
  const songUuid = typeof payload.song_uuid === 'string' ? payload.song_uuid : ''
  const keynote = typeof payload.keynote === 'string' ? payload.keynote : ''
  const rawNotation = typeof payload.notation === 'string' ? payload.notation : ''

  if (!songUuid.startsWith('synthetic-') || !keynote || !rawNotation.trim()) {
    return null
  }

  const sourceTonicMidi = parseKeynoteToMidi(keynote)
  const notationLines = rawNotation
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
  if (notationLines.length < 1) {
    return null
  }

  const sourceNoteMidis = parseNotation(notationLines, sourceTonicMidi)
    .flat()
    .filter((token): token is ParsedToken & { kind: 'note' } => token.kind === 'note')
    .map(token => token.midi)
  if (sourceNoteMidis.length < 1) {
    return null
  }

  const rangeReport = buildRangeReport(sourceNoteMidis, undefined)
  const fit = rangeReport.fits.find(candidate => candidate.instrumentId === instrumentId)
  if (!fit) {
    return null
  }

  const selectedTranspose = fit.recommendedShift
  const targetKeynote = transposeKeynote(keynote, selectedTranspose)
  const targetTonicMidi = parseKeynoteToMidi(targetKeynote)
  const transposedNotationLines = transposeNotationLines(
    notationLines,
    sourceTonicMidi,
    targetTonicMidi,
    selectedTranspose
  )
  const compactNotationBody = transposeCompactNotationBody(
    stripHappy123TempoDirective(rawNotation).replace(/\s*\|\|\|\s*$/i, '').trim(),
    sourceTonicMidi,
    targetTonicMidi,
    selectedTranspose
  )
  const transposedNoteMidis = sourceNoteMidis.map(midi => midi + selectedTranspose)
  const instrumentFingerings = buildGeneratedPublicInstrumentFingerings(
    targetKeynote,
    transposedNoteMidis,
    targetTonicMidi
  )

  const nextPayload = {
    ...scrubTemplateRuntimeCache(payload),
    keynote: targetKeynote,
    notation: ensureNotationTempoDirective(
      buildRuntimeHappy123NotationFromCompactBody(compactNotationBody),
      Number(payload.bpm) > 0 ? Number(payload.bpm) : 100
    ),
    instrument: 'none',
    fingering: '',
    fingering_index: 0,
    show_graph: '',
    instrumentFingerings,
    fingerings: buildGeneratedPublicFingeringsField(instrumentFingerings)
  } satisfies KuailepuRuntimePayload

  return {
    payload: nextPayload,
    report: {
      instrumentId,
      sourceKeynote: keynote,
      targetKeynote,
      selectedTranspose,
      sourceNoteRange: summarizeNoteRange(sourceNoteMidis),
      targetNoteRange: summarizeNoteRange(transposedNoteMidis),
      instrumentFit: fit
    }
  }
}

function resolveAutoTransposeSelection(
  noteMidis: number[],
  fits: RangeFitResult[],
  autoTransposeInstrument: string | undefined
): AutoTransposeSelection | null {
  if (!autoTransposeInstrument) {
    return null
  }

  if (autoTransposeInstrument === 'coverage') {
    return chooseBestCoverageTranspose(noteMidis)
  }

  const fit = fits.find(item => item.instrumentId === autoTransposeInstrument)
  if (!fit) {
    return null
  }

  return {
    instrumentId: fit.instrumentId,
    label: fit.label,
    recommendedShift: fit.recommendedShift
  }
}

function chooseBestCoverageTranspose(noteMidis: number[]): AutoTransposeSelection {
  const candidates = []

  for (let shift = -24; shift <= 24; shift += 1) {
    const shiftedNotes = noteMidis.map(midi => midi + shift)
    let supportedCount = 0
    let totalOutCount = 0
    let totalOverflowPenalty = 0
    let totalCenterPenalty = 0

    for (const profile of PUBLIC_RUNTIME_INSTRUMENT_PROFILES) {
      const outCount = countOutOfRange(shiftedNotes, profile.range)
      totalOutCount += outCount
      if (outCount === 0) {
        supportedCount += 1
      }

      const rangeMid = (profile.range[0] + profile.range[1]) / 2
      for (const midi of shiftedNotes) {
        if (midi < profile.range[0]) {
          totalOverflowPenalty += profile.range[0] - midi
        } else if (midi > profile.range[1]) {
          totalOverflowPenalty += midi - profile.range[1]
        }
        totalCenterPenalty += Math.abs(midi - rangeMid)
      }
    }

    candidates.push({
      shift,
      exact: shift === 0,
      octaveAligned: shift % 12 === 0,
      absShift: Math.abs(shift),
      supportedCount,
      totalOutCount,
      totalOverflowPenalty,
      totalCenterPenalty
    })
  }

  const exactCandidate = candidates.find(candidate => candidate.shift === 0)
  if (exactCandidate && exactCandidate.supportedCount > 0) {
    return {
      instrumentId: 'coverage',
      label: 'Public instrument coverage',
      recommendedShift: 0
    }
  }

  candidates.sort((left, right) => {
    if (left.supportedCount !== right.supportedCount) {
      return right.supportedCount - left.supportedCount
    }
    if (left.totalOutCount !== right.totalOutCount) {
      return left.totalOutCount - right.totalOutCount
    }
    if (left.totalOverflowPenalty !== right.totalOverflowPenalty) {
      return left.totalOverflowPenalty - right.totalOverflowPenalty
    }
    if (left.octaveAligned !== right.octaveAligned) {
      return left.octaveAligned ? -1 : 1
    }
    if (left.absShift !== right.absShift) {
      return left.absShift - right.absShift
    }
    return left.totalCenterPenalty - right.totalCenterPenalty
  })

  const best = candidates[0] ?? { shift: 0 }

  return {
    instrumentId: 'coverage',
    label: 'Public instrument coverage',
    recommendedShift: best.shift
  }
}

export function scrubTemplateRuntimeCache(template: Record<string, unknown>) {
  const payload = { ...template }
  delete payload.mpn
  delete payload.music_list
  delete payload.fetch_score
  delete payload.music_url
  delete payload.image_url
  delete payload.comment_list
  delete payload.comment
  return payload
}

function resolveRuntimeTempoBpm(
  template: Record<string, unknown>,
  draft: SongIngestDraft,
  tempoOverrideBpm?: number | null
) {
  const manualTempo = Number(tempoOverrideBpm)
  if (Number.isFinite(manualTempo) && manualTempo > 0) {
    return {
      bpm: Math.round(manualTempo),
      source: 'manual',
      family: draft.metadata.family ?? null,
      heuristic: null
    } satisfies SongIngestRuntimeTempoResolution
  }

  const sourceTempo = Number(draft.metadata.tempoBpm)
  if (Number.isFinite(sourceTempo) && sourceTempo > 0) {
    return {
      bpm: Math.round(sourceTempo),
      source: 'musicxml',
      family: draft.metadata.family ?? null,
      heuristic: null
    } satisfies SongIngestRuntimeTempoResolution
  }

  const templateTempo =
    template.meta && typeof template.meta === 'object' && 'tempo' in template.meta
      ? (template.meta as Record<string, unknown>).tempo
      : undefined
  const tempo = Number(templateTempo)

  if (Number.isFinite(tempo) && tempo > 0) {
    return {
      bpm: Math.round(tempo),
      source: 'template',
      family: draft.metadata.family ?? null,
      heuristic: null
    } satisfies SongIngestRuntimeTempoResolution
  }

  return resolveFamilyFallbackTempo(draft)
}

function resolveFamilyFallbackTempo(draft: SongIngestDraft) {
  const title = `${draft.metadata.title || ''}`.toLowerCase()
  const family = draft.metadata.family ?? null

  if (/\b(lullaby|berceuse|air)\b/.test(title)) {
    return {
      bpm: 72,
      source: 'family-fallback',
      family,
      heuristic: 'title:lullaby-air'
    } satisfies SongIngestRuntimeTempoResolution
  }

  if (/\b(waltz|waltzing)\b/.test(title)) {
    return {
      bpm: 90,
      source: 'family-fallback',
      family,
      heuristic: 'title:waltz'
    } satisfies SongIngestRuntimeTempoResolution
  }

  if (/\b(march|polka)\b/.test(title) || family === 'march') {
    return {
      bpm: 116,
      source: 'family-fallback',
      family,
      heuristic: family === 'march' ? 'family:march' : 'title:march-polka'
    } satisfies SongIngestRuntimeTempoResolution
  }

  if (/\b(hymn|prayer|carol)\b/.test(title) || family === 'hymn' || family === 'holiday') {
    return {
      bpm: 88,
      source: 'family-fallback',
      family,
      heuristic:
        family === 'hymn' || family === 'holiday' ? `family:${family}` : 'title:hymn-prayer-carol'
    } satisfies SongIngestRuntimeTempoResolution
  }

  return {
    bpm: 96,
    source: 'family-fallback',
    family,
    heuristic: family ? `family:${family}` : 'default:song'
  } satisfies SongIngestRuntimeTempoResolution
}

function ensureNotationTempoDirective(notation: string, bpm: number) {
  if (/\{bpm\s*:\s*\d+\}/i.test(notation)) {
    return notation
  }

  const normalized = String(notation || '').trim()
  const tempoDirective = `{bpm:${Math.max(1, Math.round(bpm))}}`
  return normalized ? `${tempoDirective}\n${normalized}` : tempoDirective
}

export function transposeKeynote(keynote: string, transpose: number) {
  return `1=${midiToKeyName(parseKeynoteToMidi(keynote) + transpose, transpose)}`
}

function tokenizeGeneratedNotationLine(line: string) {
  return line.match(/\{cn:[^}]+\}|#?[1-7][',dg]*|b[1-7][',dg]*|0|-|\|/gi) ?? []
}

function tokenizeCompactGeneratedNotationLine(line: string) {
  return line.match(/\{cn:[^}]+\}|(?:\|\|\||:\|:|:\||\|:|\|\||\|)|(?:[#bn]?[1-7][',"gd#bn]*|0)[\-._x/=]*/gi) ?? []
}

function renderToken(token: string, sourceTonicMidi: number, targetTonicMidi: number, transpose: number) {
  if (token.startsWith('{cn:')) {
    return transposeChordMarker(token, transpose)
  }

  const parsedToken = parseNotation([token], sourceTonicMidi)[0]?.[0]
  if (!parsedToken) {
    return token
  }

  if (parsedToken.kind === 'bar' || parsedToken.kind === 'hold' || parsedToken.kind === 'rest') {
    return parsedToken.token
  }

  if (parsedToken.kind !== 'note') {
    return token
  }

  return midiToHappy123PitchToken(parsedToken.midi + transpose, targetTonicMidi)
}

function renderCompactToken(
  token: string,
  sourceTonicMidi: number,
  targetTonicMidi: number,
  transpose: number
) {
  if (token.startsWith('{cn:')) {
    return transposeChordMarker(token, transpose)
  }

  if (/^(?:\|\|\||:\|:|:\||\|:|\|\||\|)$/i.test(token)) {
    return token
  }

  const match = token.match(/^([#bn]?[1-7][',"gd#bn]*|0)([\-._x/=]*)$/i)
  if (!match) {
    return token
  }

  const head = match[1] ?? token
  const suffix = match[2] ?? ''
  const parsedToken = parseNotation([head], sourceTonicMidi)[0]?.[0]
  if (!parsedToken) {
    return token
  }

  if (parsedToken.kind === 'rest') {
    return `${parsedToken.token}${suffix}`
  }

  if (parsedToken.kind !== 'note') {
    return token
  }

  return `${midiToHappy123PitchToken(parsedToken.midi + transpose, targetTonicMidi)}${suffix}`
}

function transposeChordMarker(token: string, transpose: number) {
  if (transpose === 0) {
    return token
  }

  return token.replace(/\{cn:([^}]+)\}/, (_match, chordName: string) => {
    return `{cn:${transposeChordName(chordName, transpose)}}`
  })
}

function transposeChordName(chordName: string, transpose: number) {
  const trimmed = chordName.trim()
  const parts = trimmed.split('/')
  const head = transposeChordPart(parts[0] ?? '', transpose)
  const bass = parts[1] ? transposeChordPart(parts[1], transpose) : null

  return `${head}${bass ? `/${bass}` : ''}`
}

function transposeChordPart(part: string, transpose: number) {
  const match = part.match(/^([A-G])([#b]?)(.*)$/)
  if (!match) {
    return part
  }

  const rootMidi = pitchNameToMidi(match[1], match[2])
  return `${midiToChordRoot(rootMidi + transpose, transpose)}${match[3] ?? ''}`
}

function pitchNameToMidi(step: string, accidental: string) {
  const baseMap: Record<string, number> = {
    C: 60,
    D: 62,
    E: 64,
    F: 65,
    G: 67,
    A: 69,
    B: 71
  }

  return (baseMap[step] ?? 60) + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
}

function midiToChordRoot(midi: number, transpose: number) {
  return midiToKeyName(midi, transpose).replace(/^b([A-G])$/, '$1b').replace(/^#([A-G])$/, '$1#')
}

function midiToKeyName(midi: number, transpose: number) {
  const sharpNames = ['C', '#C', 'D', '#D', 'E', 'F', '#F', 'G', '#G', 'A', '#A', 'B']
  const flatNames = ['C', 'bD', 'D', 'bE', 'E', 'F', 'bG', 'G', 'bA', 'A', 'bB', 'B']
  const names = transpose < 0 ? flatNames : sharpNames
  return names[((midi % 12) + 12) % 12] ?? 'C'
}

function formatKeynoteLabel(keynote: string) {
  const match = keynote.match(/^1=([#b]?)([A-G])$/)
  if (!match) return keynote
  return `1 = ${match[1]}${match[2]}`
}

function isPlaceholderLyricLine(line: string) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .every(token => token === '_')
}

function summarizeNoteRange(noteMidis: number[]) {
  if (noteMidis.length === 0) {
    return {
      min: null,
      max: null,
      noteCount: 0
    }
  }

  return {
    min: Math.min(...noteMidis),
    max: Math.max(...noteMidis),
    noteCount: noteMidis.length
  }
}

function countOutOfRange(noteMidis: number[], range: [number, number]) {
  return noteMidis.filter(midi => midi < range[0] || midi > range[1]).length
}

function buildGeneratedInstrumentFingerings(
  targetKeynote: string,
  sourceNoteMidis: number[],
  sourceTonicMidi: number
) {
  const targetPitchClass = parsePitchClassFromKeynote(targetKeynote)

  return [
    {
      instrument: 'none',
      instrumentName: '简谱(无图谱)',
      fingeringsList: [],
      fingeringSetList: [],
      graphList: []
    },
    ...GENERATED_PUBLIC_INSTRUMENT_PRESETS.map(preset => {
      const supportedFingerings = rankGeneratedInstrumentFingerings(
        preset.fingerings,
        targetPitchClass,
        sourceNoteMidis,
        sourceTonicMidi,
        preset.instrument,
        preset.allowedKeyTokens,
        targetKeynote
      )

      if (supportedFingerings.length === 0) {
        return null
      }

      return {
        instrument: preset.instrument,
        instrumentName: preset.instrumentName,
        fingeringsList: supportedFingerings.map(fingering => [fingering]),
        fingeringSetList: supportedFingerings.map(fingering => [fingering]),
        graphList: preset.graphList
      }
    }).filter((preset): preset is NonNullable<typeof preset> => Boolean(preset))
  ]
}

function rankGeneratedInstrumentFingerings(
  fingerings: GeneratedInstrumentFingeringItem[],
  targetPitchClass: number | null,
  sourceNoteMidis: number[],
  sourceTonicMidi: number,
  instrumentId: string,
  allowedKeyTokens: string[],
  targetKeynote?: string
) {
  if (fingerings.length === 0) {
    throw new Error('Generated instrument preset is missing fingering options.')
  }

  const allowedSet = new Set(allowedKeyTokens)
  const noteMin = sourceNoteMidis.length > 0 ? Math.min(...sourceNoteMidis) : sourceTonicMidi
  const noteMax = sourceNoteMidis.length > 0 ? Math.max(...sourceNoteMidis) : sourceTonicMidi
  const noteMid = (noteMin + noteMax) / 2

  return fingerings
    .filter(item => allowedSet.has(parseFingeringKeyToken(item.fingering)))
    .map(item => {
      const pitchClass = parsePitchClassFromFingering(item.fingering)
      const fingeringMidi = parseMidiFromFingering(item.fingering)
      const referencePriority = getKuailepuOcarinaReferencePriority(instrumentId, item.fingering)
      const pitchClassDistance =
        targetPitchClass === null || pitchClass === null
          ? Number.POSITIVE_INFINITY
          : Math.min(
              (pitchClass - targetPitchClass + 12) % 12,
              (targetPitchClass - pitchClass + 12) % 12
            )

      /**
       * 这里刻意不再用“固定 instrument 音域 + fingering 绝对音高”去提前淘汰候选。
       *
       * 原因：
       * - 快乐谱 runtime 里，切 fingering 更多是在切图谱解释方式
       * - 同一首歌换 F4 / F5 这类档位时，最终页面的字母谱/旋律并不会简单等于
       *   “整首歌跟着 fingering 绝对音高整体上移/下移”
       * - 所以如果这里先用固定 range 把 F5/G5 提前删掉，会误杀大量其实能正常出图的候选
       *
       * 这一层现在只做“宽松召回”，把可能成立的候选都保留下来；
       * 真正的图谱舒适度排序，交给后面的 runtime 图谱审计去做。
       */
      const registerPenalty =
        fingeringMidi === null ? Number.POSITIVE_INFINITY : Math.abs(fingeringMidi - noteMid)

      return {
        item,
        pitchClassDistance,
        registerPenalty,
        fingeringMidi,
        referencePriority
      }
    })
    .sort((left, right) => {
      if (left.pitchClassDistance !== right.pitchClassDistance) {
        return left.pitchClassDistance - right.pitchClassDistance
      }
      if (
        Math.abs(left.registerPenalty - right.registerPenalty) <=
          KUAILEPU_OCARINA_REFERENCE_REGISTER_TIE_THRESHOLD &&
        left.referencePriority !== right.referencePriority
      ) {
        return left.referencePriority - right.referencePriority
      }
      if (left.registerPenalty !== right.registerPenalty) {
        return left.registerPenalty - right.registerPenalty
      }
      if ((left.fingeringMidi ?? 0) !== (right.fingeringMidi ?? 0)) {
        return (left.fingeringMidi ?? 0) - (right.fingeringMidi ?? 0)
      }
      return left.item.fingering.localeCompare(right.item.fingering)
    })
    .map(entry => ({
      ...entry.item,
      tonalityName: inferKuailepuOcarinaTonalityName(
        instrumentId,
        entry.item.fingering,
        targetKeynote
      ) ?? entry.item.tonalityName
    }))
}

export function getKuailepuOcarinaReferencePriority(instrumentId: string, fingering: string) {
  if (instrumentId !== 'o6' && instrumentId !== 'o12') {
    return Number.POSITIVE_INFINITY
  }

  return KUAILEPU_OCARINA_AC_REFERENCE[instrumentId][fingering]?.referencePriority ?? Number.POSITIVE_INFINITY
}

export function inferKuailepuOcarinaTonalityName(
  instrumentId: string,
  fingering: string,
  targetKeynote?: string
) {
  if (instrumentId !== 'o6' && instrumentId !== 'o12') {
    return null
  }

  const targetKeyTokens = parseKeyTokensFromKeynote(targetKeynote)
  if (targetKeyTokens.length === 0) {
    return null
  }

  const mapping = KUAILEPU_OCARINA_TONALITY_REFERENCE[instrumentId][fingering]
  if (!mapping) {
    return null
  }

  for (const targetKeyToken of targetKeyTokens) {
    const tonalityName = mapping[targetKeyToken]
    if (tonalityName) {
      return tonalityName
    }
  }

  return null
}

function parseKeyTokensFromKeynote(keynote?: string) {
  if (!keynote) {
    return ['']
  }

  const match = keynote.match(/^1=([#b]?)([A-G])(\d+)?$/)
  if (!match) {
    return ['']
  }

  const baseKeyToken = `${match[1] ?? ''}${match[2] ?? ''}`
  const octaveSuffix = match[3] ?? ''
  if (!octaveSuffix) {
    return [baseKeyToken]
  }

  return [`${baseKeyToken}${octaveSuffix}`, baseKeyToken]
}

function parsePitchClassFromKeynote(keynote: string) {
  const match = keynote.match(/^1=([#b]?)([A-G])$/)
  if (!match) {
    return null
  }

  return pitchClassFromName(match[2]!, match[1]!)
}

function parsePitchClassFromFingering(fingering: string) {
  const match = fingering.match(/^([#b]?)([A-G])\d+$/i)
  if (!match) {
    return null
  }

  return pitchClassFromName(match[2]!.toUpperCase(), match[1]!)
}

function parseFingeringKeyToken(fingering: string) {
  const match = fingering.match(/^([#b]?[A-G])\d+$/i)
  if (!match) {
    return fingering
  }

  return match[1]!
}

function parseMidiFromFingering(fingering: string) {
  const match = fingering.match(/^([#b]?)([A-G])(\d+)$/i)
  if (!match) {
    return null
  }

  const pitchClass = pitchClassFromName(match[2]!.toUpperCase(), match[1]!)
  const octave = Number.parseInt(match[3]!, 10)
  return (octave + 1) * 12 + pitchClass
}

function countNotesOutsideMajorScale(notePitchClasses: number[], tonicPitchClass: number) {
  const majorScale = new Set([0, 2, 4, 5, 7, 9, 11].map(offset => (tonicPitchClass + offset) % 12))
  return notePitchClasses.filter(pitchClass => !majorScale.has(pitchClass)).length
}

function compareGeneratedFingeringScore(
  left: {
    shift: number
    octaveAligned: boolean
    absShift: number
    centerPenalty: number
    item: GeneratedInstrumentFingeringItem
    targetPitchClass: number | null
    pitchClass: number | null
  },
  right: {
    shift: number
    octaveAligned: boolean
    absShift: number
    centerPenalty: number
    item: GeneratedInstrumentFingeringItem
    targetPitchClass: number | null
    pitchClass: number | null
  }
) {
  const leftExact = left.shift === 0 ? 0 : 1
  const rightExact = right.shift === 0 ? 0 : 1
  if (leftExact !== rightExact) {
    return leftExact - rightExact
  }

  const leftOctave = left.octaveAligned ? 0 : 1
  const rightOctave = right.octaveAligned ? 0 : 1
  if (leftOctave !== rightOctave) {
    return leftOctave - rightOctave
  }

  if (left.absShift !== right.absShift) {
    return left.absShift - right.absShift
  }

  const leftPitchDistance =
    left.targetPitchClass === null || left.pitchClass === null
      ? Number.POSITIVE_INFINITY
      : Math.min(
          (left.pitchClass - left.targetPitchClass + 12) % 12,
          (left.targetPitchClass - left.pitchClass + 12) % 12
        )
  const rightPitchDistance =
    right.targetPitchClass === null || right.pitchClass === null
      ? Number.POSITIVE_INFINITY
      : Math.min(
          (right.pitchClass - right.targetPitchClass + 12) % 12,
          (right.targetPitchClass - right.pitchClass + 12) % 12
        )
  if (leftPitchDistance !== rightPitchDistance) {
    return leftPitchDistance - rightPitchDistance
  }

  if (left.centerPenalty !== right.centerPenalty) {
    return left.centerPenalty - right.centerPenalty
  }

  return left.item.fingering.localeCompare(right.item.fingering)
}


function dedupeGeneratedFingeringsByKey(fingerings: GeneratedInstrumentFingeringItem[]) {
  const seen = new Set<string>()
  return fingerings.filter(item => {
    const key = parseFingeringKeyToken(item.fingering)
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function buildGeneratedFingeringsField(
  instrumentFingerings: Array<{
    instrument: string
    fingeringSetList?: Array<Array<{ fingering: string }>>
  }>
) {
  return instrumentFingerings
    .filter(option => option.instrument !== 'none')
    .flatMap(option =>
      (option.fingeringSetList ?? []).flatMap(set =>
        set.map(item => {
          const pitchClass = parseFingeringKeyToken(item.fingering)
          return `${option.instrument}-${pitchClass}`
        })
      )
    )
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(',')
}

function pitchClassFromName(step: string, accidental: string) {
  const baseMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }

  const base = baseMap[step] ?? 0
  return (base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
}
