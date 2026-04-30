# Project V-Tabs

Play By Fingering is an English public song-library site for western search users. The product is ocarina-first and also exposes recorder and tin whistle views on public song pages.

## Fast Context

Read as little as the task allows:

- Every new session: `AGENTS.md`, then `docs/agent-handoff.md`.
- Release / current state / dirty tree questions: also read `docs/handoff.md`.
- Kuailepu import, publishing, runtime, letter mode, or song SEO: read `docs/kuailepu-compatibility-roadmap.md`, `docs/manual-runtime-qa-checklist.md`, `src/lib/kuailepu/runtime.ts`.
- Learn / hub / growth work: read `docs/seo-growth-roadmap.md`.
- Grey-song import work: read `docs/grey-song-rollout-playbook.md`.
- Pinterest image/export work: read `docs/pinterest-engineering-plan.md`.
- Internal print, copyright-only workflow, or MusicXML ingest: read `docs/internal-print-workflow.md`, `docs/song-ingest-input-spec.md`.

The older rule of reading every major document for every substantial task has been replaced by this topic map to save context.

## Product Truth

- Public `/song/<slug>` pages use deployable raw JSON plus the original Kuailepu runtime path.
- Production raw JSON lives in `data/kuailepu-runtime/<slug>.json`.
- Compact public song docs live in `data/kuailepu/<slug>.json`.
- `reference/songs/<slug>.json` is local fallback for import/debug only.
- Runtime archive lives at `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Captured SVG is only a local debug/parity baseline.
- Default note view is `letter`; public backup mode is `number`; do not restore `both`.
- Public instrument set is currently `o12`, `o6`, `r8b`, `r8g`, `w6`.
- `/api/kuailepu-runtime/<slug>` returns runtime HTML and must stay `noindex`.

## Public Copy Rules

- Visible public site copy must stay English.
- Do not expose source wording such as `Kuailepu source`, `reference source`, or `we referenced Kuailepu`.
- Homepage song cards should show the song title only.
- SEO titles should prioritize real search terms: instrument, tabs, notes, letter notes, fingering chart, song aliases.
- Do not mechanically append `| Play By Fingering` to homepage, learn, or song metadata.

## Import / Publish Rules

When the user asks to import songs for publication, default scope includes:

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json` with aliases and FAQ copy
- relevant learn / hub internal links
- `data/songbook/grey-song-rollout.json` when it is a grey song
- validation and Kuailepu preflight compare

Only keep songs unpublished when the user explicitly asks for candidate-only import.

Before publishing, run:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

If login is invalid, stop and ask the user to run:

```bash
npm run login:kuailepu
```

If an approved target song fails during search, import, compare, or preflight, do not silently switch songs. Report the failure and wait for explicit replacement approval.

## Network Rules

- Kuailepu import, compare, preflight, login checks, and live-context debugging need a China-reachable network.
- Google / western-web research usually needs a foreign VPN.
- Do not assume both are reachable at once; ask the user to switch VPN when needed.

## Runtime Guardrails

- Keep public song pages on the runtime-backed route; do not restore old native `SongClient` fallback.
- Publish/parity checks must use `note_label_mode=number`.
- Keep letter-mode transformation isolated to `src/lib/kuailepu/runtime.ts`.
- When reducing old Kuailepu assets, change runtime asset profiles instead of deleting files from `vendor/kuailepu-static` or `public/k-static`.

## Validation Commands

Common checks:

```bash
npm run validate:content
npm run validate:songbook
npm run doctor:song -- <slug>
npm run preflight:kuailepu-publish -- <slug...>
npm run build
```

Release-state checks:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

## Git Commit Rule

Commit messages must be detailed Chinese messages with:

- title line
- `变更：`
- `原因：`
- `验证：`

The repository has `.gitmessage.txt` and `.husky/commit-msg` enforcing the minimum structure.
