# Song Ingest Operator Runbook

Canonical operator playbook for local `MusicXML` / `MXL` song ingest.

Use this when the goal is not just "generate something", but to move a song through a stable,
repeatable path that a new engineer or a fresh AI session can execute without re-discovering rules.

This document is the shortest end-to-end guide. Deeper rule docs still exist:

- input model and source boundary: `docs/song-ingest-input-spec.md`
- publication review rules: `docs/song-ingest-publication-playbook.md`
- public instrument exposure rules: `docs/public-instrument-selection-rules.md`
- runtime manual QA: `docs/manual-runtime-qa-checklist.md`

## Goal

For each candidate song, we want:

1. one standard source-to-candidate path
2. one standard external-review record
3. one standard readiness check before promote / publish
4. no hidden "remember to also do X" rules living only in chat history

This document is intentionally operator-oriented. A new engineer should be able to follow it
without already knowing the historical chat decisions behind the ingest pipeline.

## Scope

This runbook is for songs that originate from local `MusicXML` / `MXL` sources such as:

- `private/openewld/dataset/**`
- locally collected public-domain XML files
- approved MuseScore-derived XML candidate files after source selection

It is not the playbook for:

- direct Kuailepu song import
- converter research / overlap-sample grammar analysis
- corpus regeneration / OpenEWLD upstream normalization

Routine import work starts from an already-prepared XML or MXL file on disk.

## Core Product Truth To Keep In Mind

- Public song pages are driven by authorized-runtime-compatible JSON plus the integrated runtime path.
- Candidate-only ingest artifacts belong under `reference/song-publish-candidates/**` until publish approval.
- Public layer files belong under:
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
- Public pages use one shared published melody/keynote per song page.
- Instrument switching changes interpretation and fingering exposure, not the song's published melody key.

## Non-Negotiable Rules

- Do not publish directly from raw `MusicXML`.
- Do not skip external melody/version verification for local-ingest songs.
- Do not treat local preview success as publication proof.
- Do not silently hide suspicious lyrics before a human has seen them.
- Do not move unpublished songs into public learn/hub links early.
- Do not bypass runtime validation just because the candidate is synthetic.
- Do not bypass the standard wrapper command for routine ingest unless you are debugging the pipeline.
- Do not commit candidate-only files under `reference/song-publish-candidates/**` as if they were public release data.
- Do not publish a song that still needs the human reviewer to inspect it.
- Do not silently switch to a different XML source or different song when the approved target has problems.
- Do not forget the instrument-fingering hard rules in `docs/public-instrument-selection-rules.md`; they are part of the release gate, not a cosmetic preference.

## Network Split

- China-reachable VPN:
  - Kuailepu login
  - Kuailepu import / compare / live-context debugging
- Foreign VPN preferred:
  - Google
  - Wikipedia
  - IMSLP
  - MuseScore cross-checks
  - western public-domain references

Do not assume both are reachable at once.

## Directory And Artifact Map

Know where each stage belongs:

- Upstream XML corpus:
  - `private/openewld/dataset/**`
- Candidate draft:
  - `reference/song-publish-candidates/drafts/<slug>.json`
- Candidate runtime:
  - `reference/song-publish-candidates/runtime/<slug>.json`
- Candidate compact songdoc:
  - `reference/song-publish-candidates/songdocs/<slug>.json`
- Candidate report:
  - `reference/song-publish-candidates/reports/<slug>-report.json`
- Candidate source sanity:
  - `reference/song-publish-candidates/source-sanity/<slug>.json`
- External review ledger:
  - `reference/song-publish-candidates/review-log.json`
- Public runtime after approval:
  - `data/kuailepu-runtime/<slug>.json`
- Public songdoc after approval:
  - `data/kuailepu/<slug>.json`

Operational rule:

- candidate generation may write to `reference/song-publish-candidates/**`
- only publish approval may move material into `data/**`
- local preview may read candidate runtime JSON, but that is not publication

## Source Selection Checklist Before You Run Anything

Before ingest, confirm the source file itself is worth spending time on.

Prefer a source that is:

1. the common public version users expect
2. clearly melody-led rather than accompaniment-led
3. structurally complete enough for a public song page
4. not obviously multi-voice-noisy when a cleaner source exists

