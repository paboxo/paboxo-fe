---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
type: feat
title: "feat: wire REAL HSP pay into gateway.hsp.ts (mainnet 177, USDC.e)"
date: 2026-07-12
target_repos: [paboxo-fe]
---

# feat: real HSP pay (gateway.hsp.ts) — mainnet 177

**Target repo:** `paboxo-fe` (React 19 + Vite + **bun** + **wagmi v3** + viem `^2.54.6`, vitest). Branch `ghozzza/hsp-real-integration` (off latest main, has the merged HSP mock seam). Commit only; NO push/merge (I handle PRs).

## Summary

The HSP Agent Protection feature already shipped **mock-default** (`src/lib/payments/` seam, `gateway.hsp.ts` is a throwing stub). HSP is now confirmed **LIVE on HashKey mainnet 177** (verified). This task fills `gateway.hsp.ts` with the **real `@hsp/sdk`** so that, when `VITE_PAYMENT_MODE=hsp`, the "Enable protection" flow does a genuine on-chain HSP payment in **USDC.e** from the user's wallet to the buyback treasury, returns a verifiable receipt (ACCEPT + HSP Explorer trace), and the existing flow grants rebalance-delegation to the AI keeper. **Mock stays the default**; hsp mode is opt-in via env.

## Verified ground truth (do NOT re-derive — use these)

**Coordinator:** `https://hsp-hackathon.hashkeymerchant.com` (one deployment serves both nets).
**Mainnet chain `hashkey` (177):** stablecoin **USDC.e** `0x054ed45810DbBAb8B27668922D110669c9D88D0a` (6 dec), adapter (pin) `0x467AaF355DF243379B961Ce00abBae20c1e25012`, confirmations 5, RPC `https://mainnet.hsk.xyz`. Testnet `hashkey-testnet` (133): USDC `0x8FE3cB719Ee4410E236Cd6b72ab1fCDC06eF53c6`, same adapter. EIP-712 domain `{name:'HSP',version:'1',chainId,verifyingContract:0x0000…0001}`.

**SDK = `github.com/project-hsp/hsp`** (branch `main`). `@hsp/sdk` + `@hsp/core` are **private, raw-TS, no build, no dist** npm-workspace packages; `exports` map serves `./src/*.ts` directly. **Not on npm.** Pin/align **viem 2.52.2** (our `^2.54.6` satisfies same-major; keep it). Node 24 for their tooling, but Vite/esbuild transpiles TS for us.

**Exact API (from the repo source):**
```ts
import { HSPClient, HSPVerifier } from '@hsp/sdk'
import { resolveChain } from '@hsp/core/chains/index'
// chain is a RESOLVED ChainConfig OBJECT, not the string:
const chain = resolveChain('hashkey')            // 177, USDC.e pinned, RPC pinned
const client = new HSPClient({
  coordinatorUrl,                                // https://hsp-hackathon.hashkeymerchant.com
  apiKey,                                        // VITE_HSP_API_KEY — Bearer for POST /payments + /observe (write-only)
  chain,                                         // ChainConfig from resolveChain
  chainName: 'hashkey',                          // optional; defaults to chain.name
  signer: { kind: 'eip1193', provider, address },// provider = EIP-1193 provider (window.ethereum / wagmi connector provider); address = connected account
})
const handle = await client.pay({ to, amount })  // amount = bigint BASE UNITS (USDC.e 6dec → 1 = 1_000_000n)
// handle: { paymentId(=mandateHash): Hex, txHash: Hex, status: string, mandate, awaitSettled(opts?) }
const snap = await handle.awaitSettled()          // polls GET /payments/:id → { paymentId, status, ... } terminal SETTLED|FAILED|EXPIRED|DISPUTED
// independent verify (optional but strong): GET /payments/:id → { mandate, receipts:[{receipt}] }, then:
const decision = await new HSPVerifier({ chain, adapterAddress }).verify(snap.mandate, receipts.at(-1).receipt)
// decision: { ok: boolean, outcomeClass: 'ACCEPT'|'RETRYABLE'|'POLICY'|'PERMANENT', errorCode?, errorDetail? }
```
- `pay()` internally: sign mandate (`eth_signTypedData_v4`, 1 wallet prompt) → `POST /payments` (needs apiKey) → broadcast ERC-20 **`transfer`** from the wallet (2nd wallet prompt, **NO approve needed** — direct transfer) → `POST /payments/:id/observe` → handle.
- **eip1193 signer** needs the raw **EIP-1193 provider** (`.request(...)`) + the account `address` — NOT a viem WalletClient. Get both from the app's wagmi v3 config (e.g. `getConnectorClient(wagmiConfig)` → its transport/provider + account, or the connected connector's `getProvider()`; fall back to `window.ethereum`). Explore the repo's `src/lib/web3/` for the wagmi config singleton.
- **Verify needs no apiKey** (`GET /payments/:id` is public).

