# Metronome Recovery Audit

Summary of the 2026-04-03 audit for whether the original Kuailepu metronome can be recovered.

## Conclusion

The metronome recovery path is still present in the repository. It is disabled by the public `public-song` asset profile and by public shell hiding, not missing from the archived runtime.

## Verified

On `ode-to-joy`:

- `public-song` profile does not load metronome-related scripts.
- `full-template` profile loads the old metronome/script dependencies.
- In `full-template`, metronome DOM exists and basic beat counting can run.
- No new upstream asset fetch is required for a basic recovery attempt.

Important scripts in the recovery path include:

- `cdn/js/lib/web-audio-scheduler_1823326334.js`
- `cdn/js/metronome_7124fad0b0.js`
- `cdn/js/media_24bd4df64f.js`
- Materialize / soundmanager dependencies from the old template

## Current Blockers

The public overlay currently hides:

- `#menu-modal`
- `#metronome-modal`
- `.modal`

So even if scripts exist, the public UI remains intentionally hidden.

## Minimal Recovery Path

If metronome work resumes:

1. Restore only metronome scope, not playback/favorites/login.
2. Add required scripts through runtime asset profile.
3. Restore a compact English public UI.
4. Keep it docked above the sheet, not as a blocking modal.
5. Test desktop/mobile and representative songs.

## Not Yet Audited

- mobile usability
- interaction with future playback recovery
- loading/permission copy
- complete English UI text coverage
