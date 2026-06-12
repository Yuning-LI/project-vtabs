# Production Runtime Assets

Production public song pages must not depend on local-only `reference/` files.

## Production Files

Must be deployable:

- `data/kuailepu-runtime-packed/<slug>.json.gz`
  - production-preferred packed raw runtime payload
- `data/kuailepu-runtime/<slug>.json`
  - readable raw runtime payload and local fallback for production truth
- `data/kuailepu/<slug>.json`
  - compact public SongDoc for catalog / SEO / lists
- `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
  - authorized runtime HTML/template archive
- `vendor/kuailepu-static/**`
  - committed authorized runtime static snapshot
- `public/k-static/**`
  - deployable static assets served by the app
- `public/static/soundfont/**`
  - deployable public playback soundfont assets

## Local-Only Files

Allowed for local import/debug, not production truth:

- `reference/songs/*.json`
- local authorized runtime template backup
- `reference/auth/kuailepu-profile/`
- `reference/generated-svg/**`
- `reference/compare/**`

## Runtime Read Order

Raw JSON:

1. `data/kuailepu-runtime-packed/<slug>.json.gz` in production when present
2. `data/kuailepu-runtime/<slug>.json`
3. `reference/songs/<slug>.json` as local fallback

Template archive:

1. `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
2. local authorized runtime template backup as local fallback

## Public Chain

```text
data/kuailepu-runtime/<slug>.json
-> /api/kuailepu-runtime/<slug>
-> runtime HTML
-> /k-static/...
-> final SVG
```

## Import Requirement

For any newly public song, update at minimum:

- packed/raw deployable runtime truth
- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- public manifest / SEO profile as needed

`reference/songs/<slug>.json` alone is not enough.
