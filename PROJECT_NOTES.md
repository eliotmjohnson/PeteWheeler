# PeteWheeler project notes

## Purpose

PeteWheeler is a mobile-first wheel-strategy tracker. It records option transactions, assignments, called-away shares, premiums, and adjusted share cost. Data is local to the browser.

## Current information architecture

| Surface | Purpose |
| --- | --- |
| Home | Portfolio overview plus a compact preview of the three most recent transactions. |
| Positions | Simple list of positions. The floating `+` opens the add-position sheet. |
| Position detail | Position metrics and complete transaction history. The floating `+` opens the add-transaction sheet. |
| Activity | One date-sorted list of all transactions; entries show ticker, type, date, strike, and price/cash flow. |
| More | Local data export, import, and reset controls. |

## Key design decisions

- Do not show individual position rows on Home; use the Recent activity preview instead.
- Keep the position-list rows compact and text-first. The ticker medallion was intentionally removed.
- Position rows have a restrained blue inset outline, light blue-white gradient, small basis chip, and right-side chevron.
- The position-detail app header reads `Position`; the ticker is only repeated inside the detail card.
- Position details preserve the standard screen animation, but enter from a 32px lower offset before sliding up.
- More-page export, import, and reset actions share the available card width evenly.
- Position and transaction creation happen in bottom sheets rather than inline forms.
- Sheets have no dimmed backdrop, slide in slowly with an iOS-like transition, and dismiss faster. The page behind a sheet is scroll-locked.
- Global text selection is disabled by design.
- Inputs use 16px text and a consistent 46px height to prevent iOS zoom. The date control intentionally relies on native iOS presentation.

## Implementation notes

- Core application logic lives in `src/App.jsx`; visual behavior lives in `src/styles.css`.
- Position and transaction data is saved under localStorage key `wheel-cost-tracker:v1`.
- The production service worker in `public/sw.js` uses a cache-first policy for non-navigation assets, but navigation and `index.html` are network-first. This prevents stale deployments.
- Cache name is currently `petewheeler-v9`; rotate it when changing service-worker cache behavior or when a cache reset is necessary.

## Development and release

```bash
npm run dev -- --port 3000
npm run build
```

After deploying a build, reload once to allow the service worker update to activate. If an older build remains visible, clear the site’s service-worker/cache storage, then reload.
