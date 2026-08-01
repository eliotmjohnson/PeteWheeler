# PeteWheeler project guidance

## Project

- Mobile-first React + Vite app for tracking wheel strategy positions.
- Persist user data in browser localStorage under `wheel-cost-tracker:v1`.
- Keep dependencies minimal; do not add a library for small UI behavior.

## Structure

- `src/App.jsx` contains the app state, calculations, and screen components.
- `src/styles.css` is the shared visual system. Keep it formatted and favor scoped selectors for screen-specific styling.
- `public/sw.js` is the production service worker.

## Product conventions

- Home is an account overview with a small recent-activity preview, not a position list.
- Positions is a simple drill-in list. Position creation uses a floating `+` button and sheet.
- Position details contain the ticker, metrics, and transaction history. Transaction creation uses a floating `+` button and sheet.
- Activity is a date-sorted, ungrouped transaction list that always includes the ticker.
- Use native date inputs; do not layer a custom calendar icon over them.
- Inputs must be at least 16px to prevent iOS focus zoom.
- Modal sheets must keep the background page fixed and must not use a dimmed backdrop.

## Visual conventions

- Preserve the light iOS-inspired interface: restrained blue accents, rounded surfaces, and subtle shadows.
- Position-row basis values must remain visible on narrow iPhones.
- Keep the More-page data actions evenly distributed across their card.
- Position-detail entry should retain the standard screen animation, starting from a lower vertical offset before sliding up.
- Avoid dense layouts and keep modal transitions smooth. Respect `prefers-reduced-motion`.

## Verification

- Always leave edited code properly formatted. Do not add compressed one-line CSS rules or inconsistent indentation.
- Run `npm run build` after code changes.
- For visible UI changes, verify the target flow in a browser at the active local dev URL.
- Before deploying changes that affect caching, review `public/sw.js`. Navigation requests must remain network-first so deployments do not serve stale app shells.
- Rotate the service-worker cache name for deployments that need existing asset caches invalidated.
