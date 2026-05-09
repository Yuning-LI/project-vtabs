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
- compressed MusicXML / `.mxl`
- outputs recommended title, slug, keynote, tonic MIDI, structured numbered notation, aligned lyrics, MusicXML harmony markers, warnings, and a `happi123Draft.notationText` string in the currently supported Happy123/Kuailepu native syntax subset

Candidate runtime generation:

```bash
npm run generate:kuailepu-from-ingest -- reference/song-ingest-drafts/<slug>.json \
  --template=happy-birthday-to-you \
  --slug=<slug> \
  --title="Song Title" \
  --auto-transpose=o12 \
  --rank-base-url=http://127.0.0.1:3000 \
  --grace-mode=source-only \
  --out-runtime=data/kuailepu-runtime/<slug>.json \
  --out-songdoc=data/kuailepu/<slug>.json \
  --out-report=exports/song-ingest/<slug>-report.json
```

This candidate generator:

- converts draft notation into Kuailepu-compatible raw notation through the shared Happy123-native notation generator
- preserves extracted MusicXML chords as `{cn:...}` notation markers when available
- transposes extracted letter chord names together with the melody
- generates public `instrumentFingerings` from our import-side preset/range logic instead of copying the template song's full fingering matrix
- defaults to scrubbing template runtime caches such as `mpn`, `music_list`, and `fetch_score`
- writes a range-fit report for the public runtime instruments
- when `--rank-base-url` is provided, runs a second pass against the local runtime page and
  reorders each instrument's fingering candidates by rendered graph quality instead of trusting
  the initial import-side recall order
- supports grace handling modes:
  - `source-only` keeps grace notes in ingest metadata only
  - `payload-metadata` also writes structured grace attachments into the generated runtime payload

Batch generation from a local MusicXML corpus:

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset \
  --template=happy-birthday-to-you \
  --auto-transpose=o12 \
  --rank-base-url=http://127.0.0.1:3000 \
  --slug-prefix=openewld- \
  --out-draft-dir=reference/song-ingest-drafts \
  --out-runtime-dir=data/kuailepu-runtime \
  --out-songdoc-dir=data/kuailepu \
  --report=exports/song-ingest/batch-generate.json
```

Batch generation writes one draft per input file and, when both output dirs are provided,
also writes runtime candidates plus compact SongDocs through the same Happy123-native chain.
If `--rank-base-url` is present and a local dev server is already serving `/song/<slug>` plus
`/api/kuailepu-runtime/<slug>`, the batch script also runs the runtime fingering re-ranker after
all candidates are written.
Use `--slug-prefix=` and explicit output dirs so local bulk runs do not accidentally mix with publication-ready files.

Coverage details and current unsupported areas:

- `docs/happy123-notation-coverage.md`

Not yet covered:

- full Happy123 grammar coverage for every advanced construct already seen in legacy runtime files
- MIDI auto melody-track selection
- full equivalence for complex voices, complex harmony, grace notes, tuplets
- batch folder ingest

## Do Not

- publish directly from MusicXML/MIDI
- skip runtime compare gate
- restore old native song page as public route
- expose Chinese/source wording publicly
- publish unauthorized copyrighted material
