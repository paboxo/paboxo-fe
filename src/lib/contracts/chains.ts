/** An EVM address literal (viem-compatible without importing viem). */
export type Address = `0x${string}`

export interface ChainConfig {
  id: number
  name: string
  rpcUrl: string
  explorerUrl: string
  nativeSymbol: string
}

/** Paboxo's home chain — all lending markets live here. */
export const HASHKEY: ChainConfig = {
  id: 177,
  name: 'HashKey Chain',
  rpcUrl: 'https://mainnet.hsk.xyz',
  explorerUrl: 'https://explorer.hsk.xyz',
  nativeSymbol: 'HSK',
}

/** Source chain for cross-chain supply (CCIP). */
export const BASE: ChainConfig = {
  id: 8453,
  name: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org',
  nativeSymbol: 'ETH',
}

/** Chainlink CCIP chain selectors for the opened Base <-> HashKey lanes. */
export const CCIP_SELECTOR = {
  hashkeyToBase: 15971525489660198786n,
  baseToHashkey: 7613811247471741961n,
} as const