## Requirements
- **R1** — Vendor `@hsp/core` + `@hsp/sdk` (src) into the repo as bun workspace packages so `@hsp/sdk` / `@hsp/core/*` subpath imports resolve and transpile via Vite. Do NOT `npm i` the git repo directly (raw-TS, private).
- **R2** — `gateway.hsp.ts` implements the real `PaymentGateway` (`pay` / `verify` / `explorerUrl`) using `HSPClient` + `HSPVerifier`, with the **eip1193 signer** sourced from the app's wagmi config. Keep the `PaymentGateway` interface unchanged.
- **R3** — Env: `VITE_PAYMENT_MODE` (mock default | hsp), `VITE_HSP_COORDINATOR_URL` (default `https://hsp-hackathon.hashkeymerchant.com`), `VITE_HSP_API_KEY` (read from `.env`, **gitignored** — a placeholder is already injected locally; add a commented line to `.env.example`, NEVER commit the real key), `VITE_HSP_CHAIN` (default `hashkey`). Read them in `src/lib/config/env.ts` + `src/lib/payments/config.ts`.
- **R4** — `PROTECTION.feeToken` → **USDC.e** mainnet `0x054ed45810DbBAb8B27668922D110669c9D88D0a` (the HSP-pinned stablecoin; pay() uses the chain-pinned token). `feeAmount` stays `1_000_000n` (1 USDC.e). Add USDC.e to the token registry if the UI needs its decimals/symbol.
- **R5** — Mock stays the DEFAULT; the app must still build & run with `VITE_PAYMENT_MODE=mock` and no HSP creds. hsp mode only activates with the env set.
- **R6** — typecheck + lint + build + existing tests green. A live mainnet pay is a MANUAL step (needs a funded wallet) — document it; do not attempt a real tx in CI.

## Key Technical Decisions
- **KTD1 — Vendor as workspace source, not a compiled dep.** Copy `packages/core` + `packages/sdk` from `project-hsp/hsp` into `vendor/hsp/{core,sdk}` (keep their `package.json` names `@hsp/core`/`@hsp/sdk`), add `"vendor/hsp/*"` to the root `package.json` `workspaces`, `bun install`. Vite transpiles the raw TS. If subpath resolution (`@hsp/core/chains/index`) fails under Vite, add a small `resolve.alias` or rely on the packages' `exports` map. Pin viem to one version (dedupe).
- **KTD2 — eip1193 signer from wagmi.** The gateway is a plain module; at `pay()` time it must read the live wallet. Source the EIP-1193 provider + connected address from the wagmi config singleton (`src/lib/web3/`), so `PaymentGateway.pay(req)` keeps its signature. If the wallet isn't connected, throw a clear error.
- **KTD3 — Independent verify in `verify()`.** After `awaitSettled()` reaches SETTLED, `verify()` fetches `GET /payments/:id` and runs `HSPVerifier(chain, adapter).verify(...)` → returns `{ ok, outcomeClass }`. This preserves the "trustless verify" story and matches the mock's contract. `explorerUrl(id)` → `${coordinatorUrl}/explorer?id=${id}`.
- **KTD4 — API key is a write-only sandbox key embedded in the FE for the demo** (per product decision). Document the caveat in code + `.env.example`; note the backend-proxy pattern (browser sign+broadcast, backend register+observe) as the production path.