Red flags that should make you switch source or hold the song early:

- starts at a bridge, coda, reprise, or odd arrangement intro
- only partial chorus / fragment
- lyrics contain verse numbers, OCR noise, unmatched quotes, or standalone punctuation everywhere
- complex multi-voice reduction clearly confuses the melody line
- measures/rhythm look suspicious before preview even starts

For public-domain catalog work, it is better to skip a noisy XML and use a different source later than
to push a doubtful conversion through publication.

## Standard Single-Song Path

Fastest standard entry:

```bash
npm run ingest:song-candidate -- <input.xml|input.mxl> \
  --slug=<slug> \
  --title="Song Title" \
  --family=folk \
  --lyric-policy=show-publicly
```

This wrapper is now the standard candidate path.

It writes the standard draft/runtime/songdoc/report/sanity outputs and, by default:

- resolves runtime BPM from manual override or source metadata before falling back
- runs runtime fingering optimization automatically
- applies melody-first overlap filtering so competing overlapping notes inside one selected source voice do not silently replace the likely lead melody
- writes punctuation-free aligned lyric slots for stable note-to-lyric matching
- keeps a separate display lyric layer so punctuation stays attached to words instead of consuming slots
- writes a runtime audit marker into candidate runtime JSON

Use `--tempo-bpm=<number>` when external verification establishes a better BPM than the source file.
Only use `--skip-runtime-fingering-optimize=true` for bulk staging/debug work that is explicitly not
ready for publish review yet.

Routine rule:

- for normal import work, use `npm run ingest:song-candidate`
- only fall back to `prepare:song-ingest` and `generate:kuailepu-from-ingest` separately when diagnosing
  a pipeline issue or when you explicitly need an intermediate draft inspection step

### 1. Prepare draft

```bash
npm run prepare:song-ingest -- <input.xml|input.mxl> \
  --title="Song Title" \
  --slug=<slug> \
  --family=folk \
  --lyric-policy=show-publicly
```

Preferred persisted output:

```bash
npm run prepare:song-ingest -- <input.xml|input.mxl> \
  --title="Song Title" \
  --slug=<slug> \
  --family=folk \
  --lyric-policy=show-publicly \
  --out=reference/song-publish-candidates/drafts/<slug>.json
```

Expected artifact:

- `reference/song-publish-candidates/drafts/<slug>.json`
- `reference/song-publish-candidates/source-sanity/<slug>.json`

What to inspect if you run the draft step manually:

- extracted title / slug look sane
- warnings do not suggest the source begins mid-song
- warnings do not show severe lyric or overlap anomalies without explanation
- the selected melody voice is plausibly the main tune

### 2. Generate candidate runtime + songdoc

```bash
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json \
  --template=happy-birthday-to-you \
  --slug=<slug> \
  --title="Song Title" \
  --auto-transpose=o12
```

Expected artifact set:

- `reference/song-publish-candidates/runtime/<slug>.json`
- `reference/song-publish-candidates/songdocs/<slug>.json`
- `reference/song-publish-candidates/reports/<slug>-report.json`
- `reference/song-publish-candidates/source-sanity/<slug>.json`

Important generation truths:

- explicit bar tokens such as `|` must survive into runtime notation
- `{bpm:...}` must survive into runtime notation
- extracted chord names should stay when the source actually provides harmony
- runtime fingering optimization must complete before the song is treated as publish-ready
- public fingering candidates are generated from our import-side rules and then re-ranked by runtime audit
- do not copy template cache fields such as `mpn` or other stale runtime blobs into the final candidate

### 2.5 Candidate generation checklist

After the wrapper or manual generation finishes, verify these before moving on:

1. the candidate runtime file exists
2. the candidate songdoc exists
3. the candidate report exists
4. the source sanity file exists
5. runtime metadata shows fingering audit status `optimized`
6. runtime payload has a BPM value
7. runtime notation still includes a resolved `{bpm:...}` directive

### 3. Run the ingest doctor

```bash
npm run doctor:song-ingest -- <slug>
```

Interpretation:

- `blocked`
  - candidate artifacts are incomplete, or HC consistency is in `warning`
- `review-needed`
  - automatic generation completed, but external verification is not yet recorded
