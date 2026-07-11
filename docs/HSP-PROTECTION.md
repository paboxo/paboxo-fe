# Agent Protection (HSP) — Frontend

Opt-in feature: a user pays a small stablecoin fee via **HSP** (Human-Signed
Payments) to turn on **AI agent protection** of their lending position. On a
verified `ACCEPT`, the app grants **rebalance-delegation** to the AI keeper
wallet, which then protects (rebalances) the position when the oracle drops.

```
Enable protection
  → gateway.pay({ to: feeTreasury, amount: fee })     # HSP mandate signed, wallet settles (zero-custody)
  → handle.awaitSettled()                              # → SETTLED
  → gateway.verify(receipt)                            # → { ok, outcomeClass } (independent, coordinator-trustless)
  → outcomeClass === 'ACCEPT'
      ? approveRebalanceDelegation(keeper, true)       # on-chain: user grants the keeper
      : stop (surface reason, no delegation)
  → keeper may now rebalance the position (it re-verifies ACCEPT on its side)
```

## Status: real HSP wired, **mock still the default**

HSP is **LIVE on HashKey mainnet 177**, settling in **USDC.e**. The real client
(`@hsp/sdk` + `@hsp/core`) is **vendored** under `vendor/hsp/*` (private, raw-TS,
not on npm — see `vendor/hsp/README.md`) and wired into `gateway.hsp.ts`.

Everything HSP still sits behind a **swappable `PaymentGateway` with a `mock`
default**, so the app builds and runs with **zero HSP credentials** — the vendored
SDK is tree-shaken out of a `mock` build. Real on-chain HSP happens only when you
opt in with `VITE_PAYMENT_MODE=hsp` + the creds below.

## Architecture

`src/lib/payments/` mirrors the existing `ChainAdapter` mock/live registry
(`src/lib/data/registry.ts`):

| File | Role |
|---|---|
| `types.ts` | `PaymentGateway`, `PayRequest`, `PaymentHandle`, `PaymentReceipt`, `Decision`, `OutcomeClass` (`ACCEPT`/`RETRYABLE`/`POLICY`/`PERMANENT`) |
| `gateway.mock.ts` | `mockPaymentGateway` — deterministic settle → `ACCEPT` (demo/build default) |
| `gateway.hsp.ts` | `hspPaymentGateway` — **real** `@hsp/sdk` `HSPClient.pay()` + `HSPVerifier.verify()` |
| `registry.ts` | `getPaymentGateway()` / `resolvePaymentGateway(mode)` — bound to `VITE_PAYMENT_MODE` |

`gateway.hsp.ts` is a plain module, so at `pay()` time it reads the **live wallet
from the wagmi config singleton** (`getConnection(wagmiConfig)` → the connector's
EIP-1193 provider + connected address), feeds HSP's `eip1193` signer, and calls
`new HSPClient({ coordinatorUrl, apiKey, chain: resolveChain('hashkey'), signer }).pay({ to, amount })`.
`verify()` independently re-fetches `GET /payments/:id` and replays the
`(mandate, receipt)` through `new HSPVerifier({ chain, adapterAddress }).verify(...)`
— an `ACCEPT` that never trusts the coordinator.

## Configuration

`src/lib/contracts/addresses.ts` → `PROTECTION`:

| Field | What | Value |
|---|---|---|
| `agentKeeper` | AI keeper wallet that receives rebalance-delegation | `0x1840A5a5AE7D0F70674C434f3BFf4a7e529c9F0b` — the **REBALANCE_KEEPER / `AGENT_ADDRESS`**, not the market-maker wallet |
| `feeTreasury` | Fee recipient — buyback / fee-sink wallet | `0x63b9679e3A253920161B51A79D122EAad1c19baF` |
| `feeToken` | Fee stablecoin (display only — HSP `pay()` uses the chain-pinned token) | **USDC.e** `0x054ed45810DbBAb8B27668922D110669c9D88D0a` |
| `feeAmount` | Fee in base units | `1_000_000n` (1 USDC.e, 6 dp) |

Env (`.env.example` documents all of these; read in `src/lib/config/env.ts`):

| Var | Default | Notes |
|---|---|---|
| `VITE_PAYMENT_MODE` | `mock` | `hsp` = real on-chain pay |
| `VITE_HSP_COORDINATOR_URL` | `https://hsp-hackathon.hashkeymerchant.com` | one deployment serves both nets |
| `VITE_HSP_CHAIN` | `hashkey` | mainnet 177 · or `hashkey-testnet` (133) |
| `VITE_HSP_API_KEY` | — | **write-only** key; keep it in **`.env.local` (gitignored)** — NEVER commit it |
| `VITE_HSP_ADAPTER_ADDRESS` | `0x467AaF355DF243379B961Ce00abBae20c1e25012` | pinned adapter (same on 177 + 133) |
| `VITE_HASHKEY_RPC` | — | optional; route mainnet receipt-reads through the same-origin proxy to dodge CORS (see below) |

---

## Going live (hsp mode)

### Flip the gateway

Put the creds in **`.env.local`** (gitignored — the real API key must never be
committed):

