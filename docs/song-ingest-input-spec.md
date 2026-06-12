# Song Ingest Input Spec

Use this for songs that are not available through Kuailepu but may enter internal print workflow or later public preparation.

Operator-facing step order:

- `docs/song-ingest-operator-runbook.md`

## Goal

Convert outside sources into a stable internal draft. Do not treat MusicXML/MIDI as the public production format, and do not bypass runtime validation for public songs.

## Source Boundary

Keep these stages separate:

1. upstream corpus preparation
2. local MusicXML ingest
3. public publication review

For the current 500-song public-domain XML corpus, the upstream preparation step is already done.
That corpus lives under `private/openewld/dataset` and comes from an OpenEWLD-derived offline
normalization process.

Important:

- OpenEWLD is the upstream corpus-preparation layer
- it is not a command that runs automatically inside `npm run prepare:song-ingest`
- current ingest commands read the already-prepared `.xml` / `.mxl` files directly
- local candidate runtime JSON under `reference/song-publish-candidates/runtime/**` can still be used by local preview/debug tooling
- if we ever refresh the corpus from more raw sources, that would be a separate offline dataset task, not part of routine per-song import

Current practical chain:

`raw external score sources -> OpenEWLD/offline corpus preparation -> private/openewld/dataset -> prepare:song-ingest -> generate:kuailepu-from-ingest -> review -> publish`

For songs that overlap with existing Kuailepu-imported pages, also treat that overlap set as a notation-sample library:

- do not assume Kuailepu is a strict per-song melody truth source
- use strong/partial overlap songs to refine converter rules cautiously
- use weak overlap songs mainly to catalog real Kuailepu grammar and notation habits before expanding generator coverage
- additionally separate overlap samples by engineering usefulness:
  - `converter-training`
  - `structure-variant`
  - `notation-sample`
  - `low-value`
- export the current bucketed overlap view with:
  - `npm run export:song-ingest-overlap-buckets`

Additional candidate-source workflow:

- `docs/musescore-candidate-workflow.md`

## Input Priority

1. MusicXML
2. MIDI
3. structured numbered-notation text
4. image / PDF only as last resort

MusicXML is preferred because it can preserve measures, rhythm, key, repeats, rests, and lyric alignment.

Current caveat: MusicXML can preserve those things in principle, but our current single-voice ingest path does not yet fully preserve every measure-internal timing offset from complex sources.

MuseScore note:

- MuseScore can be used as an upstream candidate source for `MusicXML`
- downloaded MuseScore `MusicXML` still requires selection and verification; do not treat it as canonical by default
- keep raw MuseScore acquisitions under `private/musescore-candidates/**`, not under `reference/song-publish-candidates/**`

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
npm run prepare:song-ingest -- <input.musicxml> [--title=...] [--slug=...] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--out=reference/song-publish-candidates/drafts/<slug>.json]
```

Current scope:

- internal draft only
- uncompressed MusicXML / `.xml`
- compressed MusicXML / `.mxl`
- reads the current file as-is from disk; it does not rerun OpenEWLD corpus normalization first
- outputs recommended title, slug, keynote, tonic MIDI, structured numbered notation, aligned lyrics, MusicXML harmony markers, warnings, and a `happi123Draft.notationText` string in the currently supported Happy123/Kuailepu native syntax subset
- when `--out` is used, also writes a per-song source sanity report to `reference/song-publish-candidates/source-sanity/<slug>.json` unless `--out-sanity` overrides the path

Candidate runtime generation:

```bash
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json \
  --template=happy-birthday-to-you \
  --slug=<slug> \
  --title="Song Title" \
  --auto-transpose=o12 \
  --tempo-bpm=96 \
  --grace-mode=source-only \
  --out-runtime=reference/song-publish-candidates/runtime/<slug>.json \
  --out-songdoc=reference/song-publish-candidates/songdocs/<slug>.json \
  --out-report=reference/song-publish-candidates/reports/<slug>-report.json \
  --out-sanity=reference/song-publish-candidates/source-sanity/<slug>.json
