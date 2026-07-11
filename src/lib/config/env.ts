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

export type PaymentMode = 'mock' | 'hsp'

/** Payment gateway: `mock` (preview default) or `hsp` (real HSP coordinator).
 *  HSP is pre-1.0/testnet — `hsp` needs the sandbox creds below. */
export const PAYMENT_MODE: PaymentMode =
  import.meta.env.VITE_PAYMENT_MODE === 'hsp' ? 'hsp' : 'mock'

/** HSP coordinator endpoint. Supplied by the organizer when the sandbox ships. */
export const HSP_COORDINATOR_URL: string | undefined =
  import.meta.env.VITE_HSP_COORDINATOR_URL || undefined

/** HSP settlement chain — defaults to the testnet the sandbox runs on. */
export const HSP_CHAIN: string =
  import.meta.env.VITE_HSP_CHAIN || 'hashkey-testnet'

/** Assert a real project id is present (needed to actually connect a wallet). */
export function requireProjectId(): string {
  if (!PROJECT_ID) {
    throw new Error(
      'VITE_REOWN_PROJECT_ID is not set — create one at https://dashboard.reown.com and add it to .env',
    )
  }
  return PROJECT_ID
}
