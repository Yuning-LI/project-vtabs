# Public Instrument Selection Rules

This document consolidates the current song-level transposition, instrument-fit, fingering recall,
and runtime fingering exposure rules for the public song pages.

Use it when touching:

- MusicXML ingest publication
- generated `instrumentFingerings`
- public instrument support decisions
- fingering candidate ranking or pruning
- runtime graph quality rules

## Scope Boundary

Keep these layers distinct:

1. song-level transposition
2. candidate fingering recall
3. runtime graph audit and public exposure

Do not mix them casually.

The current public product still uses one published `keynote` per song page.
It does **not** maintain a separate transposed melody per instrument.

That means:

- a song may be published in a key that suits `o12`
- another public instrument such as `o6` may then disappear if all of its fingering candidates fail runtime audit
- this is expected under the current one-song-one-keynote model

If per-instrument transposed editions are ever introduced, that is a separate product/runtime design project.

## Song-Level Transposition Rules

Current implementation:

- `src/lib/songbook/rangeFit.ts`
- `src/lib/songbook/kuailepuIngest.ts`

### Per-instrument recommended shift

When trying to fit one melody into one target instrument range, choose the best overall shift with this priority:

1. minimize out-of-range note count
2. minimize total overflow distance
3. prefer octave-aligned shifts when available
4. prefer smaller absolute shift
5. prefer the melody closer to the instrument range center

This is the current rule implemented by `chooseBestRangeShift(...)`.

### Coverage mode

When `auto-transpose=coverage` is used, select one shared song-level shift for the public instrument set with this priority:

1. if shift `0` already gives at least one supported public instrument, keep `0`
2. maximize the number of public instruments with zero out-of-range notes
3. minimize total out-of-range note count across instruments
4. minimize total overflow distance across instruments
5. prefer octave-aligned shifts
6. prefer smaller absolute shift
7. prefer lower total center penalty

### Important product rule

Transposition is applied at the **song** level, not the individual fingering-option level.

Do not silently add per-instrument repitching inside runtime fingering switching.
That would break the current assumption that:

- one public page has one melody/keynote truth
- instrument/fingering changes only alter the public reading / graph interpretation layer

## Candidate Fingering Recall Rules

Current implementation:

- `src/lib/songbook/kuailepuIngest.ts`

### Broad recall first

Generated candidate recall should stay intentionally broad.

Do not aggressively delete candidates in the generation layer just because a fingering's absolute tonic looks high/low.
The current runtime path can still render some of those candidates acceptably after graph interpretation.

This is why generation does **not** use fixed range pruning on candidate fingering tonics.

### Allowed-key filter

Generated candidates are still constrained by each instrument preset's allowed key tokens.

### Ocarina reference priority

For `o6` and `o12`, candidate ordering should continue to use the Kuailepu ocarina reference key order encoded from the online fingering chart table.

Current reference order:

- `o6`: `F4`, `G4`, `bB4`, `C5`, `D5`, `F5`, `G5`
- `o12`: `F4`, `G4`, `bB4`, `C5`, `D5`, `F5`, `G5`, `bB5`, `C6`

When generation-layer register penalties are close, prefer the better Kuailepu reference priority instead of random ordering.

### Generation-layer ranking priorities

Current generated candidate ranking prefers:

1. smaller pitch-class distance to the target key
2. when register penalty difference is small, better ocarina reference priority
3. smaller register penalty
4. smaller fingering tonic MIDI
5. stable lexical fallback

## Runtime Graph Audit Rules

Current implementation:

- `scripts/optimize-runtime-fingerings.ts`

Runtime graph audit is the authoritative public exposure gate.
Generation may recall broadly, but public pages should only expose candidates that survive runtime audit.

Operational publication rule:

- publish-ready runtime JSON must carry a `vtabs_import.runtimeFingeringAudit.status="optimized"` marker
- candidate promote/publish should be blocked if that marker is missing or still `pending`

### Generic graph quality signals

The current runtime audit penalizes or rejects candidates when graph evidence suggests that:

- too few unique outlines are carrying too many notes
- ambiguous outline reuse is too high
- extreme outlines dominate too much of the melody
- one outline is reused across too many distinct pitch labels

These generic rules apply to the public wind instruments.

### Extreme-outline hard rule

For the current public wind instrument set:

- `o12`
- `o6`
- `r8b`
- `r8g`
- `w6`

do not expose a candidate when one all-closed or all-open outline is reused across more than two distinct pitches.

Operationally:

- if one all-closed or all-open outline maps to more than `2` distinct pitches, reject the candidate from public exposure

This rule exists because repeatedly relying on all-closed / all-open plus breath-force changes to cover multiple pitches produces poor public usability.

### No bad fallback reinsert

If a public instrument has:

- no clean candidates, and
- no acceptable candidates

hide that instrument for the song instead of reinserting a known-bad fallback.

Public pages should not expose a broken option just to avoid an empty instrument list.

### Prefer non-extreme candidates in public ordering

For the current public wind instruments, treat all-closed + soft-blow and all-open + strong-blow
range extension as a fallback-only technique.

Important boundary:

- the normal boundary note that naturally uses all-closed or all-open does **not** count as extreme
- only the extra out-of-range note reached beyond that boundary by soft/strong breath extension counts as extreme

Operationally:

- first collect all runtime candidates that are still publicly viable
- keep extreme-extension candidates available only as lower-priority public options
- order public candidates as:
  1. non-extreme clean
  2. non-extreme acceptable
  3. extreme clean
  4. extreme acceptable
- this keeps the default fingering away from soft/strong-breath extension whenever a normal viable
  option exists, while still letting advanced users switch to the extension-based fallback manually

This rule exists so the public page defaults to the more stable `G` / `F`-style choice when it is
available, without completely hiding the `Bb` / alternate fallback from the dropdown.

### Recorder / whistle single-pitch preference

For:

- `r8b`
- `r8g`
- `w6`

apply one more public exposure preference on top of the general rule above.

Operationally:

- if there is at least one viable candidate whose all-closed / all-open boundary outline does not
  get reused across multiple pitch labels, keep those and drop the candidates whose boundary
  outline still serves two pitch labels
- only when no such cleaner candidate exists should the public page fall back to a candidate whose
  boundary outline covers two pitch labels
- the hard reject rule for `>2` pitch labels on one boundary outline still remains in force

This reflects a practical public usability goal:

- for recorder and tin whistle, one boundary fingering reused for one pitch is normal
- one boundary fingering reused for two pitches is tolerable only as fallback
- beyond that, public fingering quality drops too far

## Runtime Candidate Ordering Rules

After quality-tier filtering, runtime ranking currently prefers:

1. better quality tier
2. lower ambiguous outline ratio
3. lower ambiguous extreme outline ratio
4. lower total extreme outline ratio
5. more unique outlines
6. lower dominant outline ratio
7. smaller pitch-class distance
8. exact shift
9. when absolute shift difference is small, better ocarina reference priority
10. smaller absolute shift
11. stable original-order fallback

## Current Product Limitation To Remember

The public page does not yet solve this case:

- song-level transposition could be changed to rescue one instrument
- but that same change might worsen the preferred default instrument or overall catalog consistency

So today the working rule is:

- first choose a song-level key
- then generate/optimize instrument candidates under that one key
- if a secondary instrument has no acceptable candidates, hide it

Do not “fix” this by silently making the same song page behave as if each instrument has a different melody key.