- `ready-to-promote`
  - candidate is generated and review is recorded; still local-only
- `publish-layer-incomplete`
  - promoted into `data/`, but manifest / SEO work is incomplete
- `ready-to-publish`
  - promoted, reviewed, and metadata is prepared; run final validation/preflight
- `published`
  - already in the public layer

Operator rule:

- do not move forward while status is `blocked`
- do not treat `review-needed` as publishable
- use `doctor:song-ingest` as the single source of truth for "what is still missing"

### 4. External verification is mandatory

External verification happens before the human publication review of the page.
Do not ask the reviewer to inspect a song that has not already passed the lightweight external web check.

Preferred lightweight review record:

```bash
npm run record:song-ingest-review -- <slug> \
  --status=verified \
  --approve=true \
  --refs=Wikipedia,MuseScore \
  --summary="Opening title, melody, and source version verified."
```

Record at least:

- references checked
- title / attribution result
- opening lyric match result
- opening melody contour result
- whether the source starts at the main tune
- remaining risk / variant note
- approve / hold decision

Minimum review targets:

1. title and attribution
2. opening lyric identity when lyrics exist
3. opening melody contour
4. source starts at the common tune, not bridge/coda/fragment
5. if source sanity or draft warnings mention overlapping competing notes, manually confirm the kept line is truly the main melody
6. if the source lacks BPM or the BPM looks suspicious, confirm a usable tempo from an external reference or record that a manual fallback was chosen

Preferred execution order for every XML song:

1. generate candidate
2. run `doctor:song-ingest`
3. do external verification and record it
4. only then ask for / do human page review
5. only after approval publish to `data/**`

Preferred references:

- IMSLP / Mutopia / Library of Congress
- Wikipedia for identity / attribution
- trusted traditional / hymn archives
- MuseScore as secondary cross-check, not sole authority

For local `MusicXML` songs, external verification is not optional just because the parser succeeded.
It exists to answer a different question:

- "Is this the common public song/version users expect?"

not merely:

- "Can our runtime render it?"

Legacy compatibility:

- `reference/song-publish-candidates/review-notes/<slug>.md` is still accepted
- but the central `reference/song-publish-candidates/review-log.json` ledger is now the preferred operator path

When to hold instead of approve:

- melody identity is uncertain
- source appears to start from the wrong section
- lyrics are visibly corrupted and cannot be confidently repaired
- rhythm/measures are suspicious enough that the public page would mislead users
- a cleaner source likely exists and would be faster than patching a bad one

### 5. Local preview and manual QA

Open:

- `/dev/kuailepu-preview/<slug>`
- `/dev/unpublished-song-preview`
- `http://127.0.0.1:3000/song/<slug>` only after promote

Required automated checks before public publish:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Use `docs/manual-runtime-qa-checklist.md` when the song is near publication or when runtime-facing
rules changed.

For routine song-level QA, the operator should still explicitly check:

1. melody pitch sounds correct in the public page
2. rhythm feels correct enough; if metronome reveals obvious timing mismatch, stop
3. barlines are plausible and not drifting across the piece
4. lyrics align to the intended notes
5. punctuation is attached to words rather than occupying its own lyric slot
6. verse numbers like `1.` / `2.` are not leaking into public lyric slots
7. switching instrument/fingering actually changes the displayed note labels / fingering graph as expected
8. default fingering choice is reasonable and does not prefer extension-heavy options when cleaner ones exist
9. unsupported instruments are hidden rather than exposed as broken fallbacks
10. playback/metronome opens without obvious tempo surprises

If the reviewer finds a concrete issue, fix it first and then ask:

- was this a one-off source cleanup only
- or does it reveal a reusable ingest rule that belongs in code/doc

The pipeline should improve from repeated real cases. Do not keep the fix only in memory.

## Lyrics Rules That Must Not Be Forgotten

These rules are part of the standard ingest behavior and QA expectations:

1. `alignedLyrics` is the alignment truth source.
2. `lyrics` is the display layer.
3. punctuation must not consume lyric slots.
4. punctuation should stay attached to neighboring words where safe.
5. stray verse numbers such as `1.` / `2.` should not leak into public lyric alignment.
6. unmatched quotes or isolated punctuation are review signals.
7. if lyrics are suspicious, keep them visible in candidate review first; do not silently strip before human review.
8. if a public release still cannot support trustworthy lyrics, make that an explicit review decision rather than an accidental side effect.

