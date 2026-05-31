# Kuailepu Operation Playbook

Use this for any browser-based work on Kuailepu:

- song search
- import
- compare
- live-context checks
- page inspection
- source/code viewing

This playbook applies to every Kuailepu site action, not just导歌.

## Browser Rule

- Launch Playwright only through `playwright-extra`.
- Always mount `puppeteer-extra-plugin-stealth`.
- Use `scripts/kuailepuAuth.ts` as the reference pattern.
- Do not start raw `playwright` directly.

## Session Rule

- Start with a non-logged-in browser session first.
- Use the free unauthenticated quota before logging in.
- After login is needed, keep the authenticated profile alive.
- Do not re-login for every task unless the profile is broken or invalid.

## Pace Rule

- Add a random delay between Kuailepu actions.
- Keep the spacing human-paced.
- Do not burst requests back-to-back.
- Do not run multiple Kuailepu browser jobs in parallel unless the user explicitly approves it.

## Stop Rule

If Kuailepu shows any of these, stop immediately:

- captcha
- `403 Forbidden`
- `502 Bad Gateway`

Do not auto-retry in a loop.
Do not switch targets silently.
Capture evidence and report back for manual review.

## Safe Defaults

- Prefer direct detail URLs over repeated catalog search.
- Reuse the same browser profile for a session.
- Group checks per song instead of reloading the same detail page repeatedly.
- Keep compare and import runs sequential.

## When In Doubt

If a Kuailepu action starts to look noisy, unstable, or rate-limited, slow down or stop.
The goal is to avoid stressing the service and to keep state predictable.
