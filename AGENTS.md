# PeteWheeler project guidance

## Project

- Mobile-first React + Vite app for tracking wheel strategy positions.
- Record option transactions, assignments, called-away shares, premiums, adjusted share cost, and wheel P/L.
- Persist user data in browser localStorage under `wheel-cost-tracker:v1`.
- Keep dependencies minimal; do not add a library for small UI behavior. `swiper` is the deliberate exception for transaction-history swipe actions.

## Structure

- `src/App.jsx` contains the app state, calculations, and screen components.
- `src/styles.css` is the shared visual system. Keep it formatted and favor scoped selectors for screen-specific styling.
- `src/main.jsx` mounts React in `StrictMode` and registers the service worker only in production builds.
- `public/sw.js` is the production service worker.
- `vite.config.js` deploys the app under the `/PeteWheeler/` base path; keep asset and service-worker URLs base-aware.
- There is no router, backend, authentication layer, test suite, or lint script. Screen navigation is local React state (`home`, `positions`, `detail`, `activity`, and `settings`).

## Data model and accounting

- Stored data is an array of positions. A position has `id`, uppercase `symbol`, `createdAt`, and an `events` array.
- Events have `id`, `type`, `date` (`YYYY-MM-DD`), `contracts`, `shares`, `strike`, `premium`, `fees`, and an optional `note`. The supported types are `sell_put`, `buy_put`, `assignment`, `sell_call`, `buy_call`, and `called_away`.
- The contract multiplier is 100. For option events, premium is per share and cash flow is `premium × contracts × 100`, less fees for sells and plus fees for buybacks. Assignment is a debit of `strike × shares + fees`; called-away shares are a credit of `strike × shares - fees`.
- Position analysis is centralized in `analyzePosition`; keep summary, status, cost-basis, and P/L changes there rather than recreating calculations in UI components.
- Adjusted basis includes all net put and call premiums. A wheel is closed only when assigned shares have all been called away; only then is total cash flow reported as closed wheel P/L. Otherwise, wheel P/L is realized net premium to date.
- Chronological displays and calculations use date ascending, then same-day order: buybacks, option sells, assignment, called away. History views render that ordered list in reverse; activity renders newest first.
- Import replaces—not merges—saved positions. It only normalizes position-level fields and accepts each imported `events` array as-is, so preserve backward compatibility with the event schema and validate more strictly only with an intentional migration plan.

## Product conventions

- Home is an account overview with a four-transaction recent-activity preview, not a position list.
- Positions is a drill-in list grouped into Open and Closed sections. A position is Closed only after assigned shares have been called away. Position creation uses a floating `+` button and sheet.
- Position details contain the ticker, metrics, and transaction history. Transaction creation uses a floating `+` button and sheet.
- Activity is a date-sorted, ungrouped, read-only transaction list that always includes the ticker.
- More contains local data export, import, and reset controls with inline success or error notices.
- More: successful imports navigate to Positions; malformed or empty imports stay on More with an inline error. A confirmed reset returns Home. Export uses the native file share flow where available; iOS may reload a Home Screen web app after this system handoff, so Home is the intentional reload destination.
- Export is a JSON object shaped as `{ "positions": [...] }`; retain this backup format unless a compatibility path is supplied.
- A built-in AAPL sample position is available only from the empty Positions state and replaces current data when loaded.
- Position-detail transaction rows use compact Swiper actions: Edit is on the left and Delete is on the right. Reset the row after either action, and animate a deletion off-screen before collapsing its height.
- Use the in-app confirmation sheet for destructive position deletion and reset actions; do not use browser `alert`, `confirm`, or `prompt` dialogs.
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
- The layout is capped at 760px, has a fixed four-tab bottom bar, and accounts for iOS safe-area insets. Keep floating controls above the tab bar.
- Icons come from `lucide-react`; transaction swipe behavior is the only use of `swiper`.

## Verification

- Always leave edited code properly formatted. Do not add compressed one-line CSS rules or inconsistent indentation.
- Run `npm run build` after code changes.
- For visible UI changes, verify the target flow in a browser at the active local dev URL.
- Before deploying changes that affect caching, review `public/sw.js`. Navigation requests must remain network-first so deployments do not serve stale app shells.
- Rotate the service-worker cache name for deployments that need existing asset caches invalidated.

## Caching and release

- `public/sw.js` uses cache-first handling for non-navigation assets. Navigation and `index.html` must remain network-first.
- The current cache name is `petewheeler-v11`. Bump it when a deployment needs a clean offline cache; it is not required for every routine Vite asset deployment.
- The iOS Home Screen app’s name and icon metadata do not update from a new manifest alone. Reinstalling changes that metadata, so export local data first and import it afterward.
- Start local development with `npm run dev`; build production assets with `npm run build`.
