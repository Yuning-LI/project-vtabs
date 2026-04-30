# Production Runtime Assets

Production public song pages must not depend on local-only `reference/` files.

## Production Files

Must be deployable:

- `data/kuailepu-runtime/<slug>.json`
  - full raw runtime payload for public song pages
- `data/kuailepu/<slug>.json`
  - compact public SongDoc for catalog / SEO / lists
- `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
  - archived runtime HTML/template source
- `vendor/kuailepu-static/**`
  - committed source static snapshot
- `public/k-static/**`
  - deployable static assets served by the app

## Local-Only Files

Allowed for local import/debug, not production truth:

- `reference/songs/*.json`
- `reference/快乐谱代码.txt`
- `reference/auth/kuailepu-profile/`
- `reference/generated-svg/**`
- `reference/compare/**`

## Runtime Read Order

Raw JSON:

1. `data/kuailepu-runtime/<slug>.json`
2. `reference/songs/<slug>.json` as local fallback

Template archive:

1. `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
2. `reference/快乐谱代码.txt` as local fallback

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

- `data/kuailepu-runtime/<slug>.json`
- `data/kuailepu/<slug>.json`
- public manifest / SEO profile as needed

`reference/songs/<slug>.json` alone is not enough.
