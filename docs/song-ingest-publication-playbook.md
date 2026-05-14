# Song Ingest Publication Playbook

Use this when publishing songs that originate from local `MusicXML` / `MXL` files rather than from Kuailepu.

For the shortest operator path, start with:

- `docs/song-ingest-operator-runbook.md`

## Goal

Keep two truths separate:

1. **Technical ingest success**
   The song can be parsed, converted, and rendered through the Kuailepu runtime path.
2. **Public melody correctness**
   The source is the common version that search users expect, not a fragment, bridge-only extract, or uncommon arrangement.

Both are required before public publication.

## Required Pipeline

If the source song is being acquired from MuseScore first, use:

- `docs/musescore-candidate-workflow.md`

### 1. Generate local candidates

```bash
npm run generate:song-ingest-batch -- private/openewld/dataset \
  --slug-prefix=openewld- \
  --out-draft-dir=reference/song-publish-candidates/drafts \
  --out-runtime-dir=reference/song-publish-candidates/runtime \
  --out-songdoc-dir=reference/song-publish-candidates/songdocs \
  --out-sanity-dir=reference/song-publish-candidates/source-sanity \
  --report=reference/song-publish-candidates/batch-generate.json
```

This produces:

- per-song draft JSON
- per-song `source sanity` JSON
- a batch generation summary

### 2. Run technical ingest audit

```bash
npm run audit:song-ingest-batch -- private/openewld/dataset \
  --template=happy-birthday-to-you \
  --auto-transpose=o12 \
  --report=tmp/openewld-<date>/batch-audit.json
```

This checks:

- round-trip notation stability
- explicit measure-bar preservation across line breaks
- runtime tempo-directive preservation
- grace-note / tuplet / multi-voice risks
- unsupported grammar categories

### 3. Classify candidates

```bash
npm run classify:song-ingest-batch -- \
  --generate-report=reference/song-publish-candidates/batch-generate.json \
  --audit-report=tmp/openewld-<date>/batch-audit.json \
  --out=reference/song-publish-candidates/classified.json
```

Current buckets mean:

- `publish`: technically stable, no automatic source-risk flag
- `review`: technically stable, but source sanity or source structure needs human confirmation
- `reject`: generation/audit failed; do not publish

Important: `publish` means **candidate for public review**, not “already safe to publish”.

### 4. Export a web-review queue

```bash
npm run export:song-ingest-review-queue -- \
  --classified-report=reference/song-publish-candidates/classified.json \
  --sanity-dir=reference/song-publish-candidates/source-sanity \
  --bucket=publish \
  --limit=50 \
  --out=reference/song-publish-candidates/publish-review-queue.md
```

The queue includes:

- slug and source file
- opening lyric fragment
- opening note names
- suggested search queries
- next action

## Mandatory External Verification

Before a song enters the public import/publish layer, do a lightweight web verification.

This verification is about **public melody identity**, not Kuailepu parity.
Do not treat local parse success, synthetic runtime generation, or a passing build as proof that
the public song is the common version users expect.

### What to compare

Check at least these:

1. title and composer match the expected song
2. opening lyric line matches the expected version when lyrics exist
3. opening melody contour matches a common public version
4. the source begins at the main tune, not a bridge, coda, or verse-only fragment

### Required review record

For every MusicXML song approved for publication, keep a short internal review note covering:

1. which references were checked
2. whether title/composer attribution is exact, approximate, or traditional/anonymous
3. whether the lyric opening matches the common version, a known variant, or no public lyric target
4. whether the opening melody contour was confirmed against a public reference
5. whether any risk remains, such as alternate verses, arrangement-specific pickup bars, or unclear attribution

Do not move a song into the public manifest until this review is complete.

If lyric extraction looks suspicious but the melody candidate is still worth reviewing:

- keep the lyric track visible in the local candidate / unpublished preview layer
- record the exact suspicious lines or tokens in the internal review note
- do not silently strip or hide the lyrics before a human reviewer has seen the problematic text
- only hide public lyrics after an explicit review decision

### Variant handling rule

If the source is a known alternate version:

1. keep it unpublished unless the variant is still a common search target
2. make the page title and aliases describe the version honestly
3. do not present a less-common verse opening or arrangement fragment as if it were the default canonical tune

### Runtime gate vs external verification

Keep these checks separate:

1. **External verification**
   Confirms that the song identity and melody version are correct for public users.
2. **Runtime validation**
   Confirms that our generated raw JSON, SongDoc, page shell, and Kuailepu-compatible renderer still work technically.
3. **Kuailepu live compare**
   Only applies when the song actually maps to a real Kuailepu detail page.

For local MusicXML songs with a synthetic `song_uuid` such as `synthetic-<slug>`:

- do not block publication on Kuailepu live compare
- do still run the normal local runtime validation commands
- do still complete mandatory external verification against public references

### Network rule

Use the network that matches the job:

- Kuailepu login / import / live compare: China-reachable network required
- External melody/version verification: whichever network can reach the best public references

Practical default:

- foreign VPN is preferred for Google, Wikipedia, IMSLP, Library of Congress, Mutopia, and western educational references
- China VPN is acceptable only when the chosen references are still directly reachable and sufficient for review
- if the target references are blocked or incomplete on the current network, switch VPN before approving publication

### Acceptable reference types

Prefer primary or widely trusted sources:

- IMSLP / Mutopia / Library of Congress
- public-domain hymn or folk archives
- reputable ABC / lead-sheet references
- well-known educational sheet-music references

Supporting-source note:

- MuseScore can help as a candidate-acquisition source or as secondary cross-check evidence
- do not let one MuseScore upload replace the stronger references above when those are available

### Do not trust by itself

- AI summaries
- random tab sites with no score reference
- user uploads with unclear version provenance

## Publication Rule

Only after the external verification step passes should a song move into:

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`
- learn / hub / rollout files as needed

Promote the candidate runtime artifacts first:

```bash
npm run promote:song-ingest-candidate -- <slug...>
```

Then run:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
```

Before approving a notation-only maintenance rewrite, also confirm:

- every real measure end is still explicitly encoded in runtime notation instead of relying on line breaks
- the runtime notation still contains a resolved `{bpm:...}` directive
- note / rest counts still match the public SongDoc melody

For MusicXML songs whose runtime payload uses a synthetic `song_uuid`, `preflight:kuailepu-publish`
may skip Kuailepu live compare automatically. That is expected and should not be treated as a failure
by itself.

## Working Rule

- `review` bucket songs: external verification is mandatory before any publish decision.
- `publish` bucket songs: still require external verification before public import.
- `reject` bucket songs: fix source or ingest first; do not review for release.

## Practical Default

For large corpora:

1. generate everything locally
2. classify everything
3. pick a small `publish` subset based on Google value
4. web-verify that subset
5. publish in batches

This keeps the ingest pipeline fast without pretending that automatic parsing alone proves public correctness.