```bash
VITE_PAYMENT_MODE=hsp
VITE_HSP_API_KEY=<the write-only HSP key>        # keep here ONLY
# coordinator + chain default correctly; override only to change nets:
# VITE_HSP_COORDINATOR_URL=https://hsp-hackathon.hashkeymerchant.com
# VITE_HSP_CHAIN=hashkey
# Optional: avoid CORS on the receipt-wait by routing mainnet reads through the
# dev proxy (vite.config server.proxy /hsk-rpc → https://mainnet.hsk.xyz):
# VITE_HASHKEY_RPC=http://localhost:3000/hsk-rpc
```

Then `bun run dev`. Back to `mock` = delete/flip `VITE_PAYMENT_MODE`.

### Why the RPC override matters

HSP's `pay()` broadcasts the ERC-20 transfer through the wallet, then waits for
the receipt via a direct `http(chain.rpcUrl)` read. The public HashKey RPC sends
no CORS headers, so that browser read is blocked on mainnet. Set
`VITE_HASHKEY_RPC=http://localhost:3000/hsk-rpc` and `gateway.hsp.ts` routes the
mainnet receipt-wait through the app's same-origin proxy. (Testnet keeps its own
default RPC.)

### Manual live test — testnet 133 first (recommended dry-run)

HSP's testnet is a **separate deployment** on HashKey testnet (133). Because the
app's wagmi config only offers mainnet 177, an in-app testnet run needs your
wallet manually added/switched to chain 133; the lowest-friction dry-run is the
vendored SDK's own path:

1. Get a funded testnet key and claim gas + testnet USDC from the faucet
   (a separate service; URL from the organizer):
   ```bash
   curl -s -X POST <FAUCET_URL>/faucet -H 'content-type: application/json' \
     -d '{"address":"0xYourAddress"}'
   # GET <FAUCET_URL>/faucet shows drip amounts + cooldown
   ```
2. Exercise pay + independent verify with the vendored SDK against
   `VITE_HSP_CHAIN=hashkey-testnet` (the `HSPClient`/`HSPVerifier` calls are the
   same ones `gateway.hsp.ts` makes). This confirms creds + coordinator before
   spending real USDC.e.

### Manual live test — mainnet 177 (the real flow, ~1 USDC.e)

A real mainnet pay needs a funded wallet — **do this by hand, never in CI**:

1. Fund the wallet you'll connect (on HashKey **177**) with a little **HSK** for
   gas + at least **1 USDC.e** (`0x054ed45810DbBAb8B27668922D110669c9D88D0a`).
2. `.env.local`: `VITE_PAYMENT_MODE=hsp`, `VITE_HSP_API_KEY=<key>`,
   `VITE_HSP_CHAIN=hashkey` (default), and ideally the `VITE_HASHKEY_RPC` proxy
   override above. `bun run dev`.
3. Connect the funded wallet (chain 177), open a market's **Agent protection**
   panel, click **Enable protection**.
4. Approve the wallet prompts in order:
   - **Prompt 1** — sign the HSP **mandate** (EIP-712, `eth_signTypedData_v4`).
   - **Prompt 2** — the USDC.e **`transfer`** to the treasury (direct transfer,
     no approve). The app then polls the coordinator to `SETTLED`.
   - **Prompt 3** — the on-chain **`approveRebalanceDelegation`** (only after the
     independent `verify()` returns `ACCEPT`).
5. Confirm the panel shows the **ACCEPT** badge + an **HSP Explorer** link
   (`…/explorer?id=<paymentId>`) and protection reads **active**. A non-`ACCEPT`
   decision stops before any delegation and surfaces the reason.

## Honest caveats (state these in the pitch)

- **Mock by default** — no real payment happens unless `VITE_PAYMENT_MODE=hsp` +
  creds are set. A `mock` build imports no HSP code at all.
- **Write-only key in the browser (demo trade-off, KTD4)** — `VITE_HSP_API_KEY`
  is a write-only sandbox key embedded in the FE for the demo. The **production
  path** proxies register + observe through a backend (the browser only *signs*
  and *broadcasts*), so the key never ships to the client. Documented, not built.
- **Off-chain gate** — the HSP receipt is an adapter-signed observation, not an
  on-chain proof. "ACCEPT → delegation" is orchestrated in the app; the keeper
  independently re-verifies the ACCEPT receipt before it touches the position
  (keeper `docs/AI-REBALANCE-BACKEND.md` §11).
- **Keeper-side real verify is a separate branch** (`ghozzza/hsp-real-verify`),
  out of scope here.

## Verified

typecheck ✅ · lint ✅ · test ✅ 428 passed · build ✅ (mock default; Vite
resolves + transpiles the vendored raw-TS SDK — verified in dev + build).
2026-07-12. SDK source: `github.com/project-hsp/hsp` (vendored @ `65ba3c9`).
Canonical FE integration guide: `paboxo-sc/docs/INTEGRATION-FRONTEND.md` §11.
Keeper side: `paboxo-keeper/docs/AI-REBALANCE-BACKEND.md` §11.
