import { defineChain } from 'viem'
import { base } from 'wagmi/chains'
import { HASHKEY } from '#/lib/contracts'
import { HASHKEY_RPC_OVERRIDE } from '#/lib/config/env'

/** HashKey Chain (177) as a wagmi/viem chain — a custom chain, not a built-in. */
export const hashkey = defineChain({
  id: HASHKEY.id,
  name: HASHKEY.name,
  nativeCurrency: {
    name: HASHKEY.name,
    symbol: HASHKEY.nativeSymbol,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [HASHKEY_RPC_OVERRIDE ?? HASHKEY.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'HashKey Explorer', url: HASHKEY.explorerUrl },
  },
})

export { base }

/** All chains the app knows — HashKey (home) + Base (cross-chain source). */
export const chains = [hashkey, base] as const
