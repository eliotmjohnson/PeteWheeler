# PeteWheeler

A mobile-first React app for tracking wheel strategy option trades and adjusted share cost.

## Run

```bash
npm install
npm run dev
```

## What It Tracks

- Short put sells and buybacks
- Put assignment into shares
- Short call sells and buybacks
- Shares called away
- Net put/call premiums
- Adjusted cost per assigned share
- Ticker positions with a complete transaction history

Data is stored in browser localStorage under `wheel-cost-tracker:v1`.
