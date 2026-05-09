# Happy123 Notation Coverage

This document defines the current target for MusicXML import into the Kuailepu runtime path.

## Scope

The goal is not to support every legacy Happy123 / Kuailepu notation construct up front.

The current goal is narrower:

1. extract a single melody line from MusicXML
2. preserve pitch, duration, measure structure, lyrics, and chord markers
3. emit a Kuailepu-native `notation` string that the existing runtime can regenerate into sheet, playback, and fingering data

## Supported Generator Subset

Current generator support lives in:

- `src/lib/songbook/happy123Notation.ts`

The supported subset currently includes:

- scale-degree pitches `1-7`
- accidentals `#` / `b`
- native octave markers `g` / `d`
- rests `0`
- compact duration encoding with `x`, `-`, `_`
- measure bars `|`
- chord markers `{cn:...}`
- line breaks

Partially supported or high-risk areas:

- pickup handling when source rests are implicit instead of explicit
- tuplets and more complex rhythmic syntax
- harmony offsets that do not align cleanly with melody timing
- grace notes are extracted and preserved as source metadata on the following main note, but are not yet emitted into runtime notation

Current grace handling modes:

- `source-only`: keep grace metadata in the draft / report layer only
- `payload-metadata`: also write grace attachments into `runtimePayload.vtabs_import.graceAttachments` for future runtime integration

Not yet covered as first-class generator features:

- repeat bars and endings
- DS/DC navigation
- grace notes
- slurs and ornament clusters
- directive-heavy legacy syntax such as `{play:...}`, `{bpm:...}`, dynamics, tips
- multiple simultaneous voices

## Validation Standard

Use the batch auditor to validate the current chain on a local XML corpus:

```bash
npm run audit:song-ingest-batch -- private/openewld/dataset --template=happy-birthday-to-you --auto-transpose=o12 --limit=50 --report=exports/song-ingest/batch-audit.json
```

The auditor checks:

- MusicXML extraction warnings by category
- generated Happy123 feature usage
- round-trip equality between:
  - `draft.happi123Draft.notationText`
  - generated runtime `notation`

Round-trip equality means:

- same event count
- same event durations
- same event kinds
- same MIDI sequence after the selected transpose

## Working Rule

When the batch audit exposes failures, fix the generator by failure category instead of adding more parallel conversion routes.
