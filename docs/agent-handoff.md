# Agent Handoff

Shortest useful context for a new AI / developer session.

## One Sentence

Public song pages are runtime-backed Kuailepu raw JSON pages with an English SEO shell, default `letter` view, optional `number` view, public instrument views for ocarina/recorder/tin whistle, and shell-level metronome/playback tools.

## First Checks

For release-sensitive tasks:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

If the task needs Kuailepu network access, confirm the user is on a China-reachable VPN. If it needs Google / western research, confirm foreign VPN.

## Commit Hook Rule

- Pre-commit must stay fast and deterministic.
- Do not run full `npm run test:e2e` from the git pre-commit hook.
- Current pre-commit entry is `npm run precommit:checks`, which only runs lightweight staged-file checks.
- Full release validation such as `doctor`, `preflight`, `validate:content`, `validate:songbook`, `build`, and any manual `test:e2e` run still belongs to the publish / release flow, not every commit.

## Stable Rules

- Production runtime JSON: `data/kuailepu-runtime/<slug>.json`.
- Production-packed runtime JSON: `data/kuailepu-runtime-packed/<slug>.json.gz`.
- Compact public song docs: `data/kuailepu/<slug>.json`.
- Local managed Kuailepu grey import queue: `data/songbook/kuailepu-grey-import-queue.json` and it should stay out of git.
- Local fallback only: `reference/songs/<slug>.json`.
- Local-only unpublished Kuailepu candidates: `reference/kuailepu-candidates/**`.
- Publish-ready Kuailepu grey stock pool: `reference/kuailepu-candidates/publish-drafts/**`.
- Grey rollout live tracker: `data/songbook/grey-song-rollout.json`.
- Song-pick queue for faster selection only: `data/songbook/song-import-pick-queue.json`.
- Runtime archive: `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Public runtime assets: `public/k-static/**`.
- Public playback soundfonts: `public/static/soundfont/**`.
- Public note modes: `letter`, `number`; do not restore `both`.
- Public instruments: `o12`, `o6`, `r8b`, `r8g`, `w6`.
- Public visible copy must be English.
- Do not expose Kuailepu/source-attribution wording on public pages.
- `/api/kuailepu-runtime/<slug>` is not an SEO page and must remain `noindex`.
- Any new Playwright startup code must use `playwright-extra` with `puppeteer-extra-plugin-stealth`.
- Follow `scripts/kuailepuAuth.ts` for the browser initialization pattern.
- Do not launch browsers with raw `playwright` directly.
- For any Kuailepu browser action, follow `docs/kuailepu-operation-playbook.md`.

## Import / Publishing Default

When the user says “导歌”, “公开导歌”, or asks to import songs without saying candidate-only, complete the whole publication layer:

- deployable raw JSON
- compact SongDoc
- manifest entry
- SEO profile, aliases, metadata, FAQ copy
- learn / hub internal links
- grey rollout entry when relevant
- validation and preflight

Required checks:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
```

Execution rule for Kuailepu-backed songs:

- New import: always run `doctor:song` and `preflight:kuailepu-publish` for that song.
- Batch of several songs: run `validate:content`, `validate:songbook`, and `build` once after the batch, not after every single song.
- Content-only follow-up edits after a passing compare may skip another live compare if `data/kuailepu-runtime/<slug>.json`, `data/kuailepu/<slug>.json`, and runtime behavior did not change afterward.
- Do not leave unpublished Kuailepu candidate JSON under `data/kuailepu/**` or `data/kuailepu-runtime/**`; keep that material in `reference/kuailepu-candidates/**` until publish approval.

If login fails, stop and ask:

```bash
npm run login:kuailepu
```

Do not replace a user-approved target song without explicit approval.

For songs imported from local MusicXML/MXL instead of Kuailepu:

- treat `private/openewld/dataset` as an already-prepared upstream corpus, not as a preprocessing command that still runs during each import
- treat `reference/song-publish-candidates/runtime` as a local-only candidate runtime area, not as a published catalog
- do not publish directly after local generation
- prefer `npm run ingest:song-candidate -- <input> --slug=<slug> ...` as the standard candidate-generation entry
- use `npm run doctor:song-ingest -- <slug>` as the per-song readiness check
- use `npm run record:song-ingest-review -- <slug> ...` as the standard external-review record path
- use `npm run publish:song-ingest-candidate -- <slug>` as the standard publish entry once manifest/SEO are ready
- first run local generate/audit/classify flow
- then do lightweight external melody/version verification against public references
- only after that move approved songs into the public import/publish layer
- only require Kuailepu live compare when the runtime payload maps to a real Kuailepu page
- if the song uses a synthetic `song_uuid`, treat external verification plus local runtime validation as the release gate instead

Playbook:

- `docs/song-ingest-operator-runbook.md`
- `docs/song-ingest-publication-playbook.md`

## Runtime Boundaries

- Do not move public song pages back to old native rendering.
- Compare / publish gates use `note_label_mode=number`.
- Keep letter transformation in `src/lib/kuailepu/runtime.ts`.
- Keep playback / metronome integration as shell-to-runtime bridges instead of forking the archived renderer.
- Prefer runtime asset profile changes over deleting bundled old assets.
- Do not run `npm run build` and `npm run test:e2e` concurrently in the same workspace; both touch `.next` and can create false failures.
- Kuailepu live compare should minimize repeated detail-page reloads; prefer direct detail URLs and grouped per-song checks over repeated site search.
- Prefer `src/lib/runtime-core/publicRuntime.ts` for new app/runtime integration work.
- Treat `src/lib/kuailepu/runtime.ts` as compatibility shell, not the preferred place for new feature logic.
- Inline iframe bridge logic currently lives in `src/lib/runtime-core/bridge/publicRuntimeBridge.ts`.
- Current preferred priority after the latest boundary work: finish bridge decomposition before resuming visual differentiation.
- Visual experiments that are not yet backed by a stable isolated theme layer should not be left mixed into the code-structure refactor stream.
- Remaining high-value bridge split targets are playback, metronome, and letter-render / visible-sheet transform logic.

## Current Known Limitation

- Line breaks in Happy123 / Kuailepu notation are presentation-only; they are not reliable measure boundaries.
- Every exported measure end must stay explicitly encoded as a bar token such as `|`.
- If a maintenance rewrite touches runtime notation, preserve `{bpm:...}` directives; otherwise the public player can fall back to its default BPM even when `payload.bpm` still exists.
- MusicXML ingest can still produce incorrect barline placement on some songs even when melody pitch is usable.
- The issue is not that Happy123/Kuailepu notation lacks `|`; the issue is current single-voice extraction not fully preserving measure-internal timing when the source relies on `backup`, `forward`, implicit rests, or multi-voice timing.
- If this becomes worth fixing, do it at the ingest timeline layer by preserving per-event measure offsets and rebuilding explicit rests before notation generation.

## Topic Docs

- Current state / handoff details: `docs/handoff.md`
- Runtime strategy: `docs/kuailepu-compatibility-roadmap.md`
- Current de-Kuailepu refactor boundary plan: `docs/de-kuailepu-architecture-plan.md`
- Runtime QA: `docs/manual-runtime-qa-checklist.md`
- Instrument rollout: `docs/instrument-rollout-plan.md`
- Public instrument fit / transposition / fingering rules: `docs/public-instrument-selection-rules.md`
- SEO / learn / hub growth: `docs/seo-growth-roadmap.md`
- Search Console learn overlap audit: `docs/search-console-learn-audit.md`
- Grey songs: `docs/grey-song-rollout-playbook.md`
- Pinterest export: `docs/pinterest-engineering-plan.md`
- Internal print: `docs/internal-print-workflow.md`
- MusicXML ingest operator runbook: `docs/song-ingest-operator-runbook.md`
- MusicXML ingest: `docs/song-ingest-input-spec.md`
- MuseScore candidate sourcing: `docs/musescore-candidate-workflow.md`
- Unified song-pick queue for faster operator selection: `docs/song-import-pick-queue.md` and `data/songbook/song-import-pick-queue.json`
