# Project V-Tabs Agent Instructions

## Read Order

To save context, do not read every document by default.

Default for a new substantial task:

1. `README.md`
2. `docs/agent-handoff.md`

Also read `docs/handoff.md` when the task involves release state, current counts, dirty worktree context, or handoff details.

If the task touches Kuailepu compatibility, song import, publishing, letter mode, or song SEO, also read:

- `docs/kuailepu-compatibility-roadmap.md`
- `docs/manual-runtime-qa-checklist.md`
- `src/lib/kuailepu/runtime.ts`
- `docs/instrument-rollout-plan.md`

If the task touches learn / hub / growth:

- `docs/seo-growth-roadmap.md`

If the task touches grey-song rollout:

- `docs/grey-song-rollout-playbook.md`

If the task touches Pinterest image/export workflow:

- `docs/pinterest-engineering-plan.md`

If the task touches internal print/PDF export, copyrighted-song local workflow, or `MusicXML` ingest:

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

## Product Truth

- Public `/song/<slug>` pages are driven by deployable raw JSON plus the original Kuailepu runtime path.
- Production raw JSON lives in `data/kuailepu-runtime/<slug>.json`.
- Compact public SongDocs live in `data/kuailepu/<slug>.json`.
- `reference/songs/<slug>.json` is local fallback for import/debug only.
- The deployable runtime archive lives in `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Internal print preview lives at `/dev/print/song/<slug>` and stays internal-only.
- Default reading mode is `letter`; public backup mode is `number`; do not restore `both`.
- Do not silently fall back to the old native song page when raw JSON is missing.
- Captured SVG is only a local debug/parity baseline.

## User-Facing Rules

- Visible public site copy must stay English.
- Do not show wording like `Kuailepu source`, `reference source`, `we referenced Kuailepu`, or similar source-attribution text on public pages.
- Homepage song cards should show the song title only.

## Import / Publishing Rule

If a song has stable English aliases, translated names, or common alternate titles, update `data/songbook/song-seo-profiles.json` with `aliases` before publishing.

When the user asks to import songs for publication, default scope includes:

- deployable raw JSON and compact SongDoc
- public manifest entry
- song SEO profile, aliases, metadata, and FAQ copy
- relevant learn / hub internal links
- grey rollout status update when relevant
- validation and Kuailepu preflight compare

Only keep songs unpublished when the user explicitly asks for candidate-only import.

Run:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

If login is invalid, stop and ask the user to run:

```bash
npm run login:kuailepu
```

If a user-approved target fails during search, import, compare, or preflight, do not silently switch songs. Explain the failure and wait for approval.

## Network Coordination

- Kuailepu import, compare, preflight, and live-context debugging require a China-reachable network.
- Google / western-web research may require a foreign VPN.
- Do not assume both are reachable at the same time.

## Runtime Guardrails

- Keep Kuailepu core rendering behavior intact.
- Keep letter-mode transformation isolated to `src/lib/kuailepu/runtime.ts`.
- Any publish/parity check must use `note_label_mode=number`.
- When trimming Kuailepu JS/CSS for public song pages, prefer runtime asset profile changes over deleting files from `vendor/kuailepu-static` or `public/k-static`.

## Git Commit Rule

Every commit message must be detailed Chinese and include:

- title line
- `变更：`
- `原因：`
- `验证：`

The repository includes `.gitmessage.txt` and `.husky/commit-msg`.
