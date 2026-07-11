# Agent Protection (HSP) — Frontend

Opt-in feature: a user pays a small stablecoin fee via **HSP** (HashKey Settlement Protocol) to turn on **AI agent protection** of their lending position. On a verified `ACCEPT`, the app grants **rebalance-delegation** to the AI keeper wallet, which then protects (rebalances) the position when the oracle drops.

```
Enable protection
  → gateway.pay({ to: feeTreasury, amount: fee })     # HSP mandate signed, wallet settles (zero-custody)
  → handle.awaitSettled()                              # → SETTLED
  → gateway.verify(receipt)                            # → { ok, outcomeClass }
  → outcomeClass === 'ACCEPT'
      ? approveRebalanceDelegation(keeper, true)       # on-chain: user grants the keeper
      : stop (surface reason, no delegation)
  → keeper may now rebalance the position (it re-verifies ACCEPT on its side)
```

## Status: mock-default, nothing calls real HSP yet

**HSP is pre-1.0, testnet-only, and not yet released** — `@hsp/*` is not on npm; the Coordinator URL, adapter address, and USDC are placeholders the organizer supplies later. So everything HSP sits behind a **swappable `PaymentGateway` abstraction with a `mock` default**. The app builds and runs unchanged with zero HSP credentials, and **no `@hsp/*` package is imported anywhere**.

`VITE_PAYMENT_MODE` selects the gateway: `mock` (default) | `hsp` (real, needs sandbox creds). See `.env.example`.

## Architecture

`src/lib/payments/` mirrors the existing `ChainAdapter` mock/live registry (`src/lib/data/registry.ts`):

| File | Role |
|---|---|
| `types.ts` | `PaymentGateway`, `PayRequest`, `PaymentHandle`, `PaymentReceipt`, `Decision`, `OutcomeClass` (`ACCEPT`/`RETRYABLE`/`POLICY`/`PERMANENT`) |
| `gateway.mock.ts` | `mockPaymentGateway` — deterministic settle → `ACCEPT` (demo default) |
| `gateway.hsp.ts` | `hspPaymentGateway` — **stub** that throws "awaiting sandbox"; real `@hsp/sdk` calls sketched in comments |
| `registry.ts` | `getPaymentGateway()` / `resolvePaymentGateway(mode)` — bound to `VITE_PAYMENT_MODE` |

The gateway interface mirrors HSP's real API 1:1 so swapping in `@hsp/sdk` later is mechanical:
`pay({to, amount, compliance?}) → { paymentId (=mandateHash), txHash, status, awaitSettled() }` and `verify(receipt) → { ok, outcomeClass }`.

## The feature

- **`src/features/protection/hooks/useProtection.ts`** — `useProtection(market)` orchestrates pay → verify → `approveRebalanceDelegation` (reuses the standard `useWriteAction` for the on-chain leg); `useProtectionStatus(market)` reads whether protection is active.
- **`src/features/protection/components/ProtectionPanel.tsx`** — the "Enable protection (pay fee)" UI: fee amount, pay/verify/activate phases, an `ACCEPT` badge + HSP Explorer link, and an active/disable state. Mounted on the live market page (`src/features/markets/components/MarketDetail.tsx`, next to `MarketActions`).
- **Chain adapter** gained `approveRebalanceDelegation(pool, delegate, allowed)` (write) and `getRebalanceDelegation(pool, owner, delegate)` (read) — mock + live.

**On-chain primitive already existed** (no contract change): `LendingPool.approveRebalanceDelegation(delegate, allowed)` sets `rebalanceDelegation[user][delegate]`, which `LendingPool.rebalancePosition(...)` checks.

## Configure before it works — 2 placeholders

`src/lib/contracts/addresses.ts` → `PROTECTION`:

| Field | What | Status |
|---|---|---|
| `agentKeeper` | AI keeper wallet that receives rebalance-delegation | ✅ `0x1840A5a5AE7D0F70674C434f3BFf4a7e529c9F0b` — the **REBALANCE_KEEPER / `AGENT_ADDRESS`** (keeper `docs/AI-REBALANCE-FRONTEND.md`), NOT the market-maker wallet |
| `feeTreasury` | Fee recipient — buyback / fee-sink wallet | **TODO** (zero-address) — product decision, pending |
| `feeToken` | Fee stablecoin | ✅ pxUSDT |
| `feeAmount` | Fee in base units | ✅ `1_000_000n` (1 pxUSDT) |

Until `agentKeeper` **and** `feeTreasury` are set, `PROTECTION_UNCONFIGURED(PROTECTION)` is `true` and the panel disables the "Enable protection" action — nothing can be sent to `0x0`.

## Honest caveats (state these in the pitch)

- **Mock by default** — no real payment happens until the HSP sandbox ships and `VITE_PAYMENT_MODE=hsp` + creds are set.
- **Two-chain demo** — HSP runs on HashKey **testnet**; the Paboxo protocol is on **mainnet 177**. The fee leg settles on testnet while the position lives on mainnet. Surface this, don't hide it.
- **Off-chain gate** — the HSP receipt is an adapter-signed observation, not an on-chain proof. "ACCEPT → delegation" is orchestrated in the app; the keeper independently re-verifies the ACCEPT receipt before it touches the position (see keeper `docs/AI-REBALANCE-BACKEND.md` §11).

## When the sandbox ships

Wire the real SDK in `src/lib/payments/gateway.hsp.ts` (`new HSPClient({coordinatorUrl, apiKey, signer, chain}).pay(...)` + `new HSPVerifier({chain, adapterAddress}).verify(...)`), set `VITE_PAYMENT_MODE=hsp` and the `VITE_HSP_*` env. Nothing else changes.

## Verified

typecheck ✅ · lint ✅ · test ✅ 427 passed · build ✅ (2026-07-11). Canonical FE integration guide: `paboxo-sc/docs/INTEGRATION-FRONTEND.md` §11. Keeper side: `paboxo-keeper/docs/AI-REBALANCE-BACKEND.md` §11.
