# Paboxo — Frontend

The web app for **Paboxo**, a money-market (lending / borrowing) dApp on **HashKey Chain** (mainnet, chainId `177`). Supply assets to earn, borrow **pxUSDT** against collateral, and always know how safe your position is.

Built on TanStack Start (React 19, TanStack Router, Tailwind 4).

> **Status: preview.** The full UI/UX layer is implemented and runs on **mock data**. The real on-chain addresses and ABIs are already wired in [`src/lib/contracts/`](src/lib/contracts), but the wallet + contract read/write integration (wagmi/viem + Reown AppKit) is not built yet — see [Roadmap](#roadmap).

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000
```

Tour the app: **`/`** (home) → **`/markets`** (all markets) → **`/market/$id`** (market detail + supply panel) → **`/dashboard`** (your position). Try the **◑ Theme** toggle (light/dark). On mobile a **Simple/Pro** density toggle appears in the header; desktop always renders the full Pro layout.

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
    tx/         # transaction state machine + revert-reason mapping
    contracts/  # REAL HashKey-177 addresses, market/IRM config, and extracted ABIs
    copy/       # plain-language risk glossary
  components/
    ui/         # the shared kit - health viz, tx status, money input, states, wallet, tooltip ...
    layout/     # AppHeader, AppPageHeader, PortfolioStrip, DensityToggle
    density/    # DensityProvider (responsive Simple/Pro) + useDensity
    action/     # ActionPanel (money input + projected health + review + tx button)
  features/     # markets - position - crosschain - delegation - liquidate - pool-create - onboarding
    */mock.ts   # placeholder data (integration plan's real hooks swap in behind these shapes)
  routes/       # TanStack file routes: index, markets, market.$id, dashboard, about
  styles.css    # coastal-glass design tokens (light + dark) + component primitives
```

The UI kit is **data-agnostic** — components take props / injected callbacks and never import chain adapters, so the mock -> real swap is a data change, not a redesign.

## Design system

- **Coastal-glass identity** — a warm island/lagoon palette (sea-ink, lagoon, palm, sand), Fraunces (display) + Manrope (UI) + tabular mono numerals, in full light + dark. Tokens live in [`src/styles.css`](src/styles.css); flat solid surfaces with defined borders.
- **One accent, semantic-only color** — lagoon for actions, palm-green for positive/yield, amber/coral for risk — always paired with a label + shape (never color alone).
- **Simple / Pro density** — the full (Pro) layout on desktop; Simple is a mobile-only, calmer default. Responsive via [`src/components/density/DensityProvider.tsx`](src/components/density/DensityProvider.tsx).
- **Safety UX** — health as buffer-to-liquidation + liquidation price, projected before/after on every risk action, exact-amount approvals, plain-language revert reasons.

## Contracts & deployment

Paboxo is **live on HashKey Chain 177** (mock-asset path; cross-chain over Chainlink CCIP). The frontend carries the real config in [`src/lib/contracts/`](src/lib/contracts):

- `addresses.ts` — core singletons (LendingPoolFactory, TokenDataStream, IsHealthy, InterestRateModel, CCIP), tokens (pxUSDT/pxWHSK/pxWBTC/pxWETH), price feeds, cross-chain.
- `markets.ts` — the 4 markets with real per-market **IRM tiers** (LTV 70/80/80/65, liquidation thresholds 75/85/85/72) and seed prices.
- `abis/` — 12 ABIs extracted from the smart-contract repo's `forge build`.

Each market's accounting `router` is resolved at runtime via `LendingPool.router()` (two-address rule). Canonical deployment reference: `references/paboxo-sc/docs/DEPLOYMENT.md` (gitignored SC repo). The [integration plan](docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md) has a full **Deployment Reconciliation** section.

## Plans & docs

- [`docs/plans/2026-07-08-001-feat-paboxo-app-ui-ux-plan.html`](docs/plans/2026-07-08-001-feat-paboxo-app-ui-ux-plan.html) — the UI/UX design + implementation plan (open in a browser).
- [`docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md`](docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md) — the data/contract integration plan.

## Roadmap

Not yet built (owned by the integration plan): the wagmi v3 + viem + Reown AppKit provider, wallet connect, the `chainAdapter` / `indexerAdapter` data seam, and real contract reads/writes. The UI kit and the real `src/lib/contracts/` config are ready for those adapters to consume. Also external: the indexer/subgraph and the Base-side CCIP sender.

## Quality

Small, per-unit commits; ESLint + Vitest run and green before each commit. Tests cover the pure logic (formatting, health model, revert mapping) and the interactive components (tx states, money input, action-panel gating, density, states). Run `bun run test && bun run typecheck && bun run lint && bun run build`.
