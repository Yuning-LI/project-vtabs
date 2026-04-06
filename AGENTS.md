# Project V-Tabs Agent Instructions

## First Read

Before doing any substantial work in a new conversation, read these files in order:

1. `README.md`
2. `docs/handoff.md`
3. `docs/agent-handoff.md`
4. `docs/kuailepu-compatibility-roadmap.md`
5. `docs/manual-runtime-qa-checklist.md`
6. `src/lib/kuailepu/runtime.ts`
7. `docs/instrument-rollout-plan.md`

If the task touches Kuailepu compatibility, song import, publishing, letter mode, or SEO copy, this reading order is mandatory.

If the task touches internal print/PDF export, copyrighted-song local workflow, or `MusicXML` ingest, also read:

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

## Product Truth

- Public `/song/<slug>` pages are driven by deployable raw JSON plus the original Kuailepu runtime path.
- Production raw JSON lives in `data/kuailepu-runtime/<slug>.json`.
- `reference/songs/<slug>.json` is now local fallback for import/debug only.
- The deployable runtime archive lives in `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`.
- Internal print preview currently lives at `/dev/print/song/<slug>` and stays internal-only.
- Default reading mode is `letter`.
- Public optional backup mode is `number`.
- Do not restore `both` mode.
- Do not silently fall back to the old native song page when a raw JSON file is missing.
- `captured SVG` is only a local debug/parity baseline now.

## User-Facing Rules

- Visible site copy must stay English.
- Do not show wording like `Kuailepu source`, `reference source`, `we referenced Kuailepu`, or similar source-attribution text on public pages.
- Homepage song cards should show the song title only.

## Before Adding Or Publishing Songs

If a song has stable English aliases, translated names, or common alternate titles, update `data/songbook/song-seo-profiles.json` with `aliases` before publishing so:

- homepage library search can match those aliases
- song page title / description / body can naturally cover alias searches

Run the automated preflight:

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

This script will:

- check whether the Kuailepu Playwright login is still valid
- start a local dev server on an available port
- automatically fall back from port 3000 if that port is occupied
- run runtime-vs-live compare against the chosen local base URL

If login is invalid, stop and ask the user to run:

```bash
npm run login:kuailepu
```

## Network Coordination

- Kuailepu import, compare, preflight, and live-context debugging require a China-reachable network.
- Google or western-web research may require a foreign VPN instead.
- Do not assume both are reachable at the same time.
- If the current task needs the other network, explicitly tell the user to switch VPN before continuing.
- If Kuailepu login is invalid, stop and ask the user to refresh it manually instead of continuing with stale assumptions.

## Runtime Guardrails

- Keep Kuailepu core rendering behavior intact.
- Keep letter-mode transformation isolated to `src/lib/kuailepu/runtime.ts`.
- Any publish/parity check must use `note_label_mode=number`.
- When trimming extra Kuailepu JS/CSS for public song pages, default to “do not load by default, but keep the bundled assets and recovery path”.
- Prefer changing the runtime asset profile in `src/lib/kuailepu/runtime.ts` over deleting files from `vendor/kuailepu-static` or `public/k-static`.

## Git Commit Rule

- Every commit message must be written in Chinese.
- Every commit message must be detailed, not just a short title.
- The minimum expected structure is:
  - one Chinese title line
  - a `变更：` section
  - a `原因：` section
  - a `验证：` section
- The repository includes `.gitmessage.txt` as the commit template shape and `.husky/commit-msg` to enforce the minimum rule.
- If a previous commit in the current task used a vague or non-Chinese message, amend it before finishing the task.
