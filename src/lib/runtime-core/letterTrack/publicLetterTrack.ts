import type {
  PublicLetterTrackData,
  PublicLetterTrackMode,
  PublicRuntimePayload,
  PublicRuntimeState
} from '../runtimeTypes.ts'
import { resolveRuntimeInstrumentSelection } from '../state/publicRuntimeState.ts'
import { simplifyPublicRuntimeNotation } from './publicRuntimeNotation.ts'

type ScaleTonic = {
  accidental: number
  letter: string
  octave: number
}

export function buildPublicLetterTrackData(input: {
  notation?: string[] | null
  rawNotation?: string | null
  key?: string | null
  mode?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}): PublicLetterTrackData {
  const mode = normalizeNoteLabelMode(input.mode)
  if (mode === 'number' || mode === 'graph') {
    return {
      mode,
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  }

  const scale = buildMajorScaleNoteNames(resolveLetterTrackScaleTonic(input))
  const fingeringAwareLabels = buildFingeringAwareLetterLabels(input)
  const anchorTokens = extractCompactNotationNoteTokens(input.notation, {
    includeRest: false
  })
  const glyphTokens = extractCompactNotationNoteTokens(input.notation, {
    includeRest: true
  })
  if (!scale || glyphTokens.length === 0) {
    return {
      mode,
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  }

  const hasAlignedFingeringAwareGlyphLabels =
    Array.isArray(fingeringAwareLabels?.glyphLabels) &&
    fingeringAwareLabels.glyphLabels.length === glyphTokens.length
  const hasAlignedFingeringAwareAnchorLabels =
    Array.isArray(fingeringAwareLabels?.anchorLabels) &&
    fingeringAwareLabels.anchorLabels.length === anchorTokens.length

  const anchorLabels = hasAlignedFingeringAwareAnchorLabels
    ? fingeringAwareLabels!.anchorLabels
    : anchorTokens
        .map(token => mapCompactNotationTokenToLetterLabel(token, scale))
        .filter((label): label is string => Boolean(label))
  const glyphLabels = hasAlignedFingeringAwareGlyphLabels
    ? fingeringAwareLabels!.glyphLabels
    : glyphTokens
        .map(token => mapCompactNotationTokenToLetterLabel(token, scale))
        .filter((label): label is string => Boolean(label))

  return {
    mode,
    anchorLabels: anchorLabels.length > 0 ? anchorLabels : null,
    glyphLabels: glyphLabels.length > 0 ? glyphLabels : null,
    glyphTokens: glyphTokens.length > 0 ? glyphTokens : null,
    scale
  }
}

export function normalizeNoteLabelMode(mode: string | null | undefined): PublicLetterTrackMode {
  if (mode === 'number' || mode === 'letter' || mode === 'graph') {
    return mode
  }
  return 'letter'
}

function resolveLetterTrackScaleTonic(input: {
  key?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}) {
  const fingeringTonic = resolveRuntimeFingeringScaleTonics(input.payload ?? null, input.state ?? null)?.[0]
  if (fingeringTonic) {
    return fingeringTonic
  }

  return parseScaleTonic(input.key)
}

function resolveRuntimeFingeringScaleTonics(
  payload: PublicRuntimePayload | null,
  state: PublicRuntimeState | null
) {
  if (!payload) {
    return null
  }

  const { selectedFingering } = resolveRuntimeInstrumentSelection(payload, state)
  const tonics = selectedFingering
    .split('+')
    .map(candidate => parseFingeringScaleTonic(candidate))
    .filter((tonic): tonic is ScaleTonic => Boolean(tonic))

  return tonics.length > 0 ? tonics : null
}

function parseFingeringScaleTonic(fingering: string | null | undefined) {
  if (!fingering) {
    return null
  }

  const match = fingering.trim().match(/^([#b]?)([A-Ga-g])(\d+)?$/)
  if (!match) {
    return null
  }

  return {
    accidental: match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0,
    letter: match[2]!.toUpperCase(),
    octave: Number(match[3] ?? 5)
  }
}

function buildFingeringAwareLetterLabels(input: {
  notation?: string[] | null
  rawNotation?: string | null
  payload?: PublicRuntimePayload | null
  state?: PublicRuntimeState | null
}) {
  const tonics = resolveRuntimeFingeringScaleTonics(input.payload ?? null, input.state ?? null)
  if (!tonics || tonics.length < 1 || !input.rawNotation) {
    return null
  }

  const instrument =
    resolveRuntimeInstrumentSelection(input.payload!, input.state ?? null).selectedInstrument?.instrument ?? ''
  return buildLetterLabelsFromRawNotationWithFingeringTonics(input.rawNotation, tonics, instrument)
}

function buildLetterLabelsFromRawNotationWithFingeringTonics(
  rawNotation: string,
  tonics: ScaleTonic[],
  instrument: string
) {
  if (tonics.length < 1) {
    return null
  }

  const glyphLabels: string[] = []
  const anchorLabels: string[] = []
  const sequence = rawNotation.split(/(\{[^}]+\})/g).filter(Boolean)
  let fingeringIndex = 0
  let currentScale = buildMajorScaleNoteNames(tonics[fingeringIndex]!)
  let usedCurrentFingering = false

  for (const item of sequence) {
    if (item.startsWith('{')) {
      if (usedCurrentFingering && shouldAdvanceFingeringTonic(item, instrument)) {
        fingeringIndex = Math.min(fingeringIndex + 1, tonics.length - 1)
        currentScale = buildMajorScaleNoteNames(tonics[fingeringIndex]!)
        usedCurrentFingering = false
      }
      continue
    }

    const normalizedLines = simplifyPublicRuntimeNotation(item)
    const chunkGlyphTokens = extractCompactNotationNoteTokens(normalizedLines, {
      includeRest: true
    })
    const chunkAnchorTokens = extractCompactNotationNoteTokens(normalizedLines, {
      includeRest: false
    })
    if (chunkGlyphTokens.length < 1) {
      continue
    }

    glyphLabels.push(
      ...chunkGlyphTokens
        .map(token => mapCompactNotationTokenToLetterLabel(token, currentScale))
        .filter((label): label is string => Boolean(label))
    )
    anchorLabels.push(
      ...chunkAnchorTokens
        .map(token => mapCompactNotationTokenToLetterLabel(token, currentScale))
        .filter((label): label is string => Boolean(label))
    )
    usedCurrentFingering = true
  }

  if (glyphLabels.length < 1) {
    return null
  }

  return {
    anchorLabels,
    glyphLabels
  }
}

function shouldAdvanceFingeringTonic(tagToken: string, instrument: string) {
  const normalized = tagToken.slice(1, -1).replace(/\s+/g, '')
  if (!normalized) {
    return false
  }

  if (/^1=[#b]?[A-G]$/i.test(normalized)) {
    return true
  }

  if (/^f:/i.test(normalized)) {
    return true
  }

  return instrument.length > 0 && normalized.toLowerCase().startsWith(`${instrument.toLowerCase()}f:`)
}

function extractCompactNotationNoteTokens(
  notation: string[] | null | undefined,
  options?: {
    includeRest?: boolean
  }
) {
  if (!Array.isArray(notation) || notation.length === 0) {
    return []
  }

  const text = notation.join(' ').replace(/\{[^}]+\}/g, ' ')
  const pattern = options?.includeRest
    ? /(?:[#bn]?[0-7](?:[',dg]+)?[#bn]?|0)/gi
    : /[#bn]?[1-7](?:[',dg]+)?[#bn]?/gi

  return (text.match(pattern) ?? [])
    .map(normalizeCompactNotationPitchToken)
    .filter((token): token is string => Boolean(token))
}

function normalizeCompactNotationPitchToken(token: string) {
  const normalized = token.trim()
  if (normalized === '0') {
    return normalized
  }

  const match = normalized.match(/^([#bn]?)([1-7])([',dg]*)([#bn]?)$/i)
  if (!match) {
    return null
  }

  const accidental = (match[1] || match[4] || '').toLowerCase()
  const degree = match[2] ?? ''
  const octaveMarks = match[3] ?? ''

  return `${accidental}${degree}${octaveMarks}`
}

function parseScaleTonic(key: string | null | undefined) {
  if (!key) {
    return null
  }

  const normalized = key.replace(/\s+/g, '')
  const match = normalized.match(/1=([#b]?)([A-G])/i)
  if (!match) {
    return null
  }

  return {
    accidental: match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0,
    letter: match[2]!.toUpperCase(),
    octave: 5
  }
}

function buildMajorScaleNoteNames(tonic: ScaleTonic | null) {
  if (!tonic) {
    return null
  }

  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const naturalPitchClass: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }
  const intervals = [0, 2, 4, 5, 7, 9, 11]
  const tonicLetterIndex = letters.indexOf(tonic.letter)
  if (tonicLetterIndex === -1) {
    return null
  }

  const tonicPitchClass = (naturalPitchClass[tonic.letter] + tonic.accidental + 12 * 10) % 12

  return intervals.map((interval, degreeIndex) => {
    const letter = letters[(tonicLetterIndex + degreeIndex) % letters.length]!
    const targetPitchClass = (tonicPitchClass + interval) % 12
    const letterPitchClass = naturalPitchClass[letter]
    let accidental = targetPitchClass - letterPitchClass

    if (accidental > 6) {
      accidental -= 12
    }
    if (accidental < -6) {
      accidental += 12
    }

    return {
      accidental,
      letter,
      octave: tonic.octave + Math.floor((tonicLetterIndex + degreeIndex) / letters.length)
    }
  })
}

function mapCompactNotationTokenToLetterLabel(
  token: string,
  scale:
    | Array<{
        accidental: number
        letter: string
        octave: number
      }>
    | null
) {
  if (!scale) {
    return null
  }

  const normalizedToken = normalizeCompactNotationPitchToken(token)
  const match = normalizedToken?.match(/^([#bn]?)([0-7])([',dg]*)$/i)
  if (!match) {
    return null
  }

  if (match[2] === '0') {
    return 'R'
  }

  const accidentalShift = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0
  const octaveMarks = match[3] ?? ''
  const octaveShift = Array.from(octaveMarks).reduce((count, char) => {
    const octaveMark = char.toLowerCase()
    return count + (octaveMark === '\'' || octaveMark === 'g' ? 1 : -1)
  }, 0)
  const degree = Number(match[2]) - 1
  const base = scale[degree]
  if (!base) {
    return null
  }

  return formatLetterName(base.letter, base.accidental + accidentalShift, base.octave + octaveShift)
}

function formatLetterName(letter: string, accidental: number, octave: number) {
  const accidentalText =
    accidental === 0
      ? ''
      : accidental > 0
        ? '#'.repeat(accidental)
        : 'b'.repeat(Math.abs(accidental))

  return `${letter}${accidentalText}${octave}`
}
