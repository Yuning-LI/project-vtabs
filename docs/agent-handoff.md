# Agent Handoff

Shortest useful context for a new AI / developer session.

## One Sentence

Public song pages are runtime-backed Kuailepu raw JSON pages with an English SEO shell, default `letter` view, optional `number` view, and public instrument views for ocarina, recorder, and tin whistle.

## First Checks

For release-sensitive tasks:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

If the task needs Kuailepu network access, confirm the user is on a China-reachable VPN. If it needs Google / western research, confirm foreign VPN.

## Stable Rules

- Production runtime JSON: `data/kuailepu-runtime/<slug>.json`.
- Compact public song docs: `data/kuailepu/<slug>.json`.
- Local fallback only: `reference/songs/<slug>.json`.
- Runtime archive: `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
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

## Runtime Boundaries

- Do not move public song pages back to old native rendering.
- Compare / publish gates use `note_label_mode=number`.
- Keep letter transformation in `src/lib/kuailepu/runtime.ts`.
- Prefer runtime asset profile changes over deleting bundled old assets.

## Topic Docs

- Current state / handoff details: `docs/handoff.md`
- Runtime strategy: `docs/kuailepu-compatibility-roadmap.md`
- Runtime QA: `docs/manual-runtime-qa-checklist.md`
- Instrument rollout: `docs/instrument-rollout-plan.md`
- SEO / learn / hub growth: `docs/seo-growth-roadmap.md`
- Grey songs: `docs/grey-song-rollout-playbook.md`
- Pinterest export: `docs/pinterest-engineering-plan.md`
- Internal print: `docs/internal-print-workflow.md`
- MusicXML ingest: `docs/song-ingest-input-spec.md`