## Implementation Units
### U0. Deps + orient
`bun install`. READ: `src/lib/payments/{gateway.hsp,gateway.mock,registry,types,config}.ts`, `src/lib/config/env.ts`, `src/features/protection/hooks/useProtection.ts`, `src/lib/contracts/addresses.ts` (`PROTECTION`), `src/lib/web3/*` (wagmi config — how to get the connected provider+address), `src/lib/tokens/registry.ts`.

### U1. Vendor the SDK
Clone `https://github.com/project-hsp/hsp` (shallow) to a temp dir; copy `packages/core` → `vendor/hsp/core` and `packages/sdk` → `vendor/hsp/sdk` (their `src` + `package.json` + `tsconfig`). Add `vendor/hsp/*` to root `workspaces`. `bun install`. Confirm `import { HSPClient } from '@hsp/sdk'` and `import { resolveChain } from '@hsp/core/chains/index'` typecheck. Fix any Vite/bun resolution of the `./*` exports (alias if needed). Keep the vendored `.gitignore`d node_modules out; DO commit the vendored src.

### U2. Env + PROTECTION config
`env.ts`: ensure `PAYMENT_MODE`, `HSP_COORDINATOR_URL` (default the real coordinator), `HSP_API_KEY` (`import.meta.env.VITE_HSP_API_KEY`), `HSP_CHAIN` (default `hashkey`). `.env.example`: commented placeholders incl. `# VITE_HSP_API_KEY=` (never the real value). `addresses.ts`: `PROTECTION.feeToken` = USDC.e mainnet; add USDC.e `{address, decimals:6, symbol:'USDC.e'}` to the token registry if needed for display.

### U3. Implement gateway.hsp.ts
Replace the throwing stub with the real impl (see the API block above). `pay(req)` → build `HSPClient` (coordinator, apiKey, `resolveChain('hashkey')`, eip1193 signer from wagmi) → `client.pay({to:req.to, amount:req.amount})` → return a `PaymentHandle` whose `awaitSettled()` wraps `handle.awaitSettled()` and returns `{ status, receipt:{ paymentId, mandate, receipt, attestations } }` (fetch the triple for verify). `verify(receipt)` → `GET /payments/:id` + `HSPVerifier.verify` → `{ ok, outcomeClass }`. `explorerUrl(id)` → coordinator `/explorer?id=`. Throw a clear error if `VITE_HSP_API_KEY`/coordinator missing or wallet not connected.

### U4. Verify + document
`bun run typecheck`, lint, `bun run build`, `bun run test` (or the repo's scripts — discover from package.json) — all green; mock tests unbroken. Add `docs/HSP-PROTECTION.md` a short "Going live (hsp mode)" section: set `VITE_PAYMENT_MODE=hsp` + `VITE_HSP_API_KEY` + coordinator; test on **testnet 133 first** (`VITE_HSP_CHAIN=hashkey-testnet`, faucet `POST /faucet/faucet`), then mainnet (fund wallet with USDC.e + HSK). Live pay is a manual step.

## Scope Boundaries
- In scope: real `gateway.hsp.ts` + vendoring + env + config, FE only.
- Out of scope: keeper-side real verify (separate branch `ghozzza/hsp-real-verify`); a backend key-proxy (documented as the production path, not built); x402/compliance paths.

## Verification Contract
`bun run typecheck` ✅ · lint ✅ · `bun run build` ✅ · `bun run test` ✅ (mock default unbroken). No real key committed. hsp mode compiles + constructs; live mainnet pay verified manually by the user.

## Definition of Done
Units done; Verification Contract green; mock still default; `@hsp/sdk` vendored + `gateway.hsp.ts` real; committed on `ghozzza/hsp-real-integration` (NOT pushed). Report: files changed, how to flip to hsp mode, and the manual live-test steps.

## Sources
- HSP SDK: `github.com/project-hsp/hsp` (`packages/{core,sdk}/src`, `docs/guide.md`, `examples/{pay-demo,merchant-verify}.ts`). Coordinator live: `https://hsp-hackathon.hashkeymerchant.com/chains` (177 = USDC.e + adapter).
