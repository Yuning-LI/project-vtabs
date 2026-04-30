# Handoff Notes

This file keeps current execution context. Stable rules live in `README.md` and `docs/agent-handoff.md`; long technical detail lives in the topic docs.

## Current Product State

- Public `/song/<slug>` pages use `data/kuailepu-runtime/<slug>.json -> /api/kuailepu-runtime/<slug> -> original runtime -> SVG`.
- The public shell is English SEO content plus a playable notation page.
- Default note mode is `letter`; `number` remains the parity / backup mode.
- Public instruments are `o12`, `o6`, `r8b`, `r8g`, `w6`.
- `reference/songs/*.json` is local fallback only.
- `captured SVG` is debug/parity material only.
- `/api/kuailepu-runtime/<slug>` must remain `noindex, nofollow, noarchive`.

## Counts

Do not trust hand-written counts in docs. Verify current public counts with:

```bash
npm run validate:content
```

## Network Coordination

- Kuailepu import, compare, preflight, login checks, and live debugging need China-reachable network.
- Google / western research usually needs foreign VPN.
- If the wrong network is active, ask the user to switch before continuing.

## Publishing Rules

For each public import:

- add deployable raw JSON
- add compact SongDoc
- update public manifest
- update SEO profile with aliases
- update learn / hub internal links
- update grey rollout tracker when relevant
- validate content, songbook, doctor output, preflight compare, and usually build

Preflight:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

If login fails:

```bash
npm run login:kuailepu
```

## SEO State

- Public titles prioritize long-tail search fit over brand suffixes.
- Song page SEO profiles are in `data/songbook/song-seo-profiles.json`.
- Learn / hub content is in `src/lib/learn/content.ts`.
- Growth strategy and completed GSC work are summarized in `docs/seo-growth-roadmap.md`.

## Current GSC Batch Boundary

The 2026-04-23 GSC cleanup was a bounded content-layer pass:

- No new URL.
- No slug changes.
- No runtime / route changes.
- Edited only `data/songbook/song-seo-profiles.json` and `src/lib/learn/content.ts`.

Do not blindly continue that exact batch. Re-check current GSC data before another GSC-driven pass.

## Git

- Commit messages must be detailed Chinese messages with `变更：`, `原因：`, `验证：`.
- Before pushing, check:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```
