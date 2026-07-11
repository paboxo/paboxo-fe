# Paboxo — Frontend

The web app for **Paboxo**, a money-market (lending / borrowing) dApp on **HashKey Chain** (mainnet, chainId `177`). Supply assets to earn, borrow **pxUSDT** against collateral, and always know how safe your position is.

Built on TanStack Start (React 19, TanStack Router, Tailwind 4), wagmi v3 + viem, and Reown AppKit.

> **Status: live on HashKey 177.** The UI and the on-chain money path are wired end-to-end — wallet connect, contract reads through each market's `router`, and writes through `LendingPool` (two-address rule). `*/mock.ts` fixtures remain only as test doubles behind the same data shapes.

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000
```

Tour the app by **intent** from the header nav: **Earn** (`/earn`, supply collateral to earn) → **Borrow** (`/borrow`, borrow pxUSDT + repay) → **Swap** (`/swap`, swap the collateral held in a position) → **Portfolio** (`/portfolio`, your positions). Each pool has a detail page at `/earn/$id` and `/borrow/$id`. Try the **◑ Theme** toggle (light/dark); on mobile a **Simple/Pro** density toggle appears in the header.

## Scripts

| Command                   | What it does                                       |
| ------------------------- | -------------------------------------------------- |
| `bun run dev`             | Dev server on port 3000                            |
| `bun run build`           | Production build                                   |
| `bun run test`            | Unit tests (Vitest)                                |
| `bun run typecheck`       | `tsc --noEmit`                                     |
| `bun run lint`            | ESLint                                             |
| `bun run format`          | Prettier write + ESLint fix                        |
| `bun run generate-routes` | Regenerate `routeTree.gen.ts` after adding a route |

## Project structure

```text
src/
  lib/
    format/     # number/amount/currency formatting (compact, dust, per-token decimals)
    risk/       # health-factor -> zone model (buffer-to-liquidation)
    math/       # share<->asset conversions (supply/borrow shares, live totals)
    tx/         # write action wrapper, gas clamp, preflight, revert-reason mapping
    data/       # chain + indexer adapters (getAdapters seam) behind stable shapes
    contracts/  # REAL HashKey-177 addresses, market/IRM config, and extracted ABIs
    copy/       # plain-language risk glossary
  components/
    ui/         # the shared kit - health viz, tx status, money input, states, wallet, tooltip ...
    layout/     # AppHeader (Earn/Borrow/Swap/Portfolio), breadcrumb, PortfolioStrip, DensityToggle
    action/     # ActionPanel (money input + projected health + review + tx button)
  features/     # earn - borrow - repay - withdraw - supply - swap - position - portfolio
                # markets - history - analytics - crosschain - delegation - liquidate - pool-create
  routes/       # TanStack file routes: index, earn(.$id), borrow(.$id), swap, portfolio, about
  styles.css    # coastal-glass design tokens (light + dark) + component primitives
```

The UI kit is **data-agnostic** — components take props / injected callbacks and read the chain only through the `getAdapters()` seam, so behavior is testable against mock adapters without a redesign.

## Money actions

All writes go through one wrapper (`lib/tx/useWriteAction`) that clamps gas to HashKey's minimum (0.001 gwei floor), runs a preflight, waits for the receipt, and maps reverts to plain language. Amounts convert to **live debt/supply shares** so accrued interest is always covered.

- **Earn** — supply collateral to a pool; **Withdraw** returns it (blocked only by health, never a stale price).
- **Borrow** — borrow pxUSDT against collateral, gated on max-borrow, liquidity, and projected health.
- **Repay** (`features/repay`) — pick **any** token to repay with, and choose the source with the **"Repay with collateral"** toggle:
  - **token = pxUSDT** → applied directly (no swap).
  - **token = anything else** → swapped to pxUSDT on-chain via DODO.
  - **toggle off** → paid from the **wallet** (needs an approval).
  - **toggle on** → paid from the **position** (`fromPosition`) — no wallet funds, no approval. A position can hold any token (you can swap its collateral), so this isn't limited to the market's original collateral.

  Approvals are right-sized per path: exact debt **+0.1%** for the direct wallet path (covers interest drift before the tx mines), **+2%** for the swapped wallet path (the pool over-provisions the swap input ~1% so the output clears the debt), and **none** from the position. The swap `fee` field is `0` — DODO routes by token-pair and ignores it (it is not a Uniswap V3 fee tier). Swap paths surface a **"Swap cost (max) ~1%"** line and use `amountOutMinimum: 0` (the pool floors the output at the debt).
- **Swap** (`features/swap`) — swap the collateral held **inside** a position into another token (no wallet funds; the token is already in the position).

## Design system

- **Coastal-glass identity** — a warm island/lagoon palette (sea-ink, lagoon, palm, sand), Fraunces (display) + Manrope (UI) + tabular mono numerals, in full light + dark. Tokens live in [`src/styles.css`](src/styles.css); flat solid surfaces with defined borders.
- **One accent, semantic-only color** — lagoon for actions, palm-green for positive/yield, amber/coral for risk — always paired with a label + shape (never color alone).
- **Simple / Pro density** — the full (Pro) layout on desktop; Simple is a mobile-only, calmer default. Responsive via [`src/components/density/DensityProvider.tsx`](src/components/density/DensityProvider.tsx).
- **Safety UX** — health as buffer-to-liquidation + liquidation price, projected before/after on every risk action, right-sized approvals, plain-language revert reasons.

## Contracts & deployment

Paboxo is **live on HashKey Chain 177** (mock-asset path; cross-chain over Chainlink CCIP). The frontend carries the real config in [`src/lib/contracts/`](src/lib/contracts):

- `addresses.ts` — core singletons (LendingPoolFactory, TokenDataStream, IsHealthy, InterestRateModel, CCIP), tokens (pxUSDT/pxWHSK/pxWBTC/pxWETH), price feeds, cross-chain.
- `markets.ts` — the 4 markets with per-market **IRM tiers** and seed prices. Every pool actually shipped at **LTV 70 / liquidation threshold 75** (the router's `ltv()` returns `7e17` and the creation event carries `75%` on all four); the tiered numbers in older plans never deployed.
- `abis/` — ABIs extracted from the smart-contract repo's `forge build`.

Each market's accounting `router` is resolved at runtime via `LendingPool.router()`, and writes target the pool while state reads go through the router (two-address rule). Canonical deployment reference: `references/paboxo-sc/docs/DEPLOYMENT.md` and `INTEGRATION-FRONTEND.md` (gitignored SC repo).

## Plans & docs

- [`docs/plans/2026-07-08-001-feat-paboxo-app-ui-ux-plan.html`](docs/plans/2026-07-08-001-feat-paboxo-app-ui-ux-plan.html) — the UI/UX design + implementation plan (open in a browser).
- [`docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md`](docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md) — the data/contract integration plan.
- [`docs/plans/2026-07-11-003-feat-luminous-pool-detail-redesign-plan.md`](docs/plans/2026-07-11-003-feat-luminous-pool-detail-redesign-plan.md) — the Luminous pool-detail redesign.

## Roadmap

Live: wallet connect, market/position reads, and the full money path (supply, borrow, repay A/B/C, withdraw, collateral swap, cross-chain borrow over CCIP). Still external and owned outside this repo: the indexer/subgraph feeding history + analytics, and the Base-side CCIP sender.

## Quality

Small, per-unit commits; ESLint + Vitest run and green before each commit. Tests cover the pure logic (formatting, health model, share math, revert mapping) and the interactive components (tx states, money input, action-panel gating, repay paths, density, states). Run `bun run test && bun run typecheck && bun run lint && bun run build`.
