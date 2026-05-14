# MuseScore Candidate Workflow

Use this when a target song is easier to source from MuseScore than from Kuailepu or the current
OpenEWLD corpus.

## Role In The Pipeline

MuseScore is a **candidate source layer**, not a publication truth layer.

Use it for:

- finding multiple versions of the same melody
- downloading `MusicXML` / `PDF` / `MIDI` candidates quickly
- comparing openings and arrangement choices across versions

Do not use it as the only proof that a version is correct for publication.

## Source Rule

Keep these three layers separate:

1. candidate acquisition
2. technical ingest
3. public melody verification

MuseScore belongs only to layer 1.

That means:

- a MuseScore `MusicXML` file may be a good ingest input
- a MuseScore upload may still be a simplified, transposed, excerpted, or user-edited version
- publication still requires external melody/version verification against better public references

## Network Rule

MuseScore candidate work usually behaves more like western-web research than China-only Kuailepu work.

Practical default:

- prefer a foreign VPN when searching MuseScore or downloading from it
- if the current network cannot reach MuseScore reliably, switch before treating the source as blocked

## Recommended Folder Layout

Store MuseScore candidate inputs under:

`private/musescore-candidates/<slug>/<source-id>/`

Typical files:

- `source.json`
- `source.url.txt`
- downloaded `musicxml`
- downloaded `pdf`
- downloaded `midi`
- optional local notes

Do not mix these with `reference/song-publish-candidates/**`.

Reason:

- `private/musescore-candidates/**` is raw source acquisition
- `reference/song-publish-candidates/**` is our processed candidate output

## Download Helper

Project helper:

```bash
npm run fetch:musescore-candidate -- \
  --input="https://musescore.com/user/123/scores/456" \
  --slug=my-song \
  --source-id=source-1 \
  --title="My Song" \
  --types=musicxml,pdf,midi
```

This will:

- create `private/musescore-candidates/my-song/source-1/`
- call `dl-librescore`
- write `source.json`
- save the input URL in `source.url.txt` when applicable

If you already downloaded files manually, you can still normalize the folder structure:

```bash
npm run fetch:musescore-candidate -- \
  --input="https://musescore.com/user/123/scores/456" \
  --slug=my-song \
  --source-id=source-2 \
  --copy-from=/absolute/path/to/downloaded-files
```

## Selection Rule

Prefer versions that are:

- single-melody or melody-dominant
- clearly measured
- lyric-aligned when lyrics matter
- close to the common public opening
- not overloaded with accompaniment voices

Avoid versions that are:

- piano reductions with buried melody voices
- obviously excerpted intros, bridges, or codas
- transposed teaching variants unless the melody identity is still clean
- overly ornamented or arrangement-specific rewrites

## Practical Import Flow

Recommended flow:

1. download 2 to 5 MuseScore candidates for the same song
2. keep all raw files under `private/musescore-candidates/<slug>/`
3. choose the most melody-clean `MusicXML`
4. if needed, do offline normalization with `music21` before project ingest
5. run `npm run prepare:song-ingest -- <candidate.musicxml>`
6. run `npm run generate:kuailepu-from-ingest -- ...`
7. run runtime QA and external melody/version verification
8. only then promote into public publication files

Important:

- `music21` normalization is optional and external to the current npm scripts
- do not pretend that “converted successfully” means “publicly correct”

## Correctness Check Rule

MuseScore can help with verification, but only as supporting evidence.

Good use:

- compare two or more independent MuseScore versions
- check whether the opening melody contour is stable across versions
- use downloaded `PDF` as a fast human review surface

Not enough by itself:

- one random MuseScore upload
- one generated `MusicXML` that merely parses cleanly

Publication still needs:

- a trusted public reference when possible
- title/composer/version confirmation
- opening melody confirmation

## Minimal Working Standard

Before importing a MuseScore-based source into the public candidate pipeline, confirm:

1. at least one candidate has a clean main melody
2. the opening matches user expectation for that song
3. the source is not just an arrangement fragment
4. our generated SongDoc and runtime preview look structurally sane

If those pass, MuseScore is a valid upstream acquisition path for our existing MusicXML ingest flow.
