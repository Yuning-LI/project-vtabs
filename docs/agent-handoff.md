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

## Stable Rules

- Production runtime JSON: `data/kuailepu-runtime/<slug>.json`.
- Production-packed runtime JSON: `data/kuailepu-runtime-packed/<slug>.json.gz`.
- Compact public song docs: `data/kuailepu/<slug>.json`.
- Local fallback only: `reference/songs/<slug>.json`.
- Runtime archive: `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Public runtime assets: `public/k-static/**`.
- Public playback soundfonts: `public/static/soundfont/**`.
- Public note modes: `letter`, `number`; do not restore `both`.
- Public instruments: `o12`, `o6`, `r8b`, `r8g`, `w6`.
- Public visible copy must be English.
- Do not expose Kuailepu/source-attribution wording on public pages.
- `/api/kuailepu-runtime/<slug>` is not an SEO page and must remain `noindex`.

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

If login fails, stop and ask:

```bash
npm run login:kuailepu
```

Do not replace a user-approved target song without explicit approval.

For songs imported from local MusicXML/MXL instead of Kuailepu:

- do not publish directly after local generation
- first run local generate/audit/classify flow
- then do lightweight external melody/version verification against public references
- only after that move approved songs into the public import/publish layer

Playbook:

- `docs/song-ingest-publication-playbook.md`

## Runtime Boundaries

- Do not move public song pages back to old native rendering.
- Compare / publish gates use `note_label_mode=number`.
- Keep letter transformation in `src/lib/kuailepu/runtime.ts`.
- Keep playback / metronome integration as shell-to-runtime bridges instead of forking the archived renderer.
- Prefer runtime asset profile changes over deleting bundled old assets.
- Do not run `npm run build` and `npm run test:e2e` concurrently in the same workspace; both touch `.next` and can create false failures.

## Current Known Limitation

- MusicXML ingest can still produce incorrect barline placement on some songs even when melody pitch is usable.
- The issue is not that Happy123/Kuailepu notation lacks `|`; the issue is current single-voice extraction not fully preserving measure-internal timing when the source relies on `backup`, `forward`, implicit rests, or multi-voice timing.
- If this becomes worth fixing, do it at the ingest timeline layer by preserving per-event measure offsets and rebuilding explicit rests before notation generation.

## Topic Docs

- Current state / handoff details: `docs/handoff.md`
- Runtime strategy: `docs/kuailepu-compatibility-roadmap.md`
- Runtime QA: `docs/manual-runtime-qa-checklist.md`
- Instrument rollout: `docs/instrument-rollout-plan.md`
- SEO / learn / hub growth: `docs/seo-growth-roadmap.md`
- Search Console learn overlap audit: `docs/search-console-learn-audit.md`
- Grey songs: `docs/grey-song-rollout-playbook.md`
- Pinterest export: `docs/pinterest-engineering-plan.md`
- Internal print: `docs/internal-print-workflow.md`
- MusicXML ingest: `docs/song-ingest-input-spec.md`
