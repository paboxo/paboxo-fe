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

/** Assert a real project id is present (needed to actually connect a wallet). */
export function requireProjectId(): string {
  if (!PROJECT_ID) {
    throw new Error(
      'VITE_REOWN_PROJECT_ID is not set — create one at https://dashboard.reown.com and add it to .env',
    )
  }
  return PROJECT_ID
}
