# PeteWheeler project guidance

## Project

- Mobile-first React + Vite app for tracking wheel strategy positions.
- Record option transactions, assignments, called-away shares, premiums, adjusted share cost, and wheel P/L.
- Persist user data in browser localStorage under `wheel-cost-tracker:v1`.
- Keep dependencies minimal; do not add a library for small UI behavior.

## Structure

- `src/App.jsx` contains the app state, calculations, and screen components.
- `src/styles.css` is the shared visual system. Keep it formatted and favor scoped selectors for screen-specific styling.
- `public/sw.js` is the production service worker.

## Product conventions

- Home is an account overview with a four-transaction recent-activity preview, not a position list.
- Positions is a drill-in list grouped into Open and Closed sections. A position is Closed only after assigned shares have been called away. Position creation uses a floating `+` button and sheet.
- Position details contain the ticker, metrics, and transaction history. Transaction creation uses a floating `+` button and sheet.
- Activity is a date-sorted, ungrouped, read-only transaction list that always includes the ticker.
- More contains local data export, import, and reset controls with inline success or error notices.
- Use native date inputs; do not layer a custom calendar icon over them.
- Inputs must be at least 16px to prevent iOS focus zoom.
- Modal sheets must keep the background page fixed and must not use a dimmed backdrop.

## Visual conventions

- Preserve the light iOS-inspired interface: restrained blue accents, rounded surfaces, and subtle shadows.
- Keep position rows compact and text-first: use the blue inset outline, light blue-white gradient, basis chip, and right-side chevron. Do not restore a ticker medallion.
- Position-row basis values must remain visible on narrow iPhones.
- Keep the More-page data actions evenly distributed across their card.
- The app header reads `Position` on details; repeat the ticker only inside the detail card.
- Position-detail entry should blur and fade while the detail card starts from a lower vertical offset and slides up.
- Avoid dense layouts and keep modal transitions smooth. Respect `prefers-reduced-motion`.
- Global text selection is intentionally disabled.

## Verification

- Always leave edited code properly formatted. Do not add compressed one-line CSS rules or inconsistent indentation.
- Run `npm run build` after code changes.
- For visible UI changes, verify the target flow in a browser at the active local dev URL.
- Before deploying changes that affect caching, review `public/sw.js`. Navigation requests must remain network-first so deployments do not serve stale app shells.
- Rotate the service-worker cache name for deployments that need existing asset caches invalidated.

## Caching and release

- `public/sw.js` uses cache-first handling for non-navigation assets. Navigation and `index.html` must remain network-first.
- The current cache name is `petewheeler-v10`. Bump it when a deployment needs a clean offline cache; it is not required for every routine Vite asset deployment.
- The iOS Home Screen app’s name and icon metadata do not update from a new manifest alone. Reinstalling changes that metadata, so export local data first and import it afterward.
- Start local development with `npm run dev`; build production assets with `npm run build`.
