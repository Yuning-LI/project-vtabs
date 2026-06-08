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
- Any new Playwright startup code in this workspace must use `playwright-extra` plus `puppeteer-extra-plugin-stealth`.
- Use `scripts/kuailepuAuth.ts` as the canonical startup reference.
- Do not launch browsers with raw `playwright` directly.
- For any Kuailepu browser action, follow `docs/kuailepu-operation-playbook.md`.

## Latest Verified Changes

- Public playback keeps the original Kuailepu countdown overlay. The shell no longer hides `.count-down-area` when `public_feature=playback` is enabled.
- Mobile `More Tools` now closes reliably after opening. The drawer close path is centralized and guarded against touch-event reopen races.
- Full verification for the latest runtime-shell changes:
  - `npm run build` passes
  - `npm run test:e2e` passes (`21 passed`)
- De-Kuailepu Phase 5 has started as dev-only native renderer work:
  - `SongIR v0` lives in `src/lib/native-renderer/songIr.ts`
  - MusicXML draft adapter lives in `src/lib/native-renderer/fromMusicXmlDraft.ts`
  - support/fallback contract lives in `src/lib/native-renderer/support.ts`
  - internal preview route is `/dev/native-renderer/song/[id]`
  - supported MVP seed example: `/dev/native-renderer/song/on-top-of-old-smoky`
  - fallback diagnostic example: `/dev/native-renderer/song/twinkle-twinkle-little-star`
  - public `/song` pages are unchanged and still archived-runtime backed

## Counts

Do not trust hand-written counts in docs. Verify current public counts with:

```bash
npm run validate:content
```

## Runtime Notes

- Default public pages still use `public-song` asset profile.
- Any request with `public_feature=metronome` or `public_feature=playback` currently upgrades to `full-template`.
- Keep runtime bridge changes isolated to `src/lib/kuailepu/runtime.ts`; do not fork archived `song_*.js` behavior unless unavoidable.

## Current MusicXML Ingest Boundary

- The main MusicXML -> draft -> Happy123/Kuailepu notation -> runtime candidate path is usable for normal melody imports.
- Do not keep polishing the generator in the abstract. Prefer sample-driven fixes when a real song exposes a concrete failure.
- Known limitation not yet fixed:
  - some imported songs can show incorrect barline positions even though melody pitch is broadly correct
  - root cause is not missing `|` support in Happy123/Kuailepu notation
  - root cause is current single-voice extraction dropping part of the measure-internal timing structure when the source uses `backup` / `forward` / implicit rests / multi-voice timing
  - if this is revisited, the proper fix is to preserve per-event measure offsets and rebuild a full measure timeline with explicit rests before notation generation
- Treat that barline issue as a separate ingest-timing project, not a quick shell/runtime tweak.

## Local Validation Note

- Do not run `npm run build` and `npm run test:e2e` against the same workspace at the same time. Both mutate/read `.next` and can produce false `MODULE_NOT_FOUND` or manifest errors.

## Before Push

Check:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```
