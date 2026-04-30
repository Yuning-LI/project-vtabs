# Song Ingest Input Spec

Use this for songs that are not available through Kuailepu but may enter internal print workflow or later public preparation.

## Goal

Convert outside sources into a stable internal draft. Do not treat MusicXML/MIDI as the public production format, and do not bypass Kuailepu/runtime preflight for public songs.

## Input Priority

1. MusicXML
2. MIDI
3. structured numbered-notation text
4. image / PDF only as last resort

MusicXML is preferred because it can preserve measures, rhythm, key, repeats, rests, and lyric alignment.

## Required Metadata

Collect:

- English public title
- original title / aliases
- intended slug
- family: `folk`, `march`, `dance`, `song`, `holiday`, `hymn`, `classical`
- composer / source note
- rights note
- source file
- lyric requirement and language
- public lyric policy

Lyric policies:

- `show-publicly`
- `hide-by-default`
- `do-not-expose-toggle`
- `no-lyrics`

## MusicXML Expectations

Ideal:

- single main melody part
- clear measures
- time signature
- key signature
- rests
- repeats or fully expanded melody
- lyric syllable alignment when lyrics matter

For multi-part MusicXML, pick a main melody part explicitly.

## MIDI Expectations

Minimum:

- identifiable main melody track
- usable rhythm
- not accompaniment-only
- measure boundaries not badly corrupted

MIDI often needs manual track selection and metadata cleanup.

## Current Tool

```bash
npm run prepare:song-ingest -- <input.musicxml> [--title=...] [--slug=...] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--out=reference/song-ingest-drafts/<slug>.json]
```

Current scope:

- internal draft only
- uncompressed MusicXML / `.xml`
- outputs recommended title, slug, keynote, tonic MIDI, structured numbered notation, aligned lyrics, and warnings

Not yet covered:

- MIDI auto melody-track selection
- compressed `.mxl`
- full equivalence for complex voices, chords, grace notes, tuplets

## Do Not

- publish directly from MusicXML/MIDI
- skip runtime compare gate
- restore old native song page as public route
- expose Chinese/source wording publicly
- publish unauthorized copyrighted material
