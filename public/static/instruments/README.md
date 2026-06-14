# Instrument SVG Asset Layout

This directory is the stable entry point for future instrument-specific SVG assets.

Current runtime fingering graphics are still generated from TypeScript visual specs and the authorized runtime SVG output. Do not move generated runtime SVG, `public/k-static/**`, or `vendor/kuailepu-static/**` into this directory.

## Directory Ownership

- `active/`: SVG assets for instruments currently enabled on public song pages.
- `reserved/`: SVG assets for instruments that are configured but not exposed publicly yet.

## Naming Rule

Use the public or reserved instrument id as the first path segment or filename prefix.

Examples:

- `active/o12/body.svg`
- `active/r8b/body.svg`
- `reserved/ch12/body.svg`

Keep SVG content changes separate from configuration-only rollout changes.