Practical implication:

- many apparent lyric bugs are not "wrong words"
- they are slot-allocation bugs caused by punctuation, verse markers, repeated refrain offsets, or noisy source lyrics

## Measure / Rhythm / BPM Rules That Must Not Be Forgotten

1. Happy123 / Kuailepu line breaks are layout only.
2. Every real measure end must be encoded explicitly with a bar token such as `|`.
3. Any notation rewrite must preserve `{bpm:...}`.
4. A runtime payload BPM value without `{bpm:...}` is not enough; both must survive.
5. If a source has ambiguous multi-voice timing, preview the rhythm with extra skepticism.
6. If metronome/playback obviously exposes the wrong measure timing, hold the song or change source rather than pretending the page is good enough.

BPM policy:

1. use source BPM when it is present and believable
2. if source BPM is missing or weak, use `--tempo-bpm=<number>` once external review establishes a better tempo
3. if no strong source exists, use a reasonable fallback and record that fact in the review summary
4. never publish a candidate missing a resolved runtime BPM

## Fingering / Instrument Rules That Must Not Be Forgotten

Public exposure rules are documented in `docs/public-instrument-selection-rules.md`.
For routine ingest, the operator must remember the following release consequences:

1. one song page has one shared published key
2. instrument switching does not repitch the melody per instrument
3. runtime fingering audit is the authoritative public exposure gate
4. if one all-closed or all-open outline maps to more than two distinct pitches, reject that candidate
5. all-closed/all-open used for the normal boundary note is fine
6. only the extra soft-blow / strong-blow extension beyond the natural boundary counts as "extreme"
7. non-extreme viable candidates must rank ahead of extreme-extension candidates
8. for `r8b`, `r8g`, `w6`, prefer candidates whose boundary outline serves only one pitch when such options exist
9. if no clean/acceptable candidate survives, hide the instrument instead of reinserting a bad fallback

Operator interpretation:

- it is acceptable for a song to lose one secondary instrument under the current shared-key model
- it is not acceptable to re-expose a known-bad fingering candidate merely to avoid an empty dropdown

## Metadata / SEO / Public-Layer Work

Once the candidate itself is approved, finish the public layer deliberately.

Before public publish, ensure:

1. `data/songbook/public-song-manifest.json` has the song entry
2. `published: true` is correct for the release decision
3. `featuredRank` is set so the song enters the recent/release flow correctly
4. `data/songbook/song-seo-profiles.json` has page copy
5. stable aliases are filled when the song has alternate English names / common translated names
6. relevant internal links are added only when the song is really approved for public release
7. grey-song rollout files are updated only when the song is a grey song

Do not forget:

- candidate-only work should stop before public manifest / SEO publication changes if the user asked not to publish yet
- recent/new modules are fed by manifest state; they should not be hand-maintained separately per song

### 6. Promote only after review passes

```bash
npm run promote:song-ingest-candidate -- <slug>
```

This copies only the runtime/songdoc payloads into the public data layer.
It now refuses by default when any of these are missing:

- candidate report
- source sanity
- approval-grade external review evidence
- runtime fingering audit marker with `optimized` status
- resolved `{bpm:...}` directive in runtime notation

That gate exists to prevent "jumping straight into data/" with an incompletely reviewed candidate.

It does not replace:

- SEO profile work
- manifest work
- aliases
- FAQ copy
- final validation

Operational reminder:

- `promote` is a technical step
- it is not the final approval decision by itself

### 7. Complete public-layer metadata

Before publication, ensure:

- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`
- aliases are present when the song has stable alternate English names / translated names
- learn / hub links are added only if the song is actually approved for public release

If the user is using a staged "prepare now, publish later" flow:

- candidate runtime/songdoc and review evidence may exist locally
- but `data/**` promotion, manifest inclusion, and push should wait until explicit publication approval

### 8. Final publish gate

Preferred final command:

```bash
npm run publish:song-ingest-candidate -- <slug>
```

This canonical publish entry now runs:

- promote candidate runtime/songdoc
- pack deployable runtime archive
- `doctor:song-ingest`
- `validate:content`
- `validate:songbook`
- `doctor:song`
- `preflight:kuailepu-publish`

Equivalent manual checks:

```bash
npm run doctor:song-ingest -- <slug>
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug>
```

Public publish is ready only when:

- `doctor:song-ingest` is no longer `blocked` / `review-needed`
- external review record exists
- manifest entry exists
- SEO profile exists
- final validation passes

Recommended routine:

- use `npm run publish:song-ingest-candidate -- <slug>` as the normal publish command
- after that, inspect git diff so only intended public-layer files are committed
- do not accidentally commit candidate work artifacts unless there is an explicit reason

## Batch Workflow

For large corpora:

1. batch-generate candidates
2. batch-audit
3. batch-classify
4. export a review queue
5. review only the highest-value songs
6. publish in small daily batches

Core commands:

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset ...
npm run audit:song-ingest-batch -- private/openewld/dataset ...
npm run classify:song-ingest-batch -- ...
npm run export:song-ingest-review-queue -- ...
```

Even in batch mode, every song still needs:

- per-song external review evidence
- per-song `doctor:song-ingest` passable state
- per-song publish metadata
- per-song runtime fingering audit completion before promote

Practical release policy:

- it is fine to batch-prepare many songs locally
- it is preferable to publish only a small approved subset each day
- do not mistake a staged local queue for a public-ready queue

## Definition Of Done

A local-ingest song is ready for public release only when all are true:

- candidate draft exists
- candidate runtime exists
- candidate songdoc exists
- candidate report exists
- source sanity exists
- HC consistency is not `warning`
- external review record exists
- SEO profile exists
- manifest entry exists
- aliases are filled when applicable
- validate/content/song doctor/preflight pass

## Default Troubleshooting

- `doctor:song-ingest` says `blocked`
  - missing artifacts or generator inconsistency; fix generation first
- lyrics look suspicious
  - keep them visible in local candidate preview, record the suspicion in the review ledger, do not silently strip first
- source sanity says `review`
  - this is not auto-fail by itself; it means a human must explicitly clear the source/version risk
- synthetic song skips live Kuailepu compare
  - expected; local-ingest songs still need runtime validation plus external verification
- a song preview sounds melodically wrong
  - suspect source quality, wrong melody voice, or overlap-filter edge case before blaming public shell code
- barlines drift or metronome reveals impossible measure timing
  - suspect source timeline quality or multi-voice timing loss; do not publish until resolved or replaced
- one instrument disappears after optimization
  - expected if no acceptable candidate survives the shared-key + runtime-audit rules
- a fallback candidate with heavy soft/strong-breath extension becomes default
  - this is a rule regression; inspect runtime fingering ordering and audit output

## Current Canonical Commands

```bash
npm run ingest:song-candidate -- <input.xml|input.mxl> --slug=<slug> --title="Song Title" --family=folk --lyric-policy=show-publicly
npm run prepare:song-ingest -- <input.xml|input.mxl> --slug=<slug> --out=reference/song-publish-candidates/drafts/<slug>.json
npm run generate:kuailepu-from-ingest -- reference/song-publish-candidates/drafts/<slug>.json --template=happy-birthday-to-you --slug=<slug> --auto-transpose=o12
npm run doctor:song-ingest -- <slug>
npm run record:song-ingest-review -- <slug> --status=verified --approve=true --refs=Wikipedia,MuseScore --summary="External review passed."
npm run promote:song-ingest-candidate -- <slug>
npm run publish:song-ingest-candidate -- <slug>
```

## Minimal Operator Checklist

Use this when you just need the strict order without the explanation:

1. choose the best available XML/MXL source
2. run `npm run ingest:song-candidate -- ...`
3. run `npm run doctor:song-ingest -- <slug>`
4. do external verification and record it with `npm run record:song-ingest-review -- ...`
5. open local preview and manually verify melody, rhythm, lyrics, fingering defaults, and instrument exposure
6. if the song is candidate-only, stop here and keep it under `reference/song-publish-candidates/**`
7. if approved for publication, update manifest + SEO + aliases + needed internal links
8. run `npm run publish:song-ingest-candidate -- <slug>`
9. inspect git diff and commit only the intended public-layer files
10. push only after user approval when the workflow is staged
