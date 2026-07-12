/** Runtime env access (U1/U2). VITE_* vars are injected at build/dev time. */

export type DataMode = 'mock' | 'live'

/** Data source: `mock` (preview default) or `live` (real chain reads/writes). */
export const DATA_MODE: DataMode =
  import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'mock'

/** Reown (WalletConnect) project id — empty in preview until one is provided. */
export const PROJECT_ID: string = import.meta.env.VITE_REOWN_PROJECT_ID ?? ''

/** Optional RPC override for HashKey Chain. */
export const HASHKEY_RPC_OVERRIDE: string | undefined =
  import.meta.env.VITE_HASHKEY_RPC || undefined

/** GraphQL indexer/subgraph endpoint. Absent → the mock indexer is used even
 *  in live mode (the subgraph is not deployed yet). */
export const INDEXER_URL: string | undefined =
  import.meta.env.VITE_INDEXER_URL || undefined

/** Rebalance-agent REST base for the activity feed. Absent → the mock fixture is
 *  used. Point this at a same-origin proxy PATH (e.g. `/agent-api`) so the real
 *  upstream host + any auth stay server-side, never in the client bundle. */
export const AGENT_API_URL: string | undefined =
  import.meta.env.VITE_AGENT_API_URL || undefined

export type PaymentMode = 'mock' | 'hsp'

/** Payment gateway: `mock` (preview default) or `hsp` (real HSP coordinator).
 *  HSP is LIVE on HashKey mainnet 177 — `hsp` mode needs the creds below. */
export const PAYMENT_MODE: PaymentMode =
  import.meta.env.VITE_PAYMENT_MODE === 'hsp' ? 'hsp' : 'mock'

/** HSP coordinator endpoint. One deployment serves both nets; defaults to the
 *  live hackathon coordinator. */
export const HSP_COORDINATOR_URL: string =
  import.meta.env.VITE_HSP_COORDINATOR_URL ||
  'https://hsp-hackathon.hashkeymerchant.com'

/** HSP settlement chain (registry name). Defaults to HashKey mainnet `hashkey`
 *  (177); use `hashkey-testnet` (133) to dry-run against the faucet first. */
export const HSP_CHAIN: string = import.meta.env.VITE_HSP_CHAIN || 'hashkey'

/** HSP write-only API key — Bearer for the coordinator's write endpoints
 *  (POST /payments + /observe). Read from `.env` / `.env.local` (gitignored);
 *  NEVER commit it. Absent in preview/mock, required for `hsp` mode.
 *
 *  KTD4: this is a write-only sandbox key embedded in the FE for the demo. The
 *  production path proxies register+observe through a backend (browser only
 *  signs + broadcasts) so the key never ships to the browser. */
export const HSP_API_KEY: string | undefined =
  import.meta.env.VITE_HSP_API_KEY || undefined

/** HSP adapter observation-signing address, PINNED out-of-band (GET /chains).
 *  Same adapter on mainnet 177 and testnet 133. The independent HSPVerifier in
 *  the hsp gateway trusts receipts signed by it; override only if it rotates. */
export const HSP_ADAPTER_ADDRESS: string =
  import.meta.env.VITE_HSP_ADAPTER_ADDRESS ||
  '0x467AaF355DF243379B961Ce00abBae20c1e25012'

/** Assert a real project id is present (needed to actually connect a wallet). */
export function requireProjectId(): string {
  if (!PROJECT_ID) {
    throw new Error(
      'VITE_REOWN_PROJECT_ID is not set — create one at https://dashboard.reown.com and add it to .env',
    )
  }
  return PROJECT_ID
}
