# Handoff Notes

This file keeps only short current-state notes. Stable rules live in `README.md` and `docs/agent-handoff.md`; topic detail lives in the docs map there.

## Current Product State

- Public `/song/<slug>` pages use `data/kuailepu-runtime/<slug>.json -> /api/kuailepu-runtime/<slug> -> original runtime -> SVG`.
- Production builds prefer `data/kuailepu-runtime-packed/<slug>.json.gz` before raw JSON.
- The public shell is English SEO content plus a playable notation page.
- Default note mode is `letter`; `number` remains the parity / backup mode.
- Public instruments are `o12`, `o6`, `r8b`, `r8g`, `w6`.
- Public shell tools currently include compact controls, metronome, and playback.
- Playback soundfonts are served from `public/static/soundfont/**`.
- `reference/songs/*.json` is local fallback only.
- `captured SVG` is debug/parity material only.
- `/api/kuailepu-runtime/<slug>` must remain `noindex, nofollow, noarchive`.

## Counts

Do not trust hand-written counts in docs. Verify current public counts with:

```bash
npm run validate:content
```

## Runtime Notes

- Default public pages still use `public-song` asset profile.
- Any request with `public_feature=metronome` or `public_feature=playback` currently upgrades to `full-template`.
- Keep runtime bridge changes isolated to `src/lib/kuailepu/runtime.ts`; do not fork archived `song_*.js` behavior unless unavoidable.

## Current GSC Batch Boundary

The 2026-04-23 GSC cleanup was a bounded content-layer pass:

- No new URL.
- No slug changes.
- No runtime / route changes.
- Edited only `data/songbook/song-seo-profiles.json` and `src/lib/learn/content.ts`.

Do not blindly continue that exact batch. Re-check current GSC data before another GSC-driven pass.

## Before Push

Check:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```