```

This candidate generator:

- converts draft notation into Kuailepu-compatible raw notation through the shared Happy123-native notation generator
- applies a melody-first overlap filter before notation generation so competing overlapping notes do not silently displace the likely lead melody
- stores lyrics in two layers:
  - `alignedLyrics`: punctuation-free slot truth for stable note-to-lyric alignment
  - `lyrics`: display text with punctuation reattached to words where safe
- normalizes runtime lyric text for Happy123/Kuailepu safety so punctuation does not create extra lyric slots
- preserves extracted MusicXML chords as `{cn:...}` notation markers when available
- emits an explicit bar token for every real measure end; do not rely on line breaks as implicit measure separators
- keeps a `{bpm:...}` directive in runtime notation so playback/metronome speed stays tied to the resolved song BPM
- transposes extracted letter chord names together with the melody
- generates public `instrumentFingerings` from our import-side preset/range logic instead of inheriting the template song's full fingering matrix
- defaults to scrubbing template runtime caches such as `mpn`, `music_list`, and `fetch_score`
- writes a range-fit report for the public runtime instruments
- now runs a second pass against the local runtime page by default and reorders each instrument's
  fingering candidates by rendered graph quality instead of trusting the initial import-side recall order
- if no `--rank-base-url` is provided, the generator can start a managed local dev server automatically
- writes runtime audit metadata so later promote/publish gates can prove fingering pruning already ran
- supports `--tempo-bpm=<number>` as a manual override when external review establishes a better BPM
- supports grace handling modes:
  - `source-only` keeps grace notes in ingest metadata only
  - `payload-metadata` also writes structured grace attachments into the generated runtime payload
- includes a `sourceSanity` block in the ingest report so publication review keeps the source-verification context together with the generated runtime report
- emits a warning when the selected melody voice had overlapping competing notes and the melody-first filter had to discard any of them; treat that as a mandatory manual review signal

Batch generation from a local MusicXML corpus:

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset \
  --template=happy-birthday-to-you \
  --auto-transpose=o12 \
  --rank-base-url=http://127.0.0.1:3000 \
  --slug-prefix=openewld- \
  --out-draft-dir=reference/song-publish-candidates/drafts \
  --out-runtime-dir=reference/song-publish-candidates/runtime \
  --out-songdoc-dir=reference/song-publish-candidates/songdocs \
  --out-sanity-dir=reference/song-publish-candidates/source-sanity \
  --report=reference/song-publish-candidates/batch-generate.json
```

Batch generation writes one draft per input file and, when both output dirs are provided,
also writes runtime candidates plus compact SongDocs through the same Happy123-native chain.
If `--rank-base-url` is present and a local dev server is already serving `/song/<slug>` plus
`/api/kuailepu-runtime/<slug>`, the batch script also runs the runtime fingering re-ranker after
all candidates are written.
It now also writes one source sanity report per song under `reference/song-publish-candidates/source-sanity/`
by default, plus a batch summary field `sanityReviewSongs` so suspicious sources stand out before
publication.
Use `--slug-prefix=` and the candidate output dirs so local bulk runs do not accidentally mix with publication-ready files.

Publication workflow details and the required external melody/version verification step:

- `docs/song-ingest-operator-runbook.md`
- `docs/song-ingest-publication-playbook.md`

Important distinction:

- local candidate runtime/songdoc files should stay under `reference/song-publish-candidates/**` until publication is approved
- local MusicXML songs still need runtime validation before publication
- local MusicXML songs still need mandatory external melody/version verification
- Kuailepu live compare is only required when the song maps to a real Kuailepu detail page
- runtime fingering optimization is mandatory before promote; batch-only staging runs may defer it, but publish-ready songs may not

Coverage details and current unsupported areas:

- `docs/happy123-notation-coverage.md`

## Current Known Limitation

- Happy123 / Kuailepu notation can store barlines with `|`.
- Happy123 / Kuailepu line breaks are layout only; they must not be treated as implicit measure boundaries.
- MusicXML also has explicit `<measure>` boundaries.
- Some imported songs still show wrong barline placement after conversion because the current ingest path can lose part of the measure-internal timing structure when:
  - the source relies on `backup` / `forward`
  - the selected melody voice omits explicit rests
  - the source is effectively multi-voice even after choosing one voice
- In those cases, the problem is not “missing barline support”; it is incomplete timeline reconstruction before notation generation.
- The proper future fix is to preserve per-event measure offsets and rebuild explicit rests for the chosen melody voice before writing Happy123/Kuailepu notation.
- Any notation rewrite or post-processing step must preserve both explicit bar tokens and the resolved `{bpm:...}` directive.
- Until that is implemented, treat barline mismatch as a known ingest limitation unless it also causes real melody/rhythm failure.

Not yet covered:

- full Happy123 grammar coverage for every advanced construct already seen in legacy runtime files
- MIDI auto melody-track selection
- full equivalence for complex voices, complex harmony, grace notes, tuplets
- batch folder ingest

## Do Not

- publish directly from MusicXML/MIDI
- skip mandatory external melody/version verification
- skip runtime validation for public songs
- restore old native song page as public route
- expose Chinese/internal runtime provenance wording publicly
- publish unauthorized copyrighted material
