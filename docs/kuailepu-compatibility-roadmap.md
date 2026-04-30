# Kuailepu Compatibility Roadmap

This is the runtime strategy document. It should answer what must stay stable, not preserve old implementation history.

## Current Route

- Public `/song/<slug>` pages use Kuailepu raw JSON plus the original runtime rendering chain.
- Production source is `data/kuailepu-runtime/<slug>.json`.
- Runtime template archive is `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Static runtime assets are served from `/k-static/...`, currently backed by `public/k-static`.
- The public shell owns SEO copy, navigation, controls, and English UI.

Runtime chain:

`data/kuailepu-runtime/<slug>.json -> Kit.context.setContext(...) -> Song.draw()/compile() -> hc.parse/render -> final SVG`

## Reading Modes

- Default public mode: `letter`.
- Public backup / parity mode: `number`.
- Do not restore `both`.
- Letter mode reuses the original numbered-note track positions and replaces note labels only.
- Keep letter-mode behavior isolated in `src/lib/kuailepu/runtime.ts`.

Letter-mode intent:

- western users can read the melody immediately
- original rhythm, spacing, lyrics alignment, and fingering chart stay intact
- pure Chinese lyrics remain hidden by default

## Compare Gate

Publish / parity checks use:

- `note_label_mode=number`
- `runtime_asset_profile=full-template`
- `runtime_compare_mode=1`
- local compare context fixed close to Kuailepu live behavior

Do not change compare to `letter`; letter mode is a public overlay, not the parity baseline.

## Asset Profile Rule

Current public runtime profile:

- `public-song`: default public page, minimal validated script set
- `full-template`: debugging / compare / recovery mode

When reducing old Kuailepu assets:

- change profile behavior in `src/lib/kuailepu/runtime.ts`
- keep bundled assets and recovery path
- do not delete `vendor/kuailepu-static` or `public/k-static` just because a public page does not currently load a file

More detail: `docs/public-runtime-asset-profiles.md`.

## Public Page Guardrails

Do not:

- restore old native `SongClient` as public fallback
- silently fall back when raw JSON is missing
- expose Kuailepu/source wording on public pages
- expose pure Chinese lyric tracks through query params or public controls
- change fingering-chart correctness logic for SEO or Pinterest work

Do:

- keep visible public copy English
- keep `/api/kuailepu-runtime/<slug>` `noindex`
- keep controls compact enough that the notation remains reachable
- preserve iframe height behavior and avoid inner scrollbars / blank bottom space

## When To Touch Runtime

Runtime changes are justified for:

- correctness bugs
- height / overlay / loading regressions
- letter-mode label issues
- asset profile maintenance
- public control integration that cannot be solved in the shell

Runtime changes are not justified for:

- routine SEO copy
- learn / hub internal linking
- Pinterest image export
- grey-song metadata cleanup

## Scale Trigger

When public catalog approaches `200-300` songs or build/list performance becomes painful, revisit catalog architecture:

1. lighter homepage/search index
2. segmented or paginated library loading
3. more explicit file-level reads
4. only later, database/index service

Until then, prioritize stable runtime, import flow, and content quality.

## Validation Standard

For runtime or publish-sensitive changes:

```bash
npm run validate:content
npm run validate:songbook
npm run preflight:kuailepu-publish -- <slug...>
npm run build
```

Manual QA checklist: `docs/manual-runtime-qa-checklist.md`.
