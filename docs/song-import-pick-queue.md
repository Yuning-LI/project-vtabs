# Song Import Pick Queue

This document is only for choosing the next song quickly.

It does **not** replace either import workflow:

- local `MusicXML` / `MXL` songs still follow `docs/song-ingest-operator-runbook.md`
- Kuailepu grey songs still follow `docs/grey-song-rollout-playbook.md`

The purpose is narrow:

- stop re-spending time and tokens on “what song should we do next”
- keep one stable pick order
- let a new operator open one file, choose the next queued item, and then run the normal workflow without skipping rules

## Source Of Truth

Unified pick queue:

- `data/songbook/song-import-pick-queue.json`

Lane-specific upstream sources:

- XML lane:
  - `reference/song-publish-candidates/openewld-release-priority.json`
- Kuailepu grey lane:
  - `reference/kuailepu-candidates/queues/grey-priority-queue.md`
  - `data/songbook/grey-song-rollout.json`

## How To Use It

### If the task is XML import

1. Open `data/songbook/song-import-pick-queue.json`
2. Filter rows where:
   - `lane = "xml"`
   - `status = "queue"`
3. Take the smallest `priority`
4. Run the normal XML ingest workflow

Do not replace the XML workflow with this queue.
This queue only chooses the song. It does not approve publication by itself.

### If the task is Kuailepu grey import

1. Open `data/songbook/song-import-pick-queue.json`
2. Filter rows where:
   - `lane = "kuailepu-grey"`
   - `status = "queue"`
3. Take the smallest `priority`
4. Run the normal Kuailepu grey workflow

Do not replace the Kuailepu workflow with this queue.
This queue only chooses the song. It does not bypass compare, preflight, or SEO work.

## Why Keep Separate Lanes

The pick view is unified, but the import lanes stay separate because they are operationally different:

- XML lane uses local files and external review against public references
- Kuailepu lane uses China-network import, live compare, and grey rollout tracking
- the commands, blockers, and release gates are different

So:

- one unified queue for faster song selection
- two separate import playbooks for correctness

## Non-Negotiable Rule

Using the pick queue must **not** cause any workflow shortcut.

Still required:

- all current fingering and runtime rules
- all required doctor / validation / preflight checks
- all external verification steps
- all human review steps that already exist in the current import flow

The queue saves selection time only.
